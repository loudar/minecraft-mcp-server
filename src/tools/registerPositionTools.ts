import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import mineflayer from "mineflayer";
import {McpResponse} from "../models/McpResponse.js";
import {z} from "zod";
import {Vec3} from "vec3";
import {Direction} from "../models/Direction.js";
import {createErrorResponse, createResponse} from "../responseHelpers.js";
import pathfinder from 'mineflayer-pathfinder';

export function registerPositionTools(server: McpServer, bot: mineflayer.Bot) {
    server.tool(
        "get-position",
        "Get the current position of the bot",
        {},
        async (): Promise<McpResponse> => {
            try {
                const position = bot.entity.position;
                const pos = {
                    x: Math.floor(position.x),
                    y: Math.floor(position.y),
                    z: Math.floor(position.z)
                };

                return createResponse(`Current position: (${pos.x}, ${pos.y}, ${pos.z})`);
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );

    server.tool(
        "move-to-position",
        "Move the bot to a specific position",
        {
            x: z.number().describe("X coordinate"),
            y: z.number().describe("Y coordinate"),
            z: z.number().describe("Z coordinate"),
            range: z.number().optional().describe("How close to get to the target (default: 1)")
        },
        async ({x, y, z, range = 1}): Promise<McpResponse> => {
            try {
                const goal = new pathfinder.goals.GoalNear(x, y, z, range);
                await bot.pathfinder.goto(goal);

                return createResponse(`Successfully moved to position near (${x}, ${y}, ${z})`);
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );

    server.tool(
        "look-at",
        "Make the bot look at a specific position",
        {
            x: z.number().describe("X coordinate"),
            y: z.number().describe("Y coordinate"),
            z: z.number().describe("Z coordinate"),
        },
        async ({x, y, z}): Promise<McpResponse> => {
            try {
                await bot.lookAt(new Vec3(x, y, z), true);

                return createResponse(`Looking at position (${x}, ${y}, ${z})`);
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );

    server.tool(
        "jump",
        "Make the bot jump",
        {},
        async (): Promise<McpResponse> => {
            try {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 250);

                return createResponse("Successfully jumped");
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );

    server.tool(
        "move-in-direction",
        "Move the bot in a specific direction for a duration",
        {
            direction: z.enum(['forward', 'back', 'left', 'right']).describe("Direction to move"),
            duration: z.number().optional().describe("Duration in milliseconds (default: 1000)")
        },
        async ({direction, duration = 1000}: { direction: Direction, duration?: number }): Promise<McpResponse> => {
            return new Promise((resolve) => {
                try {
                    bot.setControlState(direction, true);

                    setTimeout(() => {
                        bot.setControlState(direction, false);
                        resolve(createResponse(`Moved ${direction} for ${duration}ms`));
                    }, duration);
                } catch (error) {
                    bot.setControlState(direction, false);
                    resolve(createErrorResponse(error as Error));
                }
            });
        }
    );
}