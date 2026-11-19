import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { BundleSurgery, patch, applyPatch } from '../src/index.js';

const TEST_BUNDLE = `
function foo() {
  console.log('hello');
  return 42;
}

function empty() {}

const x = 1;
console.warn('warning');
`;

describe('BundleSurgery', () => {
  const testFile = '/tmp/test-bundle.js';
  
  before(() => {
    fs.writeFileSync(testFile, TEST_BUNDLE);
  });

  after(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    if (fs.existsSync(testFile + '.backup')) fs.unlinkSync(testFile + '.backup');
  });

  it('should analyze bundle and find console logs', async () => {
    const surgery = new BundleSurgery();
    const result = await surgery.analyze(testFile);
    
    assert.ok(result.ast);
    assert.ok(result.issues);
    const consoleLogs = result.issues.filter(i => i.type === 'console-log');
    assert.strictEqual(consoleLogs.length, 2);
  });

  it('should analyze bundle and find empty functions', async () => {
    const surgery = new BundleSurgery();
    const result = await surgery.analyze(testFile);
    
    const emptyFuncs = result.issues.filter(i => i.type === 'empty-function');
    assert.strictEqual(emptyFuncs.length, 1);
  });

  it('should apply patch to remove console logs', async () => {
    const surgery = new BundleSurgery({ dryRun: false, backup: true });
    const result = surgery.applyPatch(testFile, [{ type: 'remove-console' }]);
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.changes, 1);
    
    const content = fs.readFileSync(testFile, 'utf-8');
    assert.ok(!content.includes('console.log'));
    assert.ok(!content.includes('console.warn'));
  });

  it('should create backup file', async () => {
    assert.ok(fs.existsSync(testFile + '.backup'));
  });
});

describe('patch function', () => {
  it('should return patch object', () => {
    const result = patch({ file: 'test.js', selector: 'foo', edit: 'bar' });
    assert.strictEqual(result.applied, true);
    assert.strictEqual(result.diff, '/* patch applied */');
  });
});

describe('applyPatch function', () => {
  it('should apply patch to original', () => {
    const original = 'const x = 1;';
    const patchObj = { diff: '; // patched' };
    const result = applyPatch(original, patchObj);
    assert.strictEqual(result, 'const x = 1;; // patched');
  });
});