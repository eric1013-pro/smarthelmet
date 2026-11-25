import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import {
  CINEMATIC_DURATION_SEC,
  evaluateCinematicFrame,
  type CinematicFrameState,
} from './cinematicTimeline';

export interface CinematicExportOptions {
  glCanvas: HTMLCanvasElement;
  renderFrame: (frame: CinematicFrameState) => void;
  onProgress: (percent: number, timeSec: number) => void;
  isCancelled: () => boolean;
  totalWeightG: number;
  batteryHours: number;
}

export interface CinematicExportResult {
  blob: Blob;
  filename: string;
  format: 'mp4' | 'webm';
}

const OUT_W = 1280;
const OUT_H = 720;
const FPS = 30;

export function drawCinematicCompositeFrame(
  compCtx: CanvasRenderingContext2D,
  glCanvas: HTMLCanvasElement,
  frame: CinematicFrameState,
  totalWeightG: number,
  batteryHours: number,
): void {
  const W = compCtx.canvas.width;
  const H = compCtx.canvas.height;

  compCtx.fillStyle = '#0b1019';
  compCtx.fillRect(0, 0, W, H);

  // Fit WebGL 3D render cleanly into 1280x720 cinema frame (cover crop)
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

  // Top & bottom cinema letterbox bars
  compCtx.fillStyle = 'rgba(6, 9, 15, 0.94)';
  compCtx.fillRect(0, 0, W, 38);
  compCtx.fillRect(0, H - 98, W, 98);

  // Top-left brand + Top-right live status
  compCtx.font = '600 12px "JetBrains Mono", monospace';
  compCtx.fillStyle = 'rgba(226, 232, 240, 0.8)';
  compCtx.textAlign = 'left';
  compCtx.fillText('SMARTHELMET CAD · KCs ABE MODULAR SHOWCASE', 36, 24);

  if (frame.chapter.index >= 3) {
    const isCritical = frame.severity === 'CRITICAL';
    compCtx.textAlign = 'right';
    compCtx.fillStyle = isCritical ? '#f87171' : '#34d399';
    compCtx.fillText(
      `${isCritical ? 'CRITICAL · 4Hz RED · 85dB BUZZER' : 'ACTIVE · SAFE'}  |  ${totalWeightG}g · ${batteryHours}h`,
      W - 36,
      24,
    );
  }

  // Lower-third Chapter Badge, Korean Title & Subtitle
  compCtx.save();
  compCtx.globalAlpha = frame.captionOpacity;
  compCtx.textAlign = 'left';

  compCtx.font = '600 12px "JetBrains Mono", monospace';
  compCtx.fillStyle = '#fbbf24';
  compCtx.fillText(
    `CHAPTER ${frame.chapter.code} / 06  —  ${frame.chapter.badgeEn}`,
    40,
    H - 66,
  );

  compCtx.font = '700 22px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
  compCtx.fillStyle = '#ffffff';
  compCtx.fillText(frame.chapter.titleKo, 40, H - 38);

  compCtx.font = '400 13px "Noto Sans KR", sans-serif';
  compCtx.fillStyle = '#cbd5e1';
  compCtx.fillText(frame.chapter.subtitleKo, 40, H - 15);
  compCtx.restore();

  // Thin amber/red cinema progress rule along top edge of bottom letterbox
  compCtx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  compCtx.fillRect(0, H - 98, W, 3);
  compCtx.fillStyle = frame.severity === 'CRITICAL' ? '#ef4444' : '#fbbf24';
  compCtx.fillRect(0, H - 98, W * frame.progress, 3);

  // Opening black curtain fade
  if (frame.curtainAlpha > 0.01) {
    compCtx.fillStyle = `rgba(0, 0, 0, ${frame.curtainAlpha})`;
    compCtx.fillRect(0, 0, W, H);
  }
}

