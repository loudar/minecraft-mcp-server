import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import mineflayer from "mineflayer";
import {z} from "zod";
import {McpResponse} from "../models/McpResponse.js";
import {createErrorResponse, createResponse} from "../responseHelpers.js";
import {Entity} from "prismarine-entity";

export function registerEntityTools(server: McpServer, bot: mineflayer.Bot) {
    server.tool(
        "find-entity",
        "Find the nearest entity of a specific type",
        {
            type: z.string().optional().describe("Type of entity to find (empty for any entity)"),
            maxDistance: z.number().optional().describe("Maximum search distance (default: 16)")
        },
        async ({type = '', maxDistance = 16}): Promise<McpResponse> => {
            try {
                const entityFilter = (entity: Entity) => {
                    if (!type) {
                        return true;
                    }

                    switch (type) {
                        case 'player':
                            return entity.type === 'player';
                        case 'mob':
                            return entity.type === 'mob';
                    }

                    return !!(entity.name && entity.name.includes(type.toLowerCase()));
                };

                const entity = bot.nearestEntity(entityFilter);

                if (!entity || bot.entity.position.distanceTo(entity.position) > maxDistance) {
                    return createResponse(`No ${type || 'entity'} found within ${maxDistance} blocks`);
                }

                return createResponse(`Found ${entity.name || (entity).username || entity.type} at position (${Math.floor(entity.position.x)}, ${Math.floor(entity.position.y)}, ${Math.floor(entity.position.z)})`);
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );
}