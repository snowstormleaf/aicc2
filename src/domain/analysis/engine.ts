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
   * Generate voucher placeholders using incoming feature costs and bounds
   * Returns a small set of vouchers used as a monetary scale for perceived value
   */
  static generateVouchers(featureCosts: number[], bounds: { min_discount: number; max_discount: number; levels: number }): Voucher[] {
    const avg = (bounds.min_discount + bounds.max_discount) / 2;
    // Create one voucher per level representing increasing discounts
    const vouchers: Voucher[] = [];
    const step = (bounds.max_discount - bounds.min_discount) / Math.max(1, bounds.levels - 1);
    for (let i = 0; i < bounds.levels; i++) {
      const amount = Math.round(bounds.min_discount + step * i);
      vouchers.push({
        id: `voucher-${i + 1}`,
        amount,
        description: `Voucher: $${amount} off (level ${i + 1})`
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
