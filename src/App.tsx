import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Download, FolderTree, RotateCcw, Video } from 'lucide-react';
import {
  CINEMATIC_DURATION_SEC,
  evaluateCinematicFrame,
  type CinematicFrameState,
} from './engineering/cinematicTimeline';
import {
  computePowerBudget,
  detectFallingObject,
  evaluateHazardState,
  evaluateSystemWeightAndCoG,
  type CadDisplayMode,
  type CameraPresetId,
  type ImpactDirection,
  type ModularConfig,
  type ShellCoverMode,
} from './engineering/helmetEngine';
import { SmartHelmetViewport } from './scene/SmartHelmetViewport';
import type { InspectablePartMeta } from './scene/helmetGeometry';
import { BottomCadDock, type DockTabId } from './components/BottomCadDock';
import { CadViewportTools } from './components/CadViewportTools';
import { CinematicOverlay } from './components/CinematicOverlay';
import { Blueprint2DView } from './components/Blueprint2DView';
import { WiringAndBomView } from './components/WiringAndBomView';

type WorkspaceMode = '3d' | 'cinematic' | '2d' | 'wiring';

function playBuzzerBeep(rapid: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = rapid ? 2730 : 2150;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    const duration = rapid ? 0.14 : 0.22;
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 320);
  } catch {
    // Ignore autoplay restrictions gracefully
  }
}

