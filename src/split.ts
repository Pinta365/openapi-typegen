import { mkdir, writeFile } from "@cross/fs";
import { buildDefaultHeader, buildDependencyGraph, generateInterface } from "./codegen.ts";
import type { GenerateOptions, ResolvedSchemaMap } from "./types.ts";
import type { OperationRefs } from "./paths.ts";

const DEFAULT_INDENT = { useTabs: false as const, width: 4 };

/** Slugify a tag or path segment for use as a filename (no extension). */
export function slugify(id: string): string {
    return id
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "untagged";
}

/**
 * Get the path segment used for grouping. Uses segment at index 1 if path looks like /v2/... or /api/..., else index 0.
 */
export function getPathSegment(path: string): string {
    const segments = path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
    if (segments.length === 0) return "root";
    const first = segments[0] ?? "";
    if (/^v\d+$/i.test(first) || first === "api") {
        return segments[1] ?? first;
    }
    return first;
}

/**
 * Assign each type name to a file id (slug): by tag (one tag -> that tag's file; else common) or by path segment.
 */
export function assignSchemaToGroup(
    operations: OperationRefs[],
    typeNames: Set<string>,
    split: "tag" | "path",
): Map<string, string> {
    const typeToGroups = new Map<string, Set<string>>();
    for (const op of operations) {
        const group = split === "tag" ? (op.tags.length === 1 ? slugify(op.tags[0]!) : "common") : slugify(getPathSegment(op.path));
        for (const ref of op.refs) {
            if (!typeNames.has(ref)) continue;
            let set = typeToGroups.get(ref);
            if (!set) {
                set = new Set();
                typeToGroups.set(ref, set);
            }
            set.add(group);
        }
    }
    const assignment = new Map<string, string>();
    for (const name of typeNames) {
        const groups = typeToGroups.get(name);
        if (!groups || groups.size === 0) {
            assignment.set(name, "common");
        } else if (groups.size === 1) {
            assignment.set(name, [...groups][0]!);
        } else {
            assignment.set(name, "common");
        }
    }
    return assignment;
}

/** Topological sort so that a type comes after types it references (within the same file). */
export function topoSort(typeNames: string[], deps: Map<string, Set<string>>): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (name: string) => {
        if (visited.has(name)) return;
        if (visiting.has(name)) return;
        visiting.add(name);
        for (const dep of deps.get(name) ?? []) {
            visit(dep);
        }
        visiting.delete(name);
        visited.add(name);
        order.push(name);
    };
    for (const name of typeNames) {
        visit(name);
    }
    return order;
}

/**
 * Reassign to "common" any type that is referenced (as a dependency) by types in another file.
 * Ensures each type is emitted in exactly one file and avoids duplicate exports.
 */
function moveSharedDependenciesToCommon(
    assignment: Map<string, string>,
    depGraph: Map<string, Set<string>>,
): void {
    const reverseDeps = new Map<string, Set<string>>();
    for (const [u, deps] of depGraph) {
        for (const t of deps) {
            let set = reverseDeps.get(t);
            if (!set) {
                set = new Set();
                reverseDeps.set(t, set);
            }
            set.add(u);
        }
    }
    for (const [typeName, fileId] of assignment) {
        if (fileId === "common") continue;
        const referrers = reverseDeps.get(typeName);
        if (!referrers || referrers.size === 0) continue;
        for (const u of referrers) {
            const uFile = assignment.get(u);
            if (uFile && uFile !== fileId) {
                assignment.set(typeName, "common");
                break;
            }
        }
    }
}

/**
 * Emit split files to outputDir and return the index file content.
 * Ensures outputDir exists (mkdir recursive).
 */
