# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] � next: 0.1.0

### Added

- npm package manifest (`type: module`, `tree-sitter-iec61131-3-st ~0.1.2` dependency, `tree-sitter-cli` pinned `~0.27.1`) with a committed `package-lock.json`, and `tree-sitter.json` grammar metadata.
- CI on Node 24 and 26 across Linux, macOS and Windows, a wasm build job, and a `workflow-lint` job (actionlint and zizmor). The generate, test and wasm steps are guarded on the presence of `grammar.js` until the grammar lands.
- Dependabot for npm, GitHub Actions and the docs toolchain, targeting `develop` with a 7-day cooldown.
- Hash-locked docs toolchain (`docs/requirements.txt`) for the MkDocs site.

### Changed

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
