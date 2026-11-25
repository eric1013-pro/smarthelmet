import { Pause, Play, RotateCcw, Square, Video, Volume2, VolumeX } from 'lucide-react';
import {
  CINEMATIC_CHAPTERS,
  CINEMATIC_DURATION_SEC,
  type CinematicFrameState,
} from '../engineering/cinematicTimeline';

interface CinematicOverlayProps {
  frame: CinematicFrameState;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSeek: (timeSec: number) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  isRecording: boolean;
  recordingPercent: number;
  onStartRecording: () => void;
  onCancelRecording: () => void;
  totalWeightG: number;
  batteryHours: number;
}

const CHAPTER_SHORT_LABELS = [
  '01 안전모 모체',
  '02 클립 프레임',
  '03 후면 MCU',
  '04 360° 센서',
  '05 경보 작동',
  '06 폴리곤 마감',
] as const;

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function CinematicOverlay({
  frame,
  isPlaying,
  onTogglePlay,
  onRestart,
  onSeek,
  audioEnabled,
  onToggleAudio,
  isRecording,
  recordingPercent,
  onStartRecording,
  onCancelRecording,
  totalWeightG,
  batteryHours,
}: CinematicOverlayProps) {
  const isCritical = frame.severity === 'CRITICAL';
  const showLiveSpec = frame.chapter.index >= 3;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between select-none"
      data-testid="cinematic-overlay"
    >
      {/* Opening Black Curtain Fade */}
      {frame.curtainAlpha > 0.01 && (
        <div
          className="absolute inset-0 bg-black pointer-events-none z-30"
          style={{ opacity: frame.curtainAlpha }}
        />
      )}

      {/* Top Cinema Letterbox & Architectural Chapter Header */}
      <div className="w-full">
        <div className="h-3 bg-black/95 w-full" />
        <div className="px-7 pt-5 flex items-start justify-between gap-6">
          {/* Left: Minimal Product-Launch Chapter Title */}
          <div
            className="max-w-2xl transition-opacity duration-150"
            style={{ opacity: frame.captionOpacity }}
          >
            <div className="flex items-center gap-2.5 text-[11px] font-mono-tabular tracking-[0.18em] uppercase text-amber-400">
              <span>
                CHAPTER {frame.chapter.code} / 06
              </span>
              <span className="text-slate-500" aria-hidden="true">—</span>
              <span className="text-slate-300">{frame.chapter.badgeEn}</span>
            </div>
            <h1 className="mt-1.5 text-xl md:text-2xl font-semibold tracking-tight text-white">
              {frame.chapter.titleKo}
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-300 leading-relaxed">
              {frame.chapter.subtitleKo}
            </p>
          </div>

          {/* Right: Restrained Live Engineering & Hazard Telemetry Strip */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {isRecording && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-600/90 text-white text-xs font-mono-tabular font-semibold">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
                REC {recordingPercent}%
              </div>
            )}

            {showLiveSpec && (
              <div className="bg-[#0b1019]/90 border border-white/15 rounded-lg px-3.5 py-2 text-right font-mono-tabular">
                <div className="flex items-center justify-end gap-2 text-[11px]">
                  <span className="text-slate-400">SYSTEM</span>
                  <span
                    className={`font-semibold ${
                      isCritical ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {isCritical ? 'FALLING HAZARD · CRITICAL' : 'ACTIVE · SAFE'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-end gap-2.5 text-[11px] text-slate-300">
                  <span>
                    LED{' '}
                    <strong className={isCritical ? 'text-red-400' : 'text-emerald-400'}>
                      {isCritical ? '4Hz RED' : 'GREEN'}
                    </strong>
                  </span>
                  <span className="text-slate-600">·</span>
                  <span>
                    BUZZER{' '}
                    <strong className={frame.buzzerActive ? 'text-amber-400' : 'text-slate-400'}>
                      {frame.buzzerActive ? '85dB ON' : 'STANDBY'}
                    </strong>
                  </span>
                  <span className="text-slate-600">·</span>
                  <span>
                    {totalWeightG}g · {batteryHours}h
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Solid Cinema Transport & Chapter Scrubber Deck */}
      <div className="pointer-events-auto w-full bg-[#090d14] border-t border-white/10 px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-col gap-2.5">
          {/* Interactive Chapter Jump Markers */}
          <div className="grid grid-cols-6 gap-1.5">
            {CINEMATIC_CHAPTERS.map((ch, idx) => {
              const active = frame.chapter.index === idx;
              const passed = frame.timeSec >= ch.endSec;
              const fillPct = active ? frame.chapterLocalProgress * 100 : passed ? 100 : 0;

              return (
                <button
                  key={ch.code}
                  type="button"
                  disabled={isRecording}
                  onClick={() => onSeek(ch.startSec + 0.05)}
                  className="group text-left disabled:opacity-60"
                >
                  <div className="h-1 w-full bg-white/15 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full transition-[width] duration-75 ${
                        idx === 4 && active ? 'bg-red-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                  <span
                    className={`block text-[11px] font-medium truncate transition-colors ${
                      active
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {CHAPTER_SHORT_LABELS[idx]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Transport Controls + Fine Scrubber + Video Export */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-0.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isRecording}
                onClick={onTogglePlay}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    일시정지
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    재생
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isRecording}
                onClick={onRestart}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-white/10 hover:bg-white/15 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                처음부터
              </button>

              <button
                type="button"
                onClick={onToggleAudio}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-white/10 hover:bg-white/15 rounded-md transition-colors whitespace-nowrap"
              >
                {audioEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    경보음 켜짐
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    경보음 꺼짐
                  </>
                )}
              </button>
            </div>

            {/* Fine Timeline Scrubber */}
            <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-md">
              <span className="text-[11px] font-mono-tabular text-slate-300 w-10 text-right">
                {formatTime(frame.timeSec)}
              </span>
              <input
                id="cinematic-scrubber"
                aria-label="시네마틱 타임라인"
                type="range"
                min={0}
                max={Math.round(CINEMATIC_DURATION_SEC * 10)}
                value={Math.round(frame.timeSec * 10)}
                disabled={isRecording}
                onChange={(e) => onSeek(Number(e.target.value) / 10)}
                className="cad-slider flex-1"
              />
              <span className="text-[11px] font-mono-tabular text-slate-400 w-10">
                {formatTime(CINEMATIC_DURATION_SEC)}
              </span>
            </div>

            {/* Export Presentation Video (.mp4) */}
            <div className="flex items-center gap-2">
              {isRecording ? (
                <button
                  type="button"
                  onClick={onCancelRecording}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors whitespace-nowrap"
                >
                  <Square className="w-3.5 h-3.5" aria-hidden="true" />
                  MP4 저장 중단 ({recordingPercent}%)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartRecording}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors whitespace-nowrap"
                >
                  <Video className="w-3.5 h-3.5" aria-hidden="true" />
                  발표용 MP4 영상 저장
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
