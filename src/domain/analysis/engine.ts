import {
  addRepeatTasks,
  extendNearBIBDDesign,
  generateNearBIBDDesign,
  type DesignBlock,
  type MaxDiffDesignDiagnostics,
  type SummaryStats,
} from "./design/maxdiffDesign.ts";

export interface Feature {
  id: string;
  name: string;
  description?: string;
  materialCost: number;
}

export interface Voucher {
  id: string;
  amount: number; // USD discount
  description: string;
}

export interface MaxDiffOption {
  id: string;
  name: string;
  description?: string;
}

export interface MaxDiffSet {
  id: string;
  options: MaxDiffOption[]; // typically 4 options
  repeatOfSetId?: string;
}

export interface RawResponse {
  setId: string;
  personaId: string;
  mostValued: string;
  leastValued: string;
  ranking?: string[]; // ids ordered from most to least
  failed?: boolean;
  failureReason?: string;
  debugTrace?: {
    request: Record<string, unknown>;
    response: Record<string, unknown>;
  };
}

export interface PerceivedValue {
  featureId: string;
  featureName: string;
  materialCost: number;
  perceivedValue: number; // USD
  netScore: number; // raw score before scaling
  utility?: number;
  rawWtp?: number;
  adjustedWtp?: number;
  displayWtp?: number;
  ciLower95?: number;
  ciUpper95?: number;
  bootstrapMean?: number;
  bootstrapMedian?: number;
  bootstrapCv?: number | null;
  relativeCiWidth?: number | null;
  calibrationLower?: number;
  calibrationUpper?: number;
  calibrationMid?: number;
  adjustmentSource?: "model" | "scaled" | "calibrated_override";
}

export type DesignMode = "legacy" | "near_bibd";
export type EstimatorMode = "legacy_score" | "bws_mnl_money";
export type MoneyTransform = "log1p" | "linear";
export type CalibrationAdjustmentStrategy = "global_scale" | "partial_override";

export interface RepeatabilityMetrics {
  totalRepeatPairs: number;
  bestAgreementCount: number;
  worstAgreementCount: number;
  jointAgreementCount: number;
  bestAgreementRate: number;
  worstAgreementRate: number;
  jointAgreementRate: number;
}

export interface BootstrapFeatureSummary {
  mean: number;
  median: number;
  p2_5: number;
  p97_5: number;
  std: number;
  cv: number | null;
  relativeCiWidth: number | null;
  samples: number;
}

export interface StabilityFeatureCheck {
  featureId: string;
  mean: number;
  relativeHalfWidth: number | null;
  pass: boolean;
}

export interface StabilityReport {
  enabled: boolean;
  targetRelativeHalfWidth: number;
  topN: number;
  maxTasks: number;
  tasksUsed: number;
  batchesAdded: number;
  isStable: boolean;
  statusLabel?: "pending" | "pass" | "not_reached";
  stopReason?: "maxTasksReached" | "stabilityPass" | "userCancelled";
  gates?: StabilityGateStatus;
  checks: StabilityFeatureCheck[];
}

export interface StabilityGateThresholds {
  minTasksBeforeStability: number;
  minFeatureAppearances: number;
  minVoucherAppearances: number;
  minRepeatTasks: number;
  minRepeatability: number;
  maxFailureRate: number;
}

