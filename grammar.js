import base, { kw } from 'tree-sitter-iec61131-3-st/grammar.js';

// Lexical precedences of the `{ … }` forms. The opaque base `pragma` token (0) is
// always the longest match, so the structured openers must outrank it to win at the
// lexer, and the opaque look-alikes must outrank the openers (see `_opaque_pragma`).
const PRAGMA_PREC = { OPENER: 2, OPAQUE: 3 };

// Base grammar PREC table (node_modules/tree-sitter-iec61131-3-st/grammar.js): OR 4,
// XOR 5, AND 6. AND_THEN binds like AND and OR_ELSE like OR, so the literals mirror it.
const PREC = { OR: 4, AND: 6 };

const commaSep1 = (rule) => seq(rule, repeat(seq(',', rule)));

const directiveOpener = (pattern) => token(prec(PRAGMA_PREC.OPENER, pattern));

export default grammar(base, {
  name: 'iec61131_3_st_beckhoff',

  rules: {
    _expression: ($, original) =>
      choice(
        original,
        $.short_circuit_expression,
        $.new_expression,
        $.system_call,
      ),

    // `__NEW`, `__DELETE` and `__SYSTEM` are keywords (kw), so a longer identifier such
    // as `__myVar` is still lexed as a plain identifier.
    new_expression: ($) =>
      seq(
        kw('__NEW'),
        '(',
        field('type', $._type_specifier),
        optional(seq(',', field('size', $._expression))),
        ')',
      ),

    system_call: ($) =>
      seq(
        kw('__SYSTEM'),
        '.',
        field('intrinsic', $.identifier),
        field('arguments', $.argument_list),
      ),

    delete_statement: ($) =>
      seq(kw('__DELETE'), '(', field('operand', $._expression), ')', ';'),

    short_circuit_expression: ($) =>
      choice(
        prec.left(
          PREC.AND,
          seq(
            field('left', $._expression),
            field('operator', kw('AND_THEN')),
            field('right', $._expression),
          ),
        ),
        prec.left(
          PREC.OR,
          seq(
            field('left', $._expression),
            field('operator', kw('OR_ELSE')),
            field('right', $._expression),
          ),
        ),
      ),

    _statement: ($, original) =>
      choice(original, $.set_reset_assignment_statement, $.delete_statement),

    // Modelled on the base `reference_assignment_statement` / `ref_assign`. The
    // two-character tokens only win at the lexer where the parser expects an assignment
    // operator, so `S := 1;`, `IF s = r THEN` and identifiers named `S`/`R` stay intact.
    set_reset_assignment_statement: ($) =>
      seq(
        field('left', $._expression),
        field('operator', choice($.set_assign, $.reset_assign)),
        field('right', $._expression),
        ';',
      ),

    set_assign: ($) => token(/[Ss]=/),
    reset_assign: ($) => token(/[Rr]=/),

    // The base has no ACTION construct. TwinCAT exports actions as top-level siblings of
    // their owner, hence `owner` is optional and the rule joins `_declaration`.
    _declaration: ($, original) => choice(original, $.action_declaration),

    action_declaration: ($) =>
      seq(
        kw('ACTION'),
        optional(seq(field('owner', $.identifier), '.')),
        field('name', $.identifier),
        optional(':'),
        optional(field('body', $.action_body)),
        kw('END_ACTION'),
      ),

    action_body: ($) => repeat1($._statement),

    // The base only knows `REF_TO`; TwinCAT also spells it `REFERENCE TO`. Same node
    // name and field as the B&R dialect so both expose identical nodes.
    _type_specifier: ($, original) => choice(original, $.reference_to_type),

    reference_to_type: ($) =>
      seq(kw('REFERENCE'), kw('TO'), field('target', $._type_specifier)),

    // Identical to the base rule plus `init_arguments`, the FB_init constructor
    // arguments of an instance declaration (`fb : FB_X(nParam := 5);`).
    variable_declaration: ($) =>
      seq(
        field('names', commaSep1($.identifier)),
        optional(seq(kw('AT'), field('address', $.direct_address))),
        ':',
        field('type', $._type_specifier),
        optional(field('init_arguments', $.argument_list)),
        optional(seq(':=', field('initial_value', $._initializer))),
        ';',
      ),

    pragma: ($, original) =>
      choice(
        $.attribute_pragma,
        $.conditional_directive,
        $._opaque_pragma,
        original,
      ),

    // Tree-sitter regexes have no `\b`, so the openers cannot assert the end of their
    // keyword. This token takes back what is not really a structured form and leaves
    // it as a plain `pragma`: a longer word (`{ifdef X}`, `{attributes}`), an unquoted
    // attribute (`{attribute foo}`) or an empty one (`{IF}`, `{attribute}`).
    _opaque_pragma: ($) =>
      token(
        prec(
          PRAGMA_PREC.OPAQUE,
          /\{\s*(attribute\s*[^'"\s}][^}]*|(if|elsif)[A-Za-z0-9_][^}]*|(attribute|if|elsif)\s*)\}/i,
        ),
      ),

    // The openers must span the whitespace after the keyword: stopping before it would
    // let the base token survive the transition it shares with `_opaque_pragma`.
    attribute_pragma: ($) =>
      seq(
        directiveOpener(/\{\s*attribute\s*/i),
        field('name', $.string_literal),
        optional(seq(':=', field('value', $.string_literal))),
        '}',
      ),

    // Flat on purpose: regions are not paired here, the dialect preprocesses them.
    // Each `kind` is its own named node so the corpus can assert it (anonymous nodes
    // do not appear in the test trees). The opener token includes the `{`, so read
    // the kind from the node type, not from its text.
    conditional_directive: ($) =>
      choice(
        seq(
          field('kind', alias(directiveOpener(/\{\s*if\s*/i), $.if)),
          field('condition', $.condition_text),
          '}',
        ),
        seq(
          field('kind', alias(directiveOpener(/\{\s*elsif\s*/i), $.elsif)),
          field('condition', $.condition_text),
          '}',
        ),
        field('kind', alias(directiveOpener(/\{\s*else\s*\}/i), $.else)),
        field('kind', alias(directiveOpener(/\{\s*end_if\s*\}/i), $.end_if)),
      ),

    // Raw text up to the closing brace, without surrounding whitespace. The condition
    // language (`defined (variable: x)`, `hasattribute (...)`) is left to the dialect.
    condition_text: ($) => /[^\s}]([^}]*[^\s}])?/,
  },
});
