import { test } from "@cross/test";
import { assert } from "@std/assert";
import { load } from "../src/load.ts";
import { resolve } from "../src/resolve.ts";

test("resolve internal refs only (OpenAPI 3)", async (_context, done) => {
    try {
        const spec = {
            openapi: "3.0.0",
            components: {
                schemas: {
                    Person: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            friend: { $ref: "#/components/schemas/Person" },
                        },
                    },
                },
            },
            paths: {},
        };
        const loadResult = await load(spec);
        const resolver = (_url: string) => Promise.resolve({});
        const map = await resolve(loadResult, resolver);
        assert(map.has("Person"));
        assert(map.get("Person")?.properties?.friend?.$ref === "#/components/schemas/Person");
        done();
    } catch (e) {
        done(e);
    }
});

test("resolve with mock external resolver", async (_context, done) => {
    try {
        const spec = {
            swagger: "2.0",
            definitions: {},
            paths: {
                "/x": {
                    get: {
                        responses: {
                            200: {
                                schema: { $ref: "https://example.com/schemas.json#/Thing" },
                            },
                        },
                    },
                },
            },
        };
        const loadResult = await load(spec);
        const resolver = (url: string) =>
            url === "https://example.com/schemas.json"
                ? Promise.resolve({ Thing: { type: "object", properties: { id: { type: "number" } } } })
                : Promise.reject(new Error(`Unexpected URL: ${url}`));
        const map = await resolve(loadResult, resolver);
        assert(map.has("Thing"));
        assert(map.get("Thing")?.type === "object");
        done();
    } catch (e) {
        done(e);
    }
});

test("resolve external doc with definitions wrapper (Swagger 2 fragment style)", async (_context, done) => {
    try {
        const spec = {
            swagger: "2.0",
            definitions: {},
            paths: {
                "/stats": {
                    get: {
                        responses: {
                            200: {
                                schema: { $ref: "https://example.com/activity_stats.json#/ActivityStats" },
                            },
                        },
                    },
                },
            },
        };
        const loadResult = await load(spec);
        const resolver = (url: string) =>
            url === "https://example.com/activity_stats.json"
                ? Promise.resolve({
                    definitions: {
                        ActivityStats: {
                            type: "object",
                            properties: {
                                recentRideTotals: { $ref: "#/definitions/ActivityTotal" },
                            },
                        },
                        ActivityTotal: { type: "object", properties: { count: { type: "number" } } },
                    },
                })
                : Promise.reject(new Error(`Unexpected URL: ${url}`));
        const map = await resolve(loadResult, resolver);
        assert(map.has("ActivityStats"));
        assert(map.has("ActivityTotal"));
        assert(map.get("ActivityTotal")?.properties?.count?.type === "number");
        done();
    } catch (e) {
        done(e);
    }
});
