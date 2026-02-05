import { test } from "@cross/test";
import { assert } from "@std/assert";
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
