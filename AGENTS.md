# Agents quick checklist

This document provides guidelines for AI agents and contributors working on @pinta365/openapi-typegen.

## Project Structure

- **`mod.ts`**: Main entry point, re-exports all public APIs from `src/`
- **`src/`**: Library code that consumers use (programmatic API and/or CLI) to generate TypeScript types from OpenAPI/Swagger specs in their own
  projects
- **`scripts/`**: Tooling for this repo only (e.g. build_npm, release scripts). Not for consumer type generation
- **`test/`**: Test files using `@cross/test` for cross-runtime testing
- **`test/assets/`**: Minimal OpenAPI/Swagger spec files used by tests (e.g. `openapi2-minimal.json`, `openapi3-minimal.json`, `minimal-openapi.yaml`)
- **`references/`**: Design docs and reference implementation. Reference specs for building and testing: **`references/openapi-1.28.json`** (OpenAPI
  3.x), **`references/swagger.json`** (Swagger 2.0). Not part of the published package.
- **`local_test/`**: Local experimentation (gitignored, for development)

## Development

### Running Locally

```bash
deno task dev
```

### Pre-push Validation

Run: `deno task prepush`

This runs:

- `deno fmt --check` - Format check
- `deno lint` - Linter
- `deno check mod.ts` - Type checking
- `deno test -A` - Run all tests

**Note**: `deno check` may show type resolution errors for transitive npm dependencies. This is a known Deno limitation and doesn't affect runtime
functionality.

### Testing

```bash
deno test -A
```

Tests use `@cross/test` for cross-runtime compatibility (Deno, Bun, Node.js, browsers).

### Local Testing

For manual testing and experimentation, use files in `local_test/`. These files are gitignored and can be modified freely for development.

## Guidelines

### Code Style

- **TypeScript strict mode** - ensure proper typing
- **4-space indentation**, 150 character line width (see `deno.json`)
- **Runtime-agnostic** - code must work on Deno, Node.js (18+), Bun, and browsers

### Key Conventions

- **Consumable library**: Other projects depend on this package to generate types in their repos. Expose a programmatic API and/or CLI that consumers
  run in their projects.
- **OpenAPI/Swagger as input**: Support OpenAPI 2 (Swagger) and 3.x; spec is the source of truth.
- **$ref resolution**: Resolve inline and external `$ref`s so generated types are self-contained where desired.
- **Output**: Emit TypeScript interfaces and types (e.g. camelCase properties, PascalCase type names).
- **Testing**: Use `@cross/test` for all tests to ensure cross-runtime compatibility.
- **Error handling**: Provide clear, actionable error messages with context.

### File Organization

- **Source code**: `src/` directory
- **Tests**: `test/` directory (use `@cross/test`); mirror source files (e.g. `test/codegen.test.ts` for `src/codegen.ts`)
- **Scripts**: `scripts/` for repo tooling only (build, release)
- **Test assets**: `test/assets/` for minimal spec fixtures (OpenAPI 2/3 JSON, YAML). Use these paths in tests (e.g.
  `test/assets/openapi2-minimal.json`).
- **Reference material**: `references/` for design docs and larger reference specs. Use `references/openapi-1.28.json` and `references/swagger.json`
  for integration tests that need real-world specs.
- **Documentation**: `README.md` for user-facing documentation
- **Changelog**: `CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format

### Dependencies

- **@cross/test**: Cross-runtime testing framework (via JSR)
- **@std/assert**: Assertion library (via JSR)
- **@std/yaml**: YAML parsing for OpenAPI specs in `.yaml`/`.yml` (via JSR)

### Testing Guidelines

- All tests should use `@cross/test` for cross-runtime compatibility
- Tests should be in `test/` directory with `.test.ts` suffix
- Test files should be named to match their source files (e.g., `test/codegen.test.ts` for `src/codegen.ts`)
- Use descriptive test names that explain what is being tested
- For local experimentation, use `local_test/` directory (gitignored)

### Changelog Maintenance

- **CHANGELOG.md**: Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format
- Update the `[Unreleased]` section with changes as they are made
- When releasing a new version:
  1. Move `[Unreleased]` changes to a new version section with date
  2. Add version comparison links at the bottom
  3. Update the `[Unreleased]` link to compare from the new version
- Use standard categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`

### Future Work

- **OpenAPI 3.x**: Full support for OpenAPI 3.0/3.1 schema layout and `$ref` rules
- **Output formats**: Options for single file vs split files, naming conventions, formatting
- **CLI options**: Configurable output path, spec URL/path, format options
- Keep this file updated as the project evolves
- Maintain backward compatibility for user-facing features
