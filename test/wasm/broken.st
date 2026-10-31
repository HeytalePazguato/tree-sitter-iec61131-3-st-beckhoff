// Deliberately malformed input: test:wasm must exit 1 on this file.
FUNCTION_BLOCK FB_Broken
VAR
    bA : BOOL;
END_VAR
IF bA AND_THEN THEN
    bA := ;
END_FUNCTION_BLOCK
