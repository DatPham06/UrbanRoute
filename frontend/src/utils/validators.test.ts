import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateLatitude,
  validateLongitude,
  isWithinHcmcRegion,
  validatePointToPointSelection,
  calculateHaversineDistanceMeters
} from './validators.ts';

test('validateLatitude checks valid ranges', () => {
  assert.equal(validateLatitude(10.7769).isValid, true);
  assert.equal(validateLatitude('10.7769').isValid, true);
  assert.equal(validateLatitude(95).isValid, false);
  assert.equal(validateLatitude(-95).isValid, false);
  assert.equal(validateLatitude('abc').isValid, false);
});

test('validateLongitude checks valid ranges', () => {
  assert.equal(validateLongitude(106.7009).isValid, true);
  assert.equal(validateLongitude('106.7009').isValid, true);
  assert.equal(validateLongitude(190).isValid, false);
  assert.equal(validateLongitude(-190).isValid, false);
  assert.equal(validateLongitude('xyz').isValid, false);
});

test('isWithinHcmcRegion checks coordinates against TP.HCM boundary', () => {
  assert.equal(isWithinHcmcRegion(10.7769, 106.7009), true); // Ben Thanh
  assert.equal(isWithinHcmcRegion(10.8500, 106.7719), true); // Thu Duc
  assert.equal(isWithinHcmcRegion(21.0285, 105.8542), false); // Hanoi is outside
});

test('validatePointToPointSelection prevents same origin and destination', () => {
  assert.equal(validatePointToPointSelection(1, 1).isValid, false);
  assert.equal(validatePointToPointSelection(1, 2).isValid, true);
  assert.equal(validatePointToPointSelection(null, 2).isValid, false);
  assert.equal(validatePointToPointSelection(1, null).isValid, false);
});

test('calculateHaversineDistanceMeters returns accurate distance', () => {
  // Ben Thanh (10.7725, 106.6980) to Landmark 81 (10.7951, 106.7218) ~ 3.5 km
  const dist = calculateHaversineDistanceMeters(10.7725, 106.6980, 10.7951, 106.7218);
  assert.ok(dist > 3000 && dist < 4500);
});
