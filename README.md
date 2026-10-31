# tree-sitter-iec61131-3-st-twincat

Tree-sitter grammar for Beckhoff TwinCAT 3 Structured Text, extending [tree-sitter-iec61131-3-st](https://github.com/HeytalePazguato/tree-sitter-iec61131-3-st) through tree-sitter's grammar-extension mechanism.

**Status: pre-0.1.0.** The repository currently contains only the toolchain (package, CI, release workflows); the grammar lands in the following tasks and nothing is published to npm yet.

## Scope

The dialect adds only TwinCAT-specific syntax on top of the base grammar:

- structured attribute pragmas (`{attribute 'name'}`) and conditional-compilation directives (`{IF ...}` / `{END_IF}`)
- `AND_THEN` / `OR_ELSE` short-circuit operators
- `S=` / `R=` set and reset assignments
- owner-qualified `ACTION` blocks
- `__NEW` / `__DELETE` / `__SYSTEM` intrinsics, `REFERENCE TO`, and `FB_init` constructor arguments

## Development

Requires Node 24 or newer.

```sh
npm ci
npx tree-sitter --version
```

Work happens on `develop`; releases go through `release/*` branches into `main`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
