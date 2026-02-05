import { collectRefs } from "./load.ts";
import type { LoadResult, ResolvedSchemaMap, SchemaObject, SpecVersion } from "./types.ts";
import type { Resolver } from "./types.ts";
import { toPascalCase } from "./naming.ts";

/** True if ref is an absolute HTTP(S) URL. */
function isExternalRef(ref: string): boolean {
    return ref.startsWith("http://") || ref.startsWith("https://");
}

/** Get the document URL from a ref (strip fragment). */
function getBaseUrl(ref: string): string {
    const i = ref.indexOf("#");
    return i >= 0 ? ref.slice(0, i) : ref;
}

/** Recursively clone schema; internal refs are left as $ref (resolution is by name in the map). */
function resolveSchemaInternal(
    schema: SchemaObject,
    root: unknown,
    version: SpecVersion,
): SchemaObject {
    const out: SchemaObject = { ...schema };
    if (schema.properties) {
        out.properties = {};
        for (const [k, v] of Object.entries(schema.properties)) {
            out.properties[k] = resolveSchemaInternal(v, root, version);
        }
    }
    if (out.items) {
        out.items = resolveSchemaInternal(out.items, root, version);
    }
    if (out.allOf) {
        out.allOf = out.allOf.map((s) => resolveSchemaInternal(s, root, version));
    }
    if (out.oneOf) {
        out.oneOf = out.oneOf.map((s) => resolveSchemaInternal(s, root, version));
    }
    if (out.anyOf) {
        out.anyOf = out.anyOf.map((s) => resolveSchemaInternal(s, root, version));
    }
    return out;
}

/** Extract schema map from a document (definitions for Swagger 2, components.schemas for OpenAPI 3, or top-level). */
function extractDocSchemas(doc: Record<string, unknown>): Record<string, SchemaObject> {
    const defs = doc.definitions;
    if (defs !== null && typeof defs === "object" && !Array.isArray(defs)) {
        const out: Record<string, SchemaObject> = {};
        for (const [k, v] of Object.entries(defs)) {
            if (v !== null && typeof v === "object" && !Array.isArray(v)) {
                out[k] = v as SchemaObject;
            }
        }
        return out;
    }
    const comp = doc.components as Record<string, unknown> | undefined;
    const schemas = comp?.schemas;
    if (schemas !== null && typeof schemas === "object" && !Array.isArray(schemas)) {
        const out: Record<string, SchemaObject> = {};
        for (const [k, v] of Object.entries(schemas)) {
            if (v !== null && typeof v === "object" && !Array.isArray(v)) {
                out[k] = v as SchemaObject;
            }
        }
        return out;
    }
    const out: Record<string, SchemaObject> = {};
    for (const [key, value] of Object.entries(doc)) {
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            out[key] = value as SchemaObject;
        }
    }
    return out;
}

/** Fetch external document via resolver and return baseUrl, extracted schemas, and raw object. */
async function fetchExternalDoc(
    url: string,
    resolver: Resolver,
): Promise<{ baseUrl: string; doc: Record<string, SchemaObject>; raw: Record<string, unknown> }> {
    const raw = (await resolver(url)) as Record<string, unknown>;
    if (raw === null || typeof raw !== "object") {
        throw new Error(`Resolver returned non-object for ${url}`);
    }
    const doc = extractDocSchemas(raw);
    return { baseUrl: url, doc, raw };
}

/**
 * Resolve loaded schemas into a single map: internal schemas first, then external refs fetched via resolver.
 * Schema names are normalized to PascalCase. External docs are fetched and their schemas merged.
 * @param loadResult - Result from {@link load}
 * @param resolver - Function to fetch external ref URLs (e.g. {@link defaultResolver})
 * @returns Map of type name → SchemaObject ready for {@link generate}
 */
export async function resolve(
    loadResult: LoadResult,
    resolver: Resolver,
): Promise<ResolvedSchemaMap> {
    const { version, spec, registry, refs } = loadResult;
    const root = spec as unknown;
    const result = new Map<string, SchemaObject>();

    for (const [name, schema] of registry) {
        const resolved = resolveSchemaInternal(schema, root, version);
        const typeName = toPascalCase(name);
        result.set(typeName, resolved);
    }

    const fetchedUrls = new Set<string>();
    const urlToDoc = new Map<string, Record<string, SchemaObject>>();
    const toFetch = new Set<string>();
    for (const ref of refs) {
        if (isExternalRef(ref)) {
            toFetch.add(getBaseUrl(ref));
        }
    }

    while (toFetch.size > 0) {
        const baseUrl = toFetch.values().next().value as string;
        toFetch.delete(baseUrl);
        if (fetchedUrls.has(baseUrl)) {
            continue;
        }
        fetchedUrls.add(baseUrl);
        try {
            const { doc, raw } = await fetchExternalDoc(baseUrl, resolver);
            urlToDoc.set(baseUrl, doc);
            const nestedRefs = new Set<string>();
            collectRefs(raw, nestedRefs);
            for (const r of nestedRefs) {
                if (isExternalRef(r)) {
                    const u = getBaseUrl(r);
                    if (!fetchedUrls.has(u)) {
                        toFetch.add(u);
                    }
                }
            }
        } catch (err) {
            throw new Error(`Unresolved external $ref: ${baseUrl}. ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    for (const [_baseUrl, doc] of urlToDoc) {
        for (const [name, schema] of Object.entries(doc)) {
            const typeName = toPascalCase(name);
            if (!result.has(typeName)) {
                result.set(typeName, schema);
            }
        }
    }

    return result;
}
