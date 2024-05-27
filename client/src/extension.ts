/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as path from 'path';
import * as vscode from 'vscode';
import {
    Executable,
    LanguageClient,
    LanguageClientOptions,
    ServerOptions
} from 'vscode-languageclient/node';

import { initProjectFileList } from './projectFileList';
import { APP_CONFIG_ROOT, APP_CONFIG_LANGUAGE_SERVER, APP_NAME } from './constants';

let client: LanguageClient;
let clientContext: vscode.ExtensionContext;
let n_clients = 0;

async function initLanguageClient(context: vscode.ExtensionContext, output: vscode.OutputChannel) {
    const config = vscode.workspace.getConfiguration(APP_CONFIG_LANGUAGE_SERVER);

    const binary_path = context.asAbsolutePath(
        await config.get<string>('path')
    );

    const rules_config_arg_value = context.asAbsolutePath(
        await config.get<string>('rules_config')
    );
    
    const rules_config_arg = ["--rules_config", rules_config_arg_value];
    const user_args = await config.get<string[]>('arguments');
    const args = rules_config_arg.concat(user_args);

    const verible_ls: Executable = {
        command: binary_path,
        args: args
    };

    const serverOptions: ServerOptions = verible_ls;

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for (System)Verilog documents
        documentSelector: [{ scheme: 'file', language: 'systemverilog' },
                           { scheme: 'file', language: 'verilog' }],
        outputChannel: output
    };

    // Create the language client and start the client.
    client = new LanguageClient(
        APP_CONFIG_ROOT,
        APP_NAME,
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    client.start();

    n_clients++;
}

export async function stopLanguageServer() {
    await client.stop();
}

export function startLanguageServer(output: vscode.OutputChannel) {
    if (!client) {
        return initLanguageClient(clientContext, output);
    }
    client.stop().finally(() => {
        initLanguageClient(clientContext, output);
    });
}

export function activate(context: vscode.ExtensionContext) {
    clientContext = context;
    
    const output = vscode.window.createOutputChannel(APP_NAME);

    // If a configuration change even it fired, let's dispose
    // of the previous client and create a new one.
    vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (!event.affectsConfiguration(APP_CONFIG_ROOT)) {
            return;
        }
        startLanguageServer(output);
    });

    // Init code to manage the project file list
    initProjectFileList(context, output);

    return initLanguageClient(context, output);
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
