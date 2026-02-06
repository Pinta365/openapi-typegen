import { mkdir, writeFile } from "@cross/fs";
import { generate } from "./codegen.ts";
import { load } from "./load.ts";
import { collectRefsFromPaths } from "./paths.ts";
import { resolve } from "./resolve.ts";
import { defaultResolver } from "./resolver.ts";
import { assignSchemaToGroup, emitSplitFiles } from "./split.ts";
import type { GenerateOptions, SpecInput } from "./types.ts";

/**
 * Load spec, resolve refs, generate TypeScript source, and optionally write to a file or directory.
 * Uses {@link defaultResolver} for external refs when no custom resolver is provided.
 * @param spec - URL string, file path, URL instance, or parsed spec object
 * @param options - Generation options (resolver, output, split, propertyNaming, indent, header, etc.)
 * @returns Generated TypeScript source string (single file content, or index content when split; written to options.output if set)
 */
export async function generateTypes(spec: SpecInput, options: GenerateOptions = {}): Promise<string> {
    const loadResult = await load(spec);
    const resolver = options.resolver ?? defaultResolver;
    const resolvedMap = await resolve(loadResult, resolver);
    const opts = { ...options };
    if (opts.sourceLabel === undefined && (typeof spec === "string" || spec instanceof URL)) {
        opts.sourceLabel = String(spec);
    }
    if (opts.split && !opts.output) {
        throw new Error("output is required when split is set");
    }

    const operations = collectRefsFromPaths(loadResult.spec as Record<string, unknown>, loadResult.version);
    if (opts.includeEndpointHints !== false && !opts.endpointHints) {
        const endpointHints = new Map<string, { method: string; path: string }[]>();
        for (const op of operations) {
            const endpoint = { method: op.method.toUpperCase(), path: op.path };
            for (const ref of op.refs) {
                if (resolvedMap.has(ref)) {
                    const list = endpointHints.get(ref) ?? [];
                    list.push(endpoint);
                    endpointHints.set(ref, list);
                }
            }
        }
        opts.endpointHints = endpointHints;
    }

    if (opts.split && opts.output) {
        const typeNames = new Set(resolvedMap.keys());
        const assignment = assignSchemaToGroup(operations, typeNames, opts.split);
        return await emitSplitFiles(resolvedMap, assignment, opts, opts.output);
    }

    const source = generate(resolvedMap, opts);
    if (opts.output) {
        const parent = opts.output.replace(/[/\\][^/\\]*$/, "");
        if (parent && parent !== opts.output) {
            await mkdir(parent, { recursive: true });
        }
        await writeFile(opts.output, source, "utf-8");
    }
    return source;
}
