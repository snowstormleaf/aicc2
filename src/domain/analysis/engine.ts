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
}

export interface RawResponse {
  setId: string;
  personaId: string;
  mostValued: string;
  leastValued: string;
  ranking: string[]; // ids ordered from most to least
  debugTrace?: {
    request: Record<string, unknown>;
    response: Record<string, unknown>;
  };
}

export interface PerceivedValue {
  featureId: string;
  featureName: string;
  materialCost: number;
  perceivedValue: number; // USD (display value, clamped at zero)
  rawModelWtpModelUnits: number;
  rawModelWtpCurrency: number;
  rawModelWtpCiLowCurrency: number;
  rawModelWtpCiHighCurrency: number;
  utility: number;
  utilityCiLow: number;
  utilityCiHigh: number;
  netScore: number; // raw score before scaling
}

export interface MaxDiffMethodSummary {
  personaId: string;
  personaName: string;
  plannedTasks: number;
  answeredTasks: number;
  usedInFitTasks: number;
  stopReason: string;
  moneyScale: number;
  voucherLevelCounts: string;
}

export interface MoneyModelConfig {
  transform?: 'log1p' | 'linear';
  moneyScale?: number;
  clampNegativeDisplay?: boolean;
}

export class MaxDiffEngine {
  static readonly DEFAULT_MONEY_SCALE = 100;

  /**
   * Voucher policy:
   * - min = 1
   * - max = 1.2 * max(feature cost)
   * - levels = floor(feature_count / 3.5), minimum 2
   */
  static deriveVoucherBounds(featureCosts: number[]): { min_discount: number; max_discount: number; levels: number } {
    const finiteCosts = featureCosts.filter((value) => Number.isFinite(value) && value > 0);
    const highestCost = finiteCosts.length > 0 ? Math.max(...finiteCosts) : 1;
    const minDiscount = 1;
    const maxDiscount = Number(Math.max(minDiscount, highestCost * 1.2).toFixed(2));
    const levels = Math.max(2, Math.floor(featureCosts.length / 3.5));

    return {
      min_discount: minDiscount,
      max_discount: maxDiscount,
      levels,
    };
  }

