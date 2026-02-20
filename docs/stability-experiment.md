# Quick Stability Experiment

Use this to compare sensitivity before/after hardening.

## Setup

1. Open **Workspace → Design parameters**.
2. Configure:
   - `Design mode`: `near_bibd`
   - `Estimator`: `bws_mnl_money`
   - `Money transform`: `log1p`
   - `Bootstrap samples`: `200`
   - `Repeat task fraction`: `10%`
3. Enable:
   - `Stabilize to target CI width`
   - Target: `±5%`, Top N: `5`, Batch size: `10`, Max tasks: `80`
4. Optionally enable calibration:
   - features: `5`
   - steps: `7`
   - strategy: `partial_override`

## Experiment A: Voucher-grid sensitivity

1. Run analysis with default voucher bounds.
2. Save exported JSON.
3. Run again with same seed but altered voucher range policy (e.g. half or double max discount).
4. Compare top-feature `raw model WTP` and `adjusted WTP` deltas.

Expected after hardening: smaller top-feature drift than legacy score method.

## Experiment B: Feature-list perturbation

1. Baseline run with core features.
2. Add 2 low-salience/irrelevant features.
3. Re-run with same seed and settings.
4. Compare top-feature adjusted WTP and CIs from exports.

Expected after stabilization: top-feature movement tends toward ±5% target.

## Outputs to inspect

- Per-persona summary:
  - `failureRate`
  - `repeatability.jointAgreementRate`
  - `designDiagnostics`
  - `stabilization.checks`
  - `calibration.scaleFactor`
- Feature-level:
  - `rawWtp`
  - `adjustedWtp`
  - `ciLower95`, `ciUpper95`
  - bootstrap stats (`cv`, `relativeCiWidth`)

