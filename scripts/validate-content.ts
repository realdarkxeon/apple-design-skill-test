// Validates every src/content/*.json against its schema. Run: node scripts/validate-content.ts
import { readFileSync } from 'node:fs';
import { contentNames, contentSchemas, fieldErrors } from '../src/content/schemas.ts';

let failed = false;
for (const name of contentNames) {
  const data = JSON.parse(readFileSync(new URL(`../src/content/${name}.json`, import.meta.url), 'utf8'));
  const result = contentSchemas[name].safeParse(data);
  if (result.success) {
    console.log(`✓ ${name}.json`);
  } else {
    failed = true;
    console.error(`✗ ${name}.json`);
    for (const [path, messages] of Object.entries(fieldErrors(result.error))) console.error(`    ${path}: ${messages.join('; ')}`);
  }
}
process.exit(failed ? 1 : 0);
