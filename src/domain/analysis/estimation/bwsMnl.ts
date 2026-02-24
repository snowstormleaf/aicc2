import type {
  BootstrapFeatureSummary,
  Feature,
  MaxDiffSet,
  MoneyTransform,
  RawResponse,
  RepeatabilityMetrics,
  StabilityFeatureCheck,
  Voucher,
} from "@/domain/analysis/engine";
import { wtpFromUtility, wtpFromUtilityModelUnits } from "../wtp.ts";

type TaskObservation = {
  setId: string;
  itemIds: string[];
  bestId: string;
  worstId: string;
};

export interface BwsMnlConfig {
  transform: MoneyTransform;
  moneyScale?: number;
  maxIters?: number;
  tolerance?: number;
  learningRate?: number;
  seed?: number;
}

export interface BwsMnlFitResult {
  estimator: "bws_mnl_money";
  transform: MoneyTransform;
  moneyScale: number;
  beta: number;
  utilityByFeature: Record<string, number>;
  rawWtpModelUnitsByFeature: Record<string, number>;
  rawWtpByFeature: Record<string, number>;
  converged: boolean;
  iterations: number;
  logLikelihood: number;
  taskCount: number;
  failedTaskCount: number;
}

export interface BwsBootstrapResult {
  byFeature: Record<string, BootstrapFeatureSummary>;
  beta: {
    mean: number;
    p2_5: number;
    p97_5: number;
    std: number;
    samples: number;
  };
  successfulSamples: number;
}

interface TaskBuildResult {
  tasks: TaskObservation[];
  failedCount: number;
  totalCount: number;
}

const DEFAULT_CONFIG: Required<Omit<BwsMnlConfig, "transform">> = {
  moneyScale: 100,
  maxIters: 300,
  tolerance: 1e-6,
  learningRate: 0.03,
  seed: 42,
};

const EPS = 1e-12;

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

