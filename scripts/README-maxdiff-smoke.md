# MaxDiff money WTP smoke check

Run:

```bash
node --import ./tests/register-ts-loader.mjs ./scripts/maxdiff-money-smoke.mjs
```

What to verify:
- Uses 12 features and voucher levels `[0, 50, 93, 171, 316, 581, 1068]`.
- Top feature rows print `rawCurrency` values in currency units (tens/hundreds+, not tiny model-unit values).
- `displayCurrency` is clamped to zero for negative raw values.
