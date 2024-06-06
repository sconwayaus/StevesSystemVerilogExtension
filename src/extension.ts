import * as vscode from 'vscode';
import * as vscodelc from 'vscode-languageclient/node';
import { initProjectFileList } from './projectFileList';

// Global object to dispose of previous language clients.
let client: undefined | vscodelc.LanguageClient = undefined;

async function initLanguageClient(context: vscode.ExtensionContext, output: vscode.OutputChannel) {
    const config = vscode.workspace.getConfiguration('mySystemVerilogExtension.languageServer');

    const binary_path = context.asAbsolutePath(config.get('path') as string);

    const rules_config_arg_value = context.asAbsolutePath(config.get('rules_config') as string);

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
        'verible',
        'Verible Language Server',
        serverOptions,
        clientOptions
    );
    client.start();
}

// VSCode entrypoint to bootstrap an extension
export function activate(context: vscode.ExtensionContext) {
    const output = vscode.window.createOutputChannel('Verible Language Server');

    // If a configuration change even it fired, let's dispose
    // of the previous client and create a new one.
    vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (!event.affectsConfiguration('verible')) {
            return;
        }
        if (!client) {
            return initLanguageClient(context, output);
        }
        client.stop().finally(() => {
            initLanguageClient(context, output);
        });
    });

    // Init code to manage the project file list
    initProjectFileList(context, output);

    return initLanguageClient(context, output);
}

// Entrypoint to tear it down.
export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
