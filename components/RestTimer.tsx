"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, Pause, RotateCcw, X, Maximize2, Minimize2, PartyPopper } from "lucide-react";

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
  const [expanded, setExpanded] = useState(false);

  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // quando o descanso termina, abre sozinho em tela cheia — é o alerta
  // "impossível não ver", em vez de só um textinho trocando de cor no
  // canto da ficha (fácil de passar batido se o aluno guardou o celular).
  useEffect(() => {
    if (done) {
      // se o aluno estava com o teclado aberto (ex: digitando carga/reps
      // de outro exercício) quando o descanso terminou, o navegador
      // encolhe a área visível — o teclado ainda aberto empurra o
      // conteúdo em tela cheia pra cima/fora do centro real da tela.
      // Tirar o foco fecha o teclado antes de abrir.
      (document.activeElement as HTMLElement | null)?.blur?.();
      setExpanded(true);
    }
  }, [done]);

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
        onClick={() => {
          start(duration);
          // abre direto em tela cheia — é o momento de descanso de
          // verdade, faz mais sentido já entrar no alerta grande do que
          // o aluno precisar lembrar de tocar no relógio pra ver. Quem
          // preferir a versão compacta minimiza com um toque.
          setExpanded(true);
        }}
        className="flex items-center gap-1.5 rounded-full border border-orange/25 bg-orange/10 px-3.5 py-1.5 text-sm font-semibold text-orange transition-colors hover:bg-orange/15"
      >
        <Play size={14} />
        Iniciar descanso ({duration}s)
      </button>
    );
  }

  // versão compacta (só aparece depois de minimizar da tela cheia, que já
  // tem os controles completos) — fica só com pausar/retomar; -15s/+15s
  // saíram daqui porque em celular mais estreito a fileira inteira
  // (relógio + nome + 4 botões) não cabia na largura do card e o botão
  // de cancelar vazava pra fora da borda arredondada.
  const compactPauseResume = !done && (
    running ? (
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
    )
  );

  return (
    <>
      <div
        className={`rounded-lg border p-3 transition-colors ${
          done ? "border-orange bg-orange/10" : "border-lightblue/40 bg-lightblue/5"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="group flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label="Ver cronômetro em tela cheia"
          >
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
                  style={{ transition: "stroke-dasharray 0.25s linear" }}
                />
              </svg>
              <span className="absolute text-xs font-bold text-navy">{formatTime(remaining)}</span>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-blue opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                <Maximize2 size={9} />
              </span>
            </div>
            <p className={`truncate text-sm font-medium ${done ? "text-orange" : "text-navy"}`}>
              {done ? "Descanso concluído!" : "Descansando..."}
            </p>
          </button>

          <div className="flex flex-none items-center gap-1">
            {compactPauseResume}
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

      {expanded && createPortal(
        <div
          className="fixed inset-0 z-50 m-0 flex h-[100dvh] w-screen flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-navy via-navy to-blue px-6 py-8 animate-[fadeIn_0.2s_ease-out]"
          role="dialog"
          aria-modal="true"
          aria-label="Cronômetro de descanso"
        >
          {/* minimiza pra versão compacta (não cancela — o descanso
              continua contando; quem quiser cancelar de verdade usa o
              link "Cancelar descanso" mais abaixo) */}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Minimizar"
            className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/20 hover:text-white"
          >
            <Minimize2 size={14} />
            Minimizar
          </button>

          <div
            className={`relative flex h-64 w-64 flex-none items-center justify-center ${
              done ? "animate-[bounceIn_0.5s_ease-out]" : ""
            }`}
          >
            <svg viewBox="0 0 36 36" className="h-64 w-64 -rotate-90 drop-shadow-[0_0_24px_rgba(237,91,53,0.35)]">
              <circle cx="18" cy="18" r={RING_RADIUS} fill="none" stroke="#ffffff" strokeOpacity={0.15} strokeWidth={2} />
              <circle
                cx="18"
                cy="18"
                r={RING_RADIUS}
                fill="none"
                stroke={done ? "#ED5B35" : "#EF7B3A"}
                strokeWidth={2}
                strokeDasharray={`${progress * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.25s linear" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              {done && <PartyPopper size={28} className="mb-2 text-orange2" />}
              <span className="font-heading text-6xl font-bold tabular-nums text-white">
                {formatTime(remaining)}
              </span>
            </div>
          </div>

          {/* frase curta de propósito — a versão mais longa ("Bora pra
              próxima refeição") quebrava em 2 linhas em celulares mais
              estreitos, com o emoji ficando sozinho numa linha por si só */}
          <p
            className={`mt-6 whitespace-nowrap text-center text-base font-semibold sm:text-lg ${
              done ? "text-orange2" : "text-white/80"
            }`}
          >
            {done ? "Descanso concluído! Bora! 💪" : "Descansando..."}
          </p>

          <div className="mt-8 flex items-center gap-3">
            {!done && (
              <>
                <button
                  type="button"
                  onClick={() => adjust(-ADJUST_STEP)}
                  className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
                >
                  -15s
                </button>
                {running ? (
                  <button
                    type="button"
                    onClick={pause}
                    aria-label="Pausar"
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-orange to-orange2 text-white shadow-[0_8px_24px_-6px_rgba(237,91,53,0.6)] active:scale-95"
                  >
                    <Pause size={26} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={resume}
                    aria-label="Continuar"
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-orange to-orange2 text-white shadow-[0_8px_24px_-6px_rgba(237,91,53,0.6)] active:scale-95"
                  >
                    <Play size={26} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => adjust(ADJUST_STEP)}
                  className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
                >
                  +15s
                </button>
              </>
            )}
            {done && (
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-orange to-orange2 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(237,91,53,0.6)] active:scale-95"
              >
                <RotateCcw size={16} />
                Descansar de novo
              </button>
            )}
          </div>

          {!done && (
            <button type="button" onClick={reset} className="mt-6 text-sm text-white/50 hover:text-white/80">
              Cancelar descanso
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
