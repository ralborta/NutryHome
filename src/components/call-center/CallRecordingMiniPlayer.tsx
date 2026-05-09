'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Download, Pause, Play, Square, X } from 'lucide-react';

export type PlayerTrack = {
  id: string;
  title: string;
  durationHintSecs?: number;
};

export type CallRecordingMiniPlayerHandle = {
  togglePlayPause: () => void;
  stop: () => void;
};

export type PlaybackUiState = { id: string; status: 'playing' | 'paused' } | null;

function formatClock(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

type Props = {
  track: PlayerTrack | null;
  onClose: () => void;
  onPlaybackChange: (s: PlaybackUiState) => void;
};

const CallRecordingMiniPlayer = forwardRef<CallRecordingMiniPlayerHandle, Props>(
  function CallRecordingMiniPlayer({ track, onClose, onPlaybackChange }, ref) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [loadError, setLoadError] = useState(false);
    const [uiPlaying, setUiPlaying] = useState(false);

    const audioUrl = track
      ? `/api/get-audio?id=${encodeURIComponent(track.id)}`
      : '';

    useEffect(() => {
      if (!track) return;
      const a = audioRef.current;
      if (!a) return;

      setLoadError(false);
      setCurrentTime(0);
      setUiPlaying(false);
      setDuration(track.durationHintSecs ?? 0);
      a.pause();
      a.src = audioUrl;
      a.load();

      const p = a.play();
      if (p !== undefined) {
        p
          .then(() => {
            setUiPlaying(true);
            onPlaybackChange({ id: track.id, status: 'playing' });
          })
          .catch(() => {
            setLoadError(true);
            setUiPlaying(false);
            onPlaybackChange(null);
          });
      }

      return () => {
        a.pause();
        setUiPlaying(false);
      };
    }, [track?.id, audioUrl, onPlaybackChange]);

    useEffect(() => {
      const a = audioRef.current;
      if (!a) return;

      const onTime = () => setCurrentTime(a.currentTime);
      const onMeta = () => {
        if (a.duration && Number.isFinite(a.duration)) {
          setDuration(a.duration);
        }
      };
      const onEnd = () => {
        setCurrentTime(0);
        setUiPlaying(false);
        if (track?.id) {
          onPlaybackChange({ id: track.id, status: 'paused' });
        }
      };
      const onPlay = () => setUiPlaying(true);
      const onPause = () => setUiPlaying(false);

      a.addEventListener('timeupdate', onTime);
      a.addEventListener('loadedmetadata', onMeta);
      a.addEventListener('durationchange', onMeta);
      a.addEventListener('ended', onEnd);
      a.addEventListener('play', onPlay);
      a.addEventListener('pause', onPause);
      return () => {
        a.removeEventListener('timeupdate', onTime);
        a.removeEventListener('loadedmetadata', onMeta);
        a.removeEventListener('durationchange', onMeta);
        a.removeEventListener('ended', onEnd);
        a.removeEventListener('play', onPlay);
        a.removeEventListener('pause', onPause);
      };
    }, [track?.id, track, onPlaybackChange]);

    const togglePlayPause = useCallback(() => {
      const a = audioRef.current;
      if (!a || !track?.id) return;
      if (a.paused) {
        void a.play().then(() => {
          setUiPlaying(true);
          onPlaybackChange({ id: track.id, status: 'playing' });
        });
      } else {
        a.pause();
        setUiPlaying(false);
        onPlaybackChange({ id: track.id, status: 'paused' });
      }
    }, [track, onPlaybackChange]);

    const stop = useCallback(() => {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
      setCurrentTime(0);
      setUiPlaying(false);
      onPlaybackChange(null);
      onClose();
    }, [onClose, onPlaybackChange]);

    useImperativeHandle(ref, () => ({ togglePlayPause, stop }), [togglePlayPause, stop]);

    const onSeek = (pct: number) => {
      const a = audioRef.current;
      const dur =
        duration > 0
          ? duration
          : track?.durationHintSecs && track.durationHintSecs > 0
            ? track.durationHintSecs
            : 0;
      if (!a || !dur) return;
      const t = (pct / 100) * dur;
      a.currentTime = t;
      setCurrentTime(t);
    };

    if (!track) return null;

    const durDisplay =
      duration > 0
        ? duration
        : track.durationHintSecs && track.durationHintSecs > 0
          ? track.durationHintSecs
          : 0;
    const progressPct = durDisplay > 0 ? Math.min(100, (currentTime / durDisplay) * 100) : 0;

    return (
      <div
        className="pointer-events-auto fixed bottom-5 right-5 z-[100] w-[min(calc(100vw-2.5rem),22rem)]"
        role="region"
        aria-label="Reproductor de grabación"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/75 shadow-[0_8px_40px_rgba(15,23,42,0.12),0_1px_0_rgba(255,255,255,0.8)_inset] backdrop-blur-xl">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />

          <div className="flex items-start justify-between gap-2 px-3.5 pb-2 pt-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Grabación
              </p>
              <p className="truncate text-sm font-semibold leading-tight text-slate-900">
                {track.title}
              </p>
            </div>
            <button
              type="button"
              onClick={stop}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar reproductor"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="px-3.5 pb-2">
            <div className="group relative">
              <div className="h-1.5 cursor-pointer overflow-hidden rounded-full bg-slate-200/90">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-[width] duration-150 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={0.2}
                value={progressPct}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="absolute inset-0 h-1.5 w-full cursor-pointer opacity-0"
                aria-label="Posición de reproducción"
              />
            </div>
            <div className="mt-1.5 flex justify-between tabular-nums text-[11px] font-medium text-slate-500">
              <span>{formatClock(currentTime)}</span>
              <span>{formatClock(durDisplay)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 bg-slate-50/50 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={togglePlayPause}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 transition hover:brightness-110 active:scale-95"
                aria-label={uiPlaying ? 'Pausar' : 'Reproducir'}
              >
                {uiPlaying ? (
                  <Pause className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Play className="ml-0.5 h-4 w-4 fill-current" strokeWidth={0} />
                )}
              </button>
              <button
                type="button"
                onClick={stop}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200/90 text-slate-600 transition hover:bg-slate-300 hover:text-slate-900"
                aria-label="Detener"
              >
                <Square className="h-3 w-3 fill-current" strokeWidth={0} />
              </button>
            </div>
            <a
              href={audioUrl}
              download={`grabacion_${track.id}.mp3`}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2} />
              Descargar
            </a>
          </div>

          {loadError ? (
            <p className="border-t border-rose-100 bg-rose-50/90 px-3 py-2 text-center text-[11px] text-rose-800">
              No se pudo cargar el audio. ¿Hay grabación para esta llamada?
            </p>
          ) : null}

          <audio ref={audioRef} preload="metadata" className="hidden" />
        </div>
      </div>
    );
  }
);

CallRecordingMiniPlayer.displayName = 'CallRecordingMiniPlayer';

export default CallRecordingMiniPlayer;
