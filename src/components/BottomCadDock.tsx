import { ChevronDown, ChevronUp, Volume2, VolumeX } from 'lucide-react';
import {
  calculateSpeedOfSound,
  type CameraPresetId,
  type HazardOutput,
  type ImpactDirection,
  type ModularConfig,
  type PowerBudgetMetrics,
  type ShellCoverMode,
  type WeightAndCoGMetrics,
} from '../engineering/helmetEngine';

export type DockTabId = 'assembly' | 'simulation' | 'modules';

interface BottomCadDockProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: DockTabId;
  onChangeTab: (tab: DockTabId) => void;
  explodeFactor: number;
  onChangeExplode: (v: number) => void;
  cameraPreset: CameraPresetId;
  onSelectCamera: (preset: CameraPresetId) => void;
  showCones: boolean;
  onToggleCones: (v: boolean) => void;
  coverMode: ShellCoverMode;
  onChangeCoverMode: (mode: ShellCoverMode) => void;
  modularConfig: ModularConfig;
  onChangeModularConfig: (patch: Partial<ModularConfig>) => void;
  weightMetrics: WeightAndCoGMetrics;
  powerMetrics: PowerBudgetMetrics;
  impactDirection: ImpactDirection;
  onTriggerImpact: (dir: ImpactDirection) => void;
  isFallingActive: boolean;
  onTriggerFalling: () => void;
  onResetSafe: () => void;
  hazard: HazardOutput;
  audioEnabled: boolean;
  onToggleAudio: () => void;
}

const CAMERA_LABELS: Array<{ id: CameraPresetId; label: string }> = [
  { id: 'overview', label: '헬멧 전체' },
  { id: 'front', label: '헬멧 전면' },
  { id: 'crown', label: '정수리 모듈' },
  { id: 'rear', label: '후면 MCU' },
  { id: 'side', label: '우측면 뷰' },
];

const IMPACT_BUTTONS: Array<{ dir: Exclude<ImpactDirection, 'NONE'>; label: string }> = [
  { dir: 'NORTH', label: '전면(북)' },
  { dir: 'SOUTH', label: '후면(남)' },
  { dir: 'EAST', label: '우측(동)' },
  { dir: 'WEST', label: '좌측(서)' },
  { dir: 'CROWN', label: '정수리' },
];

