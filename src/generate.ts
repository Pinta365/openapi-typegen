import { writeFile } from "@cross/fs";
import { generate } from "./codegen.ts";
import { load } from "./load.ts";
import { resolve } from "./resolve.ts";
import { defaultResolver } from "./resolver.ts";
import type { GenerateOptions, SpecInput } from "./types.ts";

export async function generateTypes(spec: SpecInput, options: GenerateOptions = {}): Promise<string> {
    const loadResult = await load(spec);
    const resolver = options.resolver ?? defaultResolver;
    const resolvedMap = await resolve(loadResult, resolver);
    const opts = { ...options };
    if (opts.sourceLabel === undefined && (typeof spec === "string" || spec instanceof URL)) {
        opts.sourceLabel = String(spec);
    }
    const source = generate(resolvedMap, opts);

    if (opts.outputPath) {
        await writeFile(opts.outputPath, source, "utf-8");
    }

    return source;
}
