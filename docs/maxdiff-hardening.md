# MaxDiff Hardening Scan Notes

Date: 2026-02-20  
Repo: `snowstormleaf/aicc2`

## 1) Existing MaxDiff pipeline (pre-hardening)

- UI analysis runner:
  - `src/components/MaxDiffAnalysis.tsx`
  - Main flow in `runAnalysis()`:
    - build plan (`buildAnalysisPlan`)
    - iterate persona × set
    - call `LLMClient.rankOptions`
    - score using `MaxDiffEngine.computePerceivedValues`
    - save cache + emit results
- Domain engine:
  - `src/domain/analysis/engine.ts`
  - Key functions:
    - `generateVouchers`
    - `generateMaxDiffSets`
    - `computePerceivedValues`
- LLM prompt + parsing:
  - `src/lib/llm-client.ts`
  - Prompt builders:
    - `buildSystemPrompt`
    - `buildUserPrompt`
  - Ranking call:
    - `LLMClient.rankOptions`
  - Endpoint:
    - backend proxy `POST /api/llm/rank-options` in `backend/server.js`
- Result types:
  - `src/domain/analysis/engine.ts`
    - `PerceivedValue`
    - `RawResponse`
    - `MaxDiffSet`
  - UI log type:
    - `src/types/analysis.ts`

## 2) Voucher creation and level selection

- Voucher policy generation:
  - `MaxDiffEngine.deriveVoucherBounds(featureCosts)` in `src/domain/analysis/engine.ts`
  - Current policy:
    - `min_discount = 1`
    - `max_discount = 1.2 * max(feature cost)`
    - `levels = max(2, floor(feature_count / 3.5))`
- Voucher level spacing:
  - `MaxDiffEngine.generateVouchers` uses geometric spacing across bounds.

## 3) Existing scoring/estimation approach

- `computePerceivedValues` used a legacy heuristic:
  - Borda-style points over ranking list
  - Then heuristic monetary scaling using voucher max / average feature cost
- This was not a proper Best–Worst likelihood estimator and treated voucher levels as independent options for scaling.

## 4) Existing caching and persistence

- Browser localStorage key:
  - `src/lib/analysis-cache.ts`
  - `buildAnalysisCacheKey(...)`
- Session workflow persistence:
  - `src/pages/Index.tsx` via `sessionStorage` (`analysis_workflow_state`)
- Analysis result cache usage:
  - `src/components/MaxDiffAnalysis.tsx`
    - loads from localStorage when `useCache`
    - persists per persona when `persistResults`

## Hardening implementation entry points

- New design module:
  - `src/domain/analysis/design/maxdiffDesign.ts`
- New estimator module:
  - `src/domain/analysis/estimation/bwsMnl.ts`
- New calibration search module:
  - `src/domain/analysis/calibration/featureCashCalibration.ts`

