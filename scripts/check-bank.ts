/**
 * npm run check:bank
 *
 * Validates pl300-bank/questions/all_questions.json with the same rules the app uses, checks that
 * every referenced image exists on disk, and prints counts. Exits 1 on any error so the build
 * (which runs this first) refuses to ship a broken bank.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bankStats } from '../src/bank/stats';
import { validateBank, type BankIssue } from '../src/bank/validate';

const BANK_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'pl300-bank');
const raw: unknown = JSON.parse(readFileSync(join(BANK_DIR, 'questions', 'all_questions.json'), 'utf8'));

const bank = validateBank(raw);
const issues: BankIssue[] = [...bank.issues];

const imageSrcs = new Set(bank.images.map((i) => i.image.src));
const missing = new Set<string>();
for (const { ref, image } of bank.images) {
  if (!existsSync(join(BANK_DIR, image.src))) {
    missing.add(image.src);
    issues.push({ level: 'error', ref, message: `image not found: ${image.src}` });
  }
}

const stats = bankStats(bank.questions, bank.cases);
const table = (record: Record<string, number>) =>
  Object.entries(record)
    .map(([k, v]) => `  ${k.padEnd(10)} ${String(v).padStart(4)}`)
    .join('\n');

console.log(`Questions: ${stats.total} (${stats.withImages} with an exhibit)`);
console.log(`Cases:     ${stats.cases.length}`);
console.log(`Images:    ${imageSrcs.size} referenced, ${imageSrcs.size - missing.size} found`);
console.log(`\nBy domain\n${table(stats.byDomain)}`);
console.log(`\nBy type\n${table(stats.byType)}`);
console.log(`\nBy difficulty\n${table(stats.byDifficulty)}`);
console.log('\nCases');
for (const c of stats.cases) {
  console.log(`  ${c.id.padEnd(4)} ${c.title.padEnd(22)} ${String(c.questions).padStart(2)} questions · ${c.tabs.join(' | ')}`);
}

const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');
for (const i of [...errors, ...warnings]) console.log(`${i.level.toUpperCase().padEnd(7)} ${i.ref}: ${i.message}`);
console.log(`\n${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