export default function App() {
  const [mode, setMode] = useState<WorkspaceMode>('3d');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [dockTab, setDockTab] = useState<DockTabId>('assembly');

  const [explodeFactor, setExplodeFactor] = useState(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('overview');
  const [cameraPresetTrigger, setCameraPresetTrigger] = useState(0);
  const [displayMode, setDisplayMode] = useState<CadDisplayMode>('shaded-edges');
  const [coverMode, setCoverMode] = useState<ShellCoverMode>('closed');
  const [treeOpen, setTreeOpen] = useState(false);
  const [showCones, setShowCones] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const [modularConfig, setModularConfig] = useState<ModularConfig>({
    includeDht11: true,
    includeMq2: false,
    includeKy037: false,
    ambientTempC: 20,
    rearObstacleCm: 185,
    gasPpm: 45,
  });

  const [impactDirection, setImpactDirection] = useState<ImpactDirection>('NONE');
  const [fallingProgress, setFallingProgress] = useState<number | null>(null);
  const [fallingDetected, setFallingDetected] = useState(false);
  const [fallingDistCm, setFallingDistCm] = useState(300);
  const [fallingSpeedCmPerSec, setFallingSpeedCmPerSec] = useState(0);
  const [inspectedPart, setInspectedPart] = useState<InspectablePartMeta | null>(null);

  // Cinematic Showcase & Video Recording State
  const [cinematicTime, setCinematicTime] = useState(0);
  const [cinematicPlaying, setCinematicPlaying] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  const blueprintSvgRef = useRef<SVGSVGElement | null>(null);
  const fallingTimerRef = useRef<number | null>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<{
    mediaRecorder: MediaRecorder;
    compCanvas: HTMLCanvasElement;
    compCtx: CanvasRenderingContext2D;
    chunks: Blob[];
    cancelled: boolean;
  } | null>(null);
  const cinematicFrameRef = useRef<CinematicFrameState>(evaluateCinematicFrame(0));

  const weightMetrics = useMemo(
    () => evaluateSystemWeightAndCoG(modularConfig),
    [modularConfig],
  );
  const powerMetrics = useMemo(() => computePowerBudget(modularConfig), [modularConfig]);

  const hazard = useMemo(
    () =>
      evaluateHazardState({
        fallingDetected,
        fallingDistanceCm: fallingDistCm,
        fallingSpeedCmPerSec,
        impactDirection,
        rearObstacleCm: modularConfig.rearObstacleCm,
        gasPpm: modularConfig.gasPpm,
        includeMq2: modularConfig.includeMq2,
        activeWorkerCount: 8,
      }),
    [
      fallingDetected,
      fallingDistCm,
      fallingSpeedCmPerSec,
      impactDirection,
      modularConfig.rearObstacleCm,
      modularConfig.gasPpm,
      modularConfig.includeMq2,
    ],
  );

  const cinematicFrame = useMemo(() => evaluateCinematicFrame(cinematicTime), [cinematicTime]);
  cinematicFrameRef.current = cinematicFrame;

  // Keyboard shortcut H to toggle dock visibility in 3D view, Space to toggle play in Cinematic
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (mode === '3d' && (e.key === 'h' || e.key === 'H')) {
        setDockCollapsed((prev) => !prev);
      } else if (mode === 'cinematic' && e.code === 'Space' && !isRecording) {
        e.preventDefault();
        setCinematicPlaying((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, isRecording]);

  // Smooth Cinematic Playback Clock + Offscreen 1280x720 Video Compositor Frame Pump
  useEffect(() => {
    if (mode !== 'cinematic' || !cinematicPlaying) return;

    let rafId = 0;
    let prevNow = performance.now();

    const drawCompositeFrame = (frame: CinematicFrameState) => {
      const rec = recorderRef.current;
      const glCanvas = webglCanvasRef.current;
      if (!rec || !glCanvas) return;

      const { compCanvas, compCtx } = rec;
      const W = compCanvas.width;
      const H = compCanvas.height;

      compCtx.fillStyle = '#0b1019';
      compCtx.fillRect(0, 0, W, H);

      // Draw WebGL 3D render cleanly fitted inside 1280x720 cinema frame
      const srcRatio = glCanvas.width / Math.max(1, glCanvas.height);
      const dstRatio = W / H;
      let drawW = W;
      let drawH = H;
      let offsetX = 0;
      let offsetY = 0;
      if (srcRatio > dstRatio) {
        drawW = H * srcRatio;
        offsetX = (W - drawW) / 2;
      } else {
        drawH = W / srcRatio;
        offsetY = (H - drawH) / 2;
      }
      compCtx.drawImage(glCanvas, offsetX, offsetY, drawW, drawH);

      // Sleek top & bottom letterbox bars
      compCtx.fillStyle = 'rgba(6, 9, 15, 0.94)';
      compCtx.fillRect(0, 0, W, 38);
      compCtx.fillRect(0, H - 96, W, 96);

      // Subtle watermark top-right
      compCtx.font = '600 13px "JetBrains Mono", monospace';
      compCtx.fillStyle = 'rgba(226, 232, 240, 0.72)';
      compCtx.textAlign = 'right';
      compCtx.fillText('SMARTHELMET CAD · MODULAR KCs ABE', W - 36, 24);

      // Lower-third Chapter Badge, Title & Subtitle
      compCtx.save();
      compCtx.globalAlpha = frame.captionOpacity;
      compCtx.textAlign = 'left';

      compCtx.font = '600 12px "JetBrains Mono", monospace';
      compCtx.fillStyle = '#fbbf24';
      compCtx.fillText(
        `CHAPTER ${frame.chapter.code} / 06  —  ${frame.chapter.badgeEn}`,
        40,
        H - 64,
      );

      compCtx.font = '700 22px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
      compCtx.fillStyle = '#ffffff';
      compCtx.fillText(frame.chapter.titleKo, 40, H - 36);

      compCtx.font = '400 13px "Noto Sans KR", sans-serif';
      compCtx.fillStyle = '#cbd5e1';
      compCtx.fillText(frame.chapter.subtitleKo, 40, H - 14);
      compCtx.restore();

      // Thin amber timeline progress rule along top edge of bottom letterbox
      compCtx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      compCtx.fillRect(0, H - 96, W, 3);
      compCtx.fillStyle = frame.severity === 'CRITICAL' ? '#ef4444' : '#fbbf24';
      compCtx.fillRect(0, H - 96, W * frame.progress, 3);

      // Opening fade curtain
      if (frame.curtainAlpha > 0.01) {
        compCtx.fillStyle = `rgba(0, 0, 0, ${frame.curtainAlpha})`;
        compCtx.fillRect(0, 0, W, H);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.08, Math.max(0.001, (now - prevNow) / 1000));
      prevNow = now;

      setCinematicTime((prev) => {
        const next = Math.min(CINEMATIC_DURATION_SEC, prev + dt);
        const frame = evaluateCinematicFrame(next);
        drawCompositeFrame(frame);

        if (next >= CINEMATIC_DURATION_SEC) {
          setCinematicPlaying(false);
          const rec = recorderRef.current;
          if (rec && rec.mediaRecorder.state === 'recording') {
            rec.mediaRecorder.stop();
          }
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mode, cinematicPlaying]);

  // Optional audio piezo beep when hazard becomes active (both CAD and Cinematic Chapter 5)
  const activeBuzzerRapid =
    mode === 'cinematic'
      ? cinematicFrame.buzzerActive
      : hazard.buzzerMode === 'RAPID';
  const activeBuzzerOn =
    mode === 'cinematic'
      ? cinematicPlaying && cinematicFrame.buzzerActive
      : hazard.buzzerMode !== 'OFF';

  useEffect(() => {
    if (!audioEnabled || !activeBuzzerOn) return;
    playBuzzerBeep(activeBuzzerRapid);
    const intervalMs = activeBuzzerRapid ? 420 : 1000;
    const id = window.setInterval(() => {
      playBuzzerBeep(activeBuzzerRapid);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [audioEnabled, activeBuzzerOn, activeBuzzerRapid]);

  useEffect(() => {
    return () => {
      if (fallingTimerRef.current !== null) {
        window.clearInterval(fallingTimerRef.current);
      }
      if (recorderRef.current && recorderRef.current.mediaRecorder.state === 'recording') {
        recorderRef.current.cancelled = true;
        recorderRef.current.mediaRecorder.stop();
      }
    };
  }, []);

  const handleUpdateModularConfig = useCallback((patch: Partial<ModularConfig>) => {
    setModularConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSelectCamera = useCallback((preset: CameraPresetId) => {
    setCameraPreset(preset);
    setCameraPresetTrigger((c) => c + 1);
  }, []);

  const handleResetSafe = useCallback(() => {
    if (fallingTimerRef.current !== null) {
      window.clearInterval(fallingTimerRef.current);
      fallingTimerRef.current = null;
    }
    setFallingProgress(null);
    setFallingDetected(false);
    setFallingDistCm(300);
    setFallingSpeedCmPerSec(0);
    setImpactDirection('NONE');
    setModularConfig((prev) => ({
      ...prev,
      rearObstacleCm: Math.max(120, prev.rearObstacleCm),
      gasPpm: Math.min(80, prev.gasPpm),
    }));
  }, []);

  const handleTriggerFalling = useCallback(() => {
    if (fallingTimerRef.current !== null) {
      window.clearInterval(fallingTimerRef.current);
    }
    setImpactDirection('NONE');
    setFallingProgress(0.05);
    setFallingDetected(false);
    setDockTab('simulation');

    const startTime = performance.now();
    const samples: Array<{ timeMs: number; distanceCm: number }> = [
      { timeMs: 0, distanceCm: 235 },
    ];

    fallingTimerRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / 750);
      const currentDist = Math.max(24, Math.round(235 - progress * 211));
      samples.push({ timeMs: elapsed, distanceCm: currentDist });
      const recent = samples.slice(-3);
      const analysis = detectFallingObject(recent);

      setFallingProgress(progress);
      setFallingDistCm(analysis.latestDistanceCm);
      setFallingSpeedCmPerSec(analysis.closingSpeedCmPerSec);
      if (analysis.detected) {
        setFallingDetected(true);
      }

      if (progress >= 1 && fallingTimerRef.current !== null) {
        window.clearInterval(fallingTimerRef.current);
        fallingTimerRef.current = null;
      }
    }, 65); // Matches 65ms ultrasonic TDM polling interval from engineering report
  }, []);

  const handleTriggerImpact = useCallback((dir: ImpactDirection) => {
    if (fallingTimerRef.current !== null) {
      window.clearInterval(fallingTimerRef.current);
      fallingTimerRef.current = null;
    }
    setFallingProgress(null);
    setFallingDetected(false);
    setImpactDirection((prev) => (prev === dir ? 'NONE' : dir));
  }, []);

  const handleExportSvg = useCallback(() => {
    const svgEl = blueprintSvgRef.current;
    if (!svgEl) {
      setMode('2d');
      return;
    }
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart-helmet-modular-blueprint-2d.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleOpenCinematic = useCallback(() => {
    setMode('cinematic');
    setCinematicTime(0);
    setCinematicPlaying(true);
  }, []);

  const handleToggleCinematicPlay = useCallback(() => {
    setCinematicPlaying((prev) => {
      if (!prev && cinematicTime >= CINEMATIC_DURATION_SEC - 0.05) {
        setCinematicTime(0);
      }
      return !prev;
    });
  }, [cinematicTime]);

  const handleRestartCinematic = useCallback(() => {
    setCinematicTime(0);
    setCinematicPlaying(true);
  }, []);

  const handleSeekCinematic = useCallback((tSec: number) => {
    setCinematicTime(Math.max(0, Math.min(CINEMATIC_DURATION_SEC, tSec)));
  }, []);

  const handleCancelRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec) {
      rec.cancelled = true;
      if (rec.mediaRecorder.state === 'recording') {
        rec.mediaRecorder.stop();
      }
    }
    setIsRecording(false);
  }, []);

  const handleStartRecording = useCallback(() => {
    if (isRecording) return;
    if (mode !== 'cinematic') {
      setMode('cinematic');
    }
    const glCanvas = webglCanvasRef.current;
    if (!glCanvas || typeof MediaRecorder === 'undefined') return;

    const compCanvas = document.createElement('canvas');
    compCanvas.width = 1280;
    compCanvas.height = 720;
    const compCtx = compCanvas.getContext('2d');
    if (!compCtx) return;

    const stream = compCanvas.captureStream(30);
    const preferredTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const mimeType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';
    const mediaRecorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : undefined,
    );

    const chunks: Blob[] = [];
    const recObj = {
      mediaRecorder,
      compCanvas,
      compCtx,
      chunks,
      cancelled: false,
    };
    recorderRef.current = recObj;

    mediaRecorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        chunks.push(ev.data);
      }
    };

    mediaRecorder.onstop = () => {
      setIsRecording(false);
      recorderRef.current = null;
      if (recObj.cancelled || chunks.length === 0) return;

      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smart-helmet-cinematic-showcase.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    setCinematicTime(0);
    setCinematicPlaying(true);
    setIsRecording(true);
    mediaRecorder.start(250);
  }, [isRecording, mode]);

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 text-slate-900"
      data-mode={mode}
      data-severity={hazard.severity}
    >
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="h-14 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 z-30">
        {/* Zone 1: Single Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setMode('3d');
          }}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          SmartHelmet CAD
        </a>

        {/* Zone 2: Clean Text Navigation Links */}
        <nav className="flex items-center gap-6 text-sm font-medium" aria-label="작업 공간 전환">
          {(
            [
              { id: '3d', label: '3D 모델링' },
              { id: 'cinematic', label: '시네마틱 영상' },
              { id: '2d', label: '2D 설계 도면' },
              { id: 'wiring', label: '부품 및 배선도' },
            ] as const
          ).map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'cinematic') {
                    handleOpenCinematic();
                  } else {
                    if (isRecording) handleCancelRecording();
                    setMode(item.id);
                  }
                }}
                className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-blue-600 text-slate-950 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="shrink-0">
          {mode === '2d' ? (
            <button
              type="button"
              onClick={handleExportSvg}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              도면 SVG 저장
            </button>
          ) : mode === 'cinematic' ? (
            <button
              type="button"
              onClick={isRecording ? handleCancelRecording : handleStartRecording}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isRecording
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <Video className="w-3.5 h-3.5" aria-hidden="true" />
              {isRecording
                ? `녹화 중 ${Math.round(cinematicFrame.progress * 100)}%`
                : '발표용 영상 저장'}
            </button>
          ) : (
            <button
              type="button"
              onClick={hazard.severity === 'SAFE' ? handleTriggerFalling : handleResetSafe}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                hazard.severity === 'SAFE'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {hazard.severity === 'SAFE' ? (
                '낙하물 경보 테스트'
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  정상 복구
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 relative overflow-hidden">
        {(mode === '3d' || mode === 'cinematic') && (
          <div className="w-full h-full relative">
            <SmartHelmetViewport
              explodeFactor={explodeFactor}
              cameraPreset={cameraPreset}
              cameraPresetTrigger={cameraPresetTrigger}
              displayMode={displayMode}
              coverMode={coverMode}
              showCones={showCones}
              modularConfig={modularConfig}
              hazard={hazard}
              impactDirection={impactDirection}
              fallingProgress={fallingProgress}
              cinematicActive={mode === 'cinematic'}
              cinematicFrame={mode === 'cinematic' ? cinematicFrame : null}
              onInspectPart={setInspectedPart}
              onCanvasReady={(c) => {
                webglCanvasRef.current = c;
              }}
            />

            {mode === 'cinematic' ? (
              <CinematicOverlay
                frame={cinematicFrame}
                isPlaying={cinematicPlaying}
                onTogglePlay={handleToggleCinematicPlay}
                onRestart={handleRestartCinematic}
                onSeek={handleSeekCinematic}
                audioEnabled={audioEnabled}
                onToggleAudio={() => setAudioEnabled((a) => !a)}
                isRecording={isRecording}
                recordingPercent={Math.round(cinematicFrame.progress * 100)}
                onStartRecording={handleStartRecording}
                onCancelRecording={handleCancelRecording}
                totalWeightG={weightMetrics.totalG}
                batteryHours={powerMetrics.batteryHours}
              />
            ) : (
              <>
                {/* Top-Right SolidWorks/Fusion360 Style ViewCube + Cover & Shading Controls */}
                <CadViewportTools
                  cameraPreset={cameraPreset}
                  onSelectCamera={handleSelectCamera}
                  displayMode={displayMode}
                  onChangeDisplayMode={setDisplayMode}
                  coverMode={coverMode}
                  onChangeCoverMode={setCoverMode}
                />

            {/* Minimal Top-Left Helmet Telemetry & Collapsible CAD Assembly Tree */}
            <div className="pointer-events-none absolute top-4 left-4 z-10 w-[300px] max-w-[calc(100vw-220px)] space-y-2">
              <div className="pointer-events-auto bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 shadow-xs">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-slate-900">
                    {hazard.alertTitleKo}
                  </span>
                  <span
                    className={`text-[11px] font-mono-tabular font-semibold ${
                      hazard.severity === 'CRITICAL'
                        ? 'text-red-600'
                        : hazard.severity === 'WARNING'
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                    }`}
                  >
                    {hazard.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                  {hazard.alertDetailKo}
                </p>
                {/* Compact Helmet Sensor & Actuator Telemetry Line */}
                <div
                  className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono-tabular text-slate-600"
                  aria-label="헬멧 센서 및 경보 상태"
                >
                  <span>
                    LED{' '}
                    <strong className={hazard.helmetRedHz > 0 ? 'text-red-600' : 'text-emerald-700'}>
                      {hazard.helmetRedHz > 0 ? `적색 ${hazard.helmetRedHz}Hz` : '녹색 정상'}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    부저{' '}
                    <strong className={hazard.buzzerMode !== 'OFF' ? 'text-amber-700' : 'text-slate-800'}>
                      {hazard.buzzerMode === 'RAPID'
                        ? '고속경보'
                        : hazard.buzzerMode === 'INTERMITTENT'
                          ? '간헐경보'
                          : '대기'}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    후면 <strong className="text-slate-900">{modularConfig.rearObstacleCm}cm</strong>
                  </span>
                </div>
              </div>

              {/* Collapsible CAD Assembly Feature Tree */}
              <div className="pointer-events-auto bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTreeOpen((v) => !v)}
                  aria-expanded={treeOpen}
                  className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                    어셈블리 트리 (폴리곤 케이스 · 센서)
                  </span>
                  {treeOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  )}
                </button>
                {treeOpen && (
                  <ul className="border-t border-slate-100 divide-y divide-slate-100 text-[11px]">
                    {(
                      [
                        {
                          label: '① 폴리곤 마감 케이스 (지오데식 외피 · 반투명 보기)',
                          cam: 'overview' as CameraPresetId,
                          cover: 'translucent' as ShellCoverMode,
                        },
                        {
                          label: '② 정수리 센서 모듈 (HC-SR04 #1 · 능동 부저 · 택트)',
                          cam: 'crown' as CameraPresetId,
                          cover: 'open' as ShellCoverMode,
                        },
                        {
                          label: '③ 후면 MCU 모듈 (Arduino Uno R3 · 2500mAh · HC #2)',
                          cam: 'rear' as CameraPresetId,
                          cover: 'open' as ShellCoverMode,
                        },
                        {
                          label: '④ 전면·측면 5방향 택트 & 양방향 LED (6개)',
                          cam: 'front' as CameraPresetId,
                          cover: 'open' as ShellCoverMode,
                        },
                        {
                          label: '⑤ 확장 센서 슬롯 (DHT11 · MQ-2 · KY-037)',
                          cam: 'side' as CameraPresetId,
                          cover: 'open' as ShellCoverMode,
                        },
                      ] as const
                    ).map((node) => (
                      <li key={node.label}>
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectCamera(node.cam);
                            setCoverMode(node.cover);
                          }}
                          className="w-full text-left px-3.5 py-1.5 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          {node.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {inspectedPart && (
                <div className="pointer-events-auto bg-white border border-slate-200 rounded-lg px-3.5 py-2 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {inspectedPart.labelKo}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {inspectedPart.sublabel}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectedPart(null)}
                      aria-label="선택 부품 닫기"
                      className="text-xs text-slate-400 hover:text-slate-700 px-1"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Unified Collapsible Bottom CAD Control Dock */}
            <BottomCadDock
              collapsed={dockCollapsed}
              onToggleCollapse={() => setDockCollapsed((c) => !c)}
              activeTab={dockTab}
              onChangeTab={setDockTab}
              explodeFactor={explodeFactor}
              onChangeExplode={setExplodeFactor}
              cameraPreset={cameraPreset}
              onSelectCamera={handleSelectCamera}
              showCones={showCones}
              onToggleCones={setShowCones}
              coverMode={coverMode}
              onChangeCoverMode={setCoverMode}
              modularConfig={modularConfig}
              onChangeModularConfig={handleUpdateModularConfig}
              weightMetrics={weightMetrics}
              powerMetrics={powerMetrics}
              impactDirection={impactDirection}
              onTriggerImpact={handleTriggerImpact}
              isFallingActive={fallingProgress !== null}
              onTriggerFalling={handleTriggerFalling}
              onResetSafe={handleResetSafe}
              hazard={hazard}
              audioEnabled={audioEnabled}
              onToggleAudio={() => setAudioEnabled((a) => !a)}
            />
              </>
            )}
          </div>
        )}

        {mode === '2d' && (
          <Blueprint2DView
            svgRef={blueprintSvgRef}
            modularConfig={modularConfig}
            weightMetrics={weightMetrics}
            powerMetrics={powerMetrics}
            hazard={hazard}
          />
        )}

        {mode === 'wiring' && (
          <WiringAndBomView
            modularConfig={modularConfig}
            weightMetrics={weightMetrics}
            powerMetrics={powerMetrics}
          />
        )}
      </main>
    </div>
  );
}
