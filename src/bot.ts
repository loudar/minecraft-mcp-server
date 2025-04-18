#!/usr/bin/env node

import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import mineflayer from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
import minecraftData from 'minecraft-data';
import {registerInventoryTools} from "./tools/registerInventoryTools.js";
import {parseCommandLineArgs} from "./parseCommandLineArgs.js";
import {registerPositionTools} from "./tools/registerPositionTools.js";
import {registerBlockTools} from "./tools/registerBlockTools.js";
import {registerEntityTools} from "./tools/registerEntityTools.js";
import {registerChatTools} from "./tools/registerChatTools.js";
import {CmdArgs} from "./models/CmdArgs.js";

import {mineflayer as mineflayerViewer} from 'prismarine-viewer';

const {pathfinder, Movements} = pathfinderPkg;

// ========== Bot Setup ==========

function setupBot(argv: CmdArgs) {
    // Configure bot options based on command line arguments
    const botOptions = {
        host: argv.host,
        port: argv.port,
        username: argv.username,
        plugins: {pathfinder}
    };

    // Log connection information
    console.error(`Connecting to Minecraft server at ${argv.host}:${argv.port} as ${argv.username}`);

    // Create a bot instance
    const bot = mineflayer.createBot(botOptions);

    // Set up the bot when it spawns
    bot.once('spawn', async () => {
        console.error('Bot has spawned in the world');

        // Set up pathfinder movements
        const mcData = minecraftData(bot.version);
        const defaultMove = new Movements(bot, mcData);
        bot.pathfinder.setMovements(defaultMove);

        bot.chat('MCP-powered bot ready to receive instructions!');
    });

    // Register common event handlers
    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        console.error(`[CHAT] ${username}: ${message}`);
    });

    bot.on('kicked', (reason) => {
        console.error(`Bot was kicked: ${reason}`);
    });

    bot.on('error', (err) => {
        console.error(`Bot error: ${err.message}`);
    });

    bot.once('spawn', () => {
        mineflayerViewer(bot, {
            port: 3007,
            firstPerson: true
        })
    });

    return bot;
}

// ========== MCP Server Configuration ==========

function createMcpServer(bot: mineflayer.Bot) {
    const server = new McpServer({
        name: "minecraft-bot",
        version: "1.0.0",
    });

    // Register all tool categories
    registerPositionTools(server, bot);
    registerInventoryTools(server, bot);
    registerBlockTools(server, bot);
    registerEntityTools(server, bot);
    registerChatTools(server, bot);

    return server;
}

// ========== Main Application ==========

async function main() {
    let bot: mineflayer.Bot | undefined;

    try {
        // Parse command line arguments
        const argv = parseCommandLineArgs();

        // Set up the Minecraft bot
        bot = setupBot(argv);

        // Create and configure MCP server
        const server = createMcpServer(bot);

        // Handle stdin end - this will detect when Claude Desktop is closed
        process.stdin.on('end', () => {
            console.error("Claude has disconnected. Shutting down...");
            if (bot) {
                bot.quit();
            }
            process.exit(0);
        });

        // Connect to the transport
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Minecraft MCP Server running on stdio");
    } catch (error) {
        console.error("Failed to start server:", error);
        if (bot) bot.quit();
        process.exit(1);
    }
}

// Start the application
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});