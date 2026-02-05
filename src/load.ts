import { readFile } from "@cross/fs";
import type { LoadResult, OpenAPI2Spec, OpenAPI3Spec, SchemaObject, SpecInput, SpecVersion } from "./types.ts";

const HTTP_PREFIX = /^https?:\/\//i;

export async function loadSpec(spec: SpecInput): Promise<unknown> {
    if (typeof spec === "object" && spec !== null && !(spec instanceof URL)) {
        return spec;
    }
    const urlOrPath = spec instanceof URL ? spec.href : spec;
    if (typeof urlOrPath !== "string") {
        throw new Error("Spec must be a string (URL or path), URL, or parsed object.");
    }
    if (HTTP_PREFIX.test(urlOrPath)) {
        const res = await fetch(urlOrPath);
        if (!res.ok) {
            throw new Error(`Failed to fetch spec: ${res.status} ${res.statusText} (${urlOrPath})`);
        }
        return await res.json() as unknown;
    }
    const text = await readFile(urlOrPath, "utf-8");
    return JSON.parse(text) as unknown;
}

export function detectVersion(spec: unknown): SpecVersion {
    if (spec === null || typeof spec !== "object") {
        throw new Error("Invalid spec: not an object.");
    }
    const o = spec as Record<string, unknown>;
    if (o.swagger === "2.0") {
        return "openapi2";
    }
    if (typeof o.openapi === "string" && /^3\.\d+\.\d+/.test(o.openapi)) {
        return "openapi3";
    }
    throw new Error("Invalid spec: missing or unsupported 'swagger: 2.0' or 'openapi: 3.x'.");
}

export function collectRefs(obj: unknown, refs: Set<string>): void {
    if (obj === null || typeof obj !== "object") {
        return;
    }
    if (Array.isArray(obj)) {
        for (const item of obj) {
            collectRefs(item, refs);
        }
        return;
    }
    const o = obj as Record<string, unknown>;
    if (typeof o.$ref === "string") {
        refs.add(o.$ref);
    }
    for (const value of Object.values(o)) {
        collectRefs(value, refs);
    }
}

export function extractSchemas(spec: unknown, version: SpecVersion): LoadResult {
    const refs = new Set<string>();
    collectRefs(spec, refs);

    const registry = new Map<string, SchemaObject>();

    if (version === "openapi2") {
        const s = spec as OpenAPI2Spec;
        const definitions = s.definitions ?? {};
        for (const [name, schema] of Object.entries(definitions)) {
            registry.set(name, schema);
        }
    } else {
        const s = spec as OpenAPI3Spec;
        const schemas = s.components?.schemas ?? {};
        for (const [name, schema] of Object.entries(schemas)) {
            registry.set(name, schema);
        }
    }

    return {
        version,
        spec: spec as OpenAPI2Spec | OpenAPI3Spec,
        registry,
        refs,
    };
}

export async function load(spec: SpecInput): Promise<LoadResult> {
    const raw = await loadSpec(spec);
    const version = detectVersion(raw);
    return extractSchemas(raw, version);
}
