import type { GenerateOptions, ResolvedSchemaMap, SchemaObject } from "./types.ts";
import { toCamelCase, toPascalCase } from "./naming.ts";

const DEFAULT_INDENT: { useTabs: false; width: number } = { useTabs: false, width: 4 };

/** Map a $ref value (e.g. #/components/schemas/Foo or URL#/path) to a PascalCase type name. */
function refToTypeName(ref: string): string {
    if (ref.startsWith("http://") || ref.startsWith("https://")) {
        const match = ref.match(/#\/(.+)$/);
        return match ? toPascalCase(match[1].replace(/^.*\//, "")) : "unknown";
    }
    if (ref.startsWith("#/definitions/")) {
        return toPascalCase(ref.slice("#/definitions/".length));
    }
    if (ref.startsWith("#/components/schemas/")) {
        return toPascalCase(ref.slice("#/components/schemas/".length));
    }
    if (ref.startsWith("#/")) {
        const parts = ref.slice(2).split("/");
        return toPascalCase(parts[parts.length - 1] ?? "Unknown");
    }
    return "unknown";
}

const DEFAULT_PROP_NAMING = "camel" as const;

/** Convert a schema node to a TypeScript type string (e.g. "string", "Foo[]", "A | B"). */
function schemaToTS(
    schema: SchemaObject,
    _map: ResolvedSchemaMap,
    opts: Pick<GenerateOptions, "propertyNaming"> = {},
): string {
    const propNaming = opts.propertyNaming ?? DEFAULT_PROP_NAMING;
    if (schema.$ref) {
        return refToTypeName(schema.$ref);
    }
    if (schema.allOf && schema.allOf.length > 0) {
        return schema.allOf.map((s) => schemaToTS(s, _map, { propertyNaming: propNaming })).join(" & ");
    }
    if (schema.oneOf && schema.oneOf.length > 0) {
        return schema.oneOf.map((s) => schemaToTS(s, _map, { propertyNaming: propNaming })).join(" | ");
    }
    if (schema.anyOf && schema.anyOf.length > 0) {
        return schema.anyOf.map((s) => schemaToTS(s, _map, { propertyNaming: propNaming })).join(" | ");
    }
    if (schema.enum) {
        return schema.enum
            .map((v) => (typeof v === "string" ? `"${v.replace(/"/g, '\\"')}"` : String(v)))
            .join(" | ");
    }
    if (schema.type === "array" && schema.items) {
        return `${schemaToTS(schema.items, _map, { propertyNaming: propNaming })}[]`;
    }
    if (schema.type === "object" || schema.properties) {
        return "object";
    }
    switch (schema.type) {
        case "string":
            return "string";
        case "integer":
        case "number":
            return "number";
        case "boolean":
            return "boolean";
        case "file":
            return "File | Blob";
        case "null":
            return "null";
        default:
            return "unknown";
    }
}

/** Apply property naming option: camelCase or preserve original key. */
function propName(key: string, propertyNaming: "camel" | "preserve"): string {
    return propertyNaming === "camel" ? toCamelCase(key) : key;
}

/** Format a description string as a JSDoc block (single or multi-line), with optional indent. */
function formatJSDocComment(text: string, indent: string): string {
    const safe = String(text).replace(/\*\//g, "* /");
    const parts = safe.split(/\r?\n/);
    if (parts.length <= 1) {
        return indent + "/** " + safe + " */";
    }
    const lines = [indent + "/**", ...parts.map((line) => indent + " * " + line), indent + " */"];
    return lines.join("\n");
}

/** Emit TypeScript property lines for an object schema (with optional JSDoc from description/title). */
function generateProperties(
    properties: Record<string, SchemaObject>,
    required: string[],
    map: ResolvedSchemaMap,
    propertyNaming: "camel" | "preserve",
    indent: string,
    indentUnit: string,
): string[] {
    const lines: string[] = [];
    for (const [key, prop] of Object.entries(properties)) {
        const name = propName(key, propertyNaming);
        const isRequired = required.includes(key);
        const optional = isRequired ? "" : "?";
        let commentText = (prop.description ?? prop.title) as string | undefined;
        if (!commentText && prop.$ref) {
            const refTypeName = refToTypeName(prop.$ref);
            const referenced = map.get(refTypeName);
            commentText = (referenced?.description ?? referenced?.title ?? refTypeName) as string | undefined;
        }
        const desc = commentText ? formatJSDocComment(commentText, indent) : "";
        const type = schemaToTS(prop, map, { propertyNaming });
        if (type === "object" && prop.properties) {
            const inner = generateProperties(
                prop.properties,
                prop.required ?? [],
                map,
                propertyNaming,
                indent + indentUnit,
                indentUnit,
            );
            if (desc) lines.push(desc);
            lines.push(`${indent}${name}${optional}: {`);
            lines.push(...inner);
            lines.push(`${indent}};`);
        } else {
            if (desc) lines.push(desc);
            lines.push(`${indent}${name}${optional}: ${type};`);
        }
    }
    return lines;
}

/** Emit a single type/interface declaration (interface, type alias, or extends). */
function generateInterface(
    name: string,
    schema: SchemaObject,
    map: ResolvedSchemaMap,
    opts: GenerateOptions,
    indentStr: string,
): string {
    const lines: string[] = [];
    const schemaCommentText = (schema.description ?? schema.title ?? name) as string | undefined;
    const desc = schemaCommentText ? formatJSDocComment(schemaCommentText, "") : "";
    const propNaming = opts.propertyNaming ?? DEFAULT_PROP_NAMING;

    if (schema.type === "array" && schema.items) {
        const itemType = schemaToTS(schema.items, map, { propertyNaming: propNaming });
        if (desc) lines.push(desc);
        lines.push(`export type ${name} = ${itemType}[];`);
        return lines.join("\n");
    }

    if (schema.allOf && schema.allOf.length > 0) {
        const baseTypes = schema.allOf
            .filter((s) => s.$ref)
            .map((s) => (s.$ref ? refToTypeName(s.$ref) : ""))
            .filter(Boolean);
        const extraProps = schema.allOf.find((s) => s.properties)?.properties ?? schema.properties ?? {};
        const required = schema.allOf.find((s) => s.required)?.required ?? schema.required ?? [];
        if (desc) lines.push(desc);
        lines.push(
            `export interface ${name}${baseTypes.length > 0 ? ` extends ${baseTypes.join(", ")}` : ""} {`,
        );
        lines.push(...generateProperties(extraProps, required, map, propNaming, indentStr, indentStr));
        lines.push("}");
        return lines.join("\n");
    }

    if (schema.enum) {
        const union = schemaToTS(schema, map, { propertyNaming: propNaming });
        if (desc) lines.push(desc);
        lines.push(`export type ${name} = ${union};`);
        return lines.join("\n");
    }

    const properties = schema.properties ?? {};
    const required = schema.required ?? [];
    if (Object.keys(properties).length === 0 && !schema.allOf) {
        if (desc) lines.push(desc);
        lines.push(`export type ${name} = Record<string, unknown>;`);
        return lines.join("\n");
    }

    if (desc) lines.push(desc);
    lines.push(`export interface ${name} {`);
    lines.push(...generateProperties(properties, required, map, propNaming, indentStr, indentStr));
    lines.push("}");
    return lines.join("\n");
}

/** Build the default file header comment (tool, timestamp, optional sourceLabel, do-not-edit). */
function buildDefaultHeader(options: GenerateOptions): string {
    const lines = [
        " * Auto-generated TypeScript types with @pinta365/openapi-typegen",
        " * Generated at: " + new Date().toISOString(),
    ];
    if (options.sourceLabel !== undefined && options.sourceLabel !== "") {
        lines.push(" * Source file: " + options.sourceLabel);
    }
    lines.push(" * DO NOT EDIT THIS FILE MANUALLY");
    return "/**\n" + lines.join("\n") + "\n */";
}

/**
 * Generate TypeScript source from a resolved schema map.
 * Emits interfaces and type aliases with optional header; does not load or resolve.
 * @param map - Resolved schema map (type name → SchemaObject), e.g. from {@link resolve}
 * @param options - Indent, propertyNaming, includeHeader, headerComment, sourceLabel
 * @returns Generated TypeScript source string
 */
export function generate(map: ResolvedSchemaMap, options: GenerateOptions = {}): string {
    const indent = options.indent ?? DEFAULT_INDENT;
    const indentStr = indent.useTabs ? "\t" : " ".repeat(indent.width ?? 4);
    const out: string[] = [];

    const includeHeader = options.includeHeader !== false;
    if (includeHeader) {
        const header = options.headerComment ?? buildDefaultHeader(options);
        out.push(header);
        out.push("");
    }

    for (const [typeName, schema] of map) {
        out.push(generateInterface(typeName, schema, map, options, indentStr));
        out.push("");
    }

    return out.join("\n");
}
