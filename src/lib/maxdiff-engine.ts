export interface Feature {
  id: string;
  name: string;
  description: string;
  materialCost: number;
}

export interface Voucher {
  id: string;
  name: string;
  description: string;
  amountUSD: number;
}

export interface MaxDiffSet {
  id: string;
  options: (Feature | Voucher)[];
}

export interface RawResponse {
  setId: string;
  personaId: string;
  mostValued: string;
  leastValued: string;
  ranking: string[];
}

export interface ScoreSummary {
  optionId: string;
  netScore: number;
  appearances: number;
}

export interface PerceivedValue {
  featureId: string;
  featureName: string;
  materialCost: number;
  perceivedValue: number;
  netScore: number;
}

export class MaxDiffEngine {
  
  /**
   * Generate vouchers based on feature costs (Section 3.1)
   */
  static generateVouchers(featureCosts: number[], bounds?: { min_discount: number; max_discount: number; levels: number }): Voucher[] {
    if (featureCosts.length === 0) return [];
    
    let minAmount: number, maxAmount: number, numVouchers: number;
    
    if (bounds) {
      minAmount = bounds.min_discount;
      maxAmount = bounds.max_discount;
      numVouchers = bounds.levels;
    } else {
      const minCost = Math.min(...featureCosts);
      const maxCost = Math.max(...featureCosts);
      minAmount = Math.round(minCost * 0.8);
      maxAmount = Math.round(maxCost * 1.2);
      numVouchers = Math.round(featureCosts.length / 3.5);
    }
    
    const vouchers: Voucher[] = [];
    
    // Generate geometric series
    const ratio = Math.pow(maxAmount / minAmount, 1 / (numVouchers - 1));
    for (let i = 0; i < numVouchers; i++) {
      const amount = Math.round(minAmount * Math.pow(ratio, i));
      vouchers.push({
        id: `voucher_${amount}`,
        name: `Voucher of $${amount}`,
        description: `Applies a discount of $${amount} USD against the vehicle purchase price.`,
        amountUSD: amount
      });
    }
    
    return vouchers;
  }

  /**
   * Generate balanced MaxDiff sets (Section 3.2)
   */
  static generateMaxDiffSets(
    features: Feature[], 
    vouchers: Voucher[], 
    targetAppearances: number = 30
  ): MaxDiffSet[] {
    const options = [...features, ...vouchers];
    const N = options.length;
    const K = 4; // set size
    const P = targetAppearances;
    
    if (N < K) {
      throw new Error(`Need at least ${K} options, got ${N}`);
    }
    
    // Calculate iterations needed
    const lcm = this.lcm(N, K);
    const iterations = Math.floor((lcm / K) * P);
    
    // Create option pool
    const repeatPool = Math.floor((iterations * K) / N);
    const extra = (iterations * K) % N;
    
    let pool: (Feature | Voucher)[] = [];
    
    // Add each option 'repeatPool' times
    for (let i = 0; i < repeatPool; i++) {
      pool.push(...options);
    }
    
    // Add random extra options
    const shuffledOptions = [...options].sort(() => Math.random() - 0.5);
    pool.push(...shuffledOptions.slice(0, extra));
    
    // Shuffle the pool
    pool = pool.sort(() => Math.random() - 0.5);
    
    // Generate sets
    const sets: MaxDiffSet[] = [];
    for (let i = 0; i < iterations && pool.length >= K; i++) {
      const setOptions: (Feature | Voucher)[] = [];
      
      // Pick K unique items
      for (let j = 0; j < K && pool.length > 0; j++) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        const option = pool.splice(randomIndex, 1)[0];
        setOptions.push(option);
      }
      
      if (setOptions.length === K) {
        sets.push({
          id: `set_${i}`,
          options: setOptions
        });
      }
    }
    
    return sets;
  }

  /**
   * Calculate scoring and interpolate values (Section 3.4)
   */
  static computePerceivedValues(
    responses: RawResponse[],
    features: Feature[],
    vouchers: Voucher[]
  ): PerceivedValue[] {
    // Calculate net scores for all options
    const allOptions = [...features, ...vouchers];
    const scores = new Map<string, { most: number; least: number }>();
    
    // Initialize scores
    allOptions.forEach(option => {
      scores.set(option.id, { most: 0, least: 0 });
    });
    
    // Count most/least selections
    responses.forEach(response => {
      const mostScore = scores.get(response.mostValued);
      const leastScore = scores.get(response.leastValued);
      
      if (mostScore) mostScore.most++;
      if (leastScore) leastScore.least++;
    });
    
    // Calculate net scores
    const netScores = new Map<string, number>();
    scores.forEach((score, optionId) => {
      netScores.set(optionId, score.most - score.least);
    });
    
    // Shift scores to keep all positive
    const minScore = Math.min(...Array.from(netScores.values()));
    const shift = -minScore + 1;
    
    const shiftedScores = new Map<string, number>();
    netScores.forEach((score, optionId) => {
      shiftedScores.set(optionId, score + shift);
    });
    
    // Create voucher anchoring line
    const voucherPoints: Array<{ score: number; value: number }> = [];
    vouchers.forEach(voucher => {
      const score = shiftedScores.get(voucher.id);
      if (score !== undefined) {
        voucherPoints.push({ score, value: voucher.amountUSD });
      }
    });
    
    // Sort voucher points by score
    voucherPoints.sort((a, b) => a.score - b.score);
    
    // Interpolate feature values
    const perceivedValues: PerceivedValue[] = features.map(feature => {
      const featureScore = shiftedScores.get(feature.id) || 0;
      let perceivedValue = feature.materialCost; // fallback
      
      if (voucherPoints.length >= 2) {
        // Linear interpolation using voucher anchors
        if (featureScore <= voucherPoints[0].score) {
          perceivedValue = voucherPoints[0].value;
        } else if (featureScore >= voucherPoints[voucherPoints.length - 1].score) {
          perceivedValue = voucherPoints[voucherPoints.length - 1].value;
        } else {
          // Find surrounding points
          for (let i = 0; i < voucherPoints.length - 1; i++) {
            const low = voucherPoints[i];
            const high = voucherPoints[i + 1];
            
            if (featureScore >= low.score && featureScore <= high.score) {
              const ratio = (featureScore - low.score) / (high.score - low.score);
              perceivedValue = low.value + ratio * (high.value - low.value);
              break;
            }
          }
        }
      }
      
      return {
        featureId: feature.id,
        featureName: feature.name,
        materialCost: feature.materialCost,
        perceivedValue: Math.round(perceivedValue),
        netScore: netScores.get(feature.id) || 0
      };
    });
    
    return perceivedValues;
  }

  private static gcd(a: number, b: number): number {
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  private static lcm(a: number, b: number): number {
    return (a * b) / this.gcd(a, b);
  }
}
