# Ranking research

This directory contains the protocols, scripts, and saved results behind the Rising stars ranking and its [published article](https://jspuzzle-lb.vercel.app/rising-stars).

- [`rising-stars/expanded/report.md`](rising-stars/expanded/report.md): the expanded retrospective of 10,400 configurations, linked from the article.
- [`rising-stars/expanded/protocol.md`](rising-stars/expanded/protocol.md): the declared rule family, time periods, and evaluation criteria.
- [`rising-stars/report.md`](rising-stars/report.md) and [`protocol.md`](rising-stars/protocol.md): the original study and protocol.

Each study keeps its scripts, figures, and results together. Large expanded grids are stored as `.json.gz`; the readers also accept their uncompressed form. Saved metadata includes hashes, so keep the existing file paths when reproducing a study.

The frontend's article data is an export of these saved results. Check it from the repository root:

```sh
python analysis/rising-stars/expanded/export_article.py --check
```

These studies describe the historical archive. They do not establish an optimal rule or guarantee future participation. The production rule is implemented in [`scraper/jane/rising_stars.py`](../scraper/jane/rising_stars.py) and [`src/utils/risingStars.ts`](../src/utils/risingStars.ts).
