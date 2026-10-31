# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] � next: 0.1.0

### Added

- Short-circuit operators: `AND_THEN` and `OR_ELSE` parse as `short_circuit_expression` (`left`, `operator`, `right`), case-insensitive, with the precedence of `AND` and `OR` respectively (mirroring the base precedence table); plain `AND`/`OR` stay `binary_expression`. Highlight capture and the `short_circuit` corpus are included.
- Structured pragmas: `{attribute 'name'}` and `{attribute 'name' := 'value'}` parse as `attribute_pragma` (`name`, `value`), and `{IF}`/`{ELSIF}`/`{ELSE}`/`{END_IF}` parse as flat `conditional_directive` nodes (`kind`, `condition`) inside the base `pragma`, wherever a base pragma is valid. `kind` is a named node of type `if`, `elsif`, `else` or `end_if`; `condition` is the raw `condition_text`. Any other `{ … }`, including look-alikes such as `{ifdef X}` and `{attribute foo}`, stays a plain `pragma`. Highlight captures and the `pragmas` corpus are included.
- Pass-through grammar extending `tree-sitter-iec61131-3-st` with no new rules, its own copy of the base external scanner (`src/scanner.c`, symbols renamed), the committed generated parser, the base highlights query and the `standard_passthrough` corpus (including the `MISSING "END_IF"` recovery case).
- npm package manifest (`type: module`, `tree-sitter-iec61131-3-st ~0.1.2` dependency, `tree-sitter-cli` pinned `~0.27.1`) with a committed `package-lock.json`, and `tree-sitter.json` grammar metadata.
- CI on Node 24 and 26 across Linux, macOS and Windows, a wasm build job, and a `workflow-lint` job (actionlint and zizmor).
- Dependabot for npm, GitHub Actions and the docs toolchain, targeting `develop` with a 7-day cooldown.
- Hash-locked docs toolchain (`docs/requirements.txt`) for the MkDocs site.

### Changed

- CI now really runs the stale-generation check, `npm test` and the wasm build; the `grammar.js` guards are gone. The wasm job builds and uploads the wasm only: `test:wasm` and `check:contract` join it with tasks 3.2 and 2.7.
- `npm test` runs `tree-sitter test` only until task 3.1 adds the Node binding tests.
- All GitHub Actions are pinned by commit SHA and workflows run with least-privilege permissions.
- `prerelease.yml` and `release.yml` keep the `0.0.0` sentinel and idempotence guards; npm publishing with Trusted Publishing is not wired yet.
- README, `mkdocs.yml` and `docs/index.md` describe this repository instead of the template placeholders.

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
