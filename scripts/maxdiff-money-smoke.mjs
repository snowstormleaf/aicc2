import { MaxDiffEngine } from "../src/domain/analysis/engine.ts";

const features = Array.from({ length: 12 }, (_, index) => ({
  id: `feature-${index + 1}`,
  name: `Feature ${index + 1}`,
  description: `Feature ${index + 1}`,
  materialCost: 120 + index * 25,
}));

const voucherLevels = [0, 50, 93, 171, 316, 581, 1068];
const vouchers = voucherLevels.map((amount, index) => ({
  id: `voucher-${index + 1}`,
  amount,
  description: `Voucher: $${amount}`,
}));

const sets = MaxDiffEngine.generateMaxDiffSets(features, vouchers, 4);
const responses = sets.map((set, index) => {
  const ranking = [...set.options].map((o) => o.id);
  if (index % 2 === 0) ranking.reverse();
  return {
    setId: set.id,
    personaId: "smoke-persona",
    mostValued: ranking[0],
    leastValued: ranking[ranking.length - 1],
    ranking,
  };
});

const values = MaxDiffEngine.computePerceivedValues(responses, features, vouchers, {
  transform: "log1p",
  moneyScale: 100,
  clampNegativeDisplay: true,
});

console.log("Top 5 feature WTP (currency):");
console.table(values.slice(0, 5).map((row) => ({
  feature: row.featureName,
  rawCurrency: row.rawModelWtpCurrency,
  displayCurrency: row.perceivedValue,
})));
