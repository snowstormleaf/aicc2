# MaxDiff money-WTP smoke check

Run this smoke test after WTP/model changes:

1. Open analysis settings and configure:
   - Estimator: `bws_mnl_money`
   - Design mode: `near_bibd`
   - Money transform: `log1p`
   - Feature count: 12
2. Use voucher levels:
   - `[0, 50, 93, 171, 316, 581, 1068]`
3. Run one persona to completion and export Excel.
4. Verify in **Method summary**:
   - `Money scale` is `100`.
   - `Planned tasks`, `Answered tasks`, and `Used in fit tasks` are populated.
5. Verify in **Results**:
   - `Raw model WTP (model units)` values are typically single digits.
   - `Raw model WTP (currency)` values are scaled monetary amounts (tens/hundreds).
   - `Perceived value` is non-negative by default.
6. Verify **MaxDiff API Calls** row counts per persona match `Answered tasks` in Method summary.
