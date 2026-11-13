# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — next: 0.2.0

## [0.1.0] - 2026-11-13

### Added

- Release pipeline: `release.yml` publishes to npm with Trusted Publishing and provenance (no token, npm >= 11.5.1 asserted) behind the `npm-publish` environment, as `<X.Y.Z>-rc.<N>` to dist-tag `next` from `release/<X.Y.Z>` branches and as `<VERSION>` to `latest` from `main`, then creates the tag and a GitHub Release (pre-release for an rc) with the wasm attached and generated notes. `scripts/resolve-release.sh` holds the guards: `VERSION` 0.0.0 does nothing, a version already on npm or an existing tag is skipped, a registry error fails the run. The reusable `build-artifacts.yml` builds and tests the wasm and the Linux, macOS and Windows prebuilds in the publishing run itself.
- README documents install, Node and web-tree-sitter usage, the node-type contract and the release flow.
- `npm run test:wasm` (`scripts/wasm-smoke.mjs`) loads the built wasm through web-tree-sitter ~0.27.1 exactly as plc-st-test does (`Parser.init()`, `Language.load(bytes)`), parses a file or a built-in snippet exercising every contract node, and exits 1 listing the range of any ERROR/MISSING node. `--wasm <path>` selects the wasm and `--expect-nodes a,b,c` fails on absent node types (defaulting to the full contract list for the built-in snippet). The `wasm` CI job runs it, plus a negative check that `test/wasm/broken.st` is rejected.
- Node bindings (`binding.gyp`, `bindings/node/{binding.cc,index.js,index.d.ts}`) built from `src/parser.c` and `src/scanner.c`, an `install` script using `node-gyp-build`, and `bindings/node/binding_test.js`, which parses one node of every TwinCAT construct and asserts no parse errors and that each node type appears. A `prebuild` CI matrix job (Ubuntu, macOS, Windows; Node 26) runs `npm run prebuild` and uploads `prebuilds/` as one artifact per OS.
- `npm run check:contract` (`scripts/check-contract.mjs`) asserts the node-type contract against `src/node-types.json` (every contract node exists, new nodes declare exactly the listed fields with the right optionality, `variable_declaration.init_arguments` is optional, reused base nodes exist) and that `src/scanner.c` equals the base scanner apart from the symbol rename and the leading header comment, printing a diff otherwise. The `wasm` CI job runs it.
- `REFERENCE TO` types parse as `reference_to_type` (`target`), the TwinCAT spelling of the base `REF_TO`, and `variable_declaration` gains an optional `init_arguments` (`argument_list`) for FB_init constructor arguments such as `fb : FB_X(nParam := 5);`. The `base_coverage` corpus also covers the FB_init/FB_reinit/FB_exit lifecycle methods, pointers, `ADR`, dereference and `REF=` with base node names. Highlight capture included.
- Intrinsics: `__NEW(Type[, size])` parses as `new_expression` (`type`, `size?`), `__DELETE(ptr);` as `delete_statement` (`operand`) and `__SYSTEM.Name(...)` as `system_call` (`intrinsic`, `arguments`), case-insensitive; identifiers such as `__myVar` stay plain identifiers. Highlight captures and the `intrinsics` corpus are included.
- Actions: `ACTION [Owner.]Name[:] ... END_ACTION` parses as a top-level `action_declaration` (`owner?`, `name`, `body?`), case-insensitive; the base grammar has no ACTION construct. Invoking an action stays a base `invocation_statement`. Highlight captures and the `actions` corpus are included.
- Set/reset assignments: `S=` and `R=` parse as `set_reset_assignment_statement` (`left`, `operator` = `set_assign`|`reset_assign`, `right`), case-insensitive. Comparisons such as `IF s=1 THEN`, plain `:=` assignments, `REF=` and identifiers named `S`/`R` are unaffected. Highlight capture and the `set_reset_assign` corpus are included.
- Short-circuit operators: `AND_THEN` and `OR_ELSE` parse as `short_circuit_expression` (`left`, `operator`, `right`), case-insensitive, with the precedence of `AND` and `OR` respectively (mirroring the base precedence table); plain `AND`/`OR` stay `binary_expression`. Highlight capture and the `short_circuit` corpus are included.
- Structured pragmas: `{attribute 'name'}` and `{attribute 'name' := 'value'}` parse as `attribute_pragma` (`name`, `value`), and `{IF}`/`{ELSIF}`/`{ELSE}`/`{END_IF}` parse as flat `conditional_directive` nodes (`kind`, `condition`) inside the base `pragma`, wherever a base pragma is valid. `kind` is a named node of type `if`, `elsif`, `else` or `end_if`; `condition` is the raw `condition_text`. Any other `{ … }`, including look-alikes such as `{ifdef X}` and `{attribute foo}`, stays a plain `pragma`. Highlight captures and the `pragmas` corpus are included.
- Pass-through grammar extending `tree-sitter-iec61131-3-st` with no new rules, its own copy of the base external scanner (`src/scanner.c`, symbols renamed), the committed generated parser, the base highlights query and the `standard_passthrough` corpus (including the `MISSING "END_IF"` recovery case).
- npm package manifest (`type: module`, `tree-sitter-iec61131-3-st ~0.1.2` dependency, `tree-sitter-cli` pinned `~0.27.1`) with a committed `package-lock.json`, and `tree-sitter.json` grammar metadata.
- CI on Node 24 and 26 across Linux, macOS and Windows, a wasm build job, and a `workflow-lint` job (actionlint and zizmor).
- Dependabot for npm, GitHub Actions and the docs toolchain, targeting `develop` with a 7-day cooldown.
- Hash-locked docs toolchain (`docs/requirements.txt`) for the MkDocs site.

