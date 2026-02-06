/** @pinta365/openapi-typegen – generate TypeScript types from OpenAPI/Swagger specs. */

export { generate } from "./src/codegen.ts";
export { generateTypes } from "./src/generate.ts";
export { load } from "./src/load.ts";
export { resolve } from "./src/resolve.ts";
export { defaultResolver } from "./src/resolver.ts";
export type {
    EndpointHint,
    GenerateOptions,
    LoadResult,
    ResolvedSchemaMap,
    Resolver,
    SchemaObject,
    SpecInput,
    SpecObject,
    SpecVersion,
} from "./src/types.ts";
