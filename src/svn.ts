import * as vscode from 'vscode';
import * as cp from "child_process";
import * as fs from 'fs';

const execShell = (cmd: string, output: vscode.OutputChannel) =>
    new Promise<string>((resolve, reject) => {
        output.appendLine("Executing: '" + cmd + "'");
        cp.exec(cmd, (err, out) => {
            if (err) {
                return reject(err);
            }
            return resolve(out);
        });
    });

async function svnUpdateVSIX(context: vscode.ExtensionContext, output: vscode.OutputChannel) {
    output.appendLine("Check for new extension");
    const semverGt = require('semver/functions/gt');

    // Get the current version
    var current_version = context.extension.packageJSON["version"];

    // See if there is a newer vsix file of the format
    // "steves-system-verilog-extension-0.2.1.vsix"
    const root_path = context.asAbsolutePath("./bin/svn/")
    output.appendLine("Searching for vsix files here: '" + root_path + "'");

    var filelist = fs.readdirSync(root_path).filter(fn => {
        return fn.startsWith("steves-system-verilog-extension-") && fn.endsWith(".vsix");
    });

    if (filelist.length == 0) {
        output.appendLine("No Files Found");
        return;
    }

    // Search for the latest version
    var latest_version = current_version;
    var latest_version_filename: string = "";
    filelist.forEach(f => {
        var file_version = f.replace("steves-system-verilog-extension-", "");
        file_version = file_version.replace(".vsix", "");
        output.appendLine("Version Found: '" + file_version + "'");
        if (semverGt(file_version, latest_version)) {
            latest_version = file_version;
            output.appendLine("Found new extesion: " + f);
            latest_version_filename = f;
        }
    });

    // Ask the user if they want to upgrade the extension
    if (latest_version_filename != "") {
        vscode.window
            .showInformationMessage("Found new extension: '" + latest_version_filename + "'\n" + 
                "Do you want to update?\n", "Yes", "No")
            .then(answer => {
                if (answer === "Yes") {
                    var update_file = root_path + latest_version_filename;
                    output.appendLine("Updating Extension: " + update_file);
                    vscode.commands.executeCommand('workbench.extensions.command.installFromVSIX', [vscode.Uri.file(update_file)]);
                }
            })
    }

}

async function isSVNPathOK(svn_path: string, output: vscode.OutputChannel) {
    // Perform an svn ls and check for the presence of .rules.verible_lint and verible-verilog-ls.exe
    var cmd_svn_ls = "svn ls " + svn_path
    try {
        const text = await execShell(cmd_svn_ls, output);
        output.appendLine("svn ls: " + text);

        const found_rules = text.includes(".rules.verible_lint");
        const found_verible_ls = text.includes("verible-verilog-ls.exe")

        if (!found_rules) {
            output.appendLine("ERROR: .rules.verible_lint not found in repo: " + svn_path);
        }

        if (!found_verible_ls) {
            output.appendLine("ERROR: verible-verilog-ls.exe not found in repo: " + svn_path);
        }

        if (found_rules && found_verible_ls) {
            output.appendLine("SVN Path OK");
            return true;
        }

    } catch (error: any) {
        output.appendLine(error.message);
    }

    output.appendLine("SVN Path NOT OK ('" + svn_path + "')");
    return false;
}

async function isSVNCheckoutOK(svn_path: string, target_path: string, output: vscode.OutputChannel) {
    var cmd_checkout = "svn checkout --force " + svn_path + " " + target_path;
    try {
        const text = await execShell(cmd_checkout, output);
        output.appendLine("svn checkout: " + text);
    } catch (er) {
        console.log(er); // 'rejected'
        output.appendLine("SVN command failed");
        vscode.window.showErrorMessage("Failed to checkout verible from SVN. Check your 'stevesSystemVerilogExtension.rules_config.svn_path' setting.");
        vscode.commands.executeCommand('workbench.action.openSettings', 'stevesSystemVerilogExtension.rules_config.svn_path');
        return false;
    }

    return true;
}

export async function svnCheckout(context: vscode.ExtensionContext, output: vscode.OutputChannel) {
    output.appendLine("Checking out SVN repo");

    // Check if the SVN location is valid in settings
    const config = vscode.workspace.getConfiguration('stevesSystemVerilogExtension.rules_config');
    const svn_path = config.get('svn_path') as string;

    const path = context.asAbsolutePath("./bin/svn")
    const quoted_path = "\"" + path + "\"";
    const path_exists = fs.existsSync(quoted_path);

    // Revert any local changes (if any)
    var cmd_revert = "svn revert -R " + quoted_path;
    try {
        const revert_text = await execShell(cmd_revert, output);
        output.appendLine("svn revert: " + revert_text);
    } catch (er) {
        console.log(er); // 'rejected'
    }

    // Check that the SVN path contains valid 
    if (await isSVNPathOK(svn_path, output)) {
        if (await isSVNCheckoutOK(svn_path, quoted_path, output)) {
            if (!path_exists) {
                vscode.window.showInformationMessage("Successfully configured SVN repo path.");
            }
            await svnUpdateVSIX(context, output);
        }
    }

    output.appendLine("SVN Operations Complete");
}
