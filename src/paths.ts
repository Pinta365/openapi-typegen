import { collectRefs } from "./load.ts";
import { refToTypeName } from "./codegen.ts";
import type { SpecVersion } from "./types.ts";

const HTTP_METHODS = ["get", "put", "post", "delete", "patch", "head", "options"] as const;

/** Result of collecting schema refs from one path + method operation. */
export interface OperationRefs {
    path: string;
    method: string;
    tags: string[];
    refs: string[];
}

/** Resolve a local $ref (e.g. #/components/schemas/Foo) against the spec; return undefined for external refs. */
function resolveLocalRef(spec: Record<string, unknown>, ref: string): unknown {
    if (ref.startsWith("http://") || ref.startsWith("https://")) return undefined;
    const fragment = ref.indexOf("#") >= 0 ? ref.slice(ref.indexOf("#") + 1) : ref;
    if (!fragment.startsWith("/")) return undefined;
    const parts = fragment.slice(1).split("/").filter(Boolean);
    let current: unknown = spec;
    for (const part of parts) {
        if (current === null || typeof current !== "object") return undefined;
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}

/** Collect type names from a schema, following local $refs in the spec so nested refs are included. */
function collectTypeNamesFromSchemaRecursive(
    schema: unknown,
    spec: Record<string, unknown>,
    version: SpecVersion,
    seen: Set<string>,
): string[] {
    const refSet = new Set<string>();
    collectRefs(schema, refSet);
    const typeNames: string[] = [];
    for (const r of refSet) {
        const name = refToTypeName(r);
        if (name === "unknown") continue;
        typeNames.push(name);
        if (seen.has(r)) continue;
        seen.add(r);
        const resolved = resolveLocalRef(spec, r);
        if (resolved !== undefined && resolved !== null && typeof resolved === "object") {
            for (const n of collectTypeNamesFromSchemaRecursive(resolved, spec, version, seen)) {
                typeNames.push(n);
            }
        }
    }
    return typeNames;
}

/** Collect schema $ref values from a schema object (recursive, following local $refs), return type names. */
function collectTypeNamesFromSchema(schema: unknown, spec: Record<string, unknown>, version: SpecVersion): string[] {
    const seen = new Set<string>();
    const names = collectTypeNamesFromSchemaRecursive(schema, spec, version, seen);
    return [...new Set(names)];
}

/** OpenAPI 3: get response and request body schema from an operation. */
function getOas3OperationSchemas(op: Record<string, unknown>): unknown[] {
    const out: unknown[] = [];
    const responses = op.responses as Record<string, unknown> | undefined;
    if (responses && typeof responses === "object") {
        for (const resp of Object.values(responses)) {
            const r = resp as Record<string, unknown>;
            const content = r?.content as Record<string, unknown> | undefined;
            const json = content?.["application/json"] as Record<string, unknown> | undefined;
            if (json?.schema) {
                out.push(json.schema);
            }
        }
    }
    const body = op.requestBody as Record<string, unknown> | undefined;
    const content = body?.content as Record<string, unknown> | undefined;
    const json = content?.["application/json"] as Record<string, unknown> | undefined;
    if (json?.schema) {
        out.push(json.schema);
    }
    return out;
}

/** Swagger 2: get response schema and body parameter schema from an operation. */
function getOas2OperationSchemas(op: Record<string, unknown>): unknown[] {
    const out: unknown[] = [];
    const responses = op.responses as Record<string, unknown> | undefined;
    if (responses && typeof responses === "object") {
        for (const resp of Object.values(responses)) {
            const r = resp as Record<string, unknown>;
            if (r?.schema) {
                out.push(r.schema);
            }
        }
    }
    const params = op.parameters as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(params)) {
        for (const p of params) {
            if (p?.in === "body" && p?.schema) {
                out.push(p.schema);
            }
        }
    }
    return out;
}

/**
 * Collect from each path/method: tags and schema refs (as type names).
 * Supports OpenAPI 2 (Swagger) and OpenAPI 3.x paths.
 */
export function collectRefsFromPaths(spec: Record<string, unknown>, version: SpecVersion): OperationRefs[] {
    const paths = spec.paths as Record<string, unknown> | undefined;
    if (!paths || typeof paths !== "object") {
        return [];
    }
    const getSchemas = version === "openapi3" ? getOas3OperationSchemas : getOas2OperationSchemas;
    const result: OperationRefs[] = [];

    for (const [path, pathItem] of Object.entries(paths)) {
        if (pathItem === null || typeof pathItem !== "object") {
            continue;
        }
        const item = pathItem as Record<string, unknown>;
        for (const method of HTTP_METHODS) {
            const op = item[method] as Record<string, unknown> | undefined;
            if (!op || typeof op !== "object") {
                continue;
            }
            const tags = Array.isArray(op.tags) ? (op.tags as string[]) : [];
            const schemas = getSchemas(op);
            const typeNames = new Set<string>();
            for (const schema of schemas) {
                for (const name of collectTypeNamesFromSchema(schema, spec, version)) {
                    typeNames.add(name);
                }
            }
            result.push({
                path,
                method,
                tags,
                refs: [...typeNames],
            });
        }
    }
    return result;
}
