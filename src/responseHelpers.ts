import {McpResponse} from "./models/McpResponse.js";

export function createResponse(text: string): McpResponse {
    return {
        content: [{type: "text", text}]
    };
}

export function createErrorResponse(error: Error | string): McpResponse {
    const errorMessage = typeof error === 'string' ? error : error.message;
    console.error(`Error: ${errorMessage}`);
    return {
        content: [{type: "text", text: `Failed: ${errorMessage}`}],
        isError: true
    };
}
