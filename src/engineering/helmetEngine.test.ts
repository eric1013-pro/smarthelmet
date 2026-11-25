import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSpeedOfSound,
  measureUltrasonicDistanceCm,
  computeTemperatureErrorCm,
  detectFallingObject,
  evaluateSystemWeightAndCoG,
  computePowerBudget,
  evaluateHazardState,
} from './helmetEngine';

test('calculateSpeedOfSound follows Rudyk et al. linear temperature model', () => {
  assert.equal(calculateSpeedOfSound(20), 343.42);
  assert.equal(calculateSpeedOfSound(-15), 322.21);
  assert.equal(calculateSpeedOfSound(40), 355.54);
});

test('measureUltrasonicDistanceCm converts echo pulse width accurately', () => {
  // At 20°C (343.42 m/s), 100 cm round trip = 2m / 343.42 = 5823.77 us
  const dist = measureUltrasonicDistanceCm(5824, 20);
  assert.ok(Math.abs(dist - 100) < 0.2, `Expected ~100cm, got ${dist}`);
  assert.equal(measureUltrasonicDistanceCm(0, 20), 0);
});

test('computeTemperatureErrorCm reproduces winter -15°C overestimate (~13.2cm at 200cm)', () => {
  const err = computeTemperatureErrorCm(200, -15);
  assert.ok(err > 12.5 && err < 14.0, `Expected ~13.2cm error, got ${err}`);
  assert.equal(computeTemperatureErrorCm(200, 20), 0);
});

test('detectFallingObject triggers on rapidly descending object and ignores static ceiling', () => {
  const falling = detectFallingObject([
    { timeMs: 0, distanceCm: 220 },
    { timeMs: 100, distanceCm: 185 },
    { timeMs: 200, distanceCm: 140 },
  ]);
  assert.equal(falling.detected, true);
  assert.equal(falling.closingSpeedCmPerSec, 400);
  assert.equal(falling.latestDistanceCm, 140);

  const staticCeiling = detectFallingObject([
    { timeMs: 0, distanceCm: 180 },
    { timeMs: 200, distanceCm: 179 },
  ]);
  assert.equal(staticCeiling.detected, false);
});

test('evaluateSystemWeightAndCoG meets KCs 150g modular add-on target in core configuration', () => {
  const core = evaluateSystemWeightAndCoG({
    includeDht11: true,
    includeMq2: false,
    includeKy037: false,
    ambientTempC: 20,
    rearObstacleCm: 185,
    gasPpm: 40,
  });
  assert.equal(core.kcsWeightCompliant, true);
  assert.ok(core.addonModuleG <= 150);

  const fullLoaded = evaluateSystemWeightAndCoG({
    includeDht11: true,
    includeMq2: true,
    includeKy037: true,
    ambientTempC: 20,
    rearObstacleCm: 185,
    gasPpm: 40,
  });
  assert.equal(fullLoaded.addonModuleG, 150);
  assert.equal(fullLoaded.kcsWeightCompliant, true);
});

test('computePowerBudget accurately captures MQ-2 ceramic heater bottleneck', () => {
  const withoutMq2 = computePowerBudget({
    includeDht11: true,
    includeMq2: false,
    includeKy037: false,
    ambientTempC: 20,
    rearObstacleCm: 185,
    gasPpm: 40,
  });
  const withMq2 = computePowerBudget({
    includeDht11: true,
    includeMq2: true,
    includeKy037: false,
    ambientTempC: 20,
    rearObstacleCm: 185,
    gasPpm: 40,
  });
  assert.equal(withoutMq2.exceedsShift8h, true);
  assert.ok(withoutMq2.batteryHours > 15);
  assert.equal(withMq2.exceedsShift8h, false);
  assert.ok(withMq2.batteryHours < 7);
});

test('evaluateHazardState formats strict 16x2 LCD output and 8 green worker LEDs', () => {
  const safe = evaluateHazardState({
    fallingDetected: false,
    fallingDistanceCm: 300,
    fallingSpeedCmPerSec: 0,
    impactDirection: 'NONE',
    rearObstacleCm: 185,
    gasPpm: 45,
    includeMq2: false,
    activeWorkerCount: 8,
  });
  assert.equal(safe.severity, 'SAFE');
  assert.equal(safe.lcdLine1.length, 16);
  assert.equal(safe.lcdLine2.length, 16);
  assert.equal(safe.workerGreenLeds.filter(Boolean).length, 8);
  assert.equal(safe.helmetRedHz, 0);

  const fall = evaluateHazardState({
    fallingDetected: true,
    fallingDistanceCm: 75,
    fallingSpeedCmPerSec: 380,
    impactDirection: 'NONE',
    rearObstacleCm: 185,
    gasPpm: 45,
    includeMq2: false,
    activeWorkerCount: 8,
  });
  assert.equal(fall.severity, 'CRITICAL');
  assert.equal(fall.lcdLine1.trim(), 'WARNING: FALLING');
  assert.equal(fall.workerGreenLeds[0], false);
  assert.equal(fall.workerGreenLeds.filter(Boolean).length, 7);
  assert.equal(fall.helmetRedHz, 2.5);

  const impact = evaluateHazardState({
    fallingDetected: false,
    fallingDistanceCm: 300,
    fallingSpeedCmPerSec: 0,
    impactDirection: 'EAST',
    rearObstacleCm: 185,
    gasPpm: 45,
    includeMq2: false,
    activeWorkerCount: 8,
  });
  assert.equal(impact.severity, 'CRITICAL');
  assert.equal(impact.lcdLine1.trim(), 'ALERT: HIT E-RGT');
  assert.equal(impact.buzzerMode, 'RAPID');
});