### Changed

- Renamed the package and repository from `tree-sitter-iec61131-3-st-twincat` to `tree-sitter-iec61131-3-st-beckhoff` so vendor dialects are named by brand (Beckhoff, B&R) rather than by IDE. The grammar name is now `iec61131_3_st_beckhoff` (C symbol `tree_sitter_iec61131_3_st_beckhoff`, scanner symbols `tree_sitter_iec61131_3_st_beckhoff_external_scanner_*`), the scope `source.iec61131-3.st.beckhoff` and the wasm `tree-sitter-iec61131_3_st_beckhoff.wasm`. The dialect still targets TwinCAT 3 Structured Text and the node-type contract is unchanged. Nothing had been published under the old name.
- CI now really runs the stale-generation check, `npm test` and the wasm build; the `grammar.js` guards are gone. The wasm job builds the wasm, smoke-tests it, checks the contract and uploads it.
- `npm test` now also runs the Node binding tests after `tree-sitter test`.
- All GitHub Actions are pinned by commit SHA and workflows run with least-privilege permissions.
- `prerelease.yml` now handles `develop` only: it uploads the wasm and prebuilds as a stamped workflow artifact. Prereleases moved to `release.yml` because the npm registry allows one Trusted Publisher per package, and they are always `-rc.N` (the `[beta]`/`[rc]` commit keywords and the alpha stage are gone).
- README, `mkdocs.yml` and `docs/index.md` describe this repository instead of the template placeholders.

### Fixed

- `main` and `types` in `package.json` name explicit files, which removes the Node DEP0151 warning on `import` of the package.
- The `[Unreleased]` heading of this file held a Windows-1252 dash, which made it invalid UTF-8.

<!--
  Add entries here while working on `develop` or `release/*`. The heading
  carries the next target version (`next: X.Y.Z`) so it's obvious what
  these entries will ship as. On release, rename to `[X.Y.Z] - YYYY-MM-DD`
  and start a new `[Unreleased] — next: X.Y.Z+1` block.

  Use these subsections, omitting any that don't apply:
    ### Added       — new features
    ### Changed     — changes in existing functionality
    ### Deprecated  — soon-to-be removed features
    ### Removed     — removed features
    ### Fixed       — bug fixes
    ### Security    — vulnerability fixes
-->
