# Expanded Rising stars retrospective audit

Protocol fixed before running this expanded search, 6 September 2026.

This is a descriptive reanalysis of an archive we have already examined. It is
not a fresh test set, a claim about future performance, or a way to obtain one
universal best rule. More rules can reveal a trade-off; they cannot choose how
much we value each goal.

## Declared finite family

Test every integer debut window W from 1 through 24 calendar months, every
minimum number of published opportunities E from 1 through W, every minimum
number of solves S from 1 through E, and each of the four scores in the original
study: raw solve rate, solve count, Wilson lower bound (z = 1.64), and the fixed
beta-binomial method. This makes 10,400 configurations. E >= S removes a logical
redundancy, because every valid record already has at least as many opportunities
as solves. A former rule W12-S3-E1 is therefore exactly W12-S3-E3.

This is exhaustive only within that family. Continuous score parameters, other
objectives and windows longer than 24 months are outside it. We keep the four
score methods fixed so that a larger search does not silently introduce a new
definition of a strong newcomer.

## Data and time

Use the existing public archive without alteration. A completed published puzzle
has a solution link and a nonempty valid solver list. Keep exact public names,
remove duplicate occurrences within one puzzle and exclude the first observed
November 2015 cohort because its true debut may be earlier. Unknown months do
not count as opportunities or failed solves.

Use every completed origin from January 2018 through February 2026 for which the
next six completed published puzzles are available. The start permits at least
24 calendar months of observed prior history. Earlier data remain part of record
history and prior fitting; the latest six completed puzzles supply outcomes.

Compute all features using only records available by each event-month origin.
For the beta method refit using all eligible debut cohorts from January 2016
onward whose six-puzzle outcome records are already complete by that origin.
The expanded analysis removes the original June 2022 cohort ceiling. The
original frozen prior remains in use only for the original-result parity check.
Retrospective lists can include later
publication revisions; this is not a reconstruction of historical web snapshots.

## Selection and goals

The first 20 attention slots are the evaluation target, not a claim that other
eligible names are inaccessible in the actual interface. Rank by the score
rounded to 12 decimals, then total solves. Split boundary ties fractionally,
using the same convention as the original study; names never select winners.

Maximize the selected records' share of the next six published puzzles solved.
Minimize their average published opportunities after debut (record length).
Maximize expected distinct names in these first 20 slots, annualized over the
period. Expected reach assumes independent random resolution of boundary ties
at each origin. It is a comparison convention, not the website's actual reach.

Keep the original mean list-fill requirement of at least 95 percent. Report
minimum fill, the share of origins with a full list, and minimum eligible count
as robustness diagnostics. Also report a pooled frontier restricted to rules
that meet the 95 percent mean-fill requirement in each of the three main eras.

## Reports

Report pooled results and three chronological descriptive eras: 2018–2020,
2021–2023, and January 2024–February 2026. Also provide January 2023–February
2026 as a recent sensitivity view. For each show frontiers for exactly W=12,
W<=12, W<=18 and W<=24. Compare behavior hashes so duplicate selection outcomes
do not count as independent evidence. Report every configuration, not only the
winners. Store per-origin sufficient metrics for later paired comparisons.

## Checks before interpretation

First reproduce all 240 original validation configurations with the original
frozen beta prior. Match metrics and selection hashes against the saved results.
Test canonical threshold equivalence and vectorized Pareto dominance against
the original definition. Verify all outcome months follow the origin and all
prior outcome months precede it. Do not change current ranking or production
data as part of this audit.
