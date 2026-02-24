import type { MoneyTransform } from "@/domain/analysis/engine";

export const wtpFromUtilityModelUnits = (uFeature: number, betaMoney: number, transform: MoneyTransform): number => {
  const safeBeta = Math.max(Math.abs(betaMoney), 1e-8);
  const ratio = uFeature / safeBeta;
  if (transform === "linear") return ratio;
  return Math.expm1(ratio);
};

export const wtpFromUtility = (
  uFeature: number,
  betaMoney: number,
  transform: MoneyTransform,
  moneyScale = 1
): number => {
  return moneyScale * wtpFromUtilityModelUnits(uFeature, betaMoney, transform);
};

export const utilityFromWtp = (
  wtp: number,
  betaMoney: number,
  transform: MoneyTransform,
  moneyScale = 1
): number => {
  const safeBeta = Math.max(Math.abs(betaMoney), 1e-8);
  const modelUnitWtp = wtp / Math.max(1e-8, moneyScale);
  if (transform === "linear") return safeBeta * modelUnitWtp;
  return safeBeta * Math.log1p(Math.max(-0.999999, modelUnitWtp));
};
