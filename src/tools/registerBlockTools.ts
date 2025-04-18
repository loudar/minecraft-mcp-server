import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import mineflayer from "mineflayer";
import pathfinder from "mineflayer-pathfinder";
import {z} from "zod";
import {FaceDirection} from "../models/FaceDirection.js";
import {McpResponse} from "../models/McpResponse.js";
import {Vec3} from "vec3";
import {createErrorResponse, createResponse} from "../responseHelpers.js";
import {FaceOption} from "../models/FaceOption.js";
import minecraftData from "minecraft-data";

const possibleFaces: FaceOption[] = [
    {direction: 'down', vector: new Vec3(0, -1, 0)},
    {direction: 'north', vector: new Vec3(0, 0, -1)},
    {direction: 'south', vector: new Vec3(0, 0, 1)},
    {direction: 'east', vector: new Vec3(1, 0, 0)},
    {direction: 'west', vector: new Vec3(-1, 0, 0)},
    {direction: 'up', vector: new Vec3(0, 1, 0)}
];

export function registerBlockTools(server: McpServer, bot: mineflayer.Bot) {
    const mcData = minecraftData(bot.version);

    server.tool(
        "place-block",
        "Place a block at the specified position",
        {
            x: z.number().describe("X coordinate"),
            y: z.number().describe("Y coordinate"),
            z: z.number().describe("Z coordinate"),
            faceDirection: z.enum(['up', 'down', 'north', 'south', 'east', 'west']).optional().describe("Direction to place against (default: 'down')")
        },
        async ({x, y, z, faceDirection = 'down'}: {
            x: number,
            y: number,
            z: number,
            faceDirection?: FaceDirection
        }): Promise<McpResponse> => {
            try {
                const placePos = new Vec3(x, y, z);
                const blockAtPos = bot.blockAt(placePos);
                if (blockAtPos && blockAtPos.name !== 'air') {
                    return createResponse(`There's already a block (${blockAtPos.name}) at (${x}, ${y}, ${z})`);
                }

                // Prioritize the requested face direction
                if (faceDirection !== 'down') {
                    const specificFace = possibleFaces.find(face => face.direction === faceDirection);
                    if (specificFace) {
                        possibleFaces.unshift(possibleFaces.splice(possibleFaces.indexOf(specificFace), 1)[0]);
                    }
                }

                // Try each potential face for placing
                for (const face of possibleFaces) {
                    const referencePos = placePos.plus(face.vector);
                    const referenceBlock = bot.blockAt(referencePos);

                    if (referenceBlock && referenceBlock.name !== 'air') {
                        if (!bot.canSeeBlock(referenceBlock)) {
                            // Try to move closer to see the block
                            const goal = new pathfinder.goals.GoalNear(referencePos.x, referencePos.y, referencePos.z, 2);
                            await bot.pathfinder.goto(goal);
                        }

                        await bot.lookAt(placePos, true);

                        try {
                            await bot.placeBlock(referenceBlock, face.vector.scaled(-1));
                            return createResponse(`Placed block at (${x}, ${y}, ${z}) using ${face.direction} face`);
                        } catch (placeError) {
                            console.error(`Failed to place using ${face.direction} face: ${(placeError as Error).message}`);
                        }
                    }
                }

                return createResponse(`Failed to place block at (${x}, ${y}, ${z}): No adjacent block, try a different coordinate first`);
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );

    server.tool(
        "dig-block",
        "Dig a block at the specified position",
        {
            x: z.number().describe("X coordinate"),
            y: z.number().describe("Y coordinate"),
            z: z.number().describe("Z coordinate"),
        },
        async ({x, y, z}): Promise<McpResponse> => {
            try {
                const blockPos = new Vec3(x, y, z);
                const block = bot.blockAt(blockPos);

                if (!block || block.name === 'air') {
                    return createResponse(`No block found at position (${x}, ${y}, ${z})`);
                }

                if (!bot.canDigBlock(block) || !bot.canSeeBlock(block)) {
                    // Try to move closer to dig the block
                    const goal = new pathfinder.goals.GoalNear(x, y, z, 2);
                    await bot.pathfinder.goto(goal);
                }

                await bot.dig(block);

                return createResponse(`Dug ${block.name} at (${x}, ${y}, ${z})`);
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );

    server.tool(
        "get-block-info",
        "Get information about a block at the specified position",
        {
            x: z.number().describe("X coordinate"),
            y: z.number().describe("Y coordinate"),
            z: z.number().describe("Z coordinate"),
        },
        async ({x, y, z}): Promise<McpResponse> => {
            try {
                const blockPos = new Vec3(x, y, z);
                const block = bot.blockAt(blockPos);

                if (!block) {
                    return createResponse(`No block information found at position (${x}, ${y}, ${z})`);
                }

                return createResponse(`Found ${block.name} (type: ${block.type}) at position (${block.position.x}, ${block.position.y}, ${block.position.z})`);
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );

    server.tool(
        "find-block",
        "Find the nearest block of a specific type",
        {
            blockType: z.string().describe("Type of block to find"),
            maxDistance: z.number().optional().describe("Maximum search distance (default: 16)")
        },
        async ({blockType, maxDistance = 16}): Promise<McpResponse> => {
            try {
                const blocksByName = mcData.blocksByName;

                if (!blocksByName[blockType]) {
                    return createResponse(`Unknown block type: ${blockType}`);
                }

                const blockId = blocksByName[blockType].id;

                const block = bot.findBlock({
                    matching: blockId,
                    maxDistance: maxDistance
                });

                if (!block) {
                    return createResponse(`No ${blockType} found within ${maxDistance} blocks`);
                }

                return createResponse(`Found ${blockType} at position (${block.position.x}, ${block.position.y}, ${block.position.z})`);
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );

    server.tool(
        "find-blocks",
        "Find multiple blocks of a specific type. Can also help if you don't know where blocks are that you could place against.",
        {
            blockType: z.string().describe("Type of block to find. Use 'all' if you just want to find where blocks are."),
            maxDistance: z.number().optional().describe("Maximum search distance (default: 16)"),
            count: z.number().optional().describe("Amount of blocks to find"),
        },
        async ({blockType, maxDistance = 16, count = 2}): Promise<McpResponse> => {
            try {
                let blocks = [];
                if (blockType === 'all') {
                    blocks = bot.findBlocks({
                        matching: block => block.name !== "air",
                        maxDistance,
                        count
                    });
                } else {
                    const blocksByName = mcData.blocksByName;

                    if (!blocksByName[blockType]) {
                        return createResponse(`Unknown block type: ${blockType}`);
                    }

                    const blockId = blocksByName[blockType].id;
                    blocks = bot.findBlocks({
                        matching: blockId,
                        maxDistance,
                        count,
                    });
                }

                if (blocks.length === 0) {
                    return createResponse(`No ${blockType} found within ${maxDistance} blocks`);
                }

                return createResponse(`Found ${blockType} at the following locations: [${blocks.map(v => JSON.stringify(v)).join(", ")}]`);
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );
}