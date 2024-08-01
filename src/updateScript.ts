import * as vscode from 'vscode';
import * as fs from 'fs';

/**
 * Looks for update.json in the svn path, which contains a list of configuration setting updates, 
 * and recommended extensions to install.
 * 
 * @param context 
 * @param output 
 */
export async function runUpdateScript(context: vscode.ExtensionContext, output: vscode.OutputChannel) {
    const update_filepath = context.asAbsolutePath("./bin/svn/update.json");
    output.appendLine("Read update file: " + update_filepath);
    try {
        const json_str: string = fs.readFileSync(update_filepath, 'utf8');
        const json = JSON.parse(json_str);

        const json_settings = json["settings"];
        if(json_settings != undefined) {
            processSettings(json_settings, output);
        }

        const json_extensions = json["extensions"];
        if(json_extensions != undefined) {
            processExtensions(json_extensions, output);
        }
    } catch (error: any) {
        output.append(error);
    }
}

/**
 * Processes the settings section of the json file. Example settings to update 
 * 
 * "editor.renderWhitespace" : "all",
 * "security.allowedUNCHosts" : adding and removing elements
 * JSON EXAMPLE:
 *   "settings": {
 *       "editor": {
 *           "renderWhitespace": {
 *               "type": "string",
 *               "value": "all",
 *               "user_setting" : true
 *           }
 *       },
 *       "security": {
 *           "allowedUNCHosts": {
 *               "type": "array",
 *               "user_setting" : true,
 *               "remove": [
 *                   "c:\\",
 *                   "c:\\temp\\",
 *                   "d:\\temp\\"
 *               ],
 *               "add": [
 *                   "c:\\temp\\"
 *               ]
 *           }
 *       }
 *   },
 * 
 * @param json_settings 
 * @param output 
 */
function processSettings(json_settings: any, output: vscode.OutputChannel) {
    const settings_keys = Object.keys(json_settings);

    settings_keys.forEach(config_key => {
        const config_json = json_settings[config_key];
        const settings_keys = Object.keys(config_json);
        const config = vscode.workspace.getConfiguration(config_key);

        settings_keys.forEach(key => {
            const setting = config_json[key]
            const type = setting["type"];
            const config_str = config_key + "." + key;
            const user_settings:boolean = setting["user_setting"]
            
            switch (type) {
                case "string":
                    const value = setting["value"];
                    output.appendLine("Set: " + config_str + " = " + value + " user_setting:" + user_settings);
                    config.update(config_str, value, user_settings);
                    break;

                case "array":
                    var array = <string[]>(config.get(key));

                    const addList = <[]>setting["add"];
                    if(addList != undefined) {
                        addList.forEach(element => {
                            if(!array.includes(element)) {
                                array.push(element);
                            }
                        });
                    }
                    
                    const removeList = <[]>setting["remove"];
                    if(removeList != undefined) {
                        removeList.forEach(element => {
                            const idx = array.indexOf(element);
                            if(idx > -1) {
                                array.splice(idx, 1);
                            }
                        });
                    }

                    output.appendLine("Set: " + config_str + " = " + array + " user_setting:" + user_settings);
                    config.update(config_str, array, user_settings);
                    break;

                default:
                    break;
            }
        });
    });
}

/**
 * Processes the "extensions" section in update.json. The user is asked if they want to install 
 * each extension and if the user chooses not to install the extension, the script will record the 
 * filename in vscode settings (stevesSystemVerilogExtension.update.ignoredExtensions) and not 
 * ask the user again.
 * 
 * @param json_extensions 
 * @param output 
 */
async function processExtensions(json_extensions: any, output: vscode.OutputChannel) {
    const config = vscode.workspace.getConfiguration('stevesSystemVerilogExtension');
    const ignored_extensions = <string[]>config.get("update.ignoredExtensions");
    const semverGt = require('semver/functions/gt');
    
    const id_list = Object.keys(json_extensions);
    id_list.forEach(id => {
        const config_json = json_extensions[id];
        const path = config_json["path"];
        const filename = config_json["filename"];
        output.appendLine("id: " + id + " filename: " + path + filename);

        if(!ignored_extensions.includes(filename)) {
            const extension = vscode.extensions.getExtension(id);
            if(extension != undefined) {
                updateExtension(extension, path, filename, output);
            } else {
                installExtension(path, filename, output);
            }
        }
    });
}

/**
 * Adds a filename to ignoredExtensions 
 * @param filename 
 */
function addIgnoredExtension(filename:string) {
    const config = vscode.workspace.getConfiguration('stevesSystemVerilogExtension');
    var ignored_extensions = <string[]>config.get("update.ignoredExtensions");
    ignored_extensions.push(filename);
    config.update("update.ignoredExtensions", ignored_extensions, true);
}

/**
 * Updates an already installed extension
 * 
 * @param extension 
 * @param root_path 
 * @param filename 
 * @param output 
 */
async function updateExtension(extension: vscode.Extension<any>, root_path:string, filename:string, output: vscode.OutputChannel) {
    const semverGt = require('semver/functions/gt');
    var update_file = root_path + filename;

    // Get the current version
    var current_version = extension.packageJSON["version"];

    var file_version: string = filename.replace(".vsix", "");
    file_version = file_version.slice(file_version.lastIndexOf("-") + 1);
    if (semverGt(file_version, current_version)) {
        vscode.window
            .showInformationMessage("Recommended Extension '" + filename + "'?\n" + 
                "Do you want to update?\n", "Yes", "No")
            .then(answer => {
                if (answer === "Yes") {
                    output.appendLine("Updating Extension: " + update_file);
                    vscode.commands.executeCommand('workbench.extensions.command.installFromVSIX', [vscode.Uri.file(update_file)]);
                } else {
                    addIgnoredExtension(filename);
                }
            });
    }
}

/**
 * Installs a new extension
 * @param root_path 
 * @param filename 
 * @param output 
 */
async function installExtension(root_path:string, filename:string, output: vscode.OutputChannel) {
    vscode.window
        .showInformationMessage("Recommended Extension '" + filename + "'?\n" + 
            "Do you want to install?\n", "Yes", "No")
        .then(answer => {
            if (answer === "Yes") {
                var update_file = root_path + filename;
                output.appendLine("Installing Extension: " + update_file);
                vscode.commands.executeCommand('workbench.extensions.command.installFromVSIX', [vscode.Uri.file(update_file)]);
            } else {
                addIgnoredExtension(filename);
            }
        });
}
