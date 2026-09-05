# Rising stars study protocol

Fixed before examining the validation results, 6 September 2026.

## Question

Which eligibility and ordering rules find recently appearing names that continue solving published puzzles, while surfacing them early and keeping a useful selection of names?

Published solves are the observable outcome. The archive does not reveal attempts, effort, identity, or latent ability. Accordingly, future published participation is a measurable proxy for the requested newcomer "alpha", not a measurement of innate talent.

## Opportunity and identity definitions

- Use distinct archived puzzle records with a published solution URL and a nonempty solver list. Exclude the ongoing puzzle and unavailable lists from numerator and denominator.
- Count one success per exact published name per puzzle, including the debut puzzle. A paired puzzle currently represented by one archive record is one opportunity.
- From debut through the snapshot, the displayed rate is successes / observed published opportunities. It is bounded by zero and one by construction.
- A name must first appear inside the chosen calendar-month eligibility window, inclusively. Names first appearing in the first available archive cohort are left-censored and excluded from newcomer evaluation.
- Do not merge aliases, teams, case variants, or similar-looking names. Separately verified encoding repairs precede the final run.

## Candidate grid

Eligibility window: 6, 9, 12, or 18 calendar months. Minimum solved puzzles: 2, 3, 4, 5, or 6. Minimum observed opportunities: 1, 3, or 6. The 12-month family directly matches the user's proposed window; the other windows are sensitivity comparisons, not changes to the meaning of newcomer without explanation.

Ordering methods:

1. Raw inclusive rate, then more solved puzzles.
2. Total solved puzzles (equivalent ordering to dividing by a fixed window length).
3. Wilson lower bound with z=1.64 on post-debut outcomes, then more solved puzzles.
4. Beta-binomial posterior mean on post-debut outcomes, then more solved puzzles. Estimate the prior from historical cohorts only.

The debut success is guaranteed by cohort entry, so it is excluded from the likelihood in methods 3 and 4. It remains part of the displayed descriptive record.

## Evaluation and temporal separation

Use the same 20 display slots for every configuration. Evaluate future success on the next six observed, completed puzzle opportunities. Never include a partially observed future outcome.

- Development origins: January 2018–June 2022.
- Validation origins: January 2023–June 2024.
- Untouched test origins: January 2025–February 2026.

The six-outcome horizons finish before the next evaluation period. During development, prior fitting uses only outcomes that finish by each origin. A prior learned from debut cohorts January 2016–June 2022, whose six post-debut outcomes finish by December 2022, is then frozen for validation and test.

The test period will be scored only after a shortlist and its rationale are written. It will not be used to retune the recommendation.

## Objectives

- **Future participation, maximize:** fraction of the next six published puzzles solved by the displayed names.
- **Early exposure, minimize:** average number of completed opportunities after debut among displayed names. This is the experience level of displayed names, not time to first discovery; it must not be described as the latter.
- **Reach, maximize:** expected distinct names surfaced, annualized over the evaluation period.
- **List occupancy, constraint:** average occupancy of at least 95% of the 20 slots for the primary frontier. Also report occupancy before filtering so a tiny list cannot conceal its limited usefulness.

Boundary ties are evaluated fractionally. Expected reach uses independent uniform selection within boundary ties across snapshots; it is an analysis convention, not a proposed randomized production ordering. Report this limitation and tie sensitivity.

A configuration is Pareto dominated if another is at least as good on every objective and strictly better on one. The frontier identifies trade-offs; it cannot decide how much reliability should be exchanged for earlier exposure. Any recommendation among frontier points must state that preference.

## Limits and checks

The data is a retrospective reconstruction of the current archive, not saved publication-time snapshots. Later list revisions may introduce hindsight. Repeated names and overlapping six-puzzle outcomes are dependent; do not treat solver-month rows as independent trials when reporting uncertainty.

Check duplicate records, missing months, incomplete lists, identity ambiguity, rate bounds, temporal separation, equal-score boundaries, and sensitivity to three- versus four-solve minimums. Report the data hash, generation time, exact input counts, and reproducible commands.
