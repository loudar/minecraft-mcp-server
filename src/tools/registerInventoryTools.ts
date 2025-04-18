import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import mineflayer from "mineflayer";
import {Item} from "prismarine-item";
import {z} from "zod";
import {InventoryItem} from "../models/InventoryItem.js";
import {McpResponse} from "../models/McpResponse.js";
import {createErrorResponse, createResponse} from "../responseHelpers.js";

export function registerInventoryTools(server: McpServer, bot: mineflayer.Bot) {
    server.tool(
        "list-inventory",
        "List all items in the bot's inventory",
        {},
        async (): Promise<McpResponse> => {
            try {
                const items = bot.inventory.items();
                const itemList: InventoryItem[] = items.map((item: Item) => ({
                    name: item.name,
                    count: item.count,
                    slot: item.slot
                }));

                if (items.length === 0) {
                    return createResponse("Inventory is empty");
                }

                let inventoryText = `Found ${items.length} items in inventory:\n\n`;
                itemList.forEach(item => {
                    inventoryText += `- ${item.name} (x${item.count}) in slot ${item.slot}\n`;
                });

                return createResponse(inventoryText);
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );

    server.tool(
        "find-item",
        "Find a specific item in the bot's inventory",
        {
            nameOrType: z.string().describe("Name or type of item to find")
        },
        async ({nameOrType}): Promise<McpResponse> => {
            try {
                const items = bot.inventory.items();
                const item = items.find((item) =>
                    item.name.includes(nameOrType.toLowerCase())
                );

                if (item) {
                    return createResponse(`Found ${item.count} ${item.name} in inventory (slot ${item.slot})`);
                } else {
                    return createResponse(`Couldn't find any item matching '${nameOrType}' in inventory`);
                }
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );

    server.tool(
        "equip-item",
        "Equip a specific item",
        {
            itemName: z.string().describe("Name of the item to equip"),
            destination: z.string().optional().describe("Where to equip the item (default: 'hand')")
        },
        async ({itemName, destination = 'hand'}): Promise<McpResponse> => {
            try {
                const items = bot.inventory.items();
                const item = items.find((item: Item) =>
                    item.name.includes(itemName.toLowerCase())
                );

                if (!item) {
                    return createResponse(`Couldn't find any item matching '${itemName}' in inventory`);
                }

                await bot.equip(item, destination as mineflayer.EquipmentDestination);
                return createResponse(`Equipped ${item.name} to ${destination}`);
            } catch (error) {
                return createErrorResponse(error as Error);
            }
        }
    );
}