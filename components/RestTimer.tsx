"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, X } from "lucide-react";

const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MIN_SECONDS = 5;
const ADJUST_STEP = 15;

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RestTimer({ seconds }: { seconds: number | null }) {
  const duration = seconds && seconds > 0 ? seconds : 60;

  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  function ensureAudioContext() {
    if (audioCtxRef.current) return audioCtxRef.current;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    audioCtxRef.current = new AudioCtx();
    return audioCtxRef.current;
  }

  function beep() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Web Audio pode falhar em alguns navegadores — ignora, o visual já avisa
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  function tick() {
    if (!endTimeRef.current) return;
    const left = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
    setRemaining(left);
    if (left <= 0) {
      setRunning(false);
      setDone(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      beep();
    }
  }

  function start(fromSeconds: number) {
    ensureAudioContext(); // criado dentro do clique do usuário, libera o beep depois
    setDone(false);
    setRunning(true);
    endTimeRef.current = Date.now() + fromSeconds * 1000;
    setRemaining(fromSeconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 250);
  }

  function pause() {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function resume() {
    if (remaining <= 0) return;
    setRunning(true);
    endTimeRef.current = Date.now() + remaining * 1000;
    intervalRef.current = setInterval(tick, 250);
  }

  function reset() {
    pause();
    setDone(false);
    setRemaining(duration);
  }

  function adjust(delta: number) {
    const next = Math.max(MIN_SECONDS, remaining + delta);
    setRemaining(next);
    if (running && endTimeRef.current) {
      endTimeRef.current = Date.now() + next * 1000;
    }
  }

  const progress = duration > 0 ? Math.min(1, Math.max(0, (duration - remaining) / duration)) : 0;
  const idle = !running && !done && remaining === duration;

  if (idle) {
    return (
      <button
        type="button"
        onClick={() => start(duration)}
        className="flex items-center gap-1.5 rounded-lg bg-blue/10 px-3 py-1.5 text-sm font-medium text-blue hover:bg-blue/20"
      >
        <Play size={14} />
        Iniciar descanso ({duration}s)
      </button>
    );
  }

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        done ? "border-orange bg-orange/10" : "border-lightblue/40 bg-lightblue/5"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 flex-none items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r={RING_RADIUS}
                fill="none"
                stroke="#8499CC"
                strokeOpacity={0.2}
                strokeWidth={3}
              />
              <circle
                cx="18"
                cy="18"
                r={RING_RADIUS}
                fill="none"
                stroke={done ? "#ED5B35" : "#2F4599"}
                strokeWidth={3}
                strokeDasharray={`${progress * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xs font-bold text-navy">{formatTime(remaining)}</span>
          </div>
          <p className={`text-sm font-medium ${done ? "text-orange" : "text-navy"}`}>
            {done ? "Descanso concluído!" : "Descansando..."}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {!done && (
            <>
              <button
                type="button"
                onClick={() => adjust(-ADJUST_STEP)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-blue hover:bg-lightblue/20"
              >
                -15s
              </button>
              <button
                type="button"
                onClick={() => adjust(ADJUST_STEP)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-blue hover:bg-lightblue/20"
              >
                +15s
              </button>
              {running ? (
                <button
                  type="button"
                  onClick={pause}
                  aria-label="Pausar"
                  className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20"
                >
                  <Pause size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resume}
                  aria-label="Continuar"
                  className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20"
                >
                  <Play size={16} />
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={reset}
            aria-label={done ? "Iniciar de novo" : "Cancelar"}
            className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20"
          >
            {done ? <RotateCcw size={16} /> : <X size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
