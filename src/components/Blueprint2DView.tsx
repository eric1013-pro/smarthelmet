import { useCallback, useRef, useState, type PointerEvent, type RefObject, type WheelEvent } from 'react';
import { BookOpen, Compass, Film, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import {
  HELMET_DIMENSIONS_MM,
  type HazardOutput,
  type ModularConfig,
  type PowerBudgetMetrics,
  type WeightAndCoGMetrics,
} from '../engineering/helmetEngine';
import { AssemblyManualView } from './AssemblyManualView';

interface Blueprint2DViewProps {
  svgRef: RefObject<SVGSVGElement | null>;
  modularConfig: ModularConfig;
  weightMetrics: WeightAndCoGMetrics;
  powerMetrics: PowerBudgetMetrics;
  hazard: HazardOutput;
  onOpenCinematic: () => void;
}

type PaperTheme = 'ks-mono' | 'autocad' | 'blueprint';
type BlueprintDocMode = 'manual' | 'cad';

export function Blueprint2DView({
  svgRef,
  modularConfig,
  weightMetrics,
  powerMetrics,
  onOpenCinematic,
}: Blueprint2DViewProps) {
  const [docMode, setDocMode] = useState<BlueprintDocMode>('manual');
  const [paperTheme, setPaperTheme] = useState<PaperTheme>('ks-mono');
  const [showPolygonCover, setShowPolygonCover] = useState(true);
  const [showHiddenLines, setShowHiddenLines] = useState(true);
  const [showCenterLines, setShowCenterLines] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showSectionHatch, setShowSectionHatch] = useState(true);
  const [showCallouts, setShowCallouts] = useState(true);

  // Interactive CAD Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  const handleZoomIn = useCallback(
    () => setZoom((z) => Math.min(2.4, Number((z + 0.2).toFixed(2)))),
    [],
  );
  const handleZoomOut = useCallback(
    () => setZoom((z) => Math.max(0.65, Number((z - 0.2).toFixed(2)))),
    [],
  );
  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && Math.abs(e.deltaY) < 4) return;
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((z) => Math.max(0.65, Math.min(2.4, Number((z + delta).toFixed(2)))));
  }, []);

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        origX: pan.x,
        origY: pan.y,
      };
      setIsDragging(true);
    },
    [pan.x, pan.y],
  );

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    setPan({
      x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false;
    setIsDragging(false);
  }, []);

  // Authentic KS B 0001 Monochrome Ink / AutoCAD Dark / Classic Cyanotype Blueprint palettes
  const p =
    paperTheme === 'ks-mono'
      ? {
          viewportBg: 'bg-neutral-200',
          sheetBg: '#ffffff',
          ink: '#0d0d0d',
          inkMid: '#2e2e2e',
          inkFine: '#525252',
          center: '#404040',
          hidden: '#404040',
          dim: '#171717',
          projGuide: '#c4c4c4',
          polyOuter: '#171717',
          polySeam: '#595959',
          hatch1: '#262626',
          hatch2: '#525252',
          tableHeaderBg: '#f3f4f6',
          gridFaint: 'rgba(0,0,0,0.03)',
        }
      : paperTheme === 'autocad'
        ? {
            viewportBg: 'bg-slate-950',
            sheetBg: '#12161f',
            ink: '#f8fafc',
            inkMid: '#cbd5e1',
            inkFine: '#94a3b8',
            center: '#f87171',
            hidden: '#94a3b8',
            dim: '#38bdf8',
            projGuide: 'rgba(148,163,184,0.22)',
            polyOuter: '#fbbf24',
            polySeam: 'rgba(251,191,36,0.58)',
            hatch1: 'rgba(248,250,252,0.45)',
            hatch2: 'rgba(251,191,36,0.55)',
            tableHeaderBg: 'rgba(255,255,255,0.05)',
            gridFaint: 'rgba(148,163,184,0.055)',
          }
        : {
            viewportBg: 'bg-slate-900',
            sheetBg: '#0b2545',
            ink: '#f0f7ff',
            inkMid: '#cfe6ff',
            inkFine: '#93c5fd',
            center: '#7dd3fc',
            hidden: '#bae6fd',
            dim: '#e0f2fe',
            projGuide: 'rgba(147,197,253,0.24)',
            polyOuter: '#fde68a',
            polySeam: 'rgba(253,230,138,0.58)',
            hatch1: 'rgba(240,247,255,0.42)',
            hatch2: 'rgba(253,230,138,0.52)',
            tableHeaderBg: 'rgba(240,247,255,0.08)',
            gridFaint: 'rgba(147,197,253,0.07)',
          };

  const zoneCols = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const zoneRows = ['A', 'B', 'C', 'D'];

  const bomItems = [
    { no: '1', name: 'KCs ABE 안전모 모체', spec: '282×222×162 (무천공)', mat: 'ABS / PC', qty: '1' },
    { no: '2', name: '폴리곤 마감 케이스', spec: '2V 지오데식 탈착 외피', mat: '크라프트 골판지', qty: '1' },
    { no: '3', name: 'Arduino Uno R3 MCU', spec: 'ATmega328P / CH340', mat: 'FR-4 PCB', qty: '1' },
    { no: '4', name: '초음파 거리 센서', spec: 'HC-SR04 (상부·후면)', mat: 'PCB / Al', qty: '2' },
    { no: '5', name: '능동 피에조 부저', spec: 'DC 5V / 85dB @ 10cm', mat: 'ABS / Piezo', qty: '1' },
    { no: '6', name: '5방향 택트 스위치', spec: '12×12mm + 원형 캡', mat: 'PA66 / Cu', qty: '5' },
    { no: '7', name: '양방향 경고 LED·저항', spec: 'Ø5 적3·녹3 / 220Ω', mat: 'Epoxy', qty: '6' },
    { no: '8', name: '클립형 림·아치 프레임', spec: '4점 비파괴 클램프', mat: 'PETG / TPU', qty: '1' },
    { no: '9', name: '리튬이온 전원 모듈', spec: '5V 2500mAh 파우치', mat: 'Li-Ion', qty: '1' },
  ];

  // Shared Third-Angle Orthographic Projection Coordinates
  // Top View directly above Front View on X = 290
  // Right Side / Section A-A directly right of Front View on Y_BASE = 776
  const X_FRONT = 290;
  const Y_TOP = 248;
  const Y_BASE = 776;
  const X_SIDE = 724;

  return (
    <div className={`flex flex-col h-full ${docMode === 'manual' ? 'bg-[#e6eef6]' : p.viewportBg} overflow-hidden`}>
      {/* Dual-Mode 2D Drafting & LEGO-Style Assembly Manual Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2 bg-white border-b border-slate-200 shrink-0 z-10">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          {/* Primary Format Switcher: LEGO Assembly Manual vs KS ISO A3 Mechanical CAD */}
          <div className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200" role="tablist" aria-label="2D 도면 형식 선택">
            <button
              type="button"
              role="tab"
              aria-selected={docMode === 'manual'}
              onClick={() => setDocMode('manual')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                docMode === 'manual'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              단계별 조립 설명서
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={docMode === 'cad'}
              onClick={() => setDocMode('cad')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                docMode === 'cad'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              KS 기계 도면 (ISO A3)
            </button>
          </div>

          {docMode === 'cad' ? (
            <>
              <span className="font-semibold text-slate-900">
                KS B 0001 · 제3각법
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">척도 1:2</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">단위 mm</span>
              <div className="inline-flex items-center gap-1 ml-1 pl-2 border-l border-slate-200">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  aria-label="도면 축소"
                  className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                >
                  <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <span className="font-mono-tabular text-[11px] font-semibold text-slate-800 w-10 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  aria-label="도면 확대"
                  className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  aria-label="도면 화면 맞춤"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 rounded transition-colors"
                >
                  <Maximize2 className="w-3 h-3" aria-hidden="true" />
                  맞춤
                </button>
              </div>
            </>
          ) : (
            <span className="text-xs text-slate-500 hidden md:inline">
              실물 제작용 8단계 시각 가이드 · 부품 수량·방향 화살표·핀 번호 포함
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {docMode === 'cad' && (
            <>
              {/* Paper Mode Switcher */}
              <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md">
                {(
                  [
                    { id: 'ks-mono', label: 'KS 흑백 도면' },
                    { id: 'autocad', label: 'AutoCAD 다크' },
                    { id: 'blueprint', label: '청사진' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaperTheme(opt.id)}
                    className={`px-2 py-1 text-[11px] font-medium rounded whitespace-nowrap transition-colors ${
                      paperTheme === opt.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Real CAD Layer Toggles */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-700">
                <label className="inline-flex items-center gap-1 cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={showPolygonCover}
                    onChange={(e) => setShowPolygonCover(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  폴리곤 외피
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={showHiddenLines}
                    onChange={(e) => setShowHiddenLines(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  은선
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={showCenterLines}
                    onChange={(e) => setShowCenterLines(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  중심선
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={showDimensions}
                    onChange={(e) => setShowDimensions(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  치수선
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={showSectionHatch}
                    onChange={(e) => setShowSectionHatch(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  A-A 해칭
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={showCallouts}
                    onChange={(e) => setShowCallouts(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  품번
                </label>
              </div>
            </>
          )}

          {/* Discreet Cinematic Showcase Entry tucked inside 2D Blueprint Toolbar */}
          <button
            type="button"
            onClick={onOpenCinematic}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-md transition-colors whitespace-nowrap"
          >
            <Film className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            시네마틱 영상
          </button>
        </div>
      </div>

      {docMode === 'manual' ? (
        <AssemblyManualView svgRef={svgRef} modularConfig={modularConfig} />
      ) : (
        /* Interactive Pan/Zoom ISO A3 Technical Drawing Viewport */
        <div
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`flex-1 overflow-auto p-3 flex justify-center items-center select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
        <div
          className="h-full max-h-[calc(100vh-124px)] aspect-[1480/1000] max-w-full shadow-md border border-neutral-400/70 transition-transform duration-75 origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg
            ref={svgRef}
            data-testid="blueprint-2d-svg"
            viewBox="0 0 1480 1000"
            className="w-full h-full block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Faint Drafting Sheet Reference Grid */}
              <pattern id="cadGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke={p.gridFaint}
                  strokeWidth="0.6"
                />
              </pattern>

              {/* ISO 128 45° Cross-Section Hatching (Helmet ABS/PC Shell) */}
              <pattern
                id="isoHatch45"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <line x1="0" y1="0" x2="0" y2="6" stroke={p.hatch1} strokeWidth="0.75" />
              </pattern>

              {/* ISO 128 135° Cross-Section Hatching (Mating Polygon Finishing Cover) */}
              <pattern
                id="isoHatch135"
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(135)"
              >
                <line x1="0" y1="0" x2="0" y2="8" stroke={p.hatch2} strokeWidth="0.75" />
              </pattern>

              {/* Authentic 15° Sharp Filled ISO Mechanical CAD Arrowheads */}
              <marker
                id="cadArrowStart"
                markerWidth="10"
                markerHeight="4"
                refX="0"
                refY="2"
                orient="auto"
              >
                <path d="M10,0.3 L0,2 L10,3.7 Z" fill={p.dim} />
              </marker>
              <marker
                id="cadArrowEnd"
                markerWidth="10"
                markerHeight="4"
                refX="10"
                refY="2"
                orient="auto"
              >
                <path d="M0,0.3 L10,2 L0,3.7 Z" fill={p.dim} />
              </marker>
              <marker
                id="cadLeaderDot"
                markerWidth="5"
                markerHeight="5"
                refX="2.5"
                refY="2.5"
              >
                <circle cx="2.5" cy="2.5" r="1.8" fill={p.ink} />
              </marker>
              <marker
                id="secPlaneArrow"
                markerWidth="11"
                markerHeight="6"
                refX="11"
                refY="3"
                orient="auto"
              >
                <path d="M0,0.4 L11,3 L0,5.6 Z" fill={p.ink} />
              </marker>
            </defs>

            {/* ISO A3 Drawing Sheet Background */}
            <rect x="0" y="0" width="1480" height="1000" fill={p.sheetBg} />
            <rect x="36" y="36" width="1408" height="928" fill="url(#cadGrid)" />

            {/* ISO 5457 Outer Trim Border & Inner Thick Frame */}
            <rect x="14" y="14" width="1452" height="972" fill="none" stroke={p.ink} strokeWidth="0.9" />
            <rect x="36" y="36" width="1408" height="928" fill="none" stroke={p.ink} strokeWidth="2.1" />

            {/* Centering Marks (ISO 5457 Mandatory Sheet Center Ticks) */}
            <g stroke={p.ink} strokeWidth="1.4">
              <line x1="740" y1="14" x2="740" y2="46" />
              <line x1="740" y1="954" x2="740" y2="986" />
              <line x1="14" y1="500" x2="46" y2="500" />
              <line x1="1434" y1="500" x2="1466" y2="500" />
            </g>

            {/* Zone Columns 1..8 */}
            {zoneCols.map((col, i) => {
              const x0 = 36 + i * (1408 / 8);
              const xm = x0 + 1408 / 16;
              return (
                <g key={col} fontFamily="JetBrains Mono, monospace" fontSize="10" fill={p.inkMid}>
                  {i > 0 && (
                    <>
                      <line x1={x0} y1="14" x2={x0} y2="36" stroke={p.ink} strokeWidth="0.8" />
                      <line x1={x0} y1="964" x2={x0} y2="986" stroke={p.ink} strokeWidth="0.8" />
                    </>
                  )}
                  <text x={xm} y="28.5" textAnchor="middle">{col}</text>
                  <text x={xm} y="978.5" textAnchor="middle">{col}</text>
                </g>
              );
            })}

            {/* Zone Rows A..D */}
            {zoneRows.map((row, i) => {
              const y0 = 36 + i * (928 / 4);
              const ym = y0 + 928 / 8;
              return (
                <g key={row} fontFamily="JetBrains Mono, monospace" fontSize="10" fill={p.inkMid}>
                  {i > 0 && (
                    <>
                      <line x1="14" y1={y0} x2="36" y2={y0} stroke={p.ink} strokeWidth="0.8" />
                      <line x1="1444" y1={y0} x2="1466" y2={y0} stroke={p.ink} strokeWidth="0.8" />
                    </>
                  )}
                  <text x="25" y={ym + 3.5} textAnchor="middle">{row}</text>
                  <text x="1455" y={ym + 3.5} textAnchor="middle">{row}</text>
                </g>
              );
            })}

            {/* Subtle Orthographic Projection Alignment Tie Lines (Top <-> Front <-> Right Side) */}
            {showCenterLines && (
              <g stroke={p.projGuide} strokeWidth="0.65" strokeDasharray="3 4">
                {/* Vertical projection guides: Top View <-> Front View */}
                <line x1={X_FRONT - 90} y1={Y_TOP + 135} x2={X_FRONT - 90} y2={Y_BASE - 150} />
                <line x1={X_FRONT} y1={Y_TOP + 166} x2={X_FRONT} y2={Y_BASE - 210} />
                <line x1={X_FRONT + 90} y1={Y_TOP + 135} x2={X_FRONT + 90} y2={Y_BASE - 150} />
                {/* Horizontal projection guides: Front View <-> Section A-A Right Side */}
                <line x1={X_FRONT + 125} y1={Y_BASE} x2={X_SIDE - 160} y2={Y_BASE} />
                <line x1={X_FRONT + 125} y1={Y_BASE - 130} x2={X_SIDE - 120} y2={Y_BASE - 130} />
                {showPolygonCover && (
                  <line x1={X_FRONT + 110} y1={Y_BASE - 180} x2={X_SIDE - 120} y2={Y_BASE - 180} />
                )}
              </g>
            )}

            {/* =================================================================
                VIEW 1 (TOP-LEFT): 평면도 (TOP VIEW — 제3각법, 전면 = 하단)
                Aligned directly above Front View on X = X_FRONT (290)
            ================================================================= */}
            <g transform={`translate(${X_FRONT}, ${Y_TOP})`}>
              {/* Centerlines */}
              {showCenterLines && (
                <g stroke={p.center} strokeWidth="0.7" strokeDasharray="16 3 2.5 3">
                  <line x1="0" y1="-175" x2="0" y2="178" />
                  <line x1="-155" y1="0" x2="155" y2="0" />
                </g>
              )}

              {/* Section Cutting Plane A-A along Vertical Symmetry Axis (X = 0) */}
              {showSectionHatch && (
                <g stroke={p.ink} fill={p.ink} fontFamily="JetBrains Mono, monospace" fontSize="11.5" fontWeight="700">
                  <line x1="0" y1="-172" x2="0" y2="-152" strokeWidth="2.4" />
                  <line x1="0" y1="-166" x2="26" y2="-166" strokeWidth="1.2" markerEnd="url(#secPlaneArrow)" />
                  <text x="30" y="-162">A</text>

                  <line x1="0" y1="154" x2="0" y2="174" strokeWidth="2.4" />
                  <line x1="0" y1="168" x2="26" y2="168" strokeWidth="1.2" markerEnd="url(#secPlaneArrow)" />
                  <text x="30" y="172">A</text>
                </g>
              )}

              {/* Helmet Front Brim (+Y = Front, pointing toward Front View) */}
              <path
                d="M -60 88 Q -48 144 0 150 Q 48 144 60 88"
                fill="none"
                stroke={p.ink}
                strokeWidth="1.8"
              />

              {/* Helmet Base Ovoid Shell (Width 222mm -> ±89px, Length 282mm -> -116..+110) */}
              <ellipse cx="0" cy="-4" rx="89" ry="114" fill="none" stroke={p.ink} strokeWidth="1.95" />
              {/* Center Crown Structural Rib */}
              <path
                d="M -11 -96 Q 0 -106 11 -96 L 9 84 Q 0 92 -9 84 Z"
                fill="none"
                stroke={p.inkMid}
                strokeWidth="0.9"
              />

              {/* Slim Clip-on Rim Band & Twin Arch Rails */}
              <ellipse cx="0" cy="-4" rx="94" ry="119" fill="none" stroke={p.inkMid} strokeWidth="1.0" />
              <path d="M -88 -12 Q -46 -44 0 -46 Q 46 -44 88 -12" fill="none" stroke={p.inkMid} strokeWidth="0.8" />
              <path d="M -88 12 Q -46 42 0 44 Q 46 42 88 12" fill="none" stroke={p.inkMid} strokeWidth="0.8" />

              {/* Exposed Arduino Hardware — Top View */}
              {/* Rear Exposed Arduino Uno R3 + Battery + HC-SR04 #2 (-Y = Rear) */}
              <rect x="-34" y="-142" width="68" height="24" fill="none" stroke={p.ink} strokeWidth="1.5" />
              {/* Uno R3 female pin headers detail */}
              <rect x="-26" y="-138" width="52" height="4" fill="none" stroke={p.inkMid} strokeWidth="0.7" />
              <rect x="-26" y="-124" width="52" height="4" fill="none" stroke={p.inkMid} strokeWidth="0.7" />
              {/* Rear HC-SR04 #2 projecting backward */}
              <rect x="-18" y="-151" width="36" height="9" fill="none" stroke={p.ink} strokeWidth="1.2" />
              {/* Rear Tactile Switch SW2 (South) */}
              <rect x="-8" y="-158" width="16" height="7" fill="none" stroke={p.ink} strokeWidth="1.1" />

              {/* Crown HC-SR04 #1 (twin Ø16 transducers) + Active Buzzer + Crown Switch SW5 */}
              <rect x="-22" y="-26" width="44" height="24" fill="none" stroke={p.ink} strokeWidth="1.4" />
              <circle cx="-10" cy="-14" r="7.5" fill="none" stroke={p.ink} strokeWidth="1.3" />
              <circle cx="10" cy="-14" r="7.5" fill="none" stroke={p.ink} strokeWidth="1.3" />
              {/* Active Buzzer Ø12 behind crown ultrasonic */}
              <circle cx="-26" cy="14" r="9" fill="none" stroke={p.ink} strokeWidth="1.3" />
              <circle cx="-26" cy="14" r="2.2" fill={p.ink} />
              {/* Crown Tactile Switch SW5 (forward of beam) */}
              <rect x="14" y="18" width="15" height="15" fill="none" stroke={p.ink} strokeWidth="1.2" />
              <circle cx="21.5" cy="25.5" r="4" fill="none" stroke={p.ink} strokeWidth="0.9" />

              {/* Perimeter Tactile Switches: North (Front), East (Right), West (Left) */}
              <rect x="-8" y="114" width="16" height="10" fill="none" stroke={p.ink} strokeWidth="1.2" />
              <rect x="92" y="-8" width="10" height="16" fill="none" stroke={p.ink} strokeWidth="1.2" />
              <rect x="-102" y="-8" width="10" height="16" fill="none" stroke={p.ink} strokeWidth="1.2" />

              {/* 6 Bidirectional LEDs (3 pairs: Front, Left, Right) */}
              <circle cx="-20" cy="112" r="3" fill="none" stroke={p.ink} strokeWidth="1.2" />
              <circle cx="20" cy="112" r="3" fill="none" stroke={p.ink} strokeWidth="1.2" />
              <circle cx="88" cy="36" r="3" fill="none" stroke={p.ink} strokeWidth="1.2" />
              <circle cx="84" cy="48" r="3" fill="none" stroke={p.ink} strokeWidth="1.2" />
              <circle cx="-88" cy="36" r="3" fill="none" stroke={p.ink} strokeWidth="1.2" />
              <circle cx="-84" cy="48" r="3" fill="none" stroke={p.ink} strokeWidth="1.2" />

              {/* Optional Kit Sensors */}
              {modularConfig.includeDht11 && (
                <rect x="86" y="-58" width="12" height="18" fill="none" stroke={p.ink} strokeWidth="1.1" />
              )}
              {modularConfig.includeMq2 && (
                <circle cx="76" cy="84" r="8" fill="none" stroke={p.ink} strokeWidth="1.1" />
              )}
              {modularConfig.includeKy037 && (
                <rect x="-98" y="-58" width="12" height="18" fill="none" stroke={p.ink} strokeWidth="1.1" />
              )}

              {/* Hidden Internal 5-Color Dupont Wire Routing (Dashed) */}
              {showHiddenLines && (
                <g fill="none" stroke={p.hidden} strokeWidth="0.85" strokeDasharray="4.5 2.5">
                  <path d="M -5 -26 L -5 -118" />
                  <path d="M 5 -26 L 5 -118" />
                  <path d="M -92 0 C -92 -66 -66 -122 -34 -128" />
                  <path d="M 92 0 C 92 -66 66 -122 34 -128" />
                </g>
              )}

              {/* REMOVABLE GEODESIC POLYGON FINISHING CASE (Top Projection — Faceted Decagonal / Triangular Mesh) */}
              {showPolygonCover && (
                <g>
                  {/* Outer 10-sided Faceted Geodesic Perimeter (Chain-double-dot / crisp polygon outline) */}
                  <polygon
                    points="0,-168 69,-146 114,-82 119,6 96,92 42,144 -42,144 -96,92 -119,6 -114,-82 -69,-146"
                    fill="none"
                    stroke={p.polyOuter}
                    strokeWidth="1.35"
                    strokeDasharray="12 2.5 2 2.5 2 2.5"
                  />
                  {/* Inner Geodesic Ridge Ring + Triangular Crease Fold Lines */}
                  <polygon
                    points="0,-96 64,-52 68,38 0,88 -68,38 -64,-52"
                    fill="none"
                    stroke={p.polySeam}
                    strokeWidth="0.7"
                    strokeDasharray="6 3"
                  />
                  <g stroke={p.polySeam} strokeWidth="0.6" strokeDasharray="6 3">
                    <line x1="0" y1="-168" x2="0" y2="-96" />
                    <line x1="69" y1="-146" x2="64" y2="-52" />
                    <line x1="114" y1="-82" x2="64" y2="-52" />
                    <line x1="119" y1="6" x2="68" y2="38" />
                    <line x1="96" y1="92" x2="68" y2="38" />
                    <line x1="42" y1="144" x2="0" y2="88" />
                    <line x1="-42" y1="144" x2="0" y2="88" />
                    <line x1="-96" y1="92" x2="-68" y2="38" />
                    <line x1="-119" y1="6" x2="-68" y2="38" />
                    <line x1="-114" y1="-82" x2="-64" y2="-52" />
                    <line x1="-69" y1="-146" x2="-64" y2="-52" />
                    <line x1="0" y1="-96" x2="-64" y2="-52" />
                    <line x1="0" y1="-96" x2="64" y2="-52" />
                  </g>
                </g>
              )}

              {/* Dimensions (Top View) */}
              {showDimensions && (
                <g stroke={p.dim} strokeWidth="0.75" fill={p.dim} fontFamily="JetBrains Mono, monospace" fontSize="10">
                  {/* Overall Polygon Width 288 mm (Top horizontal dim) */}
                  <line x1="-119" y1="0" x2="-119" y2="-194" />
                  <line x1="119" y1="0" x2="119" y2="-194" />
                  <line
                    x1="-119"
                    y1="-188"
                    x2="119"
                    y2="-188"
                    markerStart="url(#cadArrowStart)"
                    markerEnd="url(#cadArrowEnd)"
                  />
                  <rect x="-38" y="-196" width="76" height="13" fill={p.sheetBg} stroke="none" />
                  <text x="0" y="-186" textAnchor="middle">288 (외피 폭)</text>

                  {/* Helmet Base Width 222 ±0.5 mm (Left-to-Right lower dim) */}
                  <line x1="-89" y1="108" x2="-89" y2="188" />
                  <line x1="89" y1="108" x2="89" y2="188" />
                  <line
                    x1="-89"
                    y1="182"
                    x2="89"
                    y2="182"
                    markerStart="url(#cadArrowStart)"
                    markerEnd="url(#cadArrowEnd)"
                  />
                  <rect x="-40" y="174" width="80" height="13" fill={p.sheetBg} stroke="none" />
                  <text x="0" y="184.5" textAnchor="middle">{HELMET_DIMENSIONS_MM.width} ±0.5</text>

                  {/* Overall Length with Polygon Cover 356 mm (Left vertical dim) */}
                  <line x1="-12" y1="-168" x2="-170" y2="-168" />
                  <line x1="-42" y1="144" x2="-170" y2="144" />
                  <line
                    x1="-162"
                    y1="-168"
                    x2="-162"
                    y2="144"
                    markerStart="url(#cadArrowStart)"
                    markerEnd="url(#cadArrowEnd)"
                  />
                  <text x="-168" y="-12" transform="rotate(-90 -168 -12)" textAnchor="middle">
                    356 (폴리곤 전장)
                  </text>
                </g>
              )}

              {/* Numbered CAD Balloons (Top View) */}
              {showCallouts && (
                <g fontFamily="JetBrains Mono, monospace" fontSize="9.5" fontWeight="700" fill={p.ink}>
                  {/* Item 2: Polygon Cover */}
                  <polyline points="108,-90 156,-132 174,-132" fill="none" stroke={p.ink} strokeWidth="0.8" markerStart="url(#cadLeaderDot)" />
                  <circle cx="185" cy="-132" r="10" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />
                  <text x="185" y="-128.5" textAnchor="middle">2</text>

                  {/* Item 4: Crown HC-SR04 #1 */}
                  <polyline points="14,-18 156,-76 174,-76" fill="none" stroke={p.ink} strokeWidth="0.8" markerStart="url(#cadLeaderDot)" />
                  <circle cx="185" cy="-76" r="10" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />
                  <text x="185" y="-72.5" textAnchor="middle">4</text>

                  {/* Item 6: 5-Way Tactile Switch */}
                  <polyline points="98,0 156,0 174,0" fill="none" stroke={p.ink} strokeWidth="0.8" markerStart="url(#cadLeaderDot)" />
                  <circle cx="185" cy="0" r="10" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />
                  <text x="185" y="3.5" textAnchor="middle">6</text>

                  {/* Item 7: Bidirectional LEDs */}
                  <polyline points="86,44 156,64 174,64" fill="none" stroke={p.ink} strokeWidth="0.8" markerStart="url(#cadLeaderDot)" />
                  <circle cx="185" cy="64" r="10" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />
                  <text x="185" y="67.5" textAnchor="middle">7</text>
                </g>
              )}

              {/* View Title Label (KS Standard Underline) */}
              <g transform="translate(0, 212)">
                <text x="0" y="0" textAnchor="middle" fill={p.ink} fontSize="11.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif">
                  평면도 (TOP VIEW)
                </text>
                <line x1="-64" y1="4" x2="64" y2="4" stroke={p.ink} strokeWidth="1.1" />
              </g>
            </g>

            {/* =================================================================
                VIEW 2 (BOTTOM-LEFT): 정면도 (FRONT VIEW)
                Aligned directly below Top View on X = X_FRONT (290), Rim Base Y = Y_BASE (776)
            ================================================================= */}
            <g transform={`translate(${X_FRONT}, ${Y_BASE})`}>
              {/* Centerline */}
              {showCenterLines && (
                <g stroke={p.center} strokeWidth="0.7" strokeDasharray="16 3 2.5 3">
                  <line x1="0" y1="-238" x2="0" y2="42" />
                  <line x1="-138" y1="0" x2="138" y2="0" />
                </g>
              )}

              {/* 30° Ultrasonic Falling-Object Detection Cone (Phantom) */}
              <polygon
                points="0,-160 -36,-226 36,-226"
                fill="none"
                stroke={p.inkFine}
                strokeWidth="0.75"
                strokeDasharray="6 3"
              />
              {showDimensions && (
                <g fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill={p.dim}>
                  <path d="M -22,-200 A 44,44 0 0,1 22,-200" fill="none" stroke={p.dim} strokeWidth="0.75" />
                  <text x="0" y="-207" textAnchor="middle">30°</text>
                </g>
              )}

              {/* Base KCs Helmet Outer Shell (Width ±89px, Height 130px) */}
              <path
                d="M -89 0 C -88 -102 -54 -130 0 -130 C 54 -130 88 -102 89 0 Z"
                fill="none"
                stroke={p.ink}
                strokeWidth="1.95"
              />
              {/* Crown Center Structural Ridge */}
              <path d="M -14 -127 Q 0 -142 14 -127" fill="none" stroke={p.ink} strokeWidth="1.5" />
              {/* Lower Rim Lip & Front Brim Arc */}
              <path d="M -95 0 Q 0 14 95 0" fill="none" stroke={p.ink} strokeWidth="1.8" />
              <line x1="-95" y1="0" x2="-95" y2="-8" stroke={p.ink} strokeWidth="1.5" />
              <line x1="95" y1="0" x2="95" y2="-8" stroke={p.ink} strokeWidth="1.5" />

              {/* Internal KCs Suspension Headband & 36mm Buffer Zone (Hidden) */}
              {showHiddenLines && (
                <g fill="none" stroke={p.hidden} strokeWidth="0.85" strokeDasharray="4.5 2.5">
                  <path d="M -70 0 C -68 -72 -40 -96 0 -96 C 40 -96 68 -72 70 0" />
                  <path d="M -60 0 Q 0 24 60 0" />
                </g>
              )}

              {/* Exposed Sensors — Front Elevation */}
              {/* Crown HC-SR04 #1 (twin ultrasonic cans) + Active Buzzer */}
              <rect x="-22" y="-156" width="44" height="16" fill="none" stroke={p.ink} strokeWidth="1.35" />
              <rect x="-17" y="-164" width="11" height="8" fill="none" stroke={p.ink} strokeWidth="1.25" />
              <rect x="6" y="-164" width="11" height="8" fill="none" stroke={p.ink} strokeWidth="1.25" />
              <rect x="-38" y="-150" width="12" height="10" fill="none" stroke={p.ink} strokeWidth="1.1" />

              {/* Front North Tactile Switch SW1 + Front Red/Green LEDs */}
              <rect x="-8" y="-22" width="16" height="13" fill="none" stroke={p.ink} strokeWidth="1.3" />
              <circle cx="-22" cy="-16" r="3.2" fill="none" stroke={p.ink} strokeWidth="1.2" />
              <circle cx="22" cy="-16" r="3.2" fill="none" stroke={p.ink} strokeWidth="1.2" />

              {/* Side East/West Tactile Switches */}
              <rect x="-102" y="-24" width="8" height="16" fill="none" stroke={p.ink} strokeWidth="1.25" />
              <rect x="94" y="-24" width="8" height="16" fill="none" stroke={p.ink} strokeWidth="1.25" />

              {/* REMOVABLE GEODESIC POLYGON FINISHING CASE (Front Faceted Dome Silhouette) */}
              {showPolygonCover && (
                <g>
                  {/* Faceted Outer Geodesic Arch (Polygon vertices matching 2V icosahedron dome) */}
                  <polygon
                    points="-119,4 -112,-76 -78,-142 -30,-176 30,-176 78,-142 112,-76 119,4"
                    fill="none"
                    stroke={p.polyOuter}
                    strokeWidth="1.5"
                    strokeDasharray="12 2.5 2 2.5 2 2.5"
                  />
                  {/* Triangular Geodesic Fold Seams across Front Face */}
                  <g stroke={p.polySeam} strokeWidth="0.65" strokeDasharray="6 3">
                    <polyline points="-112,-76 -64,-68 0,-74 64,-68 112,-76" fill="none" />
                    <polyline points="-78,-142 -36,-132 36,-132 78,-142" fill="none" />
                    <line x1="-119" y1="4" x2="-64" y2="-68" />
                    <line x1="-64" y1="-68" x2="-52" y2="4" />
                    <line x1="-52" y1="4" x2="0" y2="-74" />
                    <line x1="0" y1="-74" x2="52" y2="4" />
                    <line x1="52" y1="4" x2="64" y2="-68" />
                    <line x1="64" y1="-68" x2="119" y2="4" />
                    <line x1="-78" y1="-142" x2="-64" y2="-68" />
                    <line x1="-36" y1="-132" x2="-64" y2="-68" />
                    <line x1="-36" y1="-132" x2="0" y2="-74" />
                    <line x1="36" y1="-132" x2="0" y2="-74" />
                    <line x1="36" y1="-132" x2="64" y2="-68" />
                    <line x1="78" y1="-142" x2="64" y2="-68" />
                    <line x1="-30" y1="-176" x2="-36" y2="-132" />
                    <line x1="30" y1="-176" x2="36" y2="-132" />
                    <line x1="0" y1="-176" x2="-36" y2="-132" />
                    <line x1="0" y1="-176" x2="36" y2="-132" />
                  </g>
                </g>
              )}

              {/* Dimensions (Front View) */}
              {showDimensions && (
                <g stroke={p.dim} strokeWidth="0.75" fill={p.dim} fontFamily="JetBrains Mono, monospace" fontSize="10">
                  {/* Helmet Shell Height 162 mm (Left inner dim) */}
                  <line x1="-30" y1="-130" x2="-154" y2="-130" />
                  <line x1="-95" y1="0" x2="-194" y2="0" />
                  <line
                    x1="-146"
                    y1="-130"
                    x2="-146"
                    y2="0"
                    markerStart="url(#cadArrowStart)"
                    markerEnd="url(#cadArrowEnd)"
                  />
                  <text x="-152" y="-65" transform="rotate(-90 -152 -65)" textAnchor="middle">
                    {HELMET_DIMENSIONS_MM.height}
                  </text>

                  {/* Total Height with Polygon Finishing Dome 222 mm (Left outer dim) */}
                  <line x1="-30" y1="-176" x2="-194" y2="-176" />
                  <line
                    x1="-186"
                    y1="-176"
                    x2="-186"
                    y2="0"
                    markerStart="url(#cadArrowStart)"
                    markerEnd="url(#cadArrowEnd)"
                  />
                  <text x="-192" y="-88" transform="rotate(-90 -192 -88)" textAnchor="middle">
                    222 (외피 총고)
                  </text>

                  {/* KCs 36mm Buffer Clearance Callout */}
                  <line x1="0" y1="-130" x2="0" y2="-96" markerStart="url(#cadArrowStart)" markerEnd="url(#cadArrowEnd)" />
                  <line x1="0" y1="-112" x2="50" y2="-112" />
                  <rect x="52" y="-119" width="60" height="12" fill={p.sheetBg} stroke="none" />
                  <text x="54" y="-109.5" fontSize="9">36±2 (KCs)</text>

                  {/* Radius R111 Leader */}
                  <line x1="60" y1="-94" x2="128" y2="-146" markerStart="url(#cadArrowStart)" />
                  <line x1="128" y1="-146" x2="176" y2="-146" />
                  <text x="152" y="-150" textAnchor="middle">R111</text>
                </g>
              )}

              {/* Callout Balloon (Item 1: Base Helmet, Item 8: Clip Rim) */}
              {showCallouts && (
                <g fontFamily="JetBrains Mono, monospace" fontSize="9.5" fontWeight="700" fill={p.ink}>
                  <polyline points="-66,-106 -108,-158" fill="none" stroke={p.ink} strokeWidth="0.8" markerStart="url(#cadLeaderDot)" />
                  <circle cx="-116" cy="-164" r="10" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />
                  <text x="-116" y="-160.5" textAnchor="middle">1</text>

                  <polyline points="94,-4 134,26 154,26" fill="none" stroke={p.ink} strokeWidth="0.8" markerStart="url(#cadLeaderDot)" />
                  <circle cx="165" cy="26" r="10" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />
                  <text x="165" y="29.5" textAnchor="middle">8</text>
                </g>
              )}

              {/* View Title Label */}
              <g transform="translate(0, 62)">
                <text x="0" y="0" textAnchor="middle" fill={p.ink} fontSize="11.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif">
                  정면도 (FRONT VIEW)
                </text>
                <line x1="-68" y1="4" x2="68" y2="4" stroke={p.ink} strokeWidth="1.1" />
              </g>
            </g>

            {/* =================================================================
                VIEW 3 (BOTTOM-CENTER): A-A 단면도 / 우측면도 (SECTION A-A / RIGHT SIDE)
                Horizontally aligned with Front View on EXACT Y_BASE = 776!
                Front Brim points LEFT (-X), Rear Arduino Uno R3 points RIGHT (+X)
            ================================================================= */}
            <g transform={`translate(${X_SIDE}, ${Y_BASE})`}>
              {/* Centerlines & CoG Vertical Datum */}
              {showCenterLines && (
                <g stroke={p.center} strokeWidth="0.7" strokeDasharray="16 3 2.5 3">
                  <line x1="-195" y1="0" x2="215" y2="0" />
                  <line x1="0" y1="-218" x2="0" y2="54" />
                </g>
              )}

              {/* Sectioned ABS/PC Helmet Shell Wall with ISO 45° Cross-Section Hatching */}
              <path
                d="M -110 2 C -106 -98 -68 -130 -4 -130 C 76 -130 116 -96 118 0 L 118 8 L -108 10 L -156 6 C -156 -2 -128 -2 -110 2 Z"
                fill={showSectionHatch ? 'url(#isoHatch45)' : 'none'}
                stroke={p.ink}
                strokeWidth="1.95"
              />
              {/* Clean White Inner Cavity Cutout (shows true shell wall thickness 3.5mm) */}
              <path
                d="M -101 0 C -98 -90 -62 -122 -4 -122 C 68 -122 108 -88 109 0 Z"
                fill={p.sheetBg}
                stroke={p.ink}
                strokeWidth="1.25"
              />

              {/* Internal KCs Suspension Headband & Ratchet Dial */}
              <path
                d="M -84 0 C -80 -72 -48 -96 -4 -96 C 54 -96 86 -68 88 0"
                fill="none"
                stroke={p.hidden}
                strokeWidth="0.95"
                strokeDasharray="4.5 2.5"
              />
              <path d="M 42 8 Q 76 46 108 42 Q 124 38 110 8" fill="none" stroke={p.inkMid} strokeWidth="1.4" />
              <circle cx="110" cy="34" r="9" fill={p.sheetBg} stroke={p.inkMid} strokeWidth="1.3" />
              <circle cx="110" cy="34" r="3" fill="none" stroke={p.inkMid} strokeWidth="1" />

              {/* Exposed Crown Sensors (HC-SR04 #1 + Active Buzzer + Crown Switch SW5) */}
              <rect x="-12" y="-154" width="24" height="14" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.35" />
              <rect x="-8" y="-164" width="16" height="10" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />
              <rect x="16" y="-148" width="16" height="12" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />
              <rect x="-36" y="-144" width="14" height="10" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />

              {/* Exposed Rear Electronics Stack (Right Side = +X: 2500mAh Li-Ion + Arduino Uno R3 + HC-SR04 #2) */}
              {/* 2500mAh Battery Pack */}
              <rect x="122" y="-44" width="14" height="46" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.3" />
              {/* Arduino Uno R3 Board */}
              <rect x="139" y="-50" width="16" height="58" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.5" />
              {/* USB-B & Barrel Jack on bottom of Uno */}
              <rect x="142" y="8" width="10" height="8" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.1" />
              {/* Rear HC-SR04 #2 facing backward (+X) */}
              <rect x="155" y="-42" width="10" height="26" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.3" />
              <rect x="165" y="-38" width="7" height="18" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.1" />
              {/* Rear South Tactile Switch SW2 */}
              <rect x="155" y="-10" width="9" height="12" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.1" />

              {/* Front North Switch + Side East Switch */}
              <rect x="-118" y="-20" width="9" height="14" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />
              <rect x="-8" y="-22" width="16" height="16" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />

              {/* Exposed Dupont Wire Conduit Path along Dorsal Arch */}
              {showHiddenLines && (
                <path
                  d="M 0 -140 C 56 -134 114 -96 138 -46"
                  fill="none"
                  stroke={p.hidden}
                  strokeWidth="0.95"
                  strokeDasharray="4.5 2.5"
                />
              )}

              {/* REMOVABLE GEODESIC POLYGON FINISHING CASE (Section A-A Wall Profile — 135° Hatching) */}
              {showPolygonCover && (
                <g>
                  {/* Sectioned Outer Corrugated Polygon Wall (double-wall thickness profile) */}
                  <path
                    d="M -144,4 L -134,-80 L -92,-146 L -34,-180 L 38,-180 L 116,-146 L 176,-78 L 182,6 L 174,6 L 168,-74 L 110,-138 L 36,-172 L -32,-172 L -86,-138 L -126,-76 L -136,4 Z"
                    fill={showSectionHatch ? 'url(#isoHatch135)' : 'none'}
                    stroke={p.polyOuter}
                    strokeWidth="1.45"
                  />
                  {/* Acoustic Aperture Cutout Marks on Polygon Cover (Crown #1 & Rear #2) */}
                  <rect x="-16" y="-182" width="32" height="12" fill={p.sheetBg} stroke={p.polyOuter} strokeWidth="1.1" />
                  <rect x="169" y="-44" width="14" height="30" fill={p.sheetBg} stroke={p.polyOuter} strokeWidth="1.1" />
                </g>
              )}

              {/* CoG Datum Axis & Engineering Readout */}
              {showDimensions && (
                <g fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill={p.dim} stroke={p.dim} strokeWidth="0.75">
                  {/* Overall Polygon Length 356 mm */}
                  <line x1="-144" y1="-180" x2="-144" y2="-206" />
                  <line x1="182" y1="-78" x2="182" y2="-206" />
                  <line
                    x1="-144"
                    y1="-198"
                    x2="182"
                    y2="-198"
                    markerStart="url(#cadArrowStart)"
                    markerEnd="url(#cadArrowEnd)"
                  />
                  <rect x="-32" y="-206" width="102" height="13" fill={p.sheetBg} stroke="none" />
                  <text x="19" y="-196" textAnchor="middle">356 (외피 전장)</text>

                  {/* Base Helmet Length 282 mm (Lower Dim) */}
                  <line x1="-156" y1="6" x2="-156" y2="62" />
                  <line x1="118" y1="8" x2="118" y2="62" />
                  <line
                    x1="-156"
                    y1="54"
                    x2="118"
                    y2="54"
                    markerStart="url(#cadArrowStart)"
                    markerEnd="url(#cadArrowEnd)"
                  />
                  <rect x="-66" y="46" width="96" height="13" fill={p.sheetBg} stroke="none" />
                  <text x="-18" y="56.5" textAnchor="middle">{HELMET_DIMENSIONS_MM.length} (모체 전장)</text>

                  {/* CoG Offset Note */}
                  <line
                    x1={weightMetrics.cogOffsetMm * 1.4}
                    y1="-114"
                    x2={weightMetrics.cogOffsetMm * 1.4}
                    y2="34"
                    strokeDasharray="6 2.5 1.5 2.5"
                  />
                  <text
                    x={weightMetrics.cogOffsetMm * 1.4 - 4}
                    y="28"
                    textAnchor="end"
                    stroke="none"
                  >
                    CoG {weightMetrics.cogOffsetMm}mm ({weightMetrics.neckTorqueNm}N·m)
                  </text>
                </g>
              )}

              {/* Balloons on Section A-A: Item 3 (Arduino Uno R3), Item 5 (Buzzer), Item 9 (Battery) */}
              {showCallouts && (
                <g fontFamily="JetBrains Mono, monospace" fontSize="9.5" fontWeight="700" fill={p.ink}>
                  <polyline points="24,-144 96,-172 114,-172" fill="none" stroke={p.ink} strokeWidth="0.8" markerStart="url(#cadLeaderDot)" />
                  <circle cx="125" cy="-172" r="10" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />
                  <text x="125" y="-168.5" textAnchor="middle">5</text>

                  <polyline points="148,-46 198,-112 212,-112" fill="none" stroke={p.ink} strokeWidth="0.8" markerStart="url(#cadLeaderDot)" />
                  <circle cx="223" cy="-112" r="10" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />
                  <text x="223" y="-108.5" textAnchor="middle">3</text>

                  <polyline points="129,-22 198,28 212,28" fill="none" stroke={p.ink} strokeWidth="0.8" markerStart="url(#cadLeaderDot)" />
                  <circle cx="223" cy="28" r="10" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />
                  <text x="223" y="31.5" textAnchor="middle">9</text>
                </g>
              )}

              {/* View Title Label */}
              <g transform="translate(10, 82)">
                <text x="0" y="0" textAnchor="middle" fill={p.ink} fontSize="11.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif">
                  단면도 A-A / 우측면도 (SECTION A-A)
                </text>
                <line x1="-108" y1="4" x2="108" y2="4" stroke={p.ink} strokeWidth="1.1" />
              </g>
            </g>

            {/* =================================================================
                VIEW 4 (TOP-CENTER): 배면도 (REAR VIEW — Uno R3 · HC-SR04 #2 · 폴리곤 후면창)
            ================================================================= */}
            <g transform={`translate(${X_SIDE}, ${Y_TOP + 68})`}>
              {showCenterLines && (
                <g stroke={p.center} strokeWidth="0.7" strokeDasharray="16 3 2.5 3">
                  <line x1="0" y1="-206" x2="0" y2="54" />
                  <line x1="-138" y1="0" x2="138" y2="0" />
                </g>
              )}

              {/* Base Helmet Rear Elevation */}
              <path
                d="M -89 0 C -88 -102 -54 -130 0 -130 C 54 -130 88 -102 89 0 Z"
                fill="none"
                stroke={p.ink}
                strokeWidth="1.95"
              />
              <path d="M -93 0 Q 0 10 93 0" fill="none" stroke={p.ink} strokeWidth="1.7" />
              {/* Suspension Rear Cradle & Ratchet Dial */}
              <path d="M -62 4 Q -52 34 0 36 Q 52 34 62 4" fill="none" stroke={p.inkMid} strokeWidth="1.4" />
              <circle cx="0" cy="30" r="8.5" fill={p.sheetBg} stroke={p.inkMid} strokeWidth="1.3" />
              <circle cx="0" cy="30" r="2.8" fill="none" stroke={p.inkMid} strokeWidth="1" />

              {/* Exposed Arduino Uno R3 PCB on Rear Backplate */}
              <rect x="-36" y="-58" width="72" height="54" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.5" />
              {/* Uno R3 Pin Headers, ATmega328P DIP-28, USB-B & DC Jack */}
              <rect x="-28" y="-52" width="56" height="5" fill="none" stroke={p.inkMid} strokeWidth="0.75" />
              <rect x="-28" y="-12" width="56" height="5" fill="none" stroke={p.inkMid} strokeWidth="0.75" />
              <rect x="-14" y="-36" width="28" height="12" fill="none" stroke={p.ink} strokeWidth="1.0" />
              <rect x="-34" y="-44" width="10" height="14" fill="none" stroke={p.ink} strokeWidth="1.0" />
              <rect x="-34" y="-24" width="9" height="9" fill="none" stroke={p.ink} strokeWidth="1.0" />
              <text x="2" y="-39" textAnchor="middle" fill={p.inkMid} fontSize="7.2" fontFamily="JetBrains Mono, monospace">UNO R3</text>

              {/* Rear HC-SR04 #2 Twin Ultrasonic Transducers (Ø16) */}
              <rect x="-24" y="-86" width="48" height="22" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.4" />
              <circle cx="-11" cy="-75" r="7" fill="none" stroke={p.ink} strokeWidth="1.3" />
              <circle cx="11" cy="-75" r="7" fill="none" stroke={p.ink} strokeWidth="1.3" />

              {/* Rear Tactile Switch SW2 + Crown Transducers Silhouette */}
              <rect x="-7" y="-2" width="14" height="10" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.2" />
              <rect x="-17" y="-154" width="11" height="10" fill="none" stroke={p.ink} strokeWidth="1.2" />
              <rect x="6" y="-154" width="11" height="10" fill="none" stroke={p.ink} strokeWidth="1.2" />

              {/* REMOVABLE GEODESIC POLYGON FINISHING CASE (Rear Faceted Profile + Acoustic Cutout) */}
              {showPolygonCover && (
                <g>
                  <polygon
                    points="-119,4 -112,-76 -78,-142 -30,-176 30,-176 78,-142 112,-76 119,4"
                    fill="none"
                    stroke={p.polyOuter}
                    strokeWidth="1.4"
                    strokeDasharray="12 2.5 2 2.5 2 2.5"
                  />
                  {/* Rear Ultrasonic Cutout Window on Polygon Cover */}
                  <rect
                    x="-28"
                    y="-90"
                    width="56"
                    height="30"
                    fill="none"
                    stroke={p.polyOuter}
                    strokeWidth="1.15"
                  />
                  {/* Facet Seam Lines */}
                  <g stroke={p.polySeam} strokeWidth="0.65" strokeDasharray="6 3">
                    <line x1="-112" y1="-76" x2="-28" y2="-76" />
                    <line x1="28" y1="-76" x2="112" y2="-76" />
                    <line x1="-78" y1="-142" x2="-34" y2="-130" />
                    <line x1="-34" y1="-130" x2="34" y2="-130" />
                    <line x1="34" y1="-130" x2="78" y2="-142" />
                    <line x1="-30" y1="-176" x2="-34" y2="-130" />
                    <line x1="30" y1="-176" x2="34" y2="-130" />
                    <line x1="-64" y1="-76" x2="-52" y2="4" />
                    <line x1="64" y1="-76" x2="52" y2="4" />
                  </g>
                </g>
              )}

              {/* Rear Dimensions */}
              {showDimensions && (
                <g stroke={p.dim} strokeWidth="0.75" fill={p.dim} fontFamily="JetBrains Mono, monospace" fontSize="9.5">
                  <line x1="-24" y1="-86" x2="-24" y2="-112" />
                  <line x1="24" y1="-86" x2="24" y2="-112" />
                  <line
                    x1="-24"
                    y1="-106"
                    x2="24"
                    y2="-106"
                    markerStart="url(#cadArrowStart)"
                    markerEnd="url(#cadArrowEnd)"
                  />
                  <rect x="-15" y="-114" width="30" height="12" fill={p.sheetBg} stroke="none" />
                  <text x="0" y="-104.5" textAnchor="middle">45</text>

                  {/* Transducer Diameter Ø16 */}
                  <line x1="17" y1="-78" x2="132" y2="-108" markerStart="url(#cadArrowStart)" />
                  <line x1="132" y1="-108" x2="190" y2="-108" />
                  <text x="161" y="-112" textAnchor="middle">2-Ø16</text>

                  {/* Arduino Uno R3 Width 68.6 mm */}
                  <line x1="-36" y1="-4" x2="-36" y2="54" />
                  <line x1="36" y1="-4" x2="36" y2="54" />
                  <line
                    x1="-36"
                    y1="48"
                    x2="36"
                    y2="48"
                    markerStart="url(#cadArrowStart)"
                    markerEnd="url(#cadArrowEnd)"
                  />
                  <rect x="-18" y="40" width="36" height="12" fill={p.sheetBg} stroke="none" />
                  <text x="0" y="50.5" textAnchor="middle">68.6</text>
                </g>
              )}

              {/* View Title Label */}
              <g transform="translate(0, 74)">
                <text x="0" y="0" textAnchor="middle" fill={p.ink} fontSize="11.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif">
                  배면도 (REAR VIEW)
                </text>
                <line x1="-68" y1="4" x2="68" y2="4" stroke={p.ink} strokeWidth="1.1" />
              </g>
            </g>

            {/* =================================================================
                RIGHT DRAFTING COLUMN (x = 1020..1444):
                1. 일반 주서 (GENERAL NOTES)
                2. KS 부품표 (PARTS LIST / BOM) — stacked flush above Title Block
                3. KS B 0001 기계제도 표제란 (TITLE BLOCK)
            ================================================================= */}

            {/* 1. General Engineering Notes (Top-Right inside Drawing Frame) */}
            <g transform="translate(1032, 62)" fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif" fill={p.ink}>
              <text x="0" y="0" fontSize="11.5" fontWeight="700">주서 (GENERAL NOTES)</text>
              <line x1="0" y1="5" x2="398" y2="5" stroke={p.ink} strokeWidth="1.1" />
              <g fontSize="9.8" fill={p.inkMid} fontFamily="JetBrains Mono, Noto Sans KR, monospace">
                <text x="0" y="24">1. 본 도면은 KS B 0001 및 ISO 128 제3각법에 준거함.</text>
                <text x="0" y="42">2. 지시 외 일반공차는 ISO 2768-mK 적용 (단위: mm).</text>
                <text x="0" y="60">3. 안전모 모체(품번 1)는 무천공·비파괴 클립 체결 원칙.</text>
                <text x="0" y="78">4. 내부 완충 공간 36±2mm 유지 (KCs ABE 규정 25~50mm).</text>
                <text x="0" y="96">5. 폴리곤 마감 케이스(품번 2)는 노출 센서·배선 최종 마감용</text>
                <text x="16" y="112">탈부착 지오데식 외피이며 상부·후면 초음파 개구부 확보.</text>
                <text x="0" y="130">6. 아두이노 센서 실장 제원 (실시간 계산 반영):</text>
                <text x="16" y="147">
                  · 총중량: {weightMetrics.totalG}g (모체 390g + 모듈 {weightMetrics.addonModuleG}g)
                </text>
                <text x="16" y="164">
                  · 무게중심 편심: {weightMetrics.cogOffsetMm}mm / 목부하 {weightMetrics.neckTorqueNm} N·m
                </text>
                <text x="16" y="181">
                  · 소비전력: {powerMetrics.totalPowerMw}mW / 2500mAh 구동 {powerMetrics.batteryHours}h
                </text>
                <text x="16" y="198">
                  · 확장 슬롯: DHT11[{modularConfig.includeDht11 ? '장착' : '미장착'}] MQ-2[{modularConfig.includeMq2 ? '장착' : '미장착'}] KY-037[{modularConfig.includeKy037 ? '장착' : '미장착'}]
                </text>
              </g>
            </g>

            {/* 2. KS B 0001 PARTS LIST / BOM TABLE (x = 1020..1444, y = 472..784, flush on Title Block) */}
            <g transform="translate(1020, 472)">
              {/* Outer BOM Border */}
              <rect x="0" y="0" width="424" height="312" fill={p.sheetBg} stroke={p.ink} strokeWidth="1.8" />

              {/* Header Row */}
              <rect x="0" y="0" width="424" height="24" fill={p.tableHeaderBg} stroke={p.ink} strokeWidth="1.1" />
              <g fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif" fontSize="9.8" fontWeight="700" fill={p.ink}>
                <text x="18" y="16" textAnchor="middle">품번</text>
                <text x="106" y="16" textAnchor="middle">품 명</text>
                <text x="244" y="16" textAnchor="middle">규 격 / 형 식</text>
                <text x="353" y="16" textAnchor="middle">재 질</text>
                <text x="408" y="16" textAnchor="middle">수량</text>
              </g>

              {/* Vertical Column Dividers */}
              <g stroke={p.ink} strokeWidth="0.9">
                <line x1="36" y1="0" x2="36" y2="312" />
                <line x1="176" y1="0" x2="176" y2="312" />
                <line x1="312" y1="0" x2="312" y2="312" />
                <line x1="392" y1="0" x2="392" y2="312" />
              </g>

              {/* BOM Data Rows (9 items, 32px each = 288px + 24px header = 312px) */}
              {bomItems.map((item, idx) => {
                const yRow = 24 + idx * 32;
                return (
                  <g key={item.no} fontFamily="JetBrains Mono, Noto Sans KR, monospace" fontSize="9.0" fill={p.inkMid}>
                    {idx > 0 && <line x1="0" y1={yRow} x2="424" y2={yRow} stroke={p.ink} strokeWidth="0.65" />}
                    <text x="18" y={yRow + 20} textAnchor="middle" fontWeight="700" fill={p.ink}>
                      {item.no}
                    </text>
                    <text x="42" y={yRow + 20} fill={p.ink}>
                      {item.name}
                    </text>
                    <text x="182" y={yRow + 20}>
                      {item.spec}
                    </text>
                    <text x="318" y={yRow + 20}>
                      {item.mat}
                    </text>
                    <text x="408" y={yRow + 20} textAnchor="middle" fill={p.ink}>
                      {item.qty}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* 3. AUTHENTIC KS B 0001 MECHANICAL TITLE BLOCK (x = 1020..1444, y = 784..964) */}
            <g transform="translate(1020, 784)">
              <rect x="0" y="0" width="424" height="180" fill={p.sheetBg} stroke={p.ink} strokeWidth="2.0" />

              {/* Horizontal Grid Lines */}
              <line x1="0" y1="36" x2="424" y2="36" stroke={p.ink} strokeWidth="1.0" />
              <line x1="0" y1="72" x2="424" y2="72" stroke={p.ink} strokeWidth="1.0" />
              <line x1="0" y1="126" x2="424" y2="126" stroke={p.ink} strokeWidth="1.2" />

              {/* Row 1 (y=0..36): 작성 / 검토 / 승인 / 일자 */}
              <g stroke={p.ink} strokeWidth="0.9">
                <line x1="76" y1="0" x2="76" y2="72" />
                <line x1="164" y1="0" x2="164" y2="72" />
                <line x1="252" y1="0" x2="252" y2="72" />
                <line x1="340" y1="0" x2="340" y2="72" />
              </g>
              <g fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif" fontSize="8.8" fill={p.inkFine}>
                <text x="38" y="13" textAnchor="middle">구 분</text>
                <text x="120" y="13" textAnchor="middle">작 성</text>
                <text x="208" y="13" textAnchor="middle">검 토</text>
                <text x="296" y="13" textAnchor="middle">승 인</text>
                <text x="382" y="13" textAnchor="middle">일 자</text>
              </g>
              <g fontFamily="JetBrains Mono, Noto Sans KR, monospace" fontSize="9.8" fontWeight="600" fill={p.ink}>
                <text x="38" y="29" textAnchor="middle">기계설계</text>
                <text x="120" y="29" textAnchor="middle">CAD ENG</text>
                <text x="208" y="29" textAnchor="middle">KCs QA</text>
                <text x="296" y="29" textAnchor="middle">PM</text>
                <text x="382" y="29" textAnchor="middle">2026-11-25</text>
              </g>

              {/* Row 2 (y=36..72): 투상법 (제3각법 기호) / 척도 / 단위 / 일반공차 / 개정 */}
              <g fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif" fontSize="8.5" fill={p.inkFine}>
                <text x="38" y="48" textAnchor="middle">투상법</text>
                <text x="120" y="48" textAnchor="middle">척 도</text>
                <text x="208" y="48" textAnchor="middle">단 위</text>
                <text x="296" y="48" textAnchor="middle">일반공차</text>
                <text x="382" y="48" textAnchor="middle">개정 / 매수</text>
              </g>
              {/* Official ISO/KS Third-Angle Projection Symbol (Truncated Cone Left + Concentric Circles Right) */}
              <g transform="translate(38, 60)" stroke={p.ink} fill="none">
                {/* Centerlines */}
                <line x1="-26" y1="0" x2="26" y2="0" strokeWidth="0.55" strokeDasharray="6 1.5 1.5 1.5" />
                <line x1="12" y1="-10" x2="12" y2="10" strokeWidth="0.55" strokeDasharray="5 1.5 1.5 1.5" />
                {/* Truncated cone on left */}
                <polygon points="-22,-4.5 -8,-8 -8,8 -22,4.5" strokeWidth="1.05" />
                {/* Concentric circles on right */}
                <circle cx="12" cy="0" r="8" strokeWidth="1.05" />
                <circle cx="12" cy="0" r="4.2" strokeWidth="1.05" />
              </g>
              <g fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" fill={p.ink}>
                <text x="120" y="64" textAnchor="middle">1 : 2</text>
                <text x="208" y="64" textAnchor="middle">mm</text>
                <text x="296" y="64" textAnchor="middle">ISO 2768-mK</text>
                <text x="382" y="64" textAnchor="middle">REV.04 · 1/1</text>
              </g>

              {/* Row 3 (y=72..126): 도 명 (DRAWING TITLE) */}
              <text x="10" y="86" fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif" fontSize="8.8" fill={p.inkFine}>
                도 명 (DRAWING TITLE)
              </text>
              <text x="10" y="106" fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif" fontSize="13" fontWeight="700" fill={p.ink}>
                모듈형 스마트 안전모 및 폴리곤 마감 케이스 조립도
              </text>
              <text x="10" y="120" fontFamily="JetBrains Mono, monospace" fontSize="9.2" fill={p.inkMid}>
                MODULAR SMART SAFETY HELMET WITH REMOVABLE GEODESIC POLYGON SHELL
              </text>

              {/* Row 4 (y=126..180): 도 번 / 표준규격 / 용지 */}
              <line x1="252" y1="126" x2="252" y2="180" stroke={p.ink} strokeWidth="1.0" />
              <line x1="354" y1="126" x2="354" y2="180" stroke={p.ink} strokeWidth="1.0" />
              <text x="10" y="140" fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif" fontSize="8.8" fill={p.inkFine}>
                도 번 (DRAWING NO.)
              </text>
              <text x="10" y="164" fontFamily="JetBrains Mono, monospace" fontSize="14.5" fontWeight="700" fill={p.ink}>
                SHM-2026-A3-001
              </text>

              <text x="262" y="140" fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif" fontSize="8.8" fill={p.inkFine}>
                표준 규격
              </text>
              <text x="262" y="162" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="700" fill={p.ink}>
                KS B 0001
              </text>

              <text x="389" y="140" textAnchor="middle" fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif" fontSize="8.8" fill={p.inkFine}>
                도면 크기
              </text>
              <text x="389" y="164" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="15" fontWeight="700" fill={p.ink}>
                A3
              </text>
            </g>
          </svg>
        </div>
      </div>
      )}
    </div>
  );
}
