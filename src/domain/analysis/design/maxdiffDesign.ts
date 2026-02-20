export type ItemId = string;

export interface DesignBlock {
  id: string;
  itemIds: ItemId[];
  repeatOfSetId?: string;
}

export interface SummaryStats {
  min: number;
  mean: number;
  max: number;
  cv: number;
}

export interface PairCountsSummary {
  allPairs: SummaryStats;
  observedPairs: SummaryStats;
  coverage: number;
  neverSeenFraction: number;
}

export interface MaxDiffDesignDiagnostics {
  itemCounts: Record<ItemId, number>;
  pairCounts: Record<string, number>;
  itemSummary: SummaryStats;
  pairSummary: PairCountsSummary;
  itemCountImbalance: number;
  pairCountImbalance: number;
  pairSquaredDeviation: number;
  exactBibd: {
    isExact: boolean;
    params?: {
      v: number;
      b: number;
      r: number;
      k: number;
      lambda: number;
    };
    checks?: {
      bkEqualsVr: boolean;
      lambdaCondition: boolean;
    };
  };
}

export interface NearBIBDResult {
  blocks: DesignBlock[];
  diagnostics: MaxDiffDesignDiagnostics;
}

interface BuildState {
  itemCounts: Map<ItemId, number>;
  pairCounts: Map<string, number>;
  pairKeys: string[];
}

interface NearBIBDOptions {
  improvementIterations?: number;
  startIndex?: number;
}

const DEFAULT_IMPROVEMENT_ITERATIONS = 600;

