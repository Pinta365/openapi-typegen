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

test("generateTypes from OpenAPI 3 reference spec (internal refs only)", async (_context, done) => {
    try {
        const specPath = "references/openapi-1.28.json";
        const out = await generateTypes(specPath);
        assert(out.length > 0);
        assert(out.includes("export interface") || out.includes("export type"));
        done();
    } catch (e) {
        done(e);
    }
});

test("generateTypes from Swagger 2 reference spec with mock resolver", async (_context, done) => {
    try {
        const specPath = "references/swagger.json";
        const resolver = (url: string) =>
            url.startsWith("https://developers.strava.com/swagger/") ? Promise.resolve({}) : Promise.reject(new Error(`Unexpected: ${url}`));
        const out = await generateTypes(specPath, { resolver });
        assert(out.length > 0);
        done();
    } catch (e) {
        done(e);
    }
});
