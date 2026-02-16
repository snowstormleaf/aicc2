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
  perceivedValue: number; // USD
  netScore: number; // raw score before scaling
}

export class MaxDiffEngine {
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
  static computePerceivedValues(responses: RawResponse[], features: Feature[], vouchers: Voucher[] = []): PerceivedValue[] {
    const scoreMap: Record<string, number> = {};
    const maxOptions = responses.reduce((m, r) => Math.max(m, r.ranking.length), 0);

    // Initialize scores
    features.forEach(f => scoreMap[f.id] = 0);
    vouchers.forEach(v => scoreMap[v.id] = 0);

    // Borda count: highest rank gets (n-1) points, next (n-2), ...
    for (const resp of responses) {
      const n = resp.ranking.length;
      for (let i = 0; i < resp.ranking.length; i++) {
        const id = resp.ranking[i];
        const points = Math.max(0, n - 1 - i);
        scoreMap[id] = (scoreMap[id] || 0) + points;
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
      const normalized = raw / maxRawScore; // 0..1
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
