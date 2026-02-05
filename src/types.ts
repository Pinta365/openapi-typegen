/** JSON Schema / OpenAPI schema object (type, properties, $ref, enum, etc.). */
export interface SchemaObject {
    type?: string;
    format?: string;
    $ref?: string;
    items?: SchemaObject;
    properties?: Record<string, SchemaObject>;
    required?: string[];
    enum?: (string | number)[];
    description?: string;
    title?: string;
    allOf?: SchemaObject[];
    oneOf?: SchemaObject[];
    anyOf?: SchemaObject[];
    nullable?: boolean;
    [key: string]: unknown;
}

/** OpenAPI 2.0 (Swagger) root spec – has definitions. */
export interface OpenAPI2Spec {
    swagger: string;
    definitions?: Record<string, SchemaObject>;
    paths?: Record<string, unknown>;
    [key: string]: unknown;
}

/** OpenAPI 3.x root spec – has components.schemas. */
export interface OpenAPI3Spec {
    openapi: string;
    components?: {
        schemas?: Record<string, SchemaObject>;
        [key: string]: unknown;
    };
    paths?: Record<string, unknown>;
    [key: string]: unknown;
}

export type SpecObject = OpenAPI2Spec | OpenAPI3Spec;

/** Input to generateTypes: URL string, file path, or parsed spec object. */
export type SpecInput = string | URL | SpecObject;

/** Detected spec version. */
export type SpecVersion = "openapi2" | "openapi3";

/** Result of loading and extracting schemas */
export interface LoadResult {
    version: SpecVersion;
    spec: SpecObject;
    /** Schema name -> schema object (from definitions or components.schemas). */
    registry: Map<string, SchemaObject>;
    /** All $ref values found in the spec (internal and external). */
    refs: Set<string>;
}

/** Resolver for external $ref URLs: fetch document by URL, return parsed JSON. */
export type Resolver = (url: string) => Promise<unknown>;

/** Options for generateTypes. */
export interface GenerateOptions {
    /** Resolver for external $ref URLs. Default: fetch. */
    resolver?: Resolver;
    /** If set, write generated TypeScript to this path (using @cross/fs). */
    outputPath?: string;
    /** Property naming in generated types. Default: "camel". */
    propertyNaming?: "camel" | "preserve";
    /**
     * Indentation for generated output.
     * - useTabs: true → one tab character per indent level (no width).
     * - useTabs: false → width spaces per indent level (default 4).
     */
    indent?: { useTabs: true } | { useTabs: false; width?: number };
    /**
     * Whether to emit a file header comment. Default: true.
     * When true, headerComment is used if set; otherwise a default block is emitted (tool, generated-at, optional source, do not edit).
     */
    includeHeader?: boolean;
    /**
     * Custom header comment (e.g. source URL, generator name, "do not edit").
     * Used only when includeHeader is true. Multi-line strings are emitted as-is; no leading comment markers added.
     */
    headerComment?: string;
    /**
     * Source label for the default header (e.g. URL or file path). Shown as "Source file: {sourceLabel}".
     * When generateTypes(spec, options) is called with a string or URL spec, this is set automatically if not provided.
     */
    sourceLabel?: string;
}

/** Resolved schema map: type name (PascalCase) -> schema. Used by codegen. */
export type ResolvedSchemaMap = Map<string, SchemaObject>;
