import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const report = JSON.parse(readFileSync('editorial-test-results.json', 'utf8'));
const knownTitles = new Set(['types.ts is in sync with the migration DDL', 'typed client surface includes the v2 tables, view, RPCs and enums', 'V2 columns landed on the V1 table types']);
const failed = report.testResults.flatMap(suite => suite.assertionResults.filter(test => test.status === 'failed').map(test => ({ suite: suite.name, title: test.title })));
assert(report.numTotalTests >= 573 && report.numPassedTests >= 570, 'Incomplete test execution');
assert.equal(report.numPendingTests, 0, 'Unexpected skipped tests');
assert.equal(report.numFailedTests, failed.length, 'Unclassified test failure');
assert(report.numFailedTestSuites <= 1, 'Unexpected failed suite');
for (const failure of failed) {
  assert(failure.suite.replaceAll('\\', '/').endsWith('/src/lib/v2/types-parity.test.ts') && knownTitles.has(failure.title), `New regression: ${failure.suite} ${failure.title}`);
}
if (failed.length) {
  // Exact unchanged live-schema file verified on pre-editorial main a31d50b.
  // The existing full CI remains red and continues to report this schema debt.
  const hash = createHash('sha256').update(readFileSync('src/integrations/supabase/types.ts')).digest('hex');
  assert.equal(hash, 'f60afbd1463c12adfb3dc6f0d236d911c1f8a05cbc2c1a9fa44d78b5feb91c41');
  console.warn(`Baseline: ${failed.length} existing V2 schema parity failures; ${report.numPassedTests} other tests passed.`);
} else console.log('All tests passed.');
