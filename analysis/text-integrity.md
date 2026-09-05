# Text integrity repair

Verified on 2026-09-06 (Asia/Shanghai), against baseline commit `bdb9be8`.

## Causes and corrections

- Jane Street's HTML declares UTF-8, but its HTTP responses can omit the charset. A Latin-1 decode had already corrupted two stored puzzle titles. The scraper now decodes HTML bytes strictly as UTF-8 and parses JSON directly from bytes, avoiding HTTP charset defaults and lossy replacement.
- The official Robot Baseball JSON itself publishes two malformed names alongside their correct Unicode counterparts. The scraper repairs a reversible Latin-1/Windows-1252-to-UTF-8 spelling only when that exact corrected name already exists in the same roster. Other Unicode names remain unchanged.
- Archived `leaders` arrays also contain blank entries, presentation headings/separators, and one name prefixed by U+FEFF. The scraper removes blank entries, filters only the 13 exact verified presentation strings, and removes a leading BOM. It does not strip arbitrary HTML, symbols, accents, or non-Latin text.
- Shared avatar initials now use `Intl.Segmenter` grapheme boundaries rather than JavaScript UTF-16 code-unit splitting. Browsers without that API retain ASCII initials and show a neutral `?` avatar for non-ASCII names; full names remain intact. The live CJK solver profile passed browser visual inspection.

These were stored-text and character-segmentation defects, not evidence that names needed a different font. No dependency or broad Unicode normalization was added.

Published JSON writers and Git attributes use UTF-8 with LF line endings, keeping data bytes and research hashes consistent on Windows and Linux. The regression tests are included; automatic workflow execution was not added because the saved GitHub credential lacks workflow-edit permission.

## Verified official sources

| Source | Verified correction or non-solver rows |
| --- | --- |
| [Chess Pains solution](https://www.janestreet.com/puzzles/chess-pains-white-to-move-solution/) | Restored `Chess Pains – White To Move`. |
| [It's Symmetric solution](https://www.janestreet.com/puzzles/it-s-symmetric-solution/) | Restored `It’s Symmetric!`. |
| [Robot Baseball roster](https://www.janestreet.com/puzzles/2025-10-01-robot-baseball-leaderboard.json) | Two malformed duplicates corrected to the already-published `Thaddäus Tentakel` and `Andrej Kolar Požun`. |
| [Knight Moves 6 roster](https://www.janestreet.com/puzzles/2024-10-01-knight-moves-6-leaderboard.json) | Two category headings. |
| [Almost Magic roster](https://www.janestreet.com/puzzles/2022-04-01-almost-magic-leaderboard.json) | Two category headings. |
| [Robot Archery roster](https://www.janestreet.com/puzzles/2021-12-01-robot-archery-leaderboard.json) | `Exact answers from:` and `Correct to 10 decimals from:`. |
| [Tangled roster](https://www.janestreet.com/puzzles/2020-09-01-tangled-leaderboard.json) | One HTML line-break separator. |
| [Pent-Up Frustration roster](https://www.janestreet.com/puzzles/2018-11-01-pent-up-frustration-leaderboard.json) | Two category headings. |
| [Swing Time 2 roster](https://www.janestreet.com/puzzles/2018-05-01-swing-time-2-leaderboard.json) | One category heading. |
| [Rather Square Sudoku roster](https://www.janestreet.com/puzzles/2018-01-01-rather-square-sudoku-leaderboard.json) | Leading U+FEFF removed from `Christoph Dietrich`. |
| [Square Run roster](https://www.janestreet.com/puzzles/2017-09-01-square-run-leaderboard.json) | Two category headings. |
| [Hex-agony 2 roster](https://www.janestreet.com/puzzles/2017-01-01-hex-agony-2-leaderboard.json) | One italic second-highest-solution note. |
| [Swing Time roster](https://www.janestreet.com/puzzles/2016-08-01-swing-time-leaderboard.json) | One italic ordering note. |

The exact structural strings were matched in the live official payloads before removal. Literal-symbol aliases such as `Sticky <3`, `Geoffrey > Jessie`, and `Let Epsilon<=0` were preserved.

## Data impact

| Measure | Before | After |
| --- | ---: | ---: |
| Puzzles | 151 | 151 |
| Raw solver rows | 29,342 | 29,316 |
| Unique solver identities | 16,393 | 16,377 |
| Blank solver rows | 12 | 0 |
| Known structural rows | 14 | 0 |
| Empty timestamp keys | 6 | 0 |
| Corrupted titles / name variants / leading BOMs | 2 / 2 / 1 | 0 / 0 / 0 |

The 14 structural rows represented 13 false identities. The two malformed name variants and the blank name accounted for the other three removed identities. The BOM correction renamed one identity without merging it with another.

All genuine solve histories/counts, valid timestamps, puzzle metadata, and relative named-row order were preserved. Named duplicate rows remain. Percentiles now exclude removed non-solver rows. Stats were regenerated with the existing Rising Stars formula; the current Rising Stars and longest-streak results are unchanged.

Final `public/data/data.json` SHA256:

`bb4438c67cd513a9276bf9c3876d6b4b73b17155d75028a7ae01a8bcb8d9ee33`

## Verification

The final audit traversed 172,705 parsed string fields and object keys: 39,822 in raw data and 132,883 in stats. It found no remaining strict reversible mojibake candidates, U+FFFD replacement characters, stray C0/C1 controls, BOMs, blank solver identities, or known presentation rows. Every final roster is unchanged by a second cleaning pass. Tracked source text also passed the UTF-8/control-character audit.

Eight Python regression tests passed, covering misleading HTTP charsets, UTF-8/BOM decoding, invalid-byte rejection, conservative counterpart repairs, international-name preservation, structural-row filtering, symbol aliases, and storage/statistics round trips. Run from the repository root with the requirements installed:

```powershell
python -m unittest discover -s scraper/tests -v
```

On the audited Windows environment, the existing dependency installation was selected with `$env:PYTHONPATH = (Join-Path (Get-Location) '.venv\Lib\site-packages')` before that command. The existing Python source CRLF endings pass `git -c core.whitespace=cr-at-eol diff --check`.

Avatar regression coverage includes combining accents, supplementary CJK, joined emoji, flags, Greek, Cyrillic, and the legacy-browser fallback:

```powershell
npm test -- --watchAll=false --runInBand --runTestsByPath src/utils/__tests__/solverInitial.test.ts
```