  private static formatVoucherAmount(amount: number): string {
    if (Number.isInteger(amount)) return String(amount);
    return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  /**
   * Generate vouchers using geometric spacing across policy bounds.
   */
  static generateVouchers(featureCosts: number[], _bounds?: { min_discount: number; max_discount: number; levels: number }): Voucher[] {
    const bounds = this.deriveVoucherBounds(featureCosts);
    const levels = Math.max(2, bounds.levels);
    const vouchers: Voucher[] = [];
    const ratio = Math.pow(bounds.max_discount / bounds.min_discount, 1 / (levels - 1));
    let previous = 0;

    for (let i = 0; i < levels; i++) {
      let amount = bounds.min_discount * Math.pow(ratio, i);
      if (i === 0) amount = bounds.min_discount;
      if (i === levels - 1) amount = bounds.max_discount;
      amount = Number(amount.toFixed(2));
      amount = Math.max(previous, amount);
      previous = amount;
      const formatted = this.formatVoucherAmount(amount);
      vouchers.push({
        id: `voucher-${i + 1}`,
        amount,
        description: `Voucher: $${formatted} off (level ${i + 1})`
      });
    }
    return vouchers;
  }

  /**
   * Generate MaxDiff sets using simple balanced-ish sampling of features.
   * This implementation produces `ceil((n * r) / k)` sets where k=4 by default.
   */
  static generateMaxDiffSets(features: Feature[], vouchers: Voucher[] = [], r: number = 3, itemsPerSet: number = 4): MaxDiffSet[] {
    const pool = features.map(f => ({ id: f.id, name: f.name, description: f.description }))
      // Also include voucher placeholders as additional options so LLM can see monetary references
      .concat(vouchers.map(v => ({ id: v.id, name: `Voucher (${v.amount})`, description: v.description })));

    const totalItems = pool.length;
    const setsCount = Math.ceil((totalItems * r) / itemsPerSet);

    // Simple round-robin distribution to ensure each item appears ~r times
    const appearances: Record<string, number> = {};
    pool.forEach(p => appearances[p.id] = 0);

    const sets: MaxDiffSet[] = [];

    for (let s = 0; s < setsCount; s++) {
      // sort pool by times appeared (ascending) to favor less-seen items
      const sorted = [...pool].sort((a, b) => appearances[a.id] - appearances[b.id]);
      const selected = sorted.slice(0, itemsPerSet);

      // If not enough unique items, fill with shuffled items
      if (selected.length < itemsPerSet) {
        const fill = [...pool].sort(() => Math.random() - 0.5).slice(0, itemsPerSet - selected.length);
        selected.push(...fill);
      }

      selected.forEach(item => appearances[item.id] = (appearances[item.id] || 0) + 1);

      sets.push({
        id: `set-${s + 1}`,
        options: selected.map(o => ({ id: o.id, name: o.name, description: o.description }))
      });
    }

    return sets;
  }

  /**
   * Compute perceived monetary values for features from raw responses.
   * Uses a Borda-style scoring from the provided rankings and scales scores to USD
   */
  static computePerceivedValues(
    responses: RawResponse[],
    features: Feature[],
    vouchers: Voucher[] = [],
    config: MoneyModelConfig = {}
  ): PerceivedValue[] {
    const transform = config.transform ?? 'log1p';
    const moneyScale = config.moneyScale ?? this.DEFAULT_MONEY_SCALE;
    const clampNegativeDisplay = config.clampNegativeDisplay ?? true;
    const scoreMap: Record<string, number> = {};
    const bestCounts: Record<string, number> = {};
    const worstCounts: Record<string, number> = {};
    const exposureCounts: Record<string, number> = {};

    // Initialize scores
    features.forEach(f => {
      scoreMap[f.id] = 0;
      bestCounts[f.id] = 0;
      worstCounts[f.id] = 0;
      exposureCounts[f.id] = 0;
    });
    vouchers.forEach(v => {
      scoreMap[v.id] = 0;
      bestCounts[v.id] = 0;
      worstCounts[v.id] = 0;
      exposureCounts[v.id] = 0;
    });

    // Borda count: highest rank gets (n-1) points, next (n-2), ...
    for (const resp of responses) {
      const n = resp.ranking.length;
      if (resp.mostValued) bestCounts[resp.mostValued] = (bestCounts[resp.mostValued] || 0) + 1;
      if (resp.leastValued) worstCounts[resp.leastValued] = (worstCounts[resp.leastValued] || 0) + 1;
      for (let i = 0; i < resp.ranking.length; i++) {
        const id = resp.ranking[i];
        const points = Math.max(0, n - 1 - i);
        scoreMap[id] = (scoreMap[id] || 0) + points;
        exposureCounts[id] = (exposureCounts[id] || 0) + 1;
      }
    }

    const voucherModelValues = vouchers
      .map((voucher) => {
        const amountModel = voucher.amount / moneyScale;
        const transformed = transform === 'log1p' ? Math.log1p(amountModel) : amountModel;
        return Number.isFinite(transformed) ? transformed : 0;
      })
      .filter((value) => Number.isFinite(value));

    const betaMoney = voucherModelValues.length > 0
      ? -1 / Math.max(1e-6, voucherModelValues.reduce((sum, value) => sum + value, 0) / voucherModelValues.length)
      : -1;

    const centeredUtilities = features.map((feature) => {
      const exposure = Math.max(1, exposureCounts[feature.id] || 0);
      const bestRate = (bestCounts[feature.id] || 0) / exposure;
      const worstRate = (worstCounts[feature.id] || 0) / exposure;
      return {
        featureId: feature.id,
        utility: bestRate - worstRate,
      };
    });
    const utilityMean = centeredUtilities.length
      ? centeredUtilities.reduce((sum, row) => sum + row.utility, 0) / centeredUtilities.length
      : 0;
    const centeredMap = new Map(
      centeredUtilities.map((row) => [row.featureId, row.utility - utilityMean])
    );

    const perceived: PerceivedValue[] = features.map(f => {
      const raw = scoreMap[f.id] || 0;
      const exposure = Math.max(1, exposureCounts[f.id] || 0);
      const utility = centeredMap.get(f.id) ?? 0;
      const utilitySe = Math.sqrt(Math.max(1e-6, 1 / exposure));
      const utilityCiLow = utility - 1.96 * utilitySe;
      const utilityCiHigh = utility + 1.96 * utilitySe;

      const wtpModelUnits = transform === 'log1p'
        ? Math.expm1(utility / betaMoney)
        : utility / betaMoney;
      const wtpCiLowModelUnits = transform === 'log1p'
        ? Math.expm1(utilityCiLow / betaMoney)
        : utilityCiLow / betaMoney;
      const wtpCiHighModelUnits = transform === 'log1p'
        ? Math.expm1(utilityCiHigh / betaMoney)
        : utilityCiHigh / betaMoney;

      const rawModelWtpCurrency = moneyScale * wtpModelUnits;
      const perceivedValue = clampNegativeDisplay ? Math.max(0, rawModelWtpCurrency) : rawModelWtpCurrency;

      return {
        featureId: f.id,
        featureName: f.name,
        materialCost: f.materialCost,
        perceivedValue: Number(perceivedValue.toFixed(2)),
        rawModelWtpModelUnits: Number(wtpModelUnits.toFixed(6)),
        rawModelWtpCurrency: Number(rawModelWtpCurrency.toFixed(2)),
        rawModelWtpCiLowCurrency: Number((moneyScale * wtpCiLowModelUnits).toFixed(2)),
        rawModelWtpCiHighCurrency: Number((moneyScale * wtpCiHighModelUnits).toFixed(2)),
        utility: Number(utility.toFixed(6)),
        utilityCiLow: Number(utilityCiLow.toFixed(6)),
        utilityCiHigh: Number(utilityCiHigh.toFixed(6)),
        netScore: raw,
      };
    });

    // Sort descending by perceivedValue
    perceived.sort((a, b) => b.perceivedValue - a.perceivedValue);

    return perceived;
  }

  static buildMethodSummary(
    personaId: string,
    personaName: string,
    plannedTasks: number,
    responses: RawResponse[],
    vouchers: Voucher[],
    moneyScale = this.DEFAULT_MONEY_SCALE,
    stopReason = 'stabilityPass'
  ): MaxDiffMethodSummary {
    const voucherCounts = vouchers
      .map((voucher) => {
        const count = responses.reduce((sum, response) => {
          return sum + (response.ranking.includes(voucher.id) ? 1 : 0);
        }, 0);
        return `${voucher.amount}:${count}`;
      })
      .join(', ');

    return {
      personaId,
      personaName,
      plannedTasks,
      answeredTasks: responses.length,
      usedInFitTasks: responses.length,
      stopReason: stopReason || 'maxTasksReached',
      moneyScale,
      voucherLevelCounts: voucherCounts,
    };
  }
}
