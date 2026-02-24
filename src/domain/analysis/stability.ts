export interface ExposureTaskPlanInput {
  featureCount: number;
  voucherLevelCount: number;
  targetFeatureExposures: number;
  targetVoucherExposuresPerLevel: number;
  repeatFraction?: number;
  featuresPerTask?: number;
  minTasksFloor?: number;
  maxTasksCap?: number;
}

export interface ExposureTaskPlan {
  featureCount: number;
  voucherLevelCount: number;
  featuresPerTask: number;
  targetFeatureExposures: number;
  targetVoucherExposuresPerLevel: number;
  tasksForFeatures: number;
  tasksForVouchers: number;
  minTasks: number;
  cappedTaskTarget: number;
  maxTasksCap?: number;
  capBelowRequired: boolean;
  recommendedRTarget: number;
  estimatedBaseTasks: number;
  estimatedRepeatTasks: number;
  estimatedTotalTasks: number;
}

export interface StabilityGateThresholdsInput {
  minTasksBeforeStability: number;
  minFeatureAppearances: number;
  minVoucherAppearances: number;
  minRepeatTasks: number;
  minRepeatability: number;
  maxFailureRate: number;
}

export interface StabilityGateInput {
  answeredTasks: number;
  repeatTasksAnswered: number;
  jointRepeatability: number;
  failureRate: number;
  featureAppearances: Map<string, number>;
  voucherAppearances: Map<string, number>;
  thresholds: StabilityGateThresholdsInput;
}

