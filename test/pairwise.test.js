import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pairwiseCases, verifyPairCoverage } from '../scripts/pairwise.mjs';

test('coverage verification catches a missing interaction even when every individual value appears', () => {
  const factors = { body: ['round', 'long'], hair: ['bob', 'bun'], hat: ['cap', 'none'] };
  const incomplete = [{ body: 'round', hair: 'bob', hat: 'cap' }, { body: 'long', hair: 'bun', hat: 'none' }];
  assert.ok(verifyPairCoverage(factors, incomplete).missing.length > 0);
  const complete = pairwiseCases(factors);
  assert.equal(verifyPairCoverage(factors, complete).coveredPairs, 12);
  assert.deepEqual(verifyPairCoverage(factors, complete).missing, []);
  assert.deepEqual(pairwiseCases(factors), complete);
});
