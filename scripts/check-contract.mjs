// Checks the grammar's public contract: the node types and fields consumed by @plc-st/dialect-beckhoff, and that src/scanner.c stays in sync with the base grammar's scanner.
//
// Paths can be overridden for negative tests without touching the repo files:
//   CONTRACT_NODE_TYPES=<path to node-types.json>  CONTRACT_SCANNER=<path to the beckhoff scanner.c>
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nodeTypesPath = process.env.CONTRACT_NODE_TYPES ?? resolve(root, 'src/node-types.json');
const scannerPath = process.env.CONTRACT_SCANNER ?? resolve(root, 'src/scanner.c');
const baseScannerPath = resolve(root, 'node_modules/tree-sitter-iec61131-3-st/src/scanner.c');

// Single source of truth for the contract (BECKHOFF_GRAMMAR_PLAN.md Overview). A trailing `?` marks an optional field.
// Changing a name or field here is a breaking change and needs a major version.
const NEW_NODES = {
  attribute_pragma: ['name', 'value?'],
  conditional_directive: ['kind', 'condition?'],
  short_circuit_expression: ['left', 'operator', 'right'],
  set_reset_assignment_statement: ['left', 'operator', 'right'],
  action_declaration: ['owner?', 'name', 'body?'],
  new_expression: ['type', 'size?'],
  delete_statement: ['operand'],
  system_call: ['intrinsic', 'arguments'],
  reference_to_type: ['target'],
};
// Base node that gains fields: only the listed additions are checked, the base fields remain.
const EXTENDED_NODES = {
  variable_declaration: ['init_arguments?'],
};
// Reused unchanged from the base grammar: existence only.
const BASE_NODES = [
  'address_of_expression',
  'dereference_expression',
  'pointer_type',
  'reference_type',
  'reference_assignment_statement',
  'method_declaration',
  'pragma',
];

const SCANNER_PREFIX = 'tree_sitter_iec61131_3_st_beckhoff_external_scanner_';
const BASE_SCANNER_PREFIX = 'tree_sitter_iec61131_3_st_external_scanner_';
const HEADER_START = '// Copied from tree-sitter-iec61131-3-st ';

const failures = [];
const fail = (message) => failures.push(message);

const parseSpec = (spec) => {
  const optional = spec.endsWith('?');
  return { name: optional ? spec.slice(0, -1) : spec, required: !optional };
};

function checkField(node, fields, spec, exact) {
  const expected = new Map();
  for (const s of spec) {
    const { name, required } = parseSpec(s);
    expected.set(name, required);
    const field = fields[name];
    if (!field) {
      fail(`node '${node}': missing field '${name}'`);
    } else if (field.required !== required) {
      fail(`node '${node}': field '${name}' must be required: ${required} but is required: ${field.required}`);
    }
  }
  if (exact) {
    for (const name of Object.keys(fields)) {
      if (!expected.has(name)) fail(`node '${node}': unexpected extra field '${name}'`);
    }
  }
}

function checkNodeTypes() {
  const nodeTypes = JSON.parse(readFileSync(nodeTypesPath, 'utf8'));
  const named = new Map();
  for (const entry of nodeTypes) {
    if (entry.named) named.set(entry.type, entry);
  }
  const lookup = (type) => {
    const entry = named.get(type);
    if (!entry) fail(`node '${type}': not a named type in ${nodeTypesPath}`);
    return entry;
  };
  for (const [type, spec] of Object.entries(NEW_NODES)) {
    const entry = lookup(type);
    if (entry) checkField(type, entry.fields ?? {}, spec, true);
  }
  for (const [type, spec] of Object.entries(EXTENDED_NODES)) {
    const entry = lookup(type);
    if (entry) checkField(type, entry.fields ?? {}, spec, false);
  }
  for (const type of BASE_NODES) lookup(type);
}

// Normalizes CRLF and drops the header comment task 1.5 added: the leading run of `//` lines that starts with HEADER_START, and nothing else.
function stripHeader(text, label) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (!lines[0].startsWith(HEADER_START)) {
    fail(`scanner: ${label} must start with the '${HEADER_START.trim()}' header comment`);
    return lines;
  }
  let i = 0;
  while (i < lines.length && lines[i].startsWith('//')) i++;
  return lines.slice(i);
}

// Minimal unified-style diff (LCS based); scanner.c is small enough for the quadratic table.
function unifiedDiff(a, b, labelA, labelB, context = 3) {
  const n = a.length;
  const m = b.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      ops.push([' ', a[i], i, j]);
      i++;
      j++;
    } else if (i < n && (j === m || lcs[i + 1][j] >= lcs[i][j + 1])) {
      ops.push(['-', a[i], i, j]);
      i++;
    } else {
      ops.push(['+', b[j], i, j]);
      j++;
    }
  }
  const out = [`--- ${labelA}`, `+++ ${labelB}`];
  const changed = ops.flatMap((op, idx) => (op[0] === ' ' ? [] : [idx]));
  let k = 0;
  while (k < changed.length) {
    let start = Math.max(0, changed[k] - context);
    let end = Math.min(ops.length, changed[k] + context + 1);
    let last = k;
    while (last + 1 < changed.length && changed[last + 1] - context <= end) {
      last++;
      end = Math.min(ops.length, changed[last] + context + 1);
    }
    const hunk = ops.slice(start, end);
    const aCount = hunk.filter((o) => o[0] !== '+').length;
    const bCount = hunk.filter((o) => o[0] !== '-').length;
    out.push(`@@ -${hunk[0][2] + 1},${aCount} +${hunk[0][3] + 1},${bCount} @@`);
    for (const [tag, line] of hunk) out.push(tag + line);
    k = last + 1;
  }
  return out.join('\n');
}

function checkScannerSync() {
  const ours = stripHeader(readFileSync(scannerPath, 'utf8'), scannerPath).map((l) => l.replaceAll(SCANNER_PREFIX, BASE_SCANNER_PREFIX));
  const base = readFileSync(baseScannerPath, 'utf8').replace(/\r\n/g, '\n').split('\n');
  if (ours.length === base.length && ours.every((line, idx) => line === base[idx])) return;
  fail(`scanner: ${scannerPath} differs from the base scanner after the symbol rename and header removal:\n${unifiedDiff(base, ours, baseScannerPath, scannerPath)}`);
}

checkNodeTypes();
checkScannerSync();

if (failures.length > 0) {
  console.error(`check-contract: ${failures.length} failure(s)`);
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}
console.log(`check-contract: OK (${Object.keys(NEW_NODES).length} new nodes, ${Object.keys(EXTENDED_NODES).length} extended, ${BASE_NODES.length} base nodes, scanner in sync)`);
