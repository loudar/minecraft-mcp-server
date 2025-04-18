import {ContentItem} from "./ContentItem.js";

export type McpResponse = {
    content: ContentItem[];
    _meta?: Record<string, unknown>;
    isError?: boolean;
    [key: string]: unknown;
};