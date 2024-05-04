/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import * as vscode from 'vscode';
import { workspace, ExtensionContext } from 'vscode';

import {
    Executable,
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

async function initLanguageClient(context: ExtensionContext) {
    const output = vscode.window.createOutputChannel('My System Verilog Extension');
    const config = vscode.workspace.getConfiguration('mySystemVerilogExtension');

    const binary_path = context.asAbsolutePath(
        path.join('bin', 'verible-verilog-ls')
    );

    const verible_ls: Executable = {
        command: binary_path,
        args: await config.get<string[]>('arguments')
    };

    const serverOptions: ServerOptions = verible_ls;
    
    // The server is implemented in node
    // const serverModule = context.asAbsolutePath(
    //     path.join('bin', 'verible-verilog-ls')
    // );

    // // If the extension is launched in debug mode then the debug server options are used
    // // Otherwise the run options are used
    // const serverOptions: ServerOptions = {
    //     run: { module: serverModule, transport: TransportKind.ipc },
    //     debug: {
    //         module: serverModule,
    //         transport: TransportKind.ipc,
    //     }
    // };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for (System)Verilog documents
        documentSelector: [{ scheme: 'file', language: 'systemverilog' },
                           { scheme: 'file', language: 'verilog' }],
        outputChannel: output
    };
    // const clientOptions: LanguageClientOptions = {
    //     // Register the server for plain text documents
    //     documentSelector: [{ scheme: 'file', language: 'plaintext' }],
    //     synchronize: {
    //         // Notify the server about file changes to '.clientrc files contained in the workspace
    //         fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
    //     }
    // };

    // Create the language client and start the client.
    client = new LanguageClient(
        'mySystemVerilogExtension',
        'My System Verilog Extension',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    client.start();
}

export function activate(context: ExtensionContext) {
    // If a configuration change even it fired, let's dispose
    // of the previous client and create a new one.
    vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (!event.affectsConfiguration('mySystemVerilogExtension')) {
            return;
        }
        if (!client) {
            return initLanguageClient(context);
        }
        client.stop().finally(() => {
            initLanguageClient(context);
        });
    });
    return initLanguageClient(context);
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
