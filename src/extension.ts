import { initProjectFileList } from './projectFileList';
import { svnCheckout } from './svn';

import * as fs from 'fs';
import * as vscode from 'vscode';
import * as vscodelc from 'vscode-languageclient/node';
import { runUpdateScript } from './updateScript';

// Global object to dispose of previous language clients.
let client: undefined | vscodelc.LanguageClient = undefined;

async function initLanguageClient(context: vscode.ExtensionContext, output: vscode.OutputChannel) {
    const config = vscode.workspace.getConfiguration('stevesSystemVerilogExtension.languageServer');

    // Source the ls and rules from SVN
    var binary_path = context.asAbsolutePath("./bin/svn/verible-verilog-ls");
    const rules_config_arg_value = context.asAbsolutePath("./bin/svn/.rules.verible_lint");

    const rules_config_arg = ["--rules_config", rules_config_arg_value];
    const user_args = config.get('arguments') as string;
    const args = rules_config_arg.concat(user_args);

    output.appendLine(`Using executable from path: ${binary_path}`);

    const verible_ls: vscodelc.Executable = {
        command: binary_path,
        args: args
    };

    const serverOptions: vscodelc.ServerOptions = verible_ls;

    // Options to control the language client
    const clientOptions: vscodelc.LanguageClientOptions = {
        // Register the server for (System)Verilog documents
        documentSelector: [{ scheme: 'file', language: 'systemverilog' },
        { scheme: 'file', language: 'verilog' }],
        outputChannel: output
    };

    // Create the language client and start the client.
    output.appendLine("Starting Language Server");
    client = new vscodelc.LanguageClient(
        'stevesSystemVerilogExtension',
        'Verible Language Server',
        serverOptions,
        clientOptions
    );
    client.start();
}

async function start_extension(context: vscode.ExtensionContext, output: vscode.OutputChannel) {
    // Checkout SVN
    await svnCheckout(context, output);

    runUpdateScript(context, output);

    // Init code to manage the project file list
    await initProjectFileList(context, output);

    return initLanguageClient(context, output);
}

// VSCode entrypoint to bootstrap an extension
export async function activate(context: vscode.ExtensionContext) {
    const output = vscode.window.createOutputChannel('Steves SystemVerilog Extension');

    // If a configuration change even it fired, let's dispose
    // of the previous client and create a new one.
    vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (!event.affectsConfiguration('stevesSystemVerilogExtension')) {
            return;
        }
        if (!client) {
            output.append("Config Changed: No Client");
            return start_extension(context, output);
        }
        client.stop().finally(async () => {
            output.append("Config Changed...");
            start_extension(context, output);
        });
    });

    return start_extension(context, output);
}

// Entrypoint to tear it down.
export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}

export async function updateExtension(context: vscode.ExtensionContext, root_path:string, output: vscode.OutputChannel) {
    output.appendLine("Check for new extension");
    const semverGt = require('semver/functions/gt');

    // Get the current version
    var current_version = context.extension.packageJSON["version"];

    // See if there is a newer vsix file of the format
    // "steves-system-verilog-extension-0.2.1.vsix"
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


