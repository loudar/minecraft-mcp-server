import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import {CmdArgs} from "./models/CmdArgs.js";

export function parseCommandLineArgs(): CmdArgs {
    return yargs(hideBin(process.argv))
        .option('host', {
            type: 'string',
            description: 'Minecraft server host',
            default: 'localhost'
        })
        .option('port', {
            type: 'number',
            description: 'Minecraft server port',
            default: 25565
        })
        .option('username', {
            type: 'string',
            description: 'Bot username',
            default: 'LLMBot'
        })
        .help()
        .alias('help', 'h')
        .parseSync();
}