# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2026-02-05

### Base functionality (first release)

- **Load**: OpenAPI 2 (Swagger) and OpenAPI 3.x specs from a URL, file path (JSON or YAML), or parsed object. Version is detected from `swagger` /
  `openapi`; schemas are read from `definitions` or `components.schemas`.
- **Resolve**: Internal `$ref`s and external refs (with a pluggable resolver, default `fetch`) are collected; external documents are fetched and
  merged so the type set is self-contained.
- **Generate**: TypeScript interfaces and type aliases from the resolved schemas. Optional camelCase property naming, configurable indent (tabs or
  spaces), and a file header (default or custom). Output is returned as a string and can be written to a file via `outputPath`.

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

[Unreleased]: https://github.com/pinta365/openapi-typegen/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/pinta365/openapi-typegen/releases/tag/v0.0.1
