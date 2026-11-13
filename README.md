# tree-sitter-iec61131-3-st-beckhoff

Tree-sitter grammar for Beckhoff TwinCAT 3 Structured Text, extending [tree-sitter-iec61131-3-st](https://github.com/HeytalePazguato/tree-sitter-iec61131-3-st) through tree-sitter's grammar-extension mechanism.

**Status: pre-0.1.0.** The grammar, bindings and wasm are complete on `develop`, but nothing is published to npm yet, so the install command below works from 0.1.0 on.

## Scope

The dialect adds only TwinCAT-specific syntax on top of the base grammar:

- structured attribute pragmas (`{attribute 'name'}`) and conditional-compilation directives (`{IF ...}` / `{END_IF}`)
- `AND_THEN` / `OR_ELSE` short-circuit operators
- `S=` / `R=` set and reset assignments
- owner-qualified `ACTION` blocks
- `__NEW` / `__DELETE` / `__SYSTEM` intrinsics, `REFERENCE TO`, and `FB_init` constructor arguments

## Install

Requires Node 24 or newer.

```sh
npm install tree-sitter-iec61131-3-st-beckhoff
```

The package ships prebuilt Node addons for Linux, macOS and Windows; on any other platform `npm install` compiles the addon from `src/`, which needs a C toolchain. It also ships a wasm build, which needs neither.

## Usage

### Node

Install the optional peer dependency `tree-sitter` (`^0.25`), then:

```js
import Parser from "tree-sitter";
import Beckhoff from "tree-sitter-iec61131-3-st-beckhoff";

const parser = new Parser();
parser.setLanguage(Beckhoff);

const tree = parser.parse("FUNCTION_BLOCK FB_A\nbOut S= bIn;\nEND_FUNCTION_BLOCK\n");
console.log(tree.rootNode.toString());
```

### web-tree-sitter (wasm)

The wasm has ABI 15 and works with `web-tree-sitter` `~0.27.1`:

```js
import { readFileSync } from "node:fs";
import { Language, Parser } from "web-tree-sitter";

const wasmUrl = import.meta.resolve("tree-sitter-iec61131-3-st-beckhoff/tree-sitter-iec61131_3_st_beckhoff.wasm");

await Parser.init();
const language = await Language.load(new Uint8Array(readFileSync(new URL(wasmUrl))));

const parser = new Parser();
parser.setLanguage(language);

const tree = parser.parse("FUNCTION_BLOCK FB_A\nbOut S= bIn;\nEND_FUNCTION_BLOCK\n");
console.log(tree.rootNode.toString());
```

In a browser, fetch the wasm from wherever your bundler or server puts it and pass the bytes to `Language.load` the same way.

## Node-type contract

These names and fields do not change without a major version. `scripts/check-contract.mjs` asserts them against `src/node-types.json` in CI. A `?` marks an optional field.

| Node | Fields | Syntax |
|------|--------|--------|
| `attribute_pragma` | `name`, `value?` | `{attribute 'name' := 'value'}`, inside a `pragma` |
| `conditional_directive` | `kind`, `condition?` | `{IF ...}`, `{ELSIF ...}`, `{ELSE}`, `{END_IF}`, inside a `pragma` |
| `short_circuit_expression` | `left`, `operator`, `right` | `a AND_THEN b`, `a OR_ELSE b` |
| `set_reset_assignment_statement` | `left`, `operator`, `right` | `a S= b;`, `a R= b;` |
| `action_declaration` | `owner?`, `name`, `body?` | `ACTION FB_A.Reset: ... END_ACTION` |
| `new_expression` | `type`, `size?` | `__NEW(INT, 16)` |
| `delete_statement` | `operand` | `__DELETE(p);` |
| `system_call` | `intrinsic`, `arguments` | `__SYSTEM.GetCurrentTaskIndex()` |
| `reference_to_type` | `target` | `REFERENCE TO INT` |
| `variable_declaration` | gains `init_arguments?` | `fb : FB_X(nParam := 5);` |

Field details that matter to consumers:

- `conditional_directive`: `kind` is a named node of type `if`, `elsif`, `else` or `end_if`. Read its type, not its text, because the opening token includes the `{`. Regions are not paired by the grammar.
- `attribute_pragma`: `name` and `value` are `string_literal` nodes, so their text includes the quotes.
- `set_reset_assignment_statement`: `operator` is a `set_assign` or `reset_assign` node.

Reused unchanged from the base grammar: `address_of_expression`, `dereference_expression`, `pointer_type`, `reference_type`, `reference_assignment_statement`, `method_declaration`, `pragma`.

## Extending

This grammar is built with the mechanism described in the base grammar's [EXTENDING.md](https://github.com/HeytalePazguato/tree-sitter-iec61131-3-st/blob/develop/EXTENDING.md), which also covers the required copy of the external scanner.

## Development

```sh
npm ci
npm test
npm run build:wasm
npm run test:wasm
npm run check:contract
```

Work happens on `develop`; releases go through `release/*` branches into `main`. See [CONTRIBUTING.md](CONTRIBUTING.md).

| Push to | Result |
|---------|--------|
| `develop` | `prerelease.yml` uploads the wasm and prebuilds as a workflow artifact; nothing is published |
| `release/<X.Y.Z>` | `release.yml` publishes `<X.Y.Z>-rc.<N>` to dist-tag `next`, tags it and creates a GitHub pre-release |
| `main` | `release.yml` publishes `VERSION` to dist-tag `latest`, tags `v<VERSION>` and creates a GitHub Release with the wasm attached |

Publishing uses npm Trusted Publishing with provenance and no stored token, behind the `npm-publish` environment. With `VERSION` at `0.0.0` nothing is released.

## License

MIT — see [LICENSE](LICENSE).
