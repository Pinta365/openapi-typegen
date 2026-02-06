import { exists, mktempdir, rm } from "@cross/fs";
import { test } from "@cross/test";
import { assert, assertRejects } from "@std/assert";
import { generateTypes } from "../mod.ts";

test("generateTypes from object (OpenAPI 3 minimal)", async (_context, done) => {
    try {
        const spec = {
            openapi: "3.0.0",
            components: {
                schemas: {
                    Hello: { type: "object", properties: { message: { type: "string" } } },
                },
            },
            paths: {},
        };
        const out = await generateTypes(spec);
        assert(out.includes("export interface Hello"));
        assert(out.includes("message"));
        assert(out.includes("string"));
        done();
    } catch (e) {
        done(e);
    }
});

test("generateTypes from checked-in OpenAPI 2 minimal (test/assets/openapi2-minimal.json)", async (_context, done) => {
    try {
        const out = await generateTypes("test/assets/openapi2-minimal.json");
        assert(out.includes("export interface Pet"));
        assert(out.includes("id: number"));
        assert(out.includes("name"));
        done();
    } catch (e) {
        done(e);
    }
});

test("generateTypes from checked-in OpenAPI 3 minimal (test/assets/openapi3-minimal.json)", async (_context, done) => {
    try {
        const out = await generateTypes("test/assets/openapi3-minimal.json");
        assert(out.includes("export interface Pet"));
        assert(out.includes("id: number"));
        assert(out.includes("name"));
        done();
    } catch (e) {
        done(e);
    }
});

test("generateTypes from checked-in YAML (test/assets/minimal-openapi.yaml)", async (_context, done) => {
    try {
        const out = await generateTypes("test/assets/minimal-openapi.yaml");
        assert(out.includes("export interface Item"));
        assert(out.includes("string"));
        assert(out.includes("name"));
        done();
    } catch (e) {
        done(e);
    }
});

test("generateTypes with split and no output throws", async (_context, done) => {
    try {
        const spec = {
            openapi: "3.0.0",
            paths: {},
            components: { schemas: { X: { type: "object", properties: {} } } },
        };
        await assertRejects(
            () => generateTypes(spec, { split: "tag" }),
            Error,
            "output is required when split is set",
        );
        done();
    } catch (e) {
        done(e);
    }
});

test("generateTypes with split and output writes multiple files and returns index content", async (_context, done) => {
    const dir = await mktempdir("openapi-typegen-split-test");
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
            components: {
                schemas: {
                    Pet: {
                        type: "object",
                        properties: { id: { type: "integer" }, name: { type: "string" } },
                        required: ["id"],
                    },
                },
            },
        };
        const out = await generateTypes(spec, { split: "tag", output: dir });
        assert(out.includes("./pets"));
        assert(out.includes("export") && out.includes("from "));
        const indexExists = await exists(`${dir}/index.ts`);
        const petsExists = await exists(`${dir}/pets.ts`);
        assert(indexExists);
        assert(petsExists);
        done();
    } catch (e) {
        done(e);
    } finally {
        await rm(dir, { recursive: true });
    }
});

test("generateTypes with includeEndpointHints adds Used by JSDoc", async (_context, done) => {
    try {
        const spec = {
            openapi: "3.0.0",
            paths: {
                "/pets": {
                    get: {
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
            components: {
                schemas: {
                    Pet: {
                        type: "object",
                        properties: { id: { type: "integer" }, name: { type: "string" } },
                        required: ["id"],
                    },
                },
            },
        };
        const out = await generateTypes(spec, { includeEndpointHints: true });
        assert(out.includes("Used by:"));
        assert(out.includes("GET"));
        assert(out.includes("/pets"));
        assert(out.includes("export interface Pet"));
        done();
    } catch (e) {
        done(e);
    }
});
