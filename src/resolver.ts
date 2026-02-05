import type { Resolver } from "./types.ts";

export const defaultResolver: Resolver = async (url: string): Promise<unknown> => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to resolve ${url}: ${res.status} ${res.statusText}`);
    }
    return await res.json() as unknown;
};