const createMulberry32 = (seed: number) => {
  let t = (seed >>> 0) + 0x6d2b79f5;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const logSumExp = (values: number[]) => {
  if (values.length === 0) return Number.NEGATIVE_INFINITY;
  const max = Math.max(...values);
  const sum = values.reduce((acc, value) => acc + Math.exp(value - max), 0);
  return max + Math.log(Math.max(sum, EPS));
};

const quantile = (values: number[], p: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * clamp(p, 0, 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return sorted[low];
  const weight = idx - low;
  return sorted[low] * (1 - weight) + sorted[high] * weight;
};

const mean = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const std = (values: number[], avg: number) => {
  if (values.length === 0) return 0;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const moneyTransform = (amount: number, transform: MoneyTransform, moneyScale: number) => {
  const safe = Math.max(0, amount) / Math.max(1e-8, moneyScale);
  if (transform === "linear") return safe;
  return Math.log1p(safe);
};

export const invertMoneyUtility = (utility: number, beta: number, transform: MoneyTransform, moneyScale = 100) => {
  return wtpFromUtility(utility, beta, transform, moneyScale);
};

const buildTasks = (sets: MaxDiffSet[], responses: RawResponse[]): TaskBuildResult => {
  const setById = new Map(sets.map((set) => [set.id, set]));
  const tasks: TaskObservation[] = [];
  let failedCount = 0;

  for (const response of responses) {
    const set = setById.get(response.setId);
    if (!set) {
      failedCount++;
      continue;
    }
    if (response.failed) {
      failedCount++;
      continue;
    }
    const itemIds = set.options.map((option) => option.id);
    if (!itemIds.includes(response.mostValued) || !itemIds.includes(response.leastValued)) {
      failedCount++;
      continue;
    }
    if (response.mostValued === response.leastValued) {
      failedCount++;
      continue;
    }

    tasks.push({
      setId: response.setId,
      itemIds,
      bestId: response.mostValued,
      worstId: response.leastValued,
    });
  }

  return {
    tasks,
    failedCount,
    totalCount: responses.length,
  };
};

const evaluateModel = (
  params: number[],
  tasks: TaskObservation[],
  featureIds: string[],
  voucherAmountById: Map<string, number>,
  transform: MoneyTransform,
  moneyScale: number
) => {
  const utilityIndexByFeature = new Map<string, number>(featureIds.map((id, index) => [id, index]));
  const logBetaIndex = featureIds.length;
  const logBeta = params[logBetaIndex] ?? Math.log(0.2);
  const beta = Math.exp(clamp(logBeta, -12, 8));
  const theta = featureIds.map((_, index) => params[index] ?? 0);
  const thetaMean = mean(theta);

  const utilityForItem = (itemId: string) => {
    const featureParamIndex = utilityIndexByFeature.get(itemId);
    if (featureParamIndex != null) return (params[featureParamIndex] ?? 0) - thetaMean;
    if (voucherAmountById.has(itemId)) {
      return beta * moneyTransform(voucherAmountById.get(itemId) ?? 0, transform, moneyScale);
    }
    return 0;
  };

  let logLikelihood = 0;
  const gradient = new Array(params.length).fill(0);

  for (const task of tasks) {
    const utilities = task.itemIds.map((id) => utilityForItem(id));
    const bestIndex = task.itemIds.indexOf(task.bestId);
    const worstIndex = task.itemIds.indexOf(task.worstId);
    if (bestIndex < 0 || worstIndex < 0 || bestIndex === worstIndex) continue;

    const logDenBest = logSumExp(utilities);
    logLikelihood += utilities[bestIndex] - logDenBest;

    const probsBest = utilities.map((value) => Math.exp(value - logDenBest));
    const dLdU = new Array(task.itemIds.length).fill(0);
    for (let i = 0; i < task.itemIds.length; i++) {
      dLdU[i] += -probsBest[i];
    }
    dLdU[bestIndex] += 1;

    const reducedIndices = task.itemIds
      .map((_, index) => index)
      .filter((index) => index !== bestIndex);
    const reducedUtilities = reducedIndices.map((index) => utilities[index]);
    const negReduced = reducedUtilities.map((value) => -value);
    const logDenWorst = logSumExp(negReduced);
    const reducedWorstIndex = reducedIndices.indexOf(worstIndex);
    if (reducedWorstIndex < 0) continue;

    logLikelihood += -utilities[worstIndex] - logDenWorst;
    const probsWorst = negReduced.map((value) => Math.exp(value - logDenWorst));

    for (let pos = 0; pos < reducedIndices.length; pos++) {
      const idx = reducedIndices[pos];
      dLdU[idx] += probsWorst[pos];
    }
    dLdU[worstIndex] -= 1;

    for (let i = 0; i < task.itemIds.length; i++) {
      const itemId = task.itemIds[i];
      const d = dLdU[i];
      if (!Number.isFinite(d)) continue;

      const featureParamIndex = utilityIndexByFeature.get(itemId);
      if (featureParamIndex != null) {
        const shared = d / Math.max(1, featureIds.length);
        for (let f = 0; f < featureIds.length; f++) {
          gradient[f] -= shared;
        }
        gradient[featureParamIndex] += d;
      }

      if (voucherAmountById.has(itemId)) {
        // u = beta * f(x), beta = exp(logBeta), so du/dlogBeta = u.
        gradient[logBetaIndex] += d * utilities[i];
      }
    }
  }

  return { logLikelihood, gradient, beta };
};

const fitFromTasks = (
  tasks: TaskObservation[],
  features: Feature[],
  vouchers: Voucher[],
  config: BwsMnlConfig
) => {
  const merged = { ...DEFAULT_CONFIG, ...config };
  const featureIds = features.map((feature) => feature.id);
  if (featureIds.length === 0) {
    return null;
  }

  const voucherAmountById = new Map(vouchers.map((voucher) => [voucher.id, voucher.amount]));
  const dimension = Math.max(1, featureIds.length) + 1; // all utilities + logBeta
  const logBetaIndex = dimension - 1;
  const params = new Array(dimension).fill(0);
  params[logBetaIndex] = Math.log(0.2);

  const m = new Array(dimension).fill(0);
  const v = new Array(dimension).fill(0);
  const beta1 = 0.9;
  const beta2 = 0.999;
  const eps = 1e-8;

  let bestParams = [...params];
  let bestNegLogLikelihood = Number.POSITIVE_INFINITY;
  let patience = 0;
  let converged = false;
  let finalIteration = 0;

  for (let iter = 1; iter <= merged.maxIters; iter++) {
    finalIteration = iter;
    const { logLikelihood, gradient } = evaluateModel(
      params,
      tasks,
      featureIds,
      voucherAmountById,
      merged.transform,
      merged.moneyScale
    );
    const nll = -logLikelihood;
    if (!Number.isFinite(nll)) break;

    if (nll < bestNegLogLikelihood) {
      bestNegLogLikelihood = nll;
      bestParams = [...params];
    }

    if (iter > 1) {
      const relImprovement = Math.abs(bestNegLogLikelihood - nll) / Math.max(1, Math.abs(bestNegLogLikelihood));
      if (relImprovement < merged.tolerance) {
        patience++;
      } else {
        patience = 0;
      }
      if (patience >= 8) {
        converged = true;
        break;
      }
    }

    for (let d = 0; d < dimension; d++) {
      const grad = -gradient[d]; // Minimize negative log-likelihood.
      m[d] = beta1 * m[d] + (1 - beta1) * grad;
      v[d] = beta2 * v[d] + (1 - beta2) * grad * grad;
      const mHat = m[d] / (1 - Math.pow(beta1, iter));
      const vHat = v[d] / (1 - Math.pow(beta2, iter));
      params[d] -= merged.learningRate * (mHat / (Math.sqrt(vHat) + eps));
    }

    params[logBetaIndex] = clamp(params[logBetaIndex], -12, 8);
  }

  const finalEval = evaluateModel(bestParams, tasks, featureIds, voucherAmountById, merged.transform, merged.moneyScale);
  const beta = finalEval.beta;
  const utilityByFeature: Record<string, number> = {};
  const rawWtpByFeature: Record<string, number> = {};
  const rawWtpModelUnitsByFeature: Record<string, number> = {};
  const theta = featureIds.map((_, i) => bestParams[i] ?? 0);
  const thetaMean = mean(theta);
  for (let i = 0; i < featureIds.length; i++) {
    const featureId = featureIds[i];
    const utility = (bestParams[i] ?? 0) - thetaMean;
    utilityByFeature[featureId] = utility;
    rawWtpModelUnitsByFeature[featureId] = wtpFromUtilityModelUnits(utility, beta, merged.transform);
    rawWtpByFeature[featureId] = invertMoneyUtility(utility, beta, merged.transform, merged.moneyScale);
  }

  return {
    estimator: "bws_mnl_money" as const,
    transform: merged.transform,
    moneyScale: merged.moneyScale,
    beta,
    utilityByFeature,
    rawWtpModelUnitsByFeature,
    rawWtpByFeature,
    converged,
    iterations: finalIteration,
    logLikelihood: finalEval.logLikelihood,
  };
};

export const fitBwsMnlMoney = (
  sets: MaxDiffSet[],
  responses: RawResponse[],
  features: Feature[],
  vouchers: Voucher[],
  config: BwsMnlConfig
): BwsMnlFitResult => {
  const built = buildTasks(sets, responses);
  const fit = fitFromTasks(built.tasks, features, vouchers, config);
  if (!fit) {
    return {
      estimator: "bws_mnl_money",
      transform: config.transform,
      moneyScale: config.moneyScale ?? DEFAULT_CONFIG.moneyScale,
      beta: 0.2,
      utilityByFeature: {},
      rawWtpModelUnitsByFeature: {},
      rawWtpByFeature: {},
      converged: false,
      iterations: 0,
      logLikelihood: Number.NEGATIVE_INFINITY,
      taskCount: 0,
      failedTaskCount: built.failedCount,
    };
  }

  return {
    ...fit,
    taskCount: built.tasks.length,
    failedTaskCount: built.failedCount,
  };
};

export const bootstrapBwsMnlMoney = (
  sets: MaxDiffSet[],
  responses: RawResponse[],
  features: Feature[],
  vouchers: Voucher[],
  samples: number,
  config: BwsMnlConfig
): BwsBootstrapResult => {
  const built = buildTasks(sets, responses);
  if (built.tasks.length === 0 || samples <= 0) {
    return {
      byFeature: {},
      beta: { mean: 0, p2_5: 0, p97_5: 0, std: 0, samples: 0 },
      successfulSamples: 0,
    };
  }

  const rng = createMulberry32(config.seed ?? DEFAULT_CONFIG.seed);
  const wtpByFeatureSamples = new Map<string, number[]>();
  const betaSamples: number[] = [];
  const featureIds = features.map((feature) => feature.id);
  featureIds.forEach((featureId) => wtpByFeatureSamples.set(featureId, []));

  let successfulSamples = 0;
  const sampleCount = Math.max(1, Math.floor(samples));

  for (let sample = 0; sample < sampleCount; sample++) {
    const draw: TaskObservation[] = [];
    for (let i = 0; i < built.tasks.length; i++) {
      const idx = Math.floor(rng() * built.tasks.length);
      draw.push(built.tasks[idx]);
    }

    const fit = fitFromTasks(draw, features, vouchers, {
      ...config,
      seed: (config.seed ?? DEFAULT_CONFIG.seed) + sample + 1,
    });
    if (!fit || !Number.isFinite(fit.beta)) continue;

    successfulSamples++;
    betaSamples.push(fit.beta);
    featureIds.forEach((featureId) => {
      const values = wtpByFeatureSamples.get(featureId);
      if (!values) return;
      const estimate = fit.rawWtpByFeature[featureId];
      if (Number.isFinite(estimate)) values.push(estimate);
    });
  }

  const byFeature: Record<string, BootstrapFeatureSummary> = {};
  featureIds.forEach((featureId) => {
    const values = wtpByFeatureSamples.get(featureId) ?? [];
    const avg = mean(values);
    const sd = std(values, avg);
    const p2_5 = quantile(values, 0.025);
    const p97_5 = quantile(values, 0.975);
    const median = quantile(values, 0.5);
    const cv = avg === 0 ? null : sd / Math.abs(avg);
    const relativeCiWidth = avg === 0 ? null : (p97_5 - p2_5) / Math.abs(avg);
    byFeature[featureId] = {
      mean: avg,
      median,
      p2_5,
      p97_5,
      std: sd,
      cv,
      relativeCiWidth,
      samples: values.length,
    };
  });

  const betaMean = mean(betaSamples);
  const betaStd = std(betaSamples, betaMean);

  return {
    byFeature,
    beta: {
      mean: betaMean,
      p2_5: quantile(betaSamples, 0.025),
      p97_5: quantile(betaSamples, 0.975),
      std: betaStd,
      samples: betaSamples.length,
    },
    successfulSamples,
  };
};

export const computeRepeatability = (sets: MaxDiffSet[], responses: RawResponse[]): RepeatabilityMetrics => {
  const setById = new Map(sets.map((set) => [set.id, set]));
  const responseBySetId = new Map<string, RawResponse>();
  responses
    .filter((response) => !response.failed)
    .forEach((response) => {
      responseBySetId.set(response.setId, response);
    });

  let total = 0;
  let bestMatches = 0;
  let worstMatches = 0;
  let jointMatches = 0;

  for (const set of sets) {
    if (!set.repeatOfSetId) continue;
    const repeatResponse = responseBySetId.get(set.id);
    const baseResponse = responseBySetId.get(set.repeatOfSetId);
    if (!repeatResponse || !baseResponse) continue;

    total++;
    const bestMatch = repeatResponse.mostValued === baseResponse.mostValued;
    const worstMatch = repeatResponse.leastValued === baseResponse.leastValued;
    if (bestMatch) bestMatches++;
    if (worstMatch) worstMatches++;
    if (bestMatch && worstMatch) jointMatches++;
  }

  return {
    totalRepeatPairs: total,
    bestAgreementCount: bestMatches,
    worstAgreementCount: worstMatches,
    jointAgreementCount: jointMatches,
    bestAgreementRate: total > 0 ? bestMatches / total : 0,
    worstAgreementRate: total > 0 ? worstMatches / total : 0,
    jointAgreementRate: total > 0 ? jointMatches / total : 0,
  };
};

export const evaluateStabilityChecks = (
  topFeatureIds: string[],
  bootstrapByFeature: Record<string, BootstrapFeatureSummary>,
  targetRelativeHalfWidth: number
): StabilityFeatureCheck[] => {
  return topFeatureIds.map((featureId) => {
    const summary = bootstrapByFeature[featureId];
    if (!summary) {
      return {
        featureId,
        mean: 0,
        relativeHalfWidth: null,
        pass: false,
      };
    }
    const denom = Math.max(1, Math.abs(summary.mean));
    const relativeHalfWidth = (summary.p97_5 - summary.p2_5) / (2 * denom);
    return {
      featureId,
      mean: summary.mean,
      relativeHalfWidth,
      pass: relativeHalfWidth <= targetRelativeHalfWidth,
    };
  });
};

export const topFeaturesByWtp = (rawWtpByFeature: Record<string, number>, topN: number) => {
  return Object.entries(rawWtpByFeature)
    .sort((left, right) => right[1] - left[1])
    .slice(0, Math.max(1, topN))
    .map(([featureId]) => featureId);
};