export function BottomCadDock({
  collapsed,
  onToggleCollapse,
  activeTab,
  onChangeTab,
  explodeFactor,
  onChangeExplode,
  cameraPreset,
  onSelectCamera,
  showCones,
  onToggleCones,
  coverMode,
  onChangeCoverMode,
  modularConfig,
  onChangeModularConfig,
  weightMetrics,
  powerMetrics,
  impactDirection,
  onTriggerImpact,
  isFallingActive,
  onTriggerFalling,
  onResetSafe,
  hazard,
  audioEnabled,
  onToggleAudio,
}: BottomCadDockProps) {
  const soundSpeed = calculateSpeedOfSound(modularConfig.ambientTempC);

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(920px,95vw)] flex flex-col items-center pointer-events-none"
      data-testid="bottom-cad-dock"
    >
      {/* Collapse / Expand Handle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md shadow-xs hover:bg-slate-50 transition-colors whitespace-nowrap"
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            컨트롤 펼치기
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            컨트롤 숨기기
          </>
        )}
      </button>

      {/* Main Unified Solid Dock Surface (No backdrop-filter over WebGL) */}
      {!collapsed && (
        <div className="pointer-events-auto w-full bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
          {/* Dock Header Bar: 3 Tabs + Audio Toggle */}
          <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-1" role="tablist" aria-label="3D 모델링 제어 탭">
              {(
                [
                  { id: 'assembly', label: '조립 및 카메라' },
                  { id: 'simulation', label: '위험 시뮬레이션' },
                  { id: 'modules', label: '모듈 및 공학 수치' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => onChangeTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="hidden sm:inline font-mono-tabular">
                추가중량 {weightMetrics.addonModuleG}g / 150g
              </span>
              <span className="hidden sm:inline" aria-hidden="true">·</span>
              <button
                type="button"
                onClick={onToggleAudio}
                aria-label={audioEnabled ? '부저 알림음 끄기' : '부저 알림음 켜기'}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200/70 rounded-md transition-colors whitespace-nowrap"
              >
                {audioEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                    부저음 켜짐
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    부저음 꺼짐
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tab 1: Assembly & Camera Controls */}
          {activeTab === 'assembly' && (
            <div className="px-4 py-3 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Exploded View Slider */}
                <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                  <label htmlFor="explode-slider" className="text-xs font-medium text-slate-700 whitespace-nowrap">
                    분해도 (Exploded)
                  </label>
                  <input
                    id="explode-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(explodeFactor * 100)}
                    onChange={(e) => onChangeExplode(Number(e.target.value) / 100)}
                    className="cad-slider flex-1"
                  />
                  <span className="text-xs font-mono-tabular text-slate-700 w-9 text-right">
                    {Math.round(explodeFactor * 100)}%
                  </span>
                </div>

                {/* Scene Overlays */}
                <div className="flex items-center gap-4 text-xs text-slate-700">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={coverMode !== 'open'}
                      onChange={(e) => onChangeCoverMode(e.target.checked ? 'closed' : 'open')}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    폴리곤 마감 케이스
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showCones}
                      onChange={(e) => onToggleCones(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    초음파 감지 빔
                  </label>
                </div>
              </div>

              {/* Camera Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500 mr-1 whitespace-nowrap">카메라 시점:</span>
                {CAMERA_LABELS.map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => onSelectCamera(cam.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                      cameraPreset === cam.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Live Hazard & ATmega128 Simulation */}
          {activeTab === 'simulation' && (
            <div className="px-4 py-3 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onTriggerFalling}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      isFallingActive
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    상부 낙하물 테스트
                  </button>

                  <span className="text-xs text-slate-500 ml-1 whitespace-nowrap">5방향 택트 충격:</span>
                  {IMPACT_BUTTONS.map((btn) => (
                    <button
                      key={btn.dir}
                      type="button"
                      onClick={() => onTriggerImpact(btn.dir)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                        impactDirection === btn.dir
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onResetSafe}
                  disabled={hazard.severity === 'SAFE' && !isFallingActive}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  정상 상태 복구
                </button>
              </div>

              {/* Rear Ultrasonic Distance & Gas Slider */}
              <div className="flex flex-wrap items-center gap-5 text-xs text-slate-700">
                <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                  <label htmlFor="rear-dist-slider" className="whitespace-nowrap font-medium">
                    후면 초음파 #2 거리
                  </label>
                  <input
                    id="rear-dist-slider"
                    type="range"
                    min={30}
                    max={250}
                    value={modularConfig.rearObstacleCm}
                    onChange={(e) =>
                      onChangeModularConfig({ rearObstacleCm: Number(e.target.value) })
                    }
                    className="cad-slider flex-1"
                  />
                  <span className="font-mono-tabular w-12 text-right">
                    {modularConfig.rearObstacleCm}cm
                  </span>
                </div>

                {modularConfig.includeMq2 && (
                  <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                    <label htmlFor="mq2-slider" className="whitespace-nowrap font-medium">
                      MQ-2 가스 농도
                    </label>
                    <input
                      id="mq2-slider"
                      type="range"
                      min={20}
                      max={600}
                      value={modularConfig.gasPpm}
                      onChange={(e) => onChangeModularConfig({ gasPpm: Number(e.target.value) })}
                      className="cad-slider flex-1"
                    />
                    <span className="font-mono-tabular w-16 text-right">
                      {modularConfig.gasPpm}ppm
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Optional Modular Kit Sensors & Engineering Specs */}
          {activeTab === 'modules' && (
            <div className="px-4 py-3 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-800">
                  <span className="font-semibold text-slate-900">보유 키트 확장 슬롯:</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={modularConfig.includeDht11}
                      onChange={(e) => onChangeModularConfig({ includeDht11: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    DHT11 온습도 (+4g)
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={modularConfig.includeMq2}
                      onChange={(e) => onChangeModularConfig({ includeMq2: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    MQ-2 가스 (+14g, 800mW)
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={modularConfig.includeKy037}
                      onChange={(e) => onChangeModularConfig({ includeKy037: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    KY-037 소음 (+5g)
                  </label>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <label htmlFor="temp-slider" className="whitespace-nowrap">외기온도</label>
                  <input
                    id="temp-slider"
                    type="range"
                    min={-15}
                    max={45}
                    value={modularConfig.ambientTempC}
                    onChange={(e) => onChangeModularConfig({ ambientTempC: Number(e.target.value) })}
                    className="cad-slider w-24"
                  />
                  <span className="font-mono-tabular w-24 text-right">
                    {modularConfig.ambientTempC}°C ({soundSpeed}m/s)
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-mono-tabular border-t border-slate-100 pt-2">
                <span>
                  총중량 <strong className="text-slate-900">{weightMetrics.totalG}g</strong> (모듈{' '}
                  {weightMetrics.addonModuleG}g)
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  CoG 편심 <strong className="text-slate-900">{weightMetrics.cogOffsetMm}mm</strong> ({weightMetrics.balanceLabel})
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  소비전력 <strong className="text-slate-900">{powerMetrics.totalPowerMw}mW</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  2500mAh 예상 구동{' '}
                  <strong className={powerMetrics.exceedsShift8h ? 'text-emerald-700' : 'text-amber-700'}>
                    {powerMetrics.batteryHours}시간
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
