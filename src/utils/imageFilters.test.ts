import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMagicColorFilter, applyBwCrispFilter } from './imageFilters';

test('applyMagicColorFilter brightens paper background and preserves ink contrast', () => {
  // Pixel 1: off-white paper (210, 205, 200, 255)
  // Pixel 2: dark ink (40, 42, 48, 255)
  const input = new Uint8ClampedArray([210, 205, 200, 255, 40, 42, 48, 255]);
  const output = applyMagicColorFilter(input);

  // Paper becomes brighter than original
  assert.ok(output[0] > input[0]);
  assert.ok(output[1] > input[1]);
  assert.ok(output[2] > input[2]);
  assert.equal(output[3], 255);

  // Dark ink remains dark and legible
  assert.ok(output[4] < 60);
  assert.ok(output[5] < 60);
  assert.ok(output[6] < 60);
});

test('applyBwCrispFilter separates light background and dark text into crisp monochrome', () => {
  const input = new Uint8ClampedArray([
    220, 220, 220, 255, // light paper
    210, 210, 210, 255, // light paper
    30, 30, 30, 255,    // dark ink
  ]);
  const output = applyBwCrispFilter(input);

  assert.equal(output[0], 255);
  assert.equal(output[1], 255);
  assert.equal(output[2], 255);

  assert.equal(output[8], 12);
  assert.equal(output[9], 12);
  assert.equal(output[10], 12);
});
