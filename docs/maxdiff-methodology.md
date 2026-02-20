# MaxDiff Methodology (Hardened)

## Scope

This implementation hardens **MaxDiff / Best-Worst Scaling (Case 1)** only.  
It does **not** implement conjoint (CBC/DCE).

## 1) Design: Near-BIBD set generation

Module: `src/domain/analysis/design/maxdiffDesign.ts`

- Set size fixed to `k=4` (default in UI flow).
- Inputs:
  - item ids (features + money options shown as voucher levels)
  - target appearances per item (`rTarget`)
  - deterministic seed
- Generator objective:
  - minimize item appearance imbalance
  - minimize pair co-occurrence imbalance
  - minimize pair squared deviation
- Deterministic behavior:
  - seeded PRNG controls all tie-breaks and optional local-improvement swaps.

### Diagnostics emitted

- `itemCounts`
- `pairCounts`
- item stats: `min/mean/max/CV`
- pair stats: `min/mean/max/CV`
- pair coverage and never-seen fraction
- imbalance metrics:
  - item count range
  - pair count range
  - pair squared deviation
- exact-BIBD check (if conditions are exactly satisfied):
  - `b*k == v*r`
  - `lambda*(v-1) == r*(k-1)`

## 2) Estimation: Best–Worst sequential logit + money function

Module: `src/domain/analysis/estimation/bwsMnl.ts`

Likelihood for each task:

\[
P(b,w|S)=
\frac{e^{u_b}}{\sum_{i \in S} e^{u_i}}
\times
\frac{e^{-u_w}}{\sum_{j \in S\setminus\{b\}} e^{-u_j}}
\]

Model parameters:

- Feature utilities \(u_j\)
- Money coefficient \(\beta>0\) (optimized in log-space)
- Money utility transform \(u_{money}(x)=\beta f(x)\), where:
  - `f(x)=log1p(x)` (default)
  - `f(x)=x` (optional)

Identifiability:

- One feature is fixed as baseline utility 0.

Optimization:

- Gradient-based Adam minimization of negative log-likelihood.

WTP inversion:

- linear: \(x=u_j/\beta\)
- log1p: \(x=\exp(u_j/\beta)-1\)

## 3) Prompting and parsing hardening

Module: `src/lib/llm-client.ts`

- MaxDiff prompt asks for **best** + **worst** only.
- Strict JSON contract:
  - `{"best":"...","worst":"..."}`
- Retry cascade for malformed output:
  1. default strict prompt
  2. explicit “JSON only, no markdown”
  3. minimal prompt
- No random parse fallback.
- Failed tasks are marked and excluded from estimation.
- Prompt includes:
  - persona name + optional persona summary
  - vehicle context
  - explicit framing that money is a **price reduction**.

## 4) Uncertainty + repeatability + stabilization

- Bootstrap uncertainty:
  - resample tasks with replacement
  - refit estimator each sample
  - report mean, median, 2.5/97.5 percentiles, CV, relative CI width
- Repeatability:
  - duplicate a configurable share of tasks
  - report best/worst/joint agreement rates
- Stabilization loop (optional):
  - add near-BIBD tasks in batches
  - refit + bootstrap each batch
  - stop when top-N feature relative CI half-width target is met or max tasks reached.

## 5) Calibration layer (feature vs cash indifference)

Modules:
- search: `src/domain/analysis/calibration/featureCashCalibration.ts`
- orchestration: `src/components/MaxDiffAnalysis.tsx`

Calibration task:

- Binary choice per feature at cash amount \(X\):
  - A) add feature
  - B) receive $X price reduction

Search method:

- bracket expansion/contraction
- log-space binary search (geometric midpoint)
- outputs lower/upper/mid indifference range + transcript

Adjustment strategies:

1. `global_scale`:
   - scale all model WTP by median calibration ratio
2. `partial_override`:
   - calibrated features use calibration midpoint
   - others use scaled model values

Caching:

- Calibration cached per persona/vehicle/feature-set/config fingerprint.

## 6) Known limitations

- Respondent is an LLM simulation, not real respondent data.
- Prompt framing and context can still influence simulated choices.
- Bootstrap uncertainty quantifies model instability over generated tasks, not real market sampling error.
- Calibration quality depends on consistency of binary LLM choices.
- Money transform choice (`log1p` vs `linear`) remains a modeling assumption.

