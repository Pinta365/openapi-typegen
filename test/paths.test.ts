import { test } from "@cross/test";
import { assert } from "@std/assert";
import { collectRefsFromPaths } from "../src/paths.ts";

test("collectRefsFromPaths OpenAPI 3 returns operation with tag and ref", (_context, done) => {
    try {
        const spec = {
            openapi: "3.0.0",
            paths: {
                "/pets": {
                    get: {
                        tags: ["Pets"],
                        responses: {
                            200: {
                                content: {
                                    "application/json": {
                                        schema: { $ref: "#/components/schemas/Pet" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            components: { schemas: {} },
        };
        const ops = collectRefsFromPaths(spec as Record<string, unknown>, "openapi3");
        assert(ops.length >= 1);
        const getOp = ops.find((o) => o.path === "/pets" && o.method === "get");
        assert(getOp !== undefined);
        assert(getOp.tags.includes("Pets"));
        assert(getOp.refs.includes("Pet"));
        done();
    } catch (e) {
        done(e);
    }
});

test("collectRefsFromPaths Swagger 2 returns operation with tag and ref", (_context, done) => {
    try {
        const spec = {
            swagger: "2.0",
            paths: {
                "/athlete": {
                    get: {
                        tags: ["Athletes"],
                        responses: {
                            200: {
                                schema: { $ref: "https://example.com/athlete.json#/DetailedAthlete" },
                            },
                        },
                    },
                },
            },
        };
        const ops = collectRefsFromPaths(spec as Record<string, unknown>, "openapi2");
        assert(ops.length >= 1);
        const getOp = ops.find((o) => o.path === "/athlete" && o.method === "get");
        assert(getOp !== undefined);
        assert(getOp.tags.includes("Athletes"));
        assert(getOp.refs.includes("DetailedAthlete"));
        done();
    } catch (e) {
        done(e);
    }
});

test("collectRefsFromPaths empty paths returns empty array", (_context, done) => {
    try {
        const spec = { openapi: "3.0.0", paths: {} };
        const ops = collectRefsFromPaths(spec as Record<string, unknown>, "openapi3");
        assert(ops.length === 0);
        done();
    } catch (e) {
        done(e);
    }
});
