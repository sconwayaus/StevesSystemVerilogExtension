import * as vscode from 'vscode';
import { posix } from 'path';

let output;

/**
 * Creates verible.filelist in the root of the workspace
 * 
 * @returns undefined
 */
async function createProjectFileList() {
    // If there is no workspace folder open then return
    if (vscode.workspace.workspaceFolders === undefined) {
        return;
    }
    const config = vscode.workspace.getConfiguration('verible.projectFileList');
    const includeGlobPattern = await config.get('includeGlobPattern') as string;
    const excludeGlobPattern = await config.get('excludeGlobPattern') as string;
    const filelist = await vscode.workspace.findFiles(includeGlobPattern, excludeGlobPattern);

    const folderUri = vscode.workspace.workspaceFolders[0].uri;
    const fileUri = folderUri.with({ path: posix.join(folderUri.path, 'verible.filelist') });

    let writeDataStr = "";
    filelist.forEach(f => {
        writeDataStr += f.fsPath.replace(folderUri.fsPath, ".");
        writeDataStr += "\n";
    });

    const writeData = Buffer.from(writeDataStr, 'utf8');
    vscode.workspace.fs.writeFile(fileUri, writeData);
}

async function createProjectFileListListener() {
    await createProjectFileList();
}

async function deleteProjectFileListListener() {
    await createProjectFileList();
}

async function renameProjectFileListListener() {
    await createProjectFileList();
}

export async function initProjectFileList(context: vscode.ExtensionContext, out: vscode.OutputChannel) {
    output = out;

    // Test to see if verible.filelist exists. If not create one
    const projectFile = "verible.filelist";
    const files = await vscode.workspace.findFiles(projectFile);
    if (files.length == 0) {
        output.appendLine(projectFile + " does NOT exist");
        await createProjectFileList();
    } else {
        output.appendLine(projectFile + " already exists");
    }

    // Add listeners for file creation, delete or rename events
    context.subscriptions.push(vscode.workspace.onDidCreateFiles(createProjectFileListListener));
    context.subscriptions.push(vscode.workspace.onDidDeleteFiles(deleteProjectFileListListener));
    context.subscriptions.push(vscode.workspace.onDidRenameFiles(renameProjectFileListListener));

    // Add a command the user can invoke to create the project file list
    context.subscriptions.push(
        vscode.commands.registerCommand('verible.create_project_file_list', createProjectFileList));
}
