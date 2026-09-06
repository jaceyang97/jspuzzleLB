# Independent method review

Reviewed 6 September 2026. This review covers the saved study and the expanded
protocol. It does not certify results that have not yet been computed.

## Main conclusions

- The old 12-month / 3-solve rule is on the saved **three-goal** frontier. A nearby
  point can be better on both axes in one graph and still be worse on the hidden
  third goal. Compare all three numbers before calling it strictly better.
- There is no obligation to keep three solves. It was a product compromise, not
  a mathematical constant. The new search can support a different compromise.
- The expanded family contains every canonical integer threshold combination
  for windows of 1–24 months and the four declared ordering methods: 10,400 rules.
  It does not cover every possible model. Rules that select the same records are
  equivalent results, not extra evidence.
- More rules do not create more observations. The archive has 128 completed
  published puzzles. The expanded protocol evaluates 96 origins after its
  warm-up, and these reuse names and future puzzles.
- The later period has already been examined. Any new selection based on it is
  an exploratory reanalysis, not a new independent test.

## The expanded protocol resolves the main implementation risks

January 2018 gives at least 24 months of history for the longest proposed window.
Earlier records still supply history. The latest six completed puzzles supply
future outcomes, so they cannot also be six-month evaluation origins.

The new beta method must use only cohorts whose six post-debut outcomes were
complete by each origin. The original implementation capped that pool in 2022.
The expanded protocol explicitly removes this cap. This is a disclosed method
update; its results should not be presented as an exact rerun of the old frozen
beta score. The original-prior parity check remains necessary.

Thresholds with E < S are redundant: requiring three solves already requires
three opportunities. Thus W12-S3-E1 and W12-S3-E3 are identical rules, not two
different policy choices. Missing puzzle months still contribute no opportunity.

## Interpret the objective correctly

The measurable outcome is future **published participation**. The data do not
measure attempts, time spent, private solves, or ability. Avoid describing the
result as a discovered measure of talent or alpha.

The analysis targets the first 20 attention slots. The actual table allows all
eligible names to be found and gives tied records a shared rank. The reach metric
assumes that boundary ties are resolved randomly again each month. It is therefore
a comparison proxy, not measured website exposure or a forecast of visitors.

Annualized unique reach is the number of distinct names over the whole evaluation
period, divided by its length in years. It is not the average of separate annual
unique-name counts. Compare candidates within the same period; do not interpret
changes between eras as a clean change in the underlying participation rate.

## Useful checks for the final short list

1. Show all three objectives, current eligible count and list-fill diagnostics
   for each option. Report pooled and recent-era results side by side.
2. Compare the same historical origins. Check paired participation differences
   using blocks of six and twelve origins. Label these exploratory sensitivity
   ranges, not independent post-selection confirmation.
3. Check one persistent tie order and the full group at the 20th-place boundary.
   The latter changes the number of attention slots; disclose that denominator.
   An apparent reach advantage that vanishes under realistic ties is weak grounds
   for changing the product.
4. Repeat finalists without the final origin, whose outcomes include the most
   recently completed puzzle. This only checks that one source of sensitivity;
   it cannot remove all later revisions in historical lists.
5. Check whether small neighboring threshold changes give similar results. An
   isolated numerical winner in a large search is less convincing than a stable
   region with a simple rule.

## How to present choices

Choose two or three options with different explicit aims: the youngest records,
more evidence of continued participation, and a simple compromise. Prefer a
12-month family when preserving the user's meaning of newcomer. A longer window
can be offered, but explain that it changes that meaning.

Do not force a single winner by inventing objective weights after seeing results.
Do not replace a transparent rule with a more complex score for a tiny unstable
gain. Conversely, do not defend three solves merely because it was previously
chosen: a material, stable improvement can justify a change.

The final options should give the exact window, minimum solves, minimum published
opportunities, ordering rule, and how ties are handled. If a conservative score
sorts the table, the visible raw solve rate must not imply that it is the sorting
score.

## Method references

Past-only rolling-origin evaluation is described in the authors' text,
[Forecasting: Principles and Practice](https://otexts.com/fpp3/tscv.html).
The scikit-learn maintainers explain why choosing and judging parameters on the
same data can give optimistic results in
[Nested versus non-nested cross-validation](https://scikit-learn.org/stable/auto_examples/model_selection/plot_nested_cross_validation_iris.html).
These support the review's caution about future-performance claims; they do not
establish any particular leaderboard parameter as best.
