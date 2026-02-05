import type { Resolver } from "./types.ts";

/** Default resolver: fetches URL with fetch() and returns parsed JSON. Used when no custom resolver is passed. */
export const defaultResolver: Resolver = async (url: string): Promise<unknown> => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to resolve ${url}: ${res.status} ${res.statusText}`);
    }
    return await res.json() as unknown;
};
