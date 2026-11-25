import { Box, Eye, Layers, Sparkles } from 'lucide-react';
import type {
  CadDisplayMode,
  CameraPresetId,
  ShellCoverMode,
} from '../engineering/helmetEngine';

interface CadViewportToolsProps {
  cameraPreset: CameraPresetId;
  onSelectCamera: (preset: CameraPresetId) => void;
  displayMode: CadDisplayMode;
  onChangeDisplayMode: (mode: CadDisplayMode) => void;
  coverMode: ShellCoverMode;
  onChangeCoverMode: (mode: ShellCoverMode) => void;
}

const VIEWCUBE_ITEMS: Array<{ id: CameraPresetId; short: string; label: string }> = [
  { id: 'overview', short: 'ISO', label: '등각 투상 (ISO)' },
  { id: 'crown', short: '평면', label: '평면도 (Top)' },
  { id: 'front', short: '정면', label: '정면도 (Front)' },
  { id: 'rear', short: '배면', label: '배면도 (Rear)' },
  { id: 'left', short: '좌측', label: '좌측면도 (Left)' },
  { id: 'side', short: '우측', label: '우측면도 (Right)' },
];

const DISPLAY_MODES: Array<{ id: CadDisplayMode; label: string }> = [
  { id: 'shaded-edges', label: '모서리' },
  { id: 'realistic', label: '실사' },
  { id: 'xray', label: '투시' },
  { id: 'wireframe', label: '와이어' },
];

const COVER_MODES: Array<{ id: ShellCoverMode; label: string }> = [
  { id: 'closed', label: '씌우기' },
  { id: 'translucent', label: '반투명' },
  { id: 'open', label: '제거' },
];

export function CadViewportTools({
  cameraPreset,
  onSelectCamera,
  displayMode,
  onChangeDisplayMode,
  coverMode,
  onChangeCoverMode,
}: CadViewportToolsProps) {
  return (
    <aside
      aria-label="CAD 뷰큐브 및 표시 설정"
      className="pointer-events-none absolute top-4 right-4 z-10 flex flex-col items-end gap-2"
    >
      {/* SolidWorks / Fusion 360 Style ViewCube Panel */}
      <div className="pointer-events-auto bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs w-[176px]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700">
            <Box className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
            VIEWCUBE
          </span>
          <span className="text-[10px] font-mono-tabular text-slate-400">mm · Z+</span>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {VIEWCUBE_ITEMS.map((item) => {
            const active = cameraPreset === item.id;
            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                aria-label={item.label}
                onClick={() => onSelectCamera(item.id)}
                className={`py-1 text-[11px] font-semibold rounded border transition-colors ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {item.short}
              </button>
            );
          })}
        </div>

        {/* Removable Geodesic Polygon Box Finishing Cover Mode */}
        <div className="mt-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 mb-1.5">
            <Layers className="w-3 h-3 text-slate-500" aria-hidden="true" />
            폴리곤 마감 케이스
          </div>
          <div className="grid grid-cols-3 gap-1" role="group" aria-label="폴리곤 마감 케이스 표시">
            {COVER_MODES.map((m) => {
              const active = coverMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangeCoverMode(m.id)}
                  className={`py-1 text-[11px] font-medium rounded border transition-colors ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* CAD Display Shading Style */}
        <div className="mt-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 mb-1.5">
            {displayMode === 'realistic' ? (
              <Sparkles className="w-3 h-3 text-slate-500" aria-hidden="true" />
            ) : (
              <Eye className="w-3 h-3 text-slate-500" aria-hidden="true" />
            )}
            표시 스타일
          </div>
          <div className="grid grid-cols-2 gap-1" role="group" aria-label="3D CAD 표시 스타일">
            {DISPLAY_MODES.map((m) => {
              const active = displayMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangeDisplayMode(m.id)}
                  className={`py-1 text-[11px] font-medium rounded border transition-colors ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
