import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import mineflayer from "mineflayer";
import {z} from "zod";
import {McpResponse} from "../models/McpResponse.js";
import {createErrorResponse, createResponse} from "../responseHelpers.js";

export function registerChatTools(server: McpServer, bot: mineflayer.Bot) {
    server.tool(
        "send-chat",
        "Send a chat message in-game",
        {
            message: z.string().describe("Message to send in chat")
        },
        async ({message}): Promise<McpResponse> => {
            try {
                bot.chat(message);
                return createResponse(`Sent message: "${message}"`);
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );
}