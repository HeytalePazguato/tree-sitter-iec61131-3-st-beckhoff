// Smoke test for the prebuilt WASM grammar consumed via web-tree-sitter.
//
// Loads tree-sitter-iec61131_3_st_beckhoff.wasm (produced by `tree-sitter build --wasm`) the way
// plc-st-test does (`Parser.init()` then `Language.load(bytes)` on web-tree-sitter ~0.27.1), parses
// a file or a built-in snippet and exits 1 on any ERROR/MISSING node or missing expected node type.
//
// Usage: node scripts/wasm-smoke.mjs [file] [--wasm <path>] [--expect-nodes a,b,c]
// Without a file the built-in snippet is parsed and --expect-nodes defaults to the node-type contract.

import { readFileSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { Parser, Language } from "web-tree-sitter";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// One node of each contract construct, in a single translation unit (mirrors bindings/node/binding_test.js).
const SNIPPET = `{attribute 'qualified_only'}
{IF defined (variable: bSim)}
{END_IF}
FUNCTION_BLOCK FB_Probe
VAR
    bA : BOOL;
    bB : BOOL;
    bOut : BOOL;
    pFb : POINTER TO FB_Probe;
    r : REFERENCE TO INT;
    fbInner : FB_Probe(nParam := 5);
    nTask : DINT;
END_VAR
IF bA AND_THEN bB THEN
    bOut := bA OR_ELSE bB;
END_IF
bOut S= bA;
bOut R= bB;
pFb := __NEW(FB_Probe);
__DELETE(pFb);
nTask := __SYSTEM.GetCurrentTaskIndex();
END_FUNCTION_BLOCK
ACTION FB_Probe.Reset:
bOut := FALSE;
END_ACTION
`;

const CONTRACT_NODES = [
  "attribute_pragma",
  "conditional_directive",
  "short_circuit_expression",
  "set_reset_assignment_statement",
  "action_declaration",
  "new_expression",
  "delete_statement",
  "system_call",
  "reference_to_type",
];

const args = process.argv.slice(2);
let wasmPath = join(repoRoot, "tree-sitter-iec61131_3_st_beckhoff.wasm");
let expectNodes = null;
let file = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--wasm") wasmPath = resolve(args[++i]);
  else if (args[i] === "--expect-nodes") expectNodes = args[++i].split(",").filter(Boolean);
  else file = args[i];
}
if (expectNodes === null && file === null) expectNodes = CONTRACT_NODES;

const source = file === null ? SNIPPET : readFileSync(file, "utf8");
const label = file ?? "<built-in snippet>";

await Parser.init();
const language = await Language.load(new Uint8Array(readFileSync(wasmPath)));
const parser = new Parser();
parser.setLanguage(language);
const tree = parser.parse(source);

const types = new Set();
const problems = [];
const walk = (node) => {
  types.add(node.type);
  if (node.type === "ERROR" || node.isMissing) {
    const { startPosition: s, endPosition: e } = node;
    problems.push(
      `${node.isMissing ? "MISSING" : "ERROR"} ${node.type} at ${s.row + 1}:${s.column + 1}-${e.row + 1}:${e.column + 1}`,
    );
  }
  for (const child of node.children) walk(child);
};
walk(tree.rootNode);

for (const p of problems) console.error(`FAIL ${label}: ${p}`);
const absent = (expectNodes ?? []).filter((t) => !types.has(t));
for (const t of absent) console.error(`FAIL ${label}: expected node type ${t} not found`);

tree.delete();
parser.delete();
if (problems.length > 0 || absent.length > 0) {
  process.exitCode = 1;
} else {
  console.log(`OK   ${label} (${basename(wasmPath)}, ${(expectNodes ?? []).length} expected node types present)`);
}