const createMulberry32 = (seed: number) => {
  let t = (seed >>> 0) + 0x6d2b79f5;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const pairKey = (a: ItemId, b: ItemId) => {
  if (a < b) return `${a}::${b}`;
  return `${b}::${a}`;
};

const uniqueItems = (items: ItemId[]) => {
  const seen = new Set<ItemId>();
  const out: ItemId[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
};

const mean = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const std = (values: number[], average: number) => {
  if (values.length === 0) return 0;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const summarize = (values: number[]): SummaryStats => {
  if (values.length === 0) {
    return { min: 0, mean: 0, max: 0, cv: 0 };
  }
  const average = mean(values);
  const deviation = std(values, average);
  return {
    min: Math.min(...values),
    mean: average,
    max: Math.max(...values),
    cv: average === 0 ? 0 : deviation / Math.abs(average),
  };
};

const initializeState = (items: ItemId[]): BuildState => {
  const itemCounts = new Map<ItemId, number>();
  const pairCounts = new Map<string, number>();
  const pairKeys: string[] = [];

  items.forEach((item) => {
    itemCounts.set(item, 0);
  });

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const key = pairKey(items[i], items[j]);
      pairCounts.set(key, 0);
      pairKeys.push(key);
    }
  }

  return { itemCounts, pairCounts, pairKeys };
};

const applyBlockToState = (state: BuildState, block: ItemId[]) => {
  block.forEach((item) => {
    state.itemCounts.set(item, (state.itemCounts.get(item) ?? 0) + 1);
  });

  for (let i = 0; i < block.length; i++) {
    for (let j = i + 1; j < block.length; j++) {
      const key = pairKey(block[i], block[j]);
      state.pairCounts.set(key, (state.pairCounts.get(key) ?? 0) + 1);
    }
  }
};

const countStateFromBlocks = (items: ItemId[], blocks: ItemId[][]) => {
  const state = initializeState(items);
  blocks.forEach((block) => applyBlockToState(state, block));
  return state;
};

const computeObjective = (items: ItemId[], blocks: ItemId[][]) => {
  const state = countStateFromBlocks(items, blocks);
  const itemValues = items.map((item) => state.itemCounts.get(item) ?? 0);
  const pairValues = state.pairKeys.map((key) => state.pairCounts.get(key) ?? 0);
  const observedPairValues = pairValues.filter((value) => value > 0);
  const itemMin = itemValues.length ? Math.min(...itemValues) : 0;
  const itemMax = itemValues.length ? Math.max(...itemValues) : 0;
  const pairMin = observedPairValues.length ? Math.min(...observedPairValues) : 0;
  const pairMax = observedPairValues.length ? Math.max(...observedPairValues) : 0;
  const pairMean = mean(pairValues);
  const pairSquaredDeviation = pairValues.reduce((sum, value) => sum + (value - pairMean) ** 2, 0);

  // Keep item balance as the dominant criterion, then pair balance, then pair variance.
  const score = (itemMax - itemMin) * 1_000_000 + (pairMax - pairMin) * 10_000 + pairSquaredDeviation;
  return {
    score,
    itemRange: itemMax - itemMin,
    pairRange: pairMax - pairMin,
    pairSquaredDeviation,
    state,
  };
};

const selectFromMinCount = (items: ItemId[], itemCounts: Map<ItemId, number>, rng: () => number) => {
  let minCount = Number.POSITIVE_INFINITY;
  const pool: ItemId[] = [];

  for (const item of items) {
    const count = itemCounts.get(item) ?? 0;
    if (count < minCount) {
      minCount = count;
      pool.length = 0;
      pool.push(item);
    } else if (count === minCount) {
      pool.push(item);
    }
  }

  if (pool.length === 0) return items[0];
  return pool[Math.floor(rng() * pool.length)];
};

const chooseNextItem = (
  allItems: ItemId[],
  currentBlock: ItemId[],
  state: BuildState,
  rng: () => number
) => {
  const inBlock = new Set(currentBlock);
  const candidates = allItems.filter((item) => !inBlock.has(item));
  if (candidates.length === 0) return null;

  let minCount = Number.POSITIVE_INFINITY;
  candidates.forEach((item) => {
    const count = state.itemCounts.get(item) ?? 0;
    minCount = Math.min(minCount, count);
  });

  // Permit one level above minCount to avoid dead-end concentration patterns.
  const filtered = candidates.filter((item) => {
    const count = state.itemCounts.get(item) ?? 0;
    return count <= minCount + 1;
  });

  const scored = filtered.map((candidate) => {
    const pairValues = currentBlock.map((selected) => state.pairCounts.get(pairKey(candidate, selected)) ?? 0);
    const pairSum = pairValues.reduce((sum, value) => sum + value, 0);
    const pairMax = pairValues.length ? Math.max(...pairValues) : 0;
    const count = state.itemCounts.get(candidate) ?? 0;
    return { candidate, count, pairSum, pairMax };
  });

  scored.sort((left, right) => {
    if (left.count !== right.count) return left.count - right.count;
    if (left.pairMax !== right.pairMax) return left.pairMax - right.pairMax;
    if (left.pairSum !== right.pairSum) return left.pairSum - right.pairSum;
    return 0;
  });

  const best = scored[0];
  const ties = scored.filter(
    (entry) =>
      entry.count === best.count && entry.pairMax === best.pairMax && entry.pairSum === best.pairSum
  );
  return ties[Math.floor(rng() * ties.length)].candidate;
};

const improveBlocksBySwaps = (
  items: ItemId[],
  blocks: ItemId[][],
  rng: () => number,
  iterations: number
) => {
  if (blocks.length < 2) return blocks;

  let bestBlocks = blocks.map((block) => [...block]);
  let bestObjective = computeObjective(items, bestBlocks);

  for (let step = 0; step < iterations; step++) {
    const b1 = Math.floor(rng() * bestBlocks.length);
    let b2 = Math.floor(rng() * bestBlocks.length);
    if (bestBlocks.length > 1) {
      while (b2 === b1) b2 = Math.floor(rng() * bestBlocks.length);
    }

    const blockA = bestBlocks[b1];
    const blockB = bestBlocks[b2];
    const posA = Math.floor(rng() * blockA.length);
    const posB = Math.floor(rng() * blockB.length);

    const itemA = blockA[posA];
    const itemB = blockB[posB];
    if (!itemA || !itemB || itemA === itemB) continue;

    if (blockA.includes(itemB) || blockB.includes(itemA)) continue;

    const candidate = bestBlocks.map((block) => [...block]);
    candidate[b1][posA] = itemB;
    candidate[b2][posB] = itemA;

    const candidateObjective = computeObjective(items, candidate);
    if (candidateObjective.score < bestObjective.score) {
      bestBlocks = candidate;
      bestObjective = candidateObjective;
    }
  }

  return bestBlocks;
};

const buildDiagnostics = (items: ItemId[], k: number, blocks: DesignBlock[]): MaxDiffDesignDiagnostics => {
  const matrix = blocks.map((block) => block.itemIds);
  const objective = computeObjective(items, matrix);
  const itemCounts = objective.state.itemCounts;
  const pairCounts = objective.state.pairCounts;
  const pairKeys = objective.state.pairKeys;

  const itemValues = items.map((item) => itemCounts.get(item) ?? 0);
  const allPairValues = pairKeys.map((key) => pairCounts.get(key) ?? 0);
  const observedPairValues = allPairValues.filter((value) => value > 0);
  const seenPairCount = observedPairValues.length;
  const totalPairCount = pairKeys.length;
  const coverage = totalPairCount === 0 ? 0 : seenPairCount / totalPairCount;
  const neverSeenFraction = totalPairCount === 0 ? 0 : 1 - coverage;

  const itemSummary = summarize(itemValues);
  const allPairsSummary = summarize(allPairValues);
  const observedPairsSummary = summarize(observedPairValues);

  const itemCountImbalance = itemSummary.max - itemSummary.min;
  const pairCountImbalance = observedPairsSummary.max - observedPairsSummary.min;

  const itemCountsRecord: Record<ItemId, number> = {};
  items.forEach((item) => {
    itemCountsRecord[item] = itemCounts.get(item) ?? 0;
  });

  const pairCountsRecord: Record<string, number> = {};
  pairKeys.forEach((key) => {
    pairCountsRecord[key] = pairCounts.get(key) ?? 0;
  });

  const v = items.length;
  const b = blocks.length;
  const rValues = [...new Set(itemValues)];
  const lambdaValues = [...new Set(observedPairValues)];
  const hasSingleR = rValues.length === 1;
  const hasSingleLambda = lambdaValues.length === 1;
  const r = hasSingleR ? rValues[0] : -1;
  const lambda = hasSingleLambda ? lambdaValues[0] : -1;
  const bkEqualsVr = hasSingleR ? b * k === v * r : false;
  const lambdaCondition = hasSingleR && hasSingleLambda ? lambda * (v - 1) === r * (k - 1) : false;
  const isExact = hasSingleR && hasSingleLambda && bkEqualsVr && lambdaCondition;

  return {
    itemCounts: itemCountsRecord,
    pairCounts: pairCountsRecord,
    itemSummary,
    pairSummary: {
      allPairs: allPairsSummary,
      observedPairs: observedPairsSummary,
      coverage,
      neverSeenFraction,
    },
    itemCountImbalance,
    pairCountImbalance,
    pairSquaredDeviation: objective.pairSquaredDeviation,
    exactBibd: {
      isExact,
      ...(isExact
        ? {
            params: { v, b, r, k, lambda },
            checks: { bkEqualsVr, lambdaCondition },
          }
        : {}),
    },
  };
};

const generateBlocksInternal = (
  items: ItemId[],
  k: number,
  blockCount: number,
  seed: number,
  options: NearBIBDOptions = {},
  startingBlocks: ItemId[][] = []
) => {
  const safeItems = uniqueItems(items);
  if (safeItems.length === 0 || k <= 0 || blockCount <= 0) {
    return [];
  }
  const blockSize = Math.max(2, Math.min(k, safeItems.length));
  const rng = createMulberry32(seed);
  const state = initializeState(safeItems);
  const existing = startingBlocks.map((block) => [...new Set(block)]).filter((block) => block.length >= 2);
  existing.forEach((block) => applyBlockToState(state, block));

  const blocks: ItemId[][] = [];
  for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
    const block: ItemId[] = [];
    const seedItem = selectFromMinCount(safeItems, state.itemCounts, rng);
    block.push(seedItem);

    while (block.length < blockSize) {
      const next = chooseNextItem(safeItems, block, state, rng);
      if (!next) break;
      block.push(next);
    }

    applyBlockToState(state, block);
    blocks.push(block);
  }

  const improved = improveBlocksBySwaps(
    safeItems,
    blocks,
    rng,
    Math.max(0, options.improvementIterations ?? DEFAULT_IMPROVEMENT_ITERATIONS)
  );

  return improved;
};

