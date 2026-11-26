import type { AssemblyStage } from './cinematicTimeline';
import type { CameraPresetId } from './helmetEngine';

export interface MountStepMeta {
  step: number;
  shortLabel: string;
  title: string;
  detail: string;
  pins: string;
  stage: AssemblyStage;
  camera: CameraPresetId;
}

export const MOUNT_STEPS: MountStepMeta[] = [
  {
    step: 0,
    shortLabel: '0. 기본모체',
    title: 'KCs ABE종 산업용 안전모 모체',
    detail: '무천공 원형 안전모 (AC 20kV 절연 및 충격 흡수 구조 그대로 보존)',
    pins: '비파괴 모체',
    stage: 'base',
    camera: 'overview',
  },
  {
    step: 1,
    shortLabel: '1. 프레임·배선',
    title: '4점 무천공 클립 프레임 & 5색 하네스',
    detail: '안전모 림 4점 클램프 + 상부 아치 레일 + 5색 듀폰 점퍼 케이블 장착',
    pins: '5V / GND 공통 분배',
    stage: 'frame',
    camera: 'overview',
  },
  {
    step: 2,
    shortLabel: '2. 후면 MCU',
    title: 'Arduino Uno R3 · 2500mAh 배터리 · HC-SR04 #2',
    detail: '후면 CoG 균형 캐리어 + 후방 사각지대 초음파 + 하부 남쪽 택트 스위치',
    pins: 'D4/D5 (초음파#2) · D7 (남쪽택트)',
    stage: 'rear',
    camera: 'rear',
  },
  {
    step: 3,
    shortLabel: '3. 정수리 센서',
    title: 'HC-SR04 #1 (낙하물) · 5V 능동 부저 · 정수리 택트',
    detail: '상향 30° 낙하물 초음파 + 2N2222 구동 95dB 부저 + 정수리 충격 스위치',
    pins: 'D2/D3 (초음파#1) · D13 (부저) · D10 (택트)',
    stage: 'crown',
    camera: 'crown',
  },
  {
    step: 4,
    shortLabel: '4. LED·택트',
    title: '틈새 5방향 택트 & 전면 최소 LED (적1·녹1)',
    detail: '외피-모체 틈새 충격 스위치(N/S/E/W/TOP) + 전면 이마 최적 위치 LED 2개',
    pins: 'D6~D10 (틈새택트) · D11(적1) · D12(녹1)',
    stage: 'perimeter',
    camera: 'front',
  },
  {
    step: 5,
    shortLabel: '5. 내부·확장',
    title: '내부 두부 DHT11 온습도 & 확장 슬롯 (MQ-2 · KY-037)',
    detail: '헬멧 안쪽 머리 상단 DHT11(열사병 감지) · 전면 MQ-2 · 좌측 KY-037',
    pins: 'A0 (내부DHT11) · A1 (MQ-2) · A2 (KY-037)',
    stage: 'optional',
    camera: 'side',
  },
  {
    step: 6,
    shortLabel: '6. 마감외피',
    title: '폴리곤 마감 케이스 씌우기 (틈새 택트 연동)',
    detail: '전면 LED 2개·초음파 2조·부저는 외부 노출, 5방향 택트는 외피 틈새에서 연동 눌림',
    pins: '외피-택트 연동 마감',
    stage: 'cover',
    camera: 'overview',
  },
];

export const MAX_MOUNT_STEP = 6;
export const DEFAULT_OPEN_MOUNT_STEP = 5;

const STAGE_ORDER: Record<AssemblyStage, number> = {
  base: 0,
  frame: 1,
  rear: 2,
  crown: 3,
  perimeter: 4,
  optional: 5,
  cover: 6,
};

function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/**
 * Computes the smooth 0..1 mounting progress for a given assembly stage
 * given a continuous mountProgress value in [0, 6].
 * - 0: hidden (not yet mounted)
 * - 0..1: actively gliding into seated position
 * - 1: fully mounted in place
 */
export function evaluateMountStageProgress(mountProgress: number, stage: AssemblyStage): number {
  const idx = STAGE_ORDER[stage];
  if (idx === 0) return 1; // Base helmet is always seated
  if (mountProgress <= idx - 1) return 0;
  if (mountProgress >= idx) return 1;
  return easeOutCubic(mountProgress - (idx - 1));
}

/**
 * Returns the active mounting step metadata corresponding to a continuous progress [0, 6].
 */
export function getActiveMountStepMeta(mountProgress: number): MountStepMeta {
  const clamped = Math.max(0, Math.min(MAX_MOUNT_STEP, mountProgress));
  const idx = clamped <= 0.01 ? 0 : Math.min(MAX_MOUNT_STEP, Math.ceil(clamped - 0.001));
  return MOUNT_STEPS[idx];
}
