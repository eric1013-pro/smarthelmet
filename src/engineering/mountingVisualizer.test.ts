import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_OPEN_MOUNT_STEP,
  evaluateMountStageProgress,
  getActiveMountStepMeta,
  MAX_MOUNT_STEP,
  MOUNT_STEPS,
} from './mountingVisualizer';

test('MOUNT_STEPS covers all 7 sequential stages from base (0) to polygon cover (6)', () => {
  assert.equal(MOUNT_STEPS.length, 7);
  assert.equal(MOUNT_STEPS[0].stage, 'base');
  assert.equal(MOUNT_STEPS[DEFAULT_OPEN_MOUNT_STEP].stage, 'optional');
  assert.equal(MOUNT_STEPS[MAX_MOUNT_STEP].stage, 'cover');
});

test('evaluateMountStageProgress keeps base seated and progressively mounts subsequent stages', () => {
  assert.equal(evaluateMountStageProgress(0, 'base'), 1);
  assert.equal(evaluateMountStageProgress(0, 'frame'), 0);
  assert.equal(evaluateMountStageProgress(0.5, 'frame'), 0.875); // easeOutCubic(0.5)
  assert.equal(evaluateMountStageProgress(1, 'frame'), 1);
  assert.equal(evaluateMountStageProgress(1, 'rear'), 0);
  assert.equal(evaluateMountStageProgress(5, 'optional'), 1);
  assert.equal(evaluateMountStageProgress(5, 'cover'), 0);
  assert.equal(evaluateMountStageProgress(6, 'cover'), 1);
});

test('getActiveMountStepMeta resolves step metadata accurately across progress range', () => {
  assert.equal(getActiveMountStepMeta(0).step, 0);
  assert.equal(getActiveMountStepMeta(2.4).stage, 'crown');
  assert.equal(getActiveMountStepMeta(5).stage, 'optional');
  assert.equal(getActiveMountStepMeta(6).stage, 'cover');
});
