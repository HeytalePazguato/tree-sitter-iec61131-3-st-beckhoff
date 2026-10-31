import base, { kw } from 'tree-sitter-iec61131-3-st/grammar.js';

// Lexical precedences of the `{ … }` forms. The opaque base `pragma` token (0) is
// always the longest match, so the structured openers must outrank it to win at the
// lexer, and the opaque look-alikes must outrank the openers (see `_opaque_pragma`).
const PRAGMA_PREC = { OPENER: 2, OPAQUE: 3 };

// Base grammar PREC table (node_modules/tree-sitter-iec61131-3-st/grammar.js): OR 4,
// XOR 5, AND 6. AND_THEN binds like AND and OR_ELSE like OR, so the literals mirror it.
const PREC = { OR: 4, AND: 6 };

const directiveOpener = (pattern) => token(prec(PRAGMA_PREC.OPENER, pattern));

export default grammar(base, {
  name: 'iec61131_3_st_twincat',

  rules: {
    _expression: ($, original) => choice(original, $.short_circuit_expression),

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
      choice(original, $.set_reset_assignment_statement),

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
