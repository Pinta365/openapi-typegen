import { readFile } from "@cross/fs";
import { parse as parseYaml } from "@std/yaml";
import type { LoadResult, OpenAPI2Spec, OpenAPI3Spec, SchemaObject, SpecInput, SpecVersion } from "./types.ts";

const HTTP_PREFIX = /^https?:\/\//i;
const YAML_EXT = /\.(yaml|yml)$/i;

/** Parse spec text as JSON or YAML based on urlOrPath extension. */
function parseSpecText(text: string, urlOrPath: string): unknown {
    if (YAML_EXT.test(urlOrPath)) {
        return parseYaml(text) as unknown;
    }
    return JSON.parse(text) as unknown;
}

/**
 * Load a spec from a URL, file path, or return the object as-is.
 * Fetches HTTP(S) URLs, reads local files (JSON or YAML by extension), or returns the given object.
 * @param spec - URL string, file path, URL instance, or parsed spec object
 * @returns Parsed spec as a plain object
 */
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
        const text = await res.text();
        return parseSpecText(text, urlOrPath);
    }
    const text = await readFile(urlOrPath, "utf-8");
    return parseSpecText(text, urlOrPath);
}

/**
 * Detect OpenAPI/Swagger version from a parsed spec object.
 * @param spec - Parsed root spec (must have `swagger: "2.0"` or `openapi: "3.x.x"`)
 * @returns `"openapi2"` or `"openapi3"`
 * @throws If spec is not an object or version is missing/unsupported
 */
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

/**
 * Recursively collect all `$ref` string values from a spec (or any object).
 * Mutates the given `refs` set in place.
 * @param obj - Any value (object, array, or primitive)
 * @param refs - Set to which found `$ref` values are added
 */
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

/**
 * Extract schema registry and collect refs from a parsed spec.
 * OpenAPI 2: uses `definitions`; OpenAPI 3: uses `components.schemas`.
 * @param spec - Parsed spec object (OpenAPI 2 or 3 shape)
 * @param version - Already-detected version
 * @returns LoadResult with registry, refs, and spec
 */
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

/**
 * Load a spec (URL, path, or object), detect version, and extract schemas and refs.
 * One-shot entry for the load pipeline.
 * @param spec - URL string, file path, URL instance, or parsed spec object
 * @returns LoadResult with version, registry, refs, and original spec
 */
export async function load(spec: SpecInput): Promise<LoadResult> {
    const raw = await loadSpec(spec);
    const version = detectVersion(raw);
    return extractSchemas(raw, version);
}
