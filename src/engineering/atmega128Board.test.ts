import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateAtmega128Display,
  FND_IDEAS,
  formatHd44780Line,
  TPK128_LED_MAP,
  type AtmegaScenarioId,
  type FndDisplayMode,
} from './atmega128Board';

const ASCII_16_REGEX = /^[\x20-\x7E]{16}$/;

test('formatHd44780Line always outputs strictly 16 printable ASCII characters', () => {
  assert.equal(formatHd44780Line('SAFE').length, 16);
  assert.equal(formatHd44780Line('0123456789ABCDEFGH').length, 16);
  assert.match(formatHd44780Line('한글테스트W01'), ASCII_16_REGEX);
});

test('all scenarios across workers 1..8 produce valid 16x2 HD44780 ASCII lines', () => {
  const scenarios: AtmegaScenarioId[] = ['safe', 'falling', 'impact', 'rear', 'heat', 'gas'];
  for (const scenario of scenarios) {
    for (let workerId = 1; workerId <= 8; workerId++) {
      const out = evaluateAtmega128Display({
        scenario,
        activeWorkerId: workerId,
        fndMode: 'worker_code',
      });
      assert.match(out.lcdLine1, ASCII_16_REGEX, `Line1 invalid for ${scenario} W${workerId}`);
      assert.match(out.lcdLine2, ASCII_16_REGEX, `Line2 invalid for ${scenario} W${workerId}`);
      if (scenario !== 'safe') {
        assert.ok(
          out.lcdLine1.startsWith(`W0${workerId}:`),
          `Expected worker prefix W0${workerId}: on LCD line 1`,
        );
      }
    }
  }
});

test('8x green LEDs map Y0..Y7 to workers 1..8 and blink only the faulted worker', () => {
  assert.equal(TPK128_LED_MAP.length, 8);

  const safeOut = evaluateAtmega128Display({
    scenario: 'safe',
    activeWorkerId: 3,
    fndMode: 'worker_code',
  });
  assert.equal(safeOut.workerLeds.every((l) => l.state === 'ON'), true);
  assert.equal(safeOut.boardBuzzerOn, false);

  const fallOut = evaluateAtmega128Display({
    scenario: 'falling',
    activeWorkerId: 5,
    fndMode: 'worker_code',
    offlineWorkers: [8],
  });
  assert.equal(fallOut.onlineCount, 7);
  assert.equal(fallOut.boardBuzzerOn, true);
  assert.equal(fallOut.workerLeds.find((l) => l.workerId === 5)?.state, 'BLINK_FAST');
  assert.equal(fallOut.workerLeds.find((l) => l.workerId === 5)?.pin, 'Y4');
  assert.equal(fallOut.workerLeds.find((l) => l.workerId === 8)?.state, 'OFF');
  assert.equal(fallOut.workerLeds.find((l) => l.workerId === 1)?.state, 'ON');

  const heatOut = evaluateAtmega128Display({
    scenario: 'heat',
    activeWorkerId: 2,
    fndMode: 'head_temp',
  });
  assert.equal(heatOut.workerLeds.find((l) => l.workerId === 2)?.state, 'BLINK_SLOW');
});

test('4-digit 7-Segment FND formats all 4 display modes accurately with decimal points', () => {
  assert.equal(FND_IDEAS.length, 4);

  const modes: FndDisplayMode[] = ['worker_code', 'distance', 'head_temp', 'golden_time'];
  for (const mode of modes) {
    const out = evaluateAtmega128Display({
      scenario: 'falling',
      activeWorkerId: 3,
      fndMode: mode,
      elapsedAlertSec: 75,
    });
    assert.equal(out.fnd.digits.length, 4);
    assert.equal(out.fnd.dots.length, 4);
  }

  assert.equal(
    evaluateAtmega128Display({ scenario: 'safe', activeWorkerId: 1, fndMode: 'worker_code' }).fnd
      .formatted,
    '08.00',
  );
  assert.equal(
    evaluateAtmega128Display({ scenario: 'falling', activeWorkerId: 3, fndMode: 'worker_code' }).fnd
      .formatted,
    '03.F1',
  );
  assert.equal(
    evaluateAtmega128Display({ scenario: 'falling', activeWorkerId: 3, fndMode: 'distance' }).fnd
      .formatted,
    '0038',
  );
  assert.equal(
    evaluateAtmega128Display({ scenario: 'heat', activeWorkerId: 4, fndMode: 'head_temp' }).fnd
      .formatted,
    '39.2C',
  );
  assert.equal(
    evaluateAtmega128Display({
      scenario: 'impact',
      activeWorkerId: 6,
      fndMode: 'golden_time',
      elapsedAlertSec: 75,
    }).fnd.formatted,
    '01.15',
  );
});
