# Data collection and text handling

[`main.py`](../main.py) runs the scraper CLI. The scheduled workflow checks the current puzzle and recently archived puzzles, writes [`public/data/data.json`](../public/data/data.json), and derives [`stats.json`](../public/data/stats.json) from those records. Neither the frontend nor feedback form writes to these files.

```sh
python main.py
```

Use `python main.py --help` for full-archive and refresh options. Scraper tests run without making live requests:

```sh
python -m unittest discover -s scraper/tests -v
```

## Solver names

The client validates UTF-8 when a response declares a conflicting charset. Parsers preserve published Unicode names and reject structural rows. Existing encoding repairs are conservative; they must not turn legitimate international names into guessed replacements.

Confirmed spelling corrections belong in the explicit alias map in [`scraper/jane/parsers.py`](../scraper/jane/parsers.py). Apply aliases before regenerating statistics so a correction persists after the next scrape. Do not merge two similar names without evidence that they are the same person.

The frontend's [`solverInitial`](../src/utils/solverInitial.ts) helper handles combining accents, supplementary characters, joined emoji, and flags. Its tests preserve the fallback for browsers without `Intl.Segmenter`.

## Saved research

Research scripts use the public puzzle archive. Saved study results record input and generator hashes; paths inside [`analysis/`](../analysis/) are part of those references. The article export reads saved results without choosing a new rule. See the [research index](../analysis/README.md) for the reports and export check.