export async function emitSplitFiles(
    map: ResolvedSchemaMap,
    assignment: Map<string, string>,
    options: GenerateOptions,
    outputDir: string,
): Promise<string> {
    const indent = options.indent ?? DEFAULT_INDENT;
    const indentStr = indent.useTabs ? "\t" : " ".repeat(indent.width ?? 4);
    const depGraph = buildDependencyGraph(map);
    moveSharedDependenciesToCommon(assignment, depGraph);

    const fileIdToTypes = new Map<string, string[]>();
    for (const [typeName, fileId] of assignment) {
        let list = fileIdToTypes.get(fileId);
        if (!list) {
            list = [];
            fileIdToTypes.set(fileId, list);
        }
        list.push(typeName);
    }
    for (const list of fileIdToTypes.values()) {
        list.sort();
    }

    await mkdir(outputDir, { recursive: true });

    const includeHeader = options.includeHeader !== false;
    const header = options.headerComment ?? buildDefaultHeader(options);
    const exportLines: { fileId: string; typeNames: string[] }[] = [];

    for (const [fileId, typeNames] of fileIdToTypes) {
        const sorted = topoSort(typeNames, depGraph);
        const emittedInThisFile = new Set(sorted);
        const externalRefs = new Map<string, Set<string>>();
        for (const name of sorted) {
            const refs = depGraph.get(name) ?? new Set();
            for (const ref of refs) {
                if (emittedInThisFile.has(ref)) continue;
                const refFile = assignment.get(ref);
                if (refFile !== undefined && refFile !== fileId) {
                    let set = externalRefs.get(refFile);
                    if (!set) {
                        set = new Set();
                        externalRefs.set(refFile, set);
                    }
                    set.add(ref);
                }
            }
        }
        for (const name of emittedInThisFile) {
            for (const set of externalRefs.values()) {
                set.delete(name);
            }
        }
        const importBlocks: string[] = [];
        for (const [fromFile, refSet] of externalRefs) {
            const refs = [...refSet].sort();
            if (refs.length > 0) {
                importBlocks.push(`import type { ${refs.join(", ")} } from "./${fromFile}.ts";`);
            }
        }
        const lines: string[] = [];
        if (includeHeader) {
            lines.push(header);
            lines.push("");
        }
        if (importBlocks.length > 0) {
            lines.push(importBlocks.join("\n"));
            lines.push("");
        }
        for (const name of sorted) {
            const schema = map.get(name)!;
            lines.push(generateInterface(name, schema, map, options, indentStr));
            lines.push("");
        }
        const content = lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
        const filename = fileId === "common" ? "common.ts" : `${fileId}.ts`;
        await writeFile(`${outputDir}/${filename}`, content + "\n", "utf-8");
        exportLines.push({ fileId, typeNames: sorted });
    }

    // Each $ref is one logical type and should be emitted in one file; assignment + moveSharedDependenciesToCommon
    // aim for that. If a type still appears in more than one file, we export each name only once from the index
    // and warn so the caller knows there is an assignment issue to fix.
    const exportedFrom = new Map<string, string>();
    const duplicates: { typeName: string; firstFile: string; alsoIn: string }[] = [];
    const indexExportLines: string[] = [];
    const fileOrder = [...fileIdToTypes.keys()].sort((a, b) => (a === "common" ? -1 : b === "common" ? 1 : a.localeCompare(b)));
    for (const fileId of fileOrder) {
        const line = exportLines.find((x) => x.fileId === fileId);
        if (!line) continue;
        const toExport: string[] = [];
        for (const n of line.typeNames) {
            const first = exportedFrom.get(n);
            if (first === undefined) {
                exportedFrom.set(n, fileId);
                toExport.push(n);
            } else {
                duplicates.push({ typeName: n, firstFile: first, alsoIn: fileId });
            }
        }
        if (toExport.length > 0) {
            indexExportLines.push(`export type { ${toExport.join(", ")} } from "./${fileId}.ts";`);
        }
    }
    if (duplicates.length > 0) {
        const summary =
            `[openapi-typegen] ${duplicates.length} type(s) are emitted in more than one file; index re-exports each once. Fix assignment so each type lives in a single file.`;
        const verbose = options.logLevel === "verbose";
        if (verbose) {
            const detail = duplicates
                .map((d) => `  ${d.typeName} (in ${d.firstFile}.ts and ${d.alsoIn}.ts)`)
                .join("\n");
            console.warn(`${summary}\n${detail}`);
        } else {
            console.warn(summary);
        }
    }

    const indexContent = [
        includeHeader ? header + "\n" : "",
        indexExportLines.join("\n"),
        "",
    ].join("\n").trimEnd() + "\n";
    await writeFile(`${outputDir}/index.ts`, indexContent, "utf-8");
    return indexContent;
}
