# MaxDiff Stability Controls

This document describes the stability hardening now used by the MaxDiff (BWS Case 1) workflow.

## 1) Exposure-based task planning

Task count is now derived from explicit exposure targets instead of a small fixed `r`.

- `targetFeatureExposures` (default `12`)
- `targetVoucherExposuresPerLevel` (default `10`)
- `minRepeatTasks` (default `8`)
- Structure per task: `3 features + 1 voucher`

Planner formulas:

- `tasksForFeatures = ceil(F * targetFeatureExposures / 3)`
- `tasksForVouchers = V * targetVoucherExposuresPerLevel`
- `minTasks = max(tasksForFeatures, tasksForVouchers, 60)`

If `maxTasks < minTasks`, stability can never pass. The UI now warns when this cap is below required minimum signal.

## 2) Stability gating before any "pass"

Stability checks are only evaluated after all minimum-information gates are satisfied:

- answered tasks >= planned `minTasks`
- minimum feature exposure >= `targetFeatureExposures`
- minimum voucher-level exposure >= `targetVoucherExposuresPerLevel`
- answered repeat pairs >= `minRepeatTasks`
- repeatability >= 80%
- parse failure rate <= 2%

Until then, status is `Stability pending (insufficient signal)` with explicit gate reasons.

## 3) WTP display behavior

- Raw WTP is preserved (`rawWtp`, `adjustedWtp`)
- Display WTP defaults to clamped non-negative (`displayWtp = max(0, adjusted/raw WTP)`)
- Results UI now has a toggle to show negative disutility values when needed:
  - `Allow negative WTP (disutility)` (default OFF)

Exports keep both display and raw/adjusted fields for diagnostics.

## 4) Money signal quality

Per persona diagnostics include:

- voucher best/worst/chosen rates
- voucher level exposure counts with dollar amounts (for example `$0x10, $50x10, ...`)

This makes weak money identification visible before trusting dollar WTP.

## 5) Deterministic LLM output path

- Temperature defaults to `0` and is passed through.
- `top_p` is fixed at `1`.
- Best/worst and calibration calls force strict function-tool outputs.
- On parse failure, retries use stricter prompts; no synthetic/random fallback is used.
