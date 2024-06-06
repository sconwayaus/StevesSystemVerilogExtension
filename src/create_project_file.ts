import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const command = 'verible.createProjectFile';

  const commandHandler = () => {
    console.log(`Hello world!!!`);
  };

  context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
}