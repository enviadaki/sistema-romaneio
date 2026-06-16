let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Hard-clip distortion curve — pushes the signal into saturation
function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 256;
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
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
  const distortion = ac.createWaveShaper();
  const masterGain = ac.createGain();

  // Heavy distortion
  distortion.curve = makeDistortionCurve(800);
  distortion.oversample = "4x";

  osc.connect(gain);
  gain.connect(distortion);
  distortion.connect(masterGain);
  masterGain.connect(ac.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  // Pre-distortion gain — drives the clipper hard
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  // Post-distortion master volume
  masterGain.gain.setValueAtTime(6.0, startTime);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/** Dois bipes ascendentes — confirmação de sucesso */
export function playScanSuccess() {
  const ac = getCtx();
  const t = ac.currentTime;
  playTone(880,  t,        0.18, 8.0, "square", ac);
  playTone(1320, t + 0.20, 0.22, 8.0, "square", ac);
}

/** Bipe grave descendente — pacote não encontrado / erro */
export function playScanError() {
  navigator.vibrate?.([250, 80, 250, 80, 500]);

  const ac = getCtx();
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const distortion = ac.createWaveShaper();
  const masterGain = ac.createGain();

  distortion.curve = makeDistortionCurve(800);
  distortion.oversample = "4x";

  osc.connect(gain);
  gain.connect(distortion);
  distortion.connect(masterGain);
  masterGain.connect(ac.destination);

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(380, t);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.5);

  gain.gain.setValueAtTime(8.0, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

  masterGain.gain.setValueAtTime(6.0, t);

  osc.start(t);
  osc.stop(t + 0.6);
}

/** Tom médio duplo — pacote já bipado (aviso) */
export function playScanWarning() {
  const ac = getCtx();
  const t = ac.currentTime;
  playTone(520, t,        0.15, 8.0, "square", ac);
  playTone(520, t + 0.20, 0.15, 8.0, "square", ac);
}
