import type { MoneyTransform } from "@/domain/analysis/engine";

export const wtpFromUtility = (uFeature: number, betaMoney: number, transform: MoneyTransform): number => {
  const safeBeta = Math.max(Math.abs(betaMoney), 1e-8);
  const ratio = uFeature / safeBeta;
  if (transform === "linear") return ratio;
  return Math.expm1(ratio);
};

export const utilityFromWtp = (wtp: number, betaMoney: number, transform: MoneyTransform): number => {
  const safeBeta = Math.max(Math.abs(betaMoney), 1e-8);
  if (transform === "linear") return safeBeta * wtp;
  return safeBeta * Math.log1p(Math.max(-0.999999, wtp));
};
