import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CINEMATIC_CHAPTERS,
  CINEMATIC_DURATION_SEC,
  evaluateCinematicFrame,
} from './cinematicTimeline.ts';

test('Chapter 1 starts with bare base safety helmet and all addon modules hidden', () => {
  const f = evaluateCinematicFrame(1.2);
  assert.equal(f.chapter.index, 0);
  assert.equal(f.stages.base, 1);
  assert.equal(f.stages.frame, 0);
  assert.equal(f.stages.rear, 0);
  assert.equal(f.stages.crown, 0);
  assert.equal(f.stages.perimeter, 0);
  assert.equal(f.stages.cover, 0);
  assert.equal(f.beamScale, 0);
  assert.equal(f.severity, 'SAFE');
});

test('Chapter 2 & 3 sequentially mount clip-on frame then rear Arduino Uno R3 with rear camera sweep', () => {
  const f2 = evaluateCinematicFrame(5.5);
  assert.equal(f2.chapter.index, 1);
  assert.equal(f2.stages.frame, 1);
  assert.equal(f2.stages.rear, 0);

  const f3 = evaluateCinematicFrame(8.8);
  assert.equal(f3.chapter.index, 2);
  assert.ok(f3.stages.rear > 0.85, 'rear Arduino MCU module should be nearly seated');
  assert.ok(f3.cameraPos[2] < -2.0, 'camera should sweep behind helmet to show Uno R3 & HC-SR04 #2');
});

test('Chapter 4 activates crown, 5-way tactile switches, LEDs, and ultrasonic beams', () => {
  const f4 = evaluateCinematicFrame(13.6);
  assert.equal(f4.chapter.index, 3);
  assert.equal(f4.stages.crown, 1);
  assert.equal(f4.stages.perimeter, 1);
  assert.equal(f4.stages.optional, 1);
  assert.equal(f4.beamScale, 1);
  assert.equal(f4.greenLedOn, true);
  assert.equal(f4.severity, 'SAFE');
});

test('Chapter 5 triggers live falling object detection, 4Hz red LEDs, and active buzzer alarm', () => {
  const f5 = evaluateCinematicFrame(16.2);
  assert.equal(f5.chapter.index, 4);
  assert.ok(f5.fallingProgress !== null && f5.fallingProgress > 0.8);
  assert.equal(f5.severity, 'CRITICAL');
  assert.equal(f5.redLedHz, 4);
  assert.equal(f5.greenLedOn, false);
  assert.equal(f5.buzzerActive, true);
  assert.equal(f5.impactDirection, 'CROWN');
});

test('Chapter 6 restores SAFE state and seats solid geodesic polygon finishing cover at finale', () => {
  const f6 = evaluateCinematicFrame(CINEMATIC_DURATION_SEC);
  assert.equal(f6.chapter.index, CINEMATIC_CHAPTERS.length - 1);
  assert.equal(f6.severity, 'SAFE');
  assert.equal(f6.greenLedOn, true);
  assert.equal(f6.buzzerActive, false);
  assert.equal(f6.stages.cover, 1);
  assert.equal(f6.polygonOpacity, 1);
});