export const generateNearBIBDDesign = (
  items: ItemId[],
  k: number,
  rTarget: number,
  seed: number,
  options: NearBIBDOptions = {}
): NearBIBDResult => {
  const safeItems = uniqueItems(items);
  const v = safeItems.length;
  if (v === 0) {
    return {
      blocks: [],
      diagnostics: buildDiagnostics([], k, []),
    };
  }
  const safeK = Math.max(2, Math.min(k, v));
  const safeR = Math.max(1, Math.floor(rTarget || 1));
  const b = Math.ceil((v * safeR) / safeK);
  const rawBlocks = generateBlocksInternal(safeItems, safeK, b, seed, options);
  const startIndex = Math.max(1, options.startIndex ?? 1);
  const blocks: DesignBlock[] = rawBlocks.map((itemIds, index) => ({
    id: `set-${startIndex + index}`,
    itemIds,
  }));

  return {
    blocks,
    diagnostics: buildDiagnostics(safeItems, safeK, blocks),
  };
};

export const extendNearBIBDDesign = (
  items: ItemId[],
  k: number,
  existingBlocks: DesignBlock[],
  additionalBlockCount: number,
  seed: number,
  options: NearBIBDOptions = {}
): NearBIBDResult => {
  if (additionalBlockCount <= 0) {
    const safeItems = uniqueItems(items);
    const safeK = Math.max(2, Math.min(k, Math.max(2, safeItems.length)));
    return {
      blocks: [...existingBlocks],
      diagnostics: buildDiagnostics(safeItems, safeK, existingBlocks),
    };
  }

  const safeItems = uniqueItems(items);
  const safeK = Math.max(2, Math.min(k, Math.max(2, safeItems.length)));
  const existingItemBlocks = existingBlocks.map((block) => block.itemIds);
  const nextIndex = existingBlocks.length + 1;

  const newBlocksRaw = generateBlocksInternal(
    safeItems,
    safeK,
    additionalBlockCount,
    seed,
    options,
    existingItemBlocks
  );

  const newBlocks: DesignBlock[] = newBlocksRaw.map((itemIds, index) => ({
    id: `set-${nextIndex + index}`,
    itemIds,
  }));

  const merged = [...existingBlocks, ...newBlocks];
  return {
    blocks: merged,
    diagnostics: buildDiagnostics(safeItems, safeK, merged),
  };
};

export const addRepeatTasks = (
  blocks: DesignBlock[],
  repeatFraction: number,
  seed: number
): DesignBlock[] => {
  if (blocks.length === 0 || repeatFraction <= 0) return blocks;
  const repeatCount = Math.max(0, Math.round(blocks.length * repeatFraction));
  if (repeatCount === 0) return blocks;

  const rng = createMulberry32(seed);
  const pool = [...blocks];
  const picks: DesignBlock[] = [];
  const maxUnique = Math.min(pool.length, repeatCount);

  // Draw without replacement for the first pass.
  for (let i = 0; i < maxUnique; i++) {
    const idx = Math.floor(rng() * pool.length);
    const selected = pool.splice(idx, 1)[0];
    picks.push(selected);
  }

  // If requested repeats exceed unique blocks, continue sampling with replacement.
  while (picks.length < repeatCount) {
    picks.push(blocks[Math.floor(rng() * blocks.length)]);
  }

  const repeated = picks.map((block, index) => ({
    id: `set-repeat-${index + 1}`,
    itemIds: [...block.itemIds],
    repeatOfSetId: block.id,
  }));

  return [...blocks, ...repeated];
};

