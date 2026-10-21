/**
 * Text helpers for parity tests that check an Edge Function copy against its src/lib original.
 * Shared by the Deno *_test.ts files here and their vitest twins under src/, so it must stay
 * runtime-neutral: no imports, no Deno or Node APIs. The name must not match Deno's *_test.ts glob.
 */

/** The right-hand side of `export const <name> = ...;`, trimmed. */
export function extractExportAssignment(source: string, name: string): string {
  const match = source.match(new RegExp(`export const ${name} = ([\\s\\S]*?);`));
  if (!match) throw new Error(`Missing export ${name} in source`);
  return match[1].trim();
}

/** The block from `// <marker>` to `// </marker>`, markers included. */
export function extractMarkedBlock(source: string, marker: string, file: string): string {
  const startMarker = `// <${marker}>`;
  const endMarker = `// </${marker}>`;
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start < 0 || end < start) throw new Error(`Missing ${marker} markers in ${file}`);
  return source.slice(start, end + endMarker.length);
}
