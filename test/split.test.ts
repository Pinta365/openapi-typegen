import { test } from "@cross/test";
import { assert } from "@std/assert";
import { assignSchemaToGroup, getPathSegment, slugify, topoSort } from "../src/split.ts";
import type { OperationRefs } from "../src/paths.ts";

test("slugify normalizes tag to lowercase hyphenated", (_context, done) => {
    try {
        assert(slugify("Daily Activity Routes") === "daily-activity-routes");
        assert(slugify("Pets") === "pets");
        assert(slugify("SegmentEfforts") === "segmentefforts");
        done();
    } catch (e) {
        done(e);
    }
});

test("getPathSegment uses first segment when no version prefix", (_context, done) => {
    try {
        assert(getPathSegment("/athlete") === "athlete");
        assert(getPathSegment("/activities") === "activities");
        done();
    } catch (e) {
        done(e);
    }
});

test("getPathSegment uses second segment when path has version prefix", (_context, done) => {
    try {
        assert(getPathSegment("/v2/usercollection/sleep") === "usercollection");
        assert(getPathSegment("/api/v3/foo") === "v3");
        done();
    } catch (e) {
        done(e);
    }
});

test("assignSchemaToGroup by tag assigns single-tag ref to that tag file", (_context, done) => {
    try {
        const ops: OperationRefs[] = [
            { path: "/pets", method: "get", tags: ["Pets"], refs: ["Pet"] },
        ];
        const typeNames = new Set(["Pet"]);
        const assignment = assignSchemaToGroup(ops, typeNames, "tag");
        assert(assignment.get("Pet") === "pets");
        done();
    } catch (e) {
        done(e);
    }
});

test("assignSchemaToGroup by tag assigns ref used by multiple tags to common", (_context, done) => {
    try {
        const ops: OperationRefs[] = [
            { path: "/a", method: "get", tags: ["A"], refs: ["Shared"] },
            { path: "/b", method: "get", tags: ["B"], refs: ["Shared"] },
        ];
        const typeNames = new Set(["Shared"]);
        const assignment = assignSchemaToGroup(ops, typeNames, "tag");
        assert(assignment.get("Shared") === "common");
        done();
    } catch (e) {
        done(e);
    }
});

test("assignSchemaToGroup assigns type never referenced to common", (_context, done) => {
    try {
        const ops: OperationRefs[] = [
            { path: "/pets", method: "get", tags: ["Pets"], refs: ["Pet"] },
        ];
        const typeNames = new Set(["Pet", "Other"]);
        const assignment = assignSchemaToGroup(ops, typeNames, "tag");
        assert(assignment.get("Pet") === "pets");
        assert(assignment.get("Other") === "common");
        done();
    } catch (e) {
        done(e);
    }
});

test("topoSort orders types so dependencies come first", (_context, done) => {
    try {
        const deps = new Map<string, Set<string>>();
        deps.set("A", new Set(["B"]));
        deps.set("B", new Set());
        deps.set("C", new Set(["A"]));
        const sorted = topoSort(["C", "A", "B"], deps);
        const bIdx = sorted.indexOf("B");
        const aIdx = sorted.indexOf("A");
        const cIdx = sorted.indexOf("C");
        assert(bIdx >= 0 && aIdx >= 0 && cIdx >= 0);
        assert(bIdx < aIdx);
        assert(aIdx < cIdx);
        done();
    } catch (e) {
        done(e);
    }
});
