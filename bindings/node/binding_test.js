import assert from "node:assert";
import { test } from "node:test";
import Parser from "tree-sitter";
import language from "./index.js";

// One node of each Phase B construct, in a single translation unit.
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

const EXPECTED_NODE_TYPES = [
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

function collectTypes(node, types = new Set()) {
  types.add(node.type);
  for (const child of node.children) collectTypes(child, types);
  return types;
}

test("can load grammar", () => {
  const parser = new Parser();
  parser.setLanguage(language);
});

test("parses one node of each TwinCAT construct without errors", () => {
  const parser = new Parser();
  parser.setLanguage(language);
  const { rootNode } = parser.parse(SNIPPET);
  assert.ok(!rootNode.hasError, rootNode.toString());

  const types = collectTypes(rootNode);
  for (const type of EXPECTED_NODE_TYPES) {
    assert.ok(types.has(type), `missing node type ${type}\n${rootNode.toString()}`);
  }

  const declarations = rootNode.descendantsOfType("variable_declaration");
  assert.ok(
    declarations.some((d) => d.childForFieldName("init_arguments") !== null),
    "no variable_declaration carries init_arguments",
  );
});
