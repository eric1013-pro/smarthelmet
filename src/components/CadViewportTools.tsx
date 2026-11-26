import { Box, ChevronDown, Eye, Layers, Sparkles } from 'lucide-react';
import type {
  CadDisplayMode,
  CameraPresetId,
  ShellCoverMode,
} from '../engineering/helmetEngine';

interface CadViewportToolsProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
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
  collapsed,
  onToggleCollapse,
  cameraPreset,
  onSelectCamera,
  displayMode,
  onChangeDisplayMode,
  coverMode,
  onChangeCoverMode,
}: CadViewportToolsProps) {
  const isOpen = !collapsed;

  return (
    <aside
      aria-label="CAD 뷰큐브 및 표시 설정"
      className="pointer-events-none absolute top-4 right-4 z-10 flex flex-col items-end"
    >
      {/* Unified Smooth Morphing ViewCube + Cover + Shading Card */}
      <div
        className={`pointer-events-auto cad-panel-surface bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden ${
          isOpen ? 'w-[196px]' : 'w-[144px]'
        }`}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={isOpen}
          aria-label={isOpen ? '뷰 · 케이스 설정 접기' : '뷰 · 케이스 설정 펼치기'}
          className="w-full px-3 py-2 flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 hover:bg-slate-50/90 active:scale-[0.99] transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Box className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
            <span>{isOpen ? 'VIEWCUBE' : '뷰 · 케이스 설정'}</span>
          </span>
          <ChevronDown
            data-open={isOpen}
            className="cad-chevron w-3.5 h-3.5 text-slate-400 shrink-0"
            aria-hidden="true"
          />
        </button>

        <div className="cad-drawer-grid" data-open={isOpen} aria-hidden={!isOpen}>
          <div className="cad-drawer-inner">
            <div className="px-2.5 pb-2.5 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-3 gap-1">
                {VIEWCUBE_ITEMS.map((item) => {
                  const active = cameraPreset === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      tabIndex={isOpen ? 0 : -1}
                      title={item.label}
                      aria-label={item.label}
                      onClick={() => onSelectCamera(item.id)}
                      className={`py-1 text-[11px] font-semibold rounded-md border transition-all duration-150 ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
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
                <div
                  className="grid grid-cols-3 gap-1"
                  role="group"
                  aria-label="폴리곤 마감 케이스 표시"
                >
                  {COVER_MODES.map((m) => {
                    const active = coverMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        tabIndex={isOpen ? 0 : -1}
                        onClick={() => onChangeCoverMode(m.id)}
                        className={`py-1 text-[11px] font-medium rounded-md border transition-all duration-150 ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
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
                <div
                  className="grid grid-cols-2 gap-1"
                  role="group"
                  aria-label="3D CAD 표시 스타일"
                >
                  {DISPLAY_MODES.map((m) => {
                    const active = displayMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        tabIndex={isOpen ? 0 : -1}
                        onClick={() => onChangeDisplayMode(m.id)}
                        className={`py-1 text-[11px] font-medium rounded-md border transition-all duration-150 ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
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
          </div>
        </div>
      </div>
    </aside>
  );
}