export interface StabilityGateStatus {
  thresholds: StabilityGateThresholds;
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

export interface MoneySignalDiagnostics {
  voucherBestCount: number;
  voucherWorstCount: number;
  voucherChosenCount: number;
  voucherBestRate: number;
  voucherWorstRate: number;
  voucherChosenRate: number;
  voucherLevelCounts: Record<string, number>;
}

export interface CalibrationTraceStep {
  step: number;
  amount: number;
  choice: "A" | "B";
  phase: "bracket" | "search";
}

export interface CalibrationResult {
  featureId: string;
  featureName: string;
  calibrationLower: number;
  calibrationUpper: number;
  calibrationMid: number;
  stepsUsed: number;
  transcript: CalibrationTraceStep[];
}

export interface FeatureEstimationSummary {
  utility: number;
  rawWtp: number;
  adjustedWtp: number;
  ciLower95: number;
  ciUpper95: number;
  bootstrap?: BootstrapFeatureSummary;
  calibration?: CalibrationResult;
  adjustmentSource: "model" | "scaled" | "calibrated_override";
}

export interface PersonaAnalysisSummary {
  designMode: DesignMode;
  estimator: EstimatorMode;
  moneyTransform: MoneyTransform;
  beta: number | null;
  designDiagnostics: MaxDiffDesignDiagnostics | null;
  repeatability: RepeatabilityMetrics;
  answeredTaskCount?: number;
  failedTaskCount: number;
  totalTaskCount: number;
  failureRate: number;
  bootstrapSamples: number;
  stopReason?: "maxTasksReached" | "stabilityPass" | "userCancelled";
  moneySignal?: MoneySignalDiagnostics;
  stabilization?: StabilityReport;
  calibration?: {
    enabled: boolean;
    strategy: CalibrationAdjustmentStrategy;
    scaleFactor: number;
    featureCount: number;
    reusedFromCache: number;
    results: CalibrationResult[];
  };
  features: Record<string, FeatureEstimationSummary>;
}

export interface GeneratedDesignPlan {
  designMode: DesignMode;
  maxDiffSets: MaxDiffSet[];
  diagnostics: MaxDiffDesignDiagnostics | null;
}

export interface GenerateDesignOptions {
  r?: number;
  itemsPerSet?: number;
  designMode?: DesignMode;
  seed?: number;
  repeatFraction?: number;
  improvementIterations?: number;
}

export interface ExtendDesignOptions extends GenerateDesignOptions {
  additionalTasks: number;
}

export interface VoucherGenerationBounds {
  min_discount: number;
  max_discount: number;
  levels: number;
  spacing?: "log" | "linear";
  include_zero?: boolean;
}

export class MaxDiffEngine {
  private static createMulberry32(seed: number) {
    let t = (seed >>> 0) + 0x6d2b79f5;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), t | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  private static shuffleWithRng<T>(items: T[], rng: () => number): T[] {
    const next = [...items];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  }

