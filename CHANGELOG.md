# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.3] - 2026-02-06

### Added

- **File splitting**: Option `split: "tag" | "path"` splits generated types into multiple files. Use `split: "tag"` to group by operation tag, or
  `split: "path"` to group by first path segment. Requires `output` (directory path). Generates `common.ts` for shared types, one file per tag/path
  segment, and `index.ts` that re-exports all.
- **Unified output option**: Option `output` specifies where to write: a file path (single-file mode) or a directory path (when `split` is set).
  Replaces the previous `outputPath` option.
- **Log level**: Option `logLevel: "basic" | "verbose"` (default `"basic"`) controls warning detail. When types are emitted in more than one file,
  basic logs a single-line summary; verbose logs the full list of duplicate types with no truncation.
- **Endpoint hints**: Option `includeEndpointHints` (default `true`) adds JSDoc “Used by: METHOD /path” on types that are referenced by path operations (e.g.
  “Used by: GET /pets”). Exported type `EndpointHint` and optional `endpointHints` map for programmatic use.

- **Format in JSDoc**: When a schema (or property) has a `format` field (e.g. `date-time`, `email`, `uuid`), generated JSDoc now includes
  "Format: &lt;format&gt;" automatically for types and properties.

## [0.0.2] - 2026-02-05

### Added

- **JSR publish CI**: `.github/workflows/jsr-publish.yml` publishes the package to JSR when a GitHub release is published (`npx jsr publish`).
- **npm publish CI**: `.github/workflows/npm-publish.yml` builds the npm package with `deno task build:npm` and publishes to npm (public) when a
  GitHub release is published.

## [0.0.1] - 2026-02-05

### Base functionality (first release)

- **Load**: OpenAPI 2 (Swagger) and OpenAPI 3.x specs from a URL, file path (JSON or YAML), or parsed object. Version is detected from `swagger` /
  `openapi`; schemas are read from `definitions` or `components.schemas`.
- **Resolve**: Internal `$ref`s and external refs (with a pluggable resolver, default `fetch`) are collected; external documents are fetched and
  merged so the type set is self-contained.
- **Generate**: TypeScript interfaces and type aliases from the resolved schemas. Optional camelCase property naming, configurable indent (tabs or
  spaces), and a file header (default or custom). Output is returned as a string and can be written to a file via `output`.

### Added

- **YAML spec support**: Load OpenAPI/Swagger specs from `.yaml` and `.yml` files or URLs (via `@std/yaml`). JSON is still used for `.json` and when
  content-type or path does not indicate YAML.
- **Test assets**: Minimal spec fixtures in `test/assets/` (`openapi2-minimal.json`, `openapi3-minimal.json`, `minimal-openapi.yaml`) for tests; load
  and generate tests use these paths.
- **JSDoc/TSDoc**: Documentation for public and internal APIs in `src/` (types, load, generate, codegen, resolve, resolver, naming), including
  `@param`, `@returns`, `@throws`, and `{@link}` where relevant.
- **Test CI**: GitHub Actions workflow `.github/workflows/tests.yaml` runs on push and pull requests to `main` (and via `workflow_dispatch`), with
  Deno, Bun, and Node.js jobs using cross-org workflows to lint, type-check, and run tests.

### Changed

- **AGENTS.md**: Documented `test/assets/`, clarified reference material vs test assets, and added `@std/yaml` to dependencies.

[Unreleased]: https://github.com/pinta365/openapi-typegen/compare/v0.0.3...HEAD
[0.0.3]: https://github.com/pinta365/openapi-typegen/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/pinta365/openapi-typegen/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/pinta365/openapi-typegen/releases/tag/v0.0.1
