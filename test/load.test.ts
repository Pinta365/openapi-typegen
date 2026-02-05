import { test } from "@cross/test";
import { assert } from "@std/assert";
import { detectVersion, extractSchemas, load } from "../src/load.ts";

test("detectVersion detects OpenAPI 2", (_context, done) => {
    try {
        const version = detectVersion({ swagger: "2.0", paths: {} });
        assert(version === "openapi2");
        done();
    } catch (e) {
        done(e);
    }
});

test("detectVersion detects OpenAPI 3", (_context, done) => {
    try {
        const version = detectVersion({ openapi: "3.0.0", paths: {} });
        assert(version === "openapi3");
        const v31 = detectVersion({ openapi: "3.1.0", paths: {} });
        assert(v31 === "openapi3");
        done();
    } catch (e) {
        done(e);
    }
});

test("detectVersion throws on invalid spec", (_context, done) => {
    try {
        try {
            detectVersion({});
            assert(false, "should throw");
        } catch (err) {
            assert(err instanceof Error);
            assert(err.message.includes("swagger") || err.message.includes("openapi"));
        }
        done();
    } catch (e) {
        done(e);
    }
});

test("extractSchemas OpenAPI 2 has definitions in registry", (_context, done) => {
    try {
        const spec = {
            swagger: "2.0",
            definitions: {
                Foo: { type: "object", properties: { id: { type: "string" } } },
            },
            paths: {},
        };
        const result = extractSchemas(spec, "openapi2");
        assert(result.version === "openapi2");
        assert(result.registry.has("Foo"));
        assert(result.registry.get("Foo")?.type === "object");
        done();
    } catch (e) {
        done(e);
    }
});

test("extractSchemas OpenAPI 3 has components.schemas in registry", (_context, done) => {
    try {
        const spec = {
            openapi: "3.0.0",
            components: {
                schemas: {
                    Bar: { type: "object", properties: { name: { type: "string" } } },
                },
            },
            paths: {},
        };
        const result = extractSchemas(spec, "openapi3");
        assert(result.version === "openapi3");
        assert(result.registry.has("Bar"));
        assert(result.registry.get("Bar")?.type === "object");
        done();
    } catch (e) {
        done(e);
    }
});

test("load from object", async (_context, done) => {
    try {
        const spec = { swagger: "2.0", definitions: { X: { type: "string" } }, paths: {} };
        const result = await load(spec);
        assert(result.version === "openapi2");
        assert(result.registry.has("X"));
        assert(result.refs.size >= 0);
        done();
    } catch (e) {
        done(e);
    }
});