export interface StabilityGateResult {
  thresholds: StabilityGateThresholdsInput;
  answeredTasks: number;
  repeatTasksAnswered: number;
  failureRate: number;
  minFeatureExposureAchieved: number;
  minVoucherExposureAchieved: number;
  minTasksMet: boolean;
  minFeatureExposureMet: boolean;
  minVoucherExposureMet: boolean;
  minRepeatsMet: boolean;
  repeatabilityMet: boolean;
  failureRateMet: boolean;
  gatesMet: boolean;
  reasons: string[];
  canEvaluateStability: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const minFromValues = (values: Iterable<number>, fallback: number) => {
  let minValue = Number.POSITIVE_INFINITY;
  let hasValue = false;
  for (const value of values) {
    hasValue = true;
    if (value < minValue) minValue = value;
  }
  return hasValue ? minValue : fallback;
};

export const computeExposureTaskPlan = (input: ExposureTaskPlanInput): ExposureTaskPlan => {
  const featureCount = Math.max(1, Math.floor(input.featureCount));
  const voucherLevelCount = Math.max(0, Math.floor(input.voucherLevelCount));
  const featuresPerTask = clamp(Math.floor(input.featuresPerTask ?? 3), 1, 8);
  const targetFeatureExposures = Math.max(1, Math.floor(input.targetFeatureExposures));
  const targetVoucherExposuresPerLevel = Math.max(1, Math.floor(input.targetVoucherExposuresPerLevel));
  const repeatFraction = clamp(Number(input.repeatFraction ?? 0.1), 0, 0.5);
  const minTasksFloor = Math.max(1, Math.floor(input.minTasksFloor ?? 60));

  const tasksForFeatures = Math.ceil((featureCount * targetFeatureExposures) / featuresPerTask);
  const tasksForVouchers = voucherLevelCount * targetVoucherExposuresPerLevel;
  const minTasks = Math.max(minTasksFloor, tasksForFeatures, tasksForVouchers);
  const maxTasksCap = input.maxTasksCap != null ? Math.max(1, Math.floor(input.maxTasksCap)) : undefined;
  const cappedTaskTarget = maxTasksCap != null ? Math.max(1, Math.min(minTasks, maxTasksCap)) : minTasks;

  const baseTarget = Math.max(1, Math.ceil(cappedTaskTarget / (1 + repeatFraction)));
  const rByTaskTarget = Math.ceil((baseTarget * featuresPerTask) / featureCount);
  const recommendedRTarget = Math.max(targetFeatureExposures, rByTaskTarget);
  const estimatedBaseTasks = Math.ceil((featureCount * recommendedRTarget) / featuresPerTask);
  const estimatedRepeatTasks = Math.round(estimatedBaseTasks * repeatFraction);
  const estimatedTotalTasks = estimatedBaseTasks + estimatedRepeatTasks;
  const capBelowRequired = maxTasksCap != null && maxTasksCap < minTasks;

  return {
    featureCount,
    voucherLevelCount,
    featuresPerTask,
    targetFeatureExposures,
    targetVoucherExposuresPerLevel,
    tasksForFeatures,
    tasksForVouchers,
    minTasks,
    cappedTaskTarget,
    maxTasksCap,
    capBelowRequired,
    recommendedRTarget,
    estimatedBaseTasks,
    estimatedRepeatTasks,
    estimatedTotalTasks,
  };
};

export const evaluateStabilityGates = (input: StabilityGateInput): StabilityGateResult => {
  const minFeatureExposureAchieved = minFromValues(input.featureAppearances.values(), 0);
  const minVoucherExposureAchieved = input.voucherAppearances.size > 0 ? minFromValues(input.voucherAppearances.values(), 0) : 0;

  const minTasksMet = input.answeredTasks >= input.thresholds.minTasksBeforeStability;
  const minFeatureExposureMet = minFeatureExposureAchieved >= input.thresholds.minFeatureAppearances;
  const minVoucherExposureMet =
    input.voucherAppearances.size === 0
      ? true
      : minVoucherExposureAchieved >= input.thresholds.minVoucherAppearances;
  const minRepeatsMet = input.repeatTasksAnswered >= input.thresholds.minRepeatTasks;
  const repeatabilityMet = minRepeatsMet && input.jointRepeatability >= input.thresholds.minRepeatability;
  const failureRateMet = input.failureRate <= input.thresholds.maxFailureRate;

  const reasons: string[] = [];
  if (!minTasksMet) {
    reasons.push(`Need at least ${input.thresholds.minTasksBeforeStability} answered tasks.`);
  }
  if (!minFeatureExposureMet) {
    reasons.push(
      `Need feature exposure >= ${input.thresholds.minFeatureAppearances}; currently ${minFeatureExposureAchieved}.`
    );
  }
  if (!minVoucherExposureMet && input.voucherAppearances.size > 0) {
    reasons.push(
      `Need voucher exposure per level >= ${input.thresholds.minVoucherAppearances}; currently ${minVoucherExposureAchieved}.`
    );
  }
  if (!minRepeatsMet) {
    reasons.push(`Need at least ${input.thresholds.minRepeatTasks} answered repeat tasks.`);
  }
  if (!repeatabilityMet && minRepeatsMet) {
    reasons.push(
      `Repeatability must be >= ${(input.thresholds.minRepeatability * 100).toFixed(0)}%; currently ${(input.jointRepeatability * 100).toFixed(1)}%.`
    );
  }
  if (!failureRateMet) {
    reasons.push(
      `Failure rate must be <= ${(input.thresholds.maxFailureRate * 100).toFixed(1)}%; currently ${(input.failureRate * 100).toFixed(1)}%.`
    );
  }

  const gatesMet =
    minTasksMet &&
    minFeatureExposureMet &&
    minVoucherExposureMet &&
    minRepeatsMet &&
    repeatabilityMet &&
    failureRateMet;

  return {
    thresholds: input.thresholds,
    answeredTasks: input.answeredTasks,
    repeatTasksAnswered: input.repeatTasksAnswered,
    failureRate: input.failureRate,
    minFeatureExposureAchieved,
    minVoucherExposureAchieved,
    minTasksMet,
    minFeatureExposureMet,
    minVoucherExposureMet,
    minRepeatsMet,
    repeatabilityMet,
    failureRateMet,
    gatesMet,
    reasons,
    canEvaluateStability: gatesMet,
  };
};

export const displayWtpFromRaw = (rawWtp: number, allowNegative: boolean) =>
  allowNegative ? rawWtp : Math.max(0, rawWtp);