function nextFrameTick(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function tryWebCodecsMp4(
  opts: CinematicExportOptions,
): Promise<CinematicExportResult | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return null;
  }

  // Try standard H.264 profiles compatible with Windows, macOS, iOS, Android, KakaoTalk & PPT
  const codecCandidates = ['avc1.42001f', 'avc1.4d001f', 'avc1.64001f'];
  let chosenCodec: string | null = null;
  for (const codec of codecCandidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width: OUT_W,
        height: OUT_H,
        bitrate: 5_500_000,
        framerate: FPS,
      });
      if (support.supported) {
        chosenCodec = codec;
        break;
      }
    } catch {
      // Try next H.264 profile
    }
  }
  if (!chosenCodec) {
    return null;
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width: OUT_W,
      height: OUT_H,
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encodeError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (err) => {
      encodeError = err instanceof Error ? err : new Error(String(err));
    },
  });

  encoder.configure({
    codec: chosenCodec,
    width: OUT_W,
    height: OUT_H,
    bitrate: 5_500_000,
    framerate: FPS,
  });

  const compCanvas = document.createElement('canvas');
  compCanvas.width = OUT_W;
  compCanvas.height = OUT_H;
  const compCtx = compCanvas.getContext('2d');
  if (!compCtx) {
    encoder.close();
    return null;
  }

  const totalFrames = Math.round(CINEMATIC_DURATION_SEC * FPS);
  const frameDurationUs = Math.round(1_000_000 / FPS);

  for (let i = 0; i < totalFrames; i++) {
    if (opts.isCancelled()) {
      encoder.close();
      return null;
    }
    if (encodeError) {
      encoder.close();
      throw encodeError;
    }

    const tSec = Math.min(CINEMATIC_DURATION_SEC, i / FPS);
    const frame = evaluateCinematicFrame(tSec);
    opts.renderFrame(frame);
    drawCinematicCompositeFrame(
      compCtx,
      opts.glCanvas,
      frame,
      opts.totalWeightG,
      opts.batteryHours,
    );

    // Backpressure guard so browser encoder queue never saturates RAM
    while (encoder.encodeQueueSize > 8) {
      await nextFrameTick();
      if (opts.isCancelled()) {
        encoder.close();
        return null;
      }
    }

    const vf = new VideoFrame(compCanvas, {
      timestamp: i * frameDurationUs,
      duration: frameDurationUs,
    });
    encoder.encode(vf, { keyFrame: i % 60 === 0 });
    vf.close();

    if (i % 3 === 0 || i === totalFrames - 1) {
      opts.onProgress(Math.round(((i + 1) / totalFrames) * 100), tSec);
      await nextFrameTick();
    }
  }

  await encoder.flush();
  encoder.close();

  if (encodeError) {
    throw encodeError;
  }

  muxer.finalize();
  const blob = new Blob([target.buffer], { type: 'video/mp4' });
  return {
    blob,
    filename: 'smart-helmet-cinematic-showcase.mp4',
    format: 'mp4',
  };
}

async function fallbackMediaRecorderExport(
  opts: CinematicExportOptions,
): Promise<CinematicExportResult | null> {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  const compCanvas = document.createElement('canvas');
  compCanvas.width = OUT_W;
  compCanvas.height = OUT_H;
  const compCtx = compCanvas.getContext('2d');
  if (!compCtx) return null;

  const mp4Mimes = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];
  const webmMimes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  const mp4Match = mp4Mimes.find((m) => MediaRecorder.isTypeSupported(m));
  const webmMatch = webmMimes.find((m) => MediaRecorder.isTypeSupported(m));
  const mimeType = mp4Match || webmMatch || '';
  const isMp4 = Boolean(mp4Match);

  const stream = compCanvas.captureStream(FPS);
  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType, videoBitsPerSecond: 5_500_000 } : undefined,
  );
  const chunks: Blob[] = [];

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(250);
  const startMs = performance.now();

  while (true) {
    if (opts.isCancelled()) {
      if (recorder.state === 'recording') recorder.stop();
      await stopped;
      return null;
    }

    const elapsedSec = Math.min(CINEMATIC_DURATION_SEC, (performance.now() - startMs) / 1000);
    const frame = evaluateCinematicFrame(elapsedSec);
    opts.renderFrame(frame);
    drawCinematicCompositeFrame(
      compCtx,
      opts.glCanvas,
      frame,
      opts.totalWeightG,
      opts.batteryHours,
    );
    opts.onProgress(Math.round((elapsedSec / CINEMATIC_DURATION_SEC) * 100), elapsedSec);

    if (elapsedSec >= CINEMATIC_DURATION_SEC) {
      break;
    }
    await nextFrameTick();
  }

  if (recorder.state === 'recording') {
    recorder.stop();
  }
  await stopped;

  if (chunks.length === 0) return null;
  const blob = new Blob(chunks, { type: mimeType || (isMp4 ? 'video/mp4' : 'video/webm') });
  return {
    blob,
    filename: isMp4
      ? 'smart-helmet-cinematic-showcase.mp4'
      : 'smart-helmet-cinematic-showcase.webm',
    format: isMp4 ? 'mp4' : 'webm',
  };
}

/**
 * Exports the full 22-second 1280×720 30fps cinematic showcase as a standard H.264 MP4 file
 * via WebCodecs + mp4-muxer (fast offline frame-accurate encoding with zero dropped frames),
 * automatically falling back to MediaRecorder MP4/WebM on browsers without WebCodecs.
 */
export async function exportCinematicVideo(
  opts: CinematicExportOptions,
): Promise<CinematicExportResult | null> {
  try {
    const mp4Result = await tryWebCodecsMp4(opts);
    if (mp4Result || opts.isCancelled()) {
      return mp4Result;
    }
  } catch {
    // Gracefully fall back if WebCodecs H.264 encoder fails on an unusual GPU driver
  }

  return fallbackMediaRecorderExport(opts);
}
