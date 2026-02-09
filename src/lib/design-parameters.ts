export interface DesignParameters {
  sets: number;
  r: number;
  lambda: number;
  efficiency: number;
  itemsPerSet: number;
}

export const calculateOptimalSets = (numFeatures: number, itemsPerSet: number = 4): DesignParameters => {
  if (numFeatures <= 1) {
    return {
      sets: 0,
      r: 0,
      lambda: 0,
      efficiency: 0,
      itemsPerSet,
    };
  }

  const optimalR = Math.max(3, Math.min(5, Math.ceil(numFeatures / 5)));
  const calculatedSets = Math.ceil((numFeatures * optimalR) / itemsPerSet);
  const lambda = (optimalR * (itemsPerSet - 1)) / (numFeatures - 1);
  const minSets = Math.max(8, Math.ceil(numFeatures / 2));
  const maxSets = Math.min(25, numFeatures * 2);
  const finalSets = Math.max(minSets, Math.min(maxSets, calculatedSets));

  return {
    sets: finalSets,
    r: optimalR,
    lambda,
    efficiency: lambda % 1 === 0 ? 1 : 1 - (lambda % 1),
    itemsPerSet,
  };
};
