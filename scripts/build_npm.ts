// scripts/build_npm.ts
// deno-lint-ignore no-import-prefix
import { build, emptyDir } from "jsr:@deno/dnt@0.42.3";

import pkg from "../deno.json" with { type: "json" };

const outputDir = "./npm";

await emptyDir(outputDir);

await build({
    importMap: "deno.json",
    entryPoints: ["./mod.ts"],
    outDir: outputDir,
    shims: {
        deno: false,
    },
    package: {
        name: pkg.name,
        version: pkg.version,
        description: "Generate TypeScript types from OpenAPI 2 (Swagger) and OpenAPI 3.x specs",
        license: "MIT",
        repository: {
            type: "git",
            url: "git+https://github.com/Pinta365/openapi-typegen.git",
        },
        bugs: {
            url: "https://github.com/Pinta365/openapi-typegen/issues",
        },
        homepage: "https://github.com/Pinta365/openapi-typegen",
        keywords: [
            "openapi",
            "swagger",
            "typegen",
            "types",
            "cross-runtime",
            "deno",
            "node",
            "bun",
            "typescript",
        ],
        engines: {
            node: ">=18.0.0",
        },
    },
    async postBuild() {
        Deno.copyFileSync("LICENSE", "npm/LICENSE");
        Deno.copyFileSync("README.md", "npm/README.md");
        const npmIgnore = "npm/.npmignore";
        const npmIgnoreContent = [
            "*.map",
            "local_test/",
            "scripts/",
            "references/",
            ".github/",
            "AGENTS.md",
        ].join("\n");
        try {
            const content = await Deno.readTextFile(npmIgnore);
            await Deno.writeTextFile(npmIgnore, content + "\n" + npmIgnoreContent);
        } catch {
            await Deno.writeTextFile(npmIgnore, npmIgnoreContent);
        }
    },
    typeCheck: false,
    test: false,
    compilerOptions: {
        lib: ["ESNext", "DOM", "DOM.Iterable"],
        sourceMap: false,
        inlineSources: false,
        skipLibCheck: true,
    },
});
