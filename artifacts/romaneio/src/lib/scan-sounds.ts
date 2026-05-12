let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(
  frequency: number,
  startTime: number,
  duration: number,
  gainValue: number,
  type: OscillatorType,
  ac: AudioContext,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/** Dois bipes ascendentes — confirmação de sucesso */
export function playScanSuccess() {
  const ac = getCtx();
  const t = ac.currentTime;
  playTone(880, t, 0.12, 0.9, "sine", ac);
  playTone(1320, t + 0.13, 0.18, 0.85, "sine", ac);
}

/** Bipe grave descendente — pacote não encontrado / erro */
export function playScanError() {
  const ac = getCtx();
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(320, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.35);

  gain.gain.setValueAtTime(0.85, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);

  osc.start(t);
  osc.stop(t + 0.42);
}

/** Tom médio duplo — pacote já bipado (aviso) */
export function playScanWarning() {
  const ac = getCtx();
  const t = ac.currentTime;
  playTone(520, t, 0.1, 0.85, "triangle", ac);
  playTone(520, t + 0.15, 0.1, 0.8, "triangle", ac);
}