  private static summarize(values: number[]): SummaryStats {
    if (values.length === 0) {
      return { min: 0, mean: 0, max: 0, cv: 0 };
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(Math.max(0, variance));
    return {
      min: Math.min(...values),
      mean,
      max: Math.max(...values),
      cv: mean === 0 ? 0 : std / Math.abs(mean),
    };
  }

  /**
   * Voucher policy:
   * - min = 0 (always include $0)
   * - max = 1.2 * max(feature cost)
   * - levels = 7 (default)
   */
  static deriveVoucherBounds(featureCosts: number[]): VoucherGenerationBounds {
    const finiteCosts = featureCosts.filter((value) => Number.isFinite(value) && value > 0);
    const highestCost = finiteCosts.length > 0 ? Math.max(...finiteCosts) : 500;
    const minDiscount = 0;
    const maxDiscount = Number(Math.max(50, highestCost * 1.2).toFixed(2));
    const levels = 7;

    return {
      min_discount: minDiscount,
      max_discount: maxDiscount,
      levels,
      spacing: "log",
      include_zero: true,
    };
  }

  private static formatVoucherAmount(amount: number): string {
    if (Number.isInteger(amount)) return String(amount);
    return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  private static linspace(start: number, end: number, points: number) {
    if (points <= 1) return [start];
    const step = (end - start) / (points - 1);
    const values: number[] = [];
    for (let i = 0; i < points; i++) {
      values.push(start + step * i);
    }
    return values;
  }

  static buildVoucherGrid(
    bounds: VoucherGenerationBounds,
    options?: { spacing?: "log" | "linear"; includeZero?: boolean }
  ): number[] {
    const includeZero = options?.includeZero ?? bounds.include_zero ?? true;
    const spacing = options?.spacing ?? bounds.spacing ?? "log";
    const requestedLevels = Math.max(2, Math.round(bounds.levels));
    const safeMax = Math.max(1, Number(bounds.max_discount) || 1);
    const safeMin = Math.max(0, Number(bounds.min_discount) || 0);

    const zeroOffset = includeZero ? 1 : 0;
    const nonZeroLevels = Math.max(1, requestedLevels - zeroOffset);
    const minPositiveBase = safeMin > 0 ? safeMin : Math.min(50, Math.max(1, safeMax / 20));
    const minPositive = Math.min(minPositiveBase, safeMax);
    const maxRounded = Math.max(1, Math.round(safeMax));

    const dedupeAndSort = (raw: number[]) => {
      const sorted = [...raw].sort((a, b) => a - b);
      const out: number[] = [];
      for (const value of sorted) {
        let next = Math.round(value);
        if (!Number.isFinite(next)) continue;
        if (next < 0) next = 0;
        if (next > maxRounded) next = maxRounded;
        if (out.length > 0 && next <= out[out.length - 1]) {
          next = Math.min(maxRounded, out[out.length - 1] + 1);
        }
        if (next === 0 && !includeZero) next = 1;
        if (out.includes(next)) continue;
        out.push(next);
      }
      return out;
    };

    const buildLinear = () => {
      const start = includeZero ? minPositive : Math.max(minPositive, 1);
      const source = this.linspace(start, safeMax, nonZeroLevels);
      return dedupeAndSort(source);
    };

    let nonZeroValues: number[] = [];
    if (spacing === "log") {
      const source = this.linspace(Math.log1p(minPositive), Math.log1p(safeMax), nonZeroLevels).map((value) => Math.expm1(value));
      nonZeroValues = dedupeAndSort(source);
      if (nonZeroValues.length < nonZeroLevels) {
        nonZeroValues = buildLinear();
      }
    } else {
      nonZeroValues = buildLinear();
    }

    if (nonZeroValues.length === 0) {
      nonZeroValues = [maxRounded];
    }

    while (nonZeroValues.length < nonZeroLevels && nonZeroValues[nonZeroValues.length - 1] < maxRounded) {
      nonZeroValues.push(Math.min(maxRounded, nonZeroValues[nonZeroValues.length - 1] + 1));
    }

    while (nonZeroValues.length > nonZeroLevels) {
      nonZeroValues.splice(nonZeroValues.length - 2, 1);
    }

    const levels = includeZero ? [0, ...nonZeroValues] : [...nonZeroValues];
    return Array.from(new Set(levels)).sort((a, b) => a - b);
  }

  private static voucherOptionName(amount: number) {
    return amount <= 0 ? "No price reduction ($0)" : `Price reduction ($${this.formatVoucherAmount(amount)})`;
  }

  /**
   * Generate voucher levels with optional log/linear spacing.
   */
  static generateVouchers(featureCosts: number[], bounds?: VoucherGenerationBounds): Voucher[] {
    const derived = this.deriveVoucherBounds(featureCosts);
    const merged: VoucherGenerationBounds = {
      ...derived,
      ...(bounds ?? {}),
    };
    const levels = this.buildVoucherGrid(merged, {
      spacing: merged.spacing,
      includeZero: merged.include_zero ?? true,
    });

    return levels.map((amount, index) => ({
      id: `voucher-${index + 1}`,
      amount,
      description:
        amount <= 0
          ? `No price reduction ($0) (level ${index + 1})`
          : `Price reduction: $${this.formatVoucherAmount(amount)} off purchase price (level ${index + 1})`,
    }));
  }

  /**
   * Generate MaxDiff sets using simple balanced-ish sampling of features.
   * This implementation produces `ceil((n * r) / k)` sets where k=4 by default.
   */
  static generateMaxDiffSets(features: Feature[], vouchers: Voucher[] = [], r: number = 3, itemsPerSet: number = 4): MaxDiffSet[] {
    return this.generateMaxDiffPlan(features, vouchers, {
      r,
      itemsPerSet,
      designMode: "legacy",
    }).maxDiffSets;
  }

  private static buildOptionPool(features: Feature[], vouchers: Voucher[]) {
    const pool = features.map((feature) => ({ id: feature.id, name: feature.name, description: feature.description }))
      .concat(vouchers.map((voucher) => ({ id: voucher.id, name: this.voucherOptionName(voucher.amount), description: voucher.description })));
    return pool;
  }

  private static generateLegacyBlocks(
    items: string[],
    r: number,
    itemsPerSet: number,
    seed: number,
    startIndex: number = 1
  ): DesignBlock[] {
    const totalItems = items.length;
    const setsCount = Math.ceil((totalItems * r) / Math.max(2, itemsPerSet));
    const rng = this.createMulberry32(seed);

    const appearances: Record<string, number> = {};
    items.forEach((item) => {
      appearances[item] = 0;
    });
    const sets: DesignBlock[] = [];

    for (let s = 0; s < setsCount; s++) {
      const sorted = [...items].sort((left, right) => {
        const delta = appearances[left] - appearances[right];
        if (delta !== 0) return delta;
        return rng() < 0.5 ? -1 : 1;
      });
      const selected = sorted.slice(0, itemsPerSet);
      if (selected.length < itemsPerSet) {
        const fill = this.shuffleWithRng(items, rng).slice(0, itemsPerSet - selected.length);
        selected.push(...fill.filter((item) => !selected.includes(item)));
      }
      selected.forEach((item) => {
        appearances[item] = (appearances[item] || 0) + 1;
      });
      sets.push({
        id: `set-${startIndex + s}`,
        itemIds: selected,
      });
    }

    return sets;
  }

  private static buildFeatureBlocks(
    featureIds: string[],
    r: number,
    blockSize: number,
    designMode: DesignMode,
    seed: number,
    repeatFraction: number,
    improvementIterations?: number
  ) {
    const safeFeatureIds = [...new Set(featureIds)];
    if (safeFeatureIds.length === 0) return [] as DesignBlock[];
    const safeBlockSize = Math.max(2, Math.min(blockSize, safeFeatureIds.length));

    const base =
      designMode === "legacy"
        ? this.generateLegacyBlocks(safeFeatureIds, r, safeBlockSize, seed, 1)
        : generateNearBIBDDesign(safeFeatureIds, safeBlockSize, r, seed, {
            improvementIterations,
          }).blocks;

    return addRepeatTasks(base, Math.max(0, repeatFraction), seed + 17_129);
  }

  private static chooseBalancedVoucherIds(
    vouchers: Voucher[],
    targetCount: number,
    seed: number,
    existingCounts?: Map<string, number>
  ) {
    if (vouchers.length === 0 || targetCount <= 0) return [] as string[];
    const rng = this.createMulberry32(seed);
    const counts = new Map<string, number>();
    vouchers.forEach((voucher) => {
      counts.set(voucher.id, existingCounts?.get(voucher.id) ?? 0);
    });
    const picks: string[] = [];

    for (let i = 0; i < targetCount; i++) {
      let minCount = Number.POSITIVE_INFINITY;
      const candidates: string[] = [];
      for (const voucher of vouchers) {
        const count = counts.get(voucher.id) ?? 0;
        if (count < minCount) {
          minCount = count;
          candidates.length = 0;
          candidates.push(voucher.id);
        } else if (count === minCount) {
          candidates.push(voucher.id);
        }
      }
      const selected = candidates[Math.floor(rng() * candidates.length)];
      picks.push(selected);
      counts.set(selected, (counts.get(selected) ?? 0) + 1);
    }

    return picks;
  }

  private static shuffleSetItems(itemIds: string[], seed: number) {
    const rng = this.createMulberry32(seed);
    return this.shuffleWithRng(itemIds, rng);
  }

  private static extractFeatureBlocksFromSets(sets: MaxDiffSet[], voucherIds: Set<string>) {
    return sets.map((set) => ({
      id: set.id,
      repeatOfSetId: set.repeatOfSetId,
      itemIds: set.options.map((option) => option.id).filter((id) => !voucherIds.has(id)),
    }));
  }

  private static countVoucherExposures(sets: MaxDiffSet[], vouchers: Voucher[]) {
    const counts = new Map(vouchers.map((voucher) => [voucher.id, 0]));
    const voucherIds = new Set(vouchers.map((voucher) => voucher.id));

    sets.forEach((set) => {
      const voucherId = set.options.map((option) => option.id).find((id) => voucherIds.has(id));
      if (!voucherId) return;
      counts.set(voucherId, (counts.get(voucherId) ?? 0) + 1);
    });
    return counts;
  }

  private static mergeStructuredDiagnostics(
    featureIds: string[],
    featureBlockSize: number,
    featureBlocks: DesignBlock[],
    vouchers: Voucher[],
    fullSets: MaxDiffSet[],
    seed: number
  ): MaxDiffDesignDiagnostics | null {
    if (featureIds.length === 0) return null;
    const featureDiagnostics = extendNearBIBDDesign(featureIds, featureBlockSize, featureBlocks, 0, seed).diagnostics;
    if (vouchers.length === 0) return featureDiagnostics;

    const voucherCountsMap = this.countVoucherExposures(fullSets, vouchers);
    const voucherCounts: Record<string, number> = {};
    vouchers.forEach((voucher) => {
      voucherCounts[voucher.id] = voucherCountsMap.get(voucher.id) ?? 0;
    });
    const voucherValues = vouchers.map((voucher) => voucherCounts[voucher.id]);
    const seenVoucherLevels = voucherValues.filter((value) => value > 0).length;
    const voucherCoverage = vouchers.length > 0 ? seenVoucherLevels / vouchers.length : 0;
    const voucherSummary = this.summarize(voucherValues);

    return {
      ...featureDiagnostics,
      voucherCounts,
      voucherSummary,
      voucherCoverage,
      voucherCountImbalance: voucherSummary.max - voucherSummary.min,
    };
  }

  private static buildSetFromBlock(
    block: DesignBlock,
    voucherId: string,
    optionLookup: Map<string, { id: string; name: string; description?: string }>,
    seed: number
  ): MaxDiffSet {
    const itemIds = this.shuffleSetItems([...block.itemIds, voucherId], seed);
    return {
      id: block.id,
      repeatOfSetId: block.repeatOfSetId,
      options: itemIds
        .map((id) => optionLookup.get(id))
        .filter(Boolean)
        .map((option) => ({ id: option!.id, name: option!.name, description: option!.description })),
    };
  }

  private static buildStructuredPlan(
    features: Feature[],
    vouchers: Voucher[],
    options: GenerateDesignOptions
  ): GeneratedDesignPlan {
    const seed = Number.isFinite(options.seed) ? Number(options.seed) : 42;
    const r = Math.max(1, Math.floor(options.r ?? 3));
    const repeatFraction = Math.max(0, options.repeatFraction ?? 0);
    const designMode: DesignMode = options.designMode ?? "near_bibd";
    const featureIds = features.map((feature) => feature.id);
    const featureBlockSize = Math.max(2, Math.min(3, featureIds.length));
    const optionLookup = new Map(this.buildOptionPool(features, vouchers).map((option) => [option.id, option]));

    const featureBlocks = this.buildFeatureBlocks(
      featureIds,
      r,
      featureBlockSize,
      designMode,
      seed,
      repeatFraction,
      options.improvementIterations
    );
    const baseBlocks = featureBlocks.filter((block) => !block.repeatOfSetId);
    const voucherBySetId = new Map<string, string>();
    const voucherAssignments = this.chooseBalancedVoucherIds(vouchers, baseBlocks.length, seed + 41);
    baseBlocks.forEach((block, index) => {
      voucherBySetId.set(block.id, voucherAssignments[index]);
    });

    const maxDiffSets = featureBlocks.map((block, index) => {
      const assignedVoucher =
        block.repeatOfSetId != null
          ? voucherBySetId.get(block.repeatOfSetId) ?? voucherAssignments[index % voucherAssignments.length]
          : voucherBySetId.get(block.id) ?? voucherAssignments[index % voucherAssignments.length];
      voucherBySetId.set(block.id, assignedVoucher);
      return this.buildSetFromBlock(block, assignedVoucher, optionLookup, seed + 97 + index);
    });

    const diagnostics = this.mergeStructuredDiagnostics(
      featureIds,
      featureBlockSize,
      featureBlocks,
      vouchers,
      maxDiffSets,
      seed
    );

    return {
      designMode,
      maxDiffSets,
      diagnostics,
    };
  }

  static generateMaxDiffPlan(
    features: Feature[],
    vouchers: Voucher[] = [],
    options: GenerateDesignOptions = {}
  ): GeneratedDesignPlan {
    const designMode: DesignMode = options.designMode ?? "near_bibd";
    const seed = Number.isFinite(options.seed) ? Number(options.seed) : 42;
    const pool = this.buildOptionPool(features, vouchers);
    const items = pool.map((option) => option.id);
    const lookup = new Map(pool.map((option) => [option.id, option]));
    const r = Math.max(1, Math.floor(options.r ?? 3));
    const itemsPerSet = Math.max(2, Math.min(Math.floor(options.itemsPerSet ?? 4), Math.max(2, items.length)));

    if (vouchers.length > 0 && itemsPerSet >= 4) {
      return this.buildStructuredPlan(features, vouchers, options);
    }

    if (designMode === "legacy") {
      const legacyBlocks = this.generateLegacyBlocks(items, r, itemsPerSet, seed, 1);
      const legacySets = legacyBlocks.map((block) => ({
        id: block.id,
        options: block.itemIds
          .map((id) => lookup.get(id))
          .filter(Boolean)
          .map((option) => ({ id: option!.id, name: option!.name, description: option!.description })),
      }));
      const diagnostics =
        items.length >= 2
          ? extendNearBIBDDesign(items, itemsPerSet, legacyBlocks, 0, seed).diagnostics
          : null;
      return {
        designMode,
        maxDiffSets: legacySets,
        diagnostics,
      };
    }

    const near = generateNearBIBDDesign(items, itemsPerSet, r, seed, {
      improvementIterations: options.improvementIterations,
    });
    const withRepeats = addRepeatTasks(near.blocks, Math.max(0, options.repeatFraction ?? 0), seed + 17_129);
    const diagnostics = extendNearBIBDDesign(items, itemsPerSet, withRepeats, 0, seed).diagnostics;

    const maxDiffSets: MaxDiffSet[] = withRepeats.map((block) => ({
      id: block.id,
      repeatOfSetId: block.repeatOfSetId,
      options: block.itemIds
        .map((id) => lookup.get(id))
        .filter(Boolean)
        .map((option) => ({ id: option!.id, name: option!.name, description: option!.description })),
    }));

    return {
      designMode,
      maxDiffSets,
      diagnostics,
    };
  }

  static extendMaxDiffPlan(
    existingSets: MaxDiffSet[],
    features: Feature[],
    vouchers: Voucher[] = [],
    options: ExtendDesignOptions
  ): GeneratedDesignPlan {
    const additionalTasks = Math.max(0, Math.floor(options.additionalTasks));
    if (additionalTasks === 0) {
      return {
        designMode: options.designMode ?? "near_bibd",
        maxDiffSets: [...existingSets],
        diagnostics: null,
      };
    }

    const designMode: DesignMode = options.designMode ?? "near_bibd";
    const seed = Number.isFinite(options.seed) ? Number(options.seed) : 42;
    const repeatFraction = Math.max(0, options.repeatFraction ?? 0);
    const optionLookup = new Map(this.buildOptionPool(features, vouchers).map((option) => [option.id, option]));

    if (vouchers.length === 0) {
      const items = features.map((feature) => feature.id);
      const itemsPerSet = Math.max(2, Math.min(Math.floor(options.itemsPerSet ?? 4), Math.max(2, items.length)));
      const existingBlocks = existingSets.map((set) => ({
        id: set.id,
        repeatOfSetId: set.repeatOfSetId,
        itemIds: set.options.map((option) => option.id),
      }));
      const extended = extendNearBIBDDesign(items, itemsPerSet, existingBlocks, additionalTasks, seed, {
        improvementIterations: options.improvementIterations,
      });
      const maxDiffSets = extended.blocks.map((block) => ({
        id: block.id,
        repeatOfSetId: block.repeatOfSetId,
        options: block.itemIds
          .map((id) => optionLookup.get(id))
          .filter(Boolean)
          .map((option) => ({ id: option!.id, name: option!.name, description: option!.description })),
      }));
      return {
        designMode,
        maxDiffSets,
        diagnostics: extended.diagnostics,
      };
    }

    const voucherIds = new Set(vouchers.map((voucher) => voucher.id));
    const featureIds = features.map((feature) => feature.id);
    const featureBlockSize = Math.max(2, Math.min(3, featureIds.length));
    const existingFeatureBlocks = this.extractFeatureBlocksFromSets(existingSets, voucherIds);

    const repeatCount =
      repeatFraction > 0 && additionalTasks > 1
        ? Math.min(additionalTasks - 1, Math.max(1, Math.round(additionalTasks * repeatFraction)))
        : 0;
    const coreCount = Math.max(1, additionalTasks - repeatCount);

    const extendedFeatures = extendNearBIBDDesign(featureIds, featureBlockSize, existingFeatureBlocks, coreCount, seed, {
      improvementIterations: options.improvementIterations,
    });
    const newCoreFeatureBlocks = extendedFeatures.blocks.slice(existingFeatureBlocks.length);

    const existingVoucherCounts = this.countVoucherExposures(existingSets, vouchers);
    const newVoucherAssignments = this.chooseBalancedVoucherIds(
      vouchers,
      newCoreFeatureBlocks.length,
      seed + 311,
      existingVoucherCounts
    );
    const newCoreSets = newCoreFeatureBlocks.map((block, index) => {
      const voucherId = newVoucherAssignments[index % newVoucherAssignments.length];
      return this.buildSetFromBlock(block, voucherId, optionLookup, seed + 900 + index);
    });

    const repeatCandidates = [...existingSets, ...newCoreSets].filter((set) => !set.repeatOfSetId);
    const repeatRng = this.createMulberry32(seed + 733);
    const newRepeatSets: MaxDiffSet[] = [];
    const maxDistinct = Math.min(repeatCandidates.length, repeatCount);
    const pool = [...repeatCandidates];

    for (let i = 0; i < maxDistinct; i++) {
      const idx = Math.floor(repeatRng() * pool.length);
      const selected = pool.splice(idx, 1)[0];
      newRepeatSets.push({
        id: `set-repeat-extra-${existingSets.length + i + 1}`,
        repeatOfSetId: selected.id,
        options: selected.options.map((option) => ({ ...option })),
      });
    }

    while (newRepeatSets.length < repeatCount && repeatCandidates.length > 0) {
      const selected = repeatCandidates[Math.floor(repeatRng() * repeatCandidates.length)];
      newRepeatSets.push({
        id: `set-repeat-extra-${existingSets.length + newRepeatSets.length + 1}`,
        repeatOfSetId: selected.id,
        options: selected.options.map((option) => ({ ...option })),
      });
    }

    const maxDiffSets = [...existingSets, ...newCoreSets, ...newRepeatSets];
    const mergedFeatureBlocks = [
      ...existingFeatureBlocks,
      ...newCoreFeatureBlocks,
      ...newRepeatSets.map((set) => ({
        id: set.id,
        repeatOfSetId: set.repeatOfSetId,
        itemIds: set.options.map((option) => option.id).filter((id) => !voucherIds.has(id)),
      })),
    ];

    const diagnostics = this.mergeStructuredDiagnostics(
      featureIds,
      featureBlockSize,
      mergedFeatureBlocks,
      vouchers,
      maxDiffSets,
      seed + 1_511
    );

    return {
      designMode,
      maxDiffSets,
      diagnostics,
    };
  }

  /**
   * Compute perceived monetary values for features from raw responses.
   * Uses a Borda-style scoring from the provided rankings and scales scores to USD
   */
  static computePerceivedValues(responses: RawResponse[], features: Feature[], vouchers: Voucher[] = []): PerceivedValue[] {
    const scoreMap: Record<string, number> = {};
    const validResponses = responses.filter((response) => !response.failed);

    // Initialize scores
    features.forEach(f => scoreMap[f.id] = 0);
    vouchers.forEach(v => scoreMap[v.id] = 0);

    // Legacy Borda count for full rankings; fallback to best/worst if only pair is available.
    for (const resp of validResponses) {
      const ranking = Array.isArray(resp.ranking) ? resp.ranking.filter((id) => typeof id === "string") : [];
      if (ranking.length >= 3) {
        const n = ranking.length;
        for (let i = 0; i < ranking.length; i++) {
          const id = ranking[i];
          const points = Math.max(0, n - 1 - i);
          scoreMap[id] = (scoreMap[id] || 0) + points;
        }
        continue;
      }

      if (resp.mostValued) {
        scoreMap[resp.mostValued] = (scoreMap[resp.mostValued] || 0) + 1;
      }
      if (resp.leastValued) {
        scoreMap[resp.leastValued] = (scoreMap[resp.leastValued] || 0) - 1;
      }
    }

    // Determine scaling: use max voucher amount as monetary scale; fallback to average feature cost
    const voucherMax = vouchers.length ? Math.max(...vouchers.map(v => v.amount)) : 0;
    const avgCost = features.length ? features.reduce((s, f) => s + f.materialCost, 0) / features.length : 0;
    const scale = Math.max(voucherMax, avgCost || 1);

    // Find the max raw score among features to normalize
    const featureScores = features.map(f => ({ id: f.id, score: scoreMap[f.id] || 0 }));
    const maxRawScore = Math.max(1, ...featureScores.map(s => s.score));

    // Compute perceived values
    const perceived: PerceivedValue[] = features.map(f => {
      const raw = scoreMap[f.id] || 0;
      const normalized = raw / maxRawScore; // roughly 0..1 in legacy flow
      // Perceived value = material cost + normalized * scale * adjustment
      const perceivedValue = f.materialCost + normalized * scale;
      return {
        featureId: f.id,
        featureName: f.name,
        materialCost: f.materialCost,
        perceivedValue: Number(perceivedValue.toFixed(2)),
        netScore: raw
      };
    });

    // Sort descending by perceivedValue
    perceived.sort((a, b) => b.perceivedValue - a.perceivedValue);

    return perceived;
  }
}
