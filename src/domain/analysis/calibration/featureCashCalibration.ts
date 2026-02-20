import type { CalibrationTraceStep } from "../engine.ts";

export interface CalibrationSearchConfig {
  initialGuess: number;
  minX: number;
  maxX: number;
  steps?: number;
  minCap?: number;
  maxCap?: number;
}

export interface CalibrationSearchResult {
  calibrationLower: number;
  calibrationUpper: number;
  calibrationMid: number;
  stepsUsed: number;
  bracketStraddled: boolean;
  transcript: CalibrationTraceStep[];
}

export type FeatureVsCashChoice = "A" | "B";
export type CalibrationChoiceFn = (amount: number, step: number, phase: "bracket" | "search") => Promise<FeatureVsCashChoice>;

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

const geometricMid = (low: number, high: number) => {
  if (low > 0 && high > 0) return Math.sqrt(low * high);
  return (low + high) / 2;
};

export const runFeatureCashCalibrationSearch = async (
  chooser: CalibrationChoiceFn,
  config: CalibrationSearchConfig
): Promise<CalibrationSearchResult> => {
  const maxSteps = Math.max(1, Math.floor(config.steps ?? 7));
  const minCap = Math.max(0.01, config.minCap ?? 0.01);
  const maxCap = Math.max(minCap + 0.01, config.maxCap ?? Number.MAX_SAFE_INTEGER);
  const minX = clamp(Math.max(0.01, config.minX), minCap, maxCap);
  const maxX = clamp(Math.max(minX + 0.01, config.maxX), minCap, maxCap);
  const seedGuess = Number.isFinite(config.initialGuess) ? Math.max(0.01, config.initialGuess) : minX;

  let low = clamp(seedGuess / 2, minX, maxX);
  let high = clamp(seedGuess * 2, minX, maxX);
  if (low >= high) {
    low = minX;
    high = maxX;
  }

  let step = 0;
  const transcript: CalibrationTraceStep[] = [];
  const record = (amount: number, choice: FeatureVsCashChoice, phase: "bracket" | "search") => {
    step++;
    transcript.push({ step, amount, choice, phase });
  };

  // Bracket expansion: at high, if feature still wins (A), increase high until money wins (B) or cap.
  let highChoice = await chooser(high, step + 1, "bracket");
  record(high, highChoice, "bracket");
  let guard = 0;
  while (highChoice === "A" && high < maxCap && guard < 8) {
    high = clamp(high * 2, minCap, maxCap);
    highChoice = await chooser(high, step + 1, "bracket");
    record(high, highChoice, "bracket");
    guard++;
  }

  // Bracket contraction: at low, if money wins (B), decrease low until feature wins (A) or cap.
  let lowChoice = await chooser(low, step + 1, "bracket");
  record(low, lowChoice, "bracket");
  guard = 0;
  while (lowChoice === "B" && low > minCap && guard < 8) {
    low = clamp(low / 2, minCap, maxCap);
    lowChoice = await chooser(low, step + 1, "bracket");
    record(low, lowChoice, "bracket");
    guard++;
  }

  let bracketStraddled = lowChoice === "A" && highChoice === "B" && low < high;

  // If still unstraddled, keep the best available bracket and proceed to search anyway.
  if (!bracketStraddled && low >= high) {
    high = clamp(Math.max(low + 0.01, maxX), minCap, maxCap);
  }

  for (let i = 0; i < maxSteps; i++) {
    const mid = clamp(geometricMid(low, high), minCap, maxCap);
    const choice = await chooser(mid, step + 1, "search");
    record(mid, choice, "search");

    if (choice === "A") {
      low = mid;
    } else {
      high = mid;
    }

    if (Math.abs(high - low) <= Math.max(0.5, low * 0.01)) {
      break;
    }
  }

  bracketStraddled = bracketStraddled || low < high;
  const calibrationLower = Math.min(low, high);
  const calibrationUpper = Math.max(low, high);
  const calibrationMid = geometricMid(calibrationLower, calibrationUpper);

  return {
    calibrationLower,
    calibrationUpper,
    calibrationMid,
    stepsUsed: transcript.length,
    bracketStraddled,
    transcript,
  };
};
