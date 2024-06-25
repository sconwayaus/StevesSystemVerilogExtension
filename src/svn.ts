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


export async function svnCheckout(context: vscode.ExtensionContext, output: vscode.OutputChannel) {
    output.appendLine("Checking out SVN repo");

    // Check if the SVN location is valid in settings
    const config = vscode.workspace.getConfiguration('stevesSystemVerilogExtension.rules_config');
    const svn_path = config.get('svn_path') as string;
    
    const path = "\"" + context.asAbsolutePath("./bin/svn") + "\"";
    const path_exists = fs.existsSync(path);
    
    var cmd_revert = "svn revert -R " + path;
    try {
        const revert_text = await execShell(cmd_revert, output);
        output.appendLine("svn revert: " + revert_text);
    } catch (er) {
        console.log(er); // 'rejected'
    }
    
    var cmd_checkout = "svn checkout --force " + svn_path + " " + path;
    try {
        const text = await execShell(cmd_checkout, output);
        output.appendLine("svn checkout: " + text);
        if(!path_exists) {
            vscode.window.showInformationMessage("Successfully configured SVN repo path.");
        }
    } catch (er) {
        console.log(er); // 'rejected'
        output.appendLine("SVN command failed");
        vscode.window.showErrorMessage("Failed to checkout verible from SVN. Check your 'stevesSystemVerilogExtension.rules_config.svn_path' setting.");
        vscode.commands.executeCommand( 'workbench.action.openSettings', 'stevesSystemVerilogExtension.rules_config.svn_path' );
    }

    output.appendLine("SVN Operations Complete");
}
