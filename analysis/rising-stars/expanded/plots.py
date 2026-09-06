"""Render final study figures from saved results, without re-running selection."""
import gzip
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import PercentFormatter

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'figures'
OUT.mkdir(exist_ok=True)
source = ROOT / 'results/pooled_grid.json'
raw = source.read_bytes() if source.exists() else gzip.decompress(source.with_suffix('.json.gz').read_bytes())
rows = json.loads(raw)
qualified = list({row['behavior_hash']: row for row in rows if row['meets_95pct_fill']}.values())
frontier = [row for row in qualified if row['pareto_up_to24']]
selected = next(row for row in rows if row['config_id'] == 'W18-S2-E3-raw')
assert len(frontier) == 97 and selected['pareto_up_to24']

plt.rcParams.update({
    'font.family': 'DejaVu Sans', 'font.size': 11, 'text.color': '#272824',
    'axes.labelcolor': '#4d524e', 'axes.edgecolor': '#cbd0cb',
    'xtick.color': '#59615b', 'ytick.color': '#59615b',
    'axes.spines.top': False, 'axes.spines.right': False,
    'figure.facecolor': '#faf9f6', 'axes.facecolor': '#faf9f6', 'svg.fonttype': 'none',
})

for field, label, stem in [
    ('average_post_debut_exposure', 'Average puzzles after first solve (lower = newer records)', 'age'),
    ('annualized_unique_reach', 'Expected names per year in the first 20 places (higher = broader)', 'reach'),
]:
    fig, ax = plt.subplots(figsize=(8.6, 5.8))
    fig.suptitle('How we rank Rising stars', x=.10, y=.98, ha='left', fontsize=17, fontweight='bold')
    fig.text(.10, .913, '10,400 rules · 96 snapshots · Jan 2018–Feb 2026', fontsize=10, color='#59615b')
    ax.scatter([r[field] for r in qualified], [r['future_quality'] for r in qualified],
               s=20, color='#b9c1c4', alpha=.48, linewidth=0, label='Other qualifying rules', zorder=2)
    ax.scatter([r[field] for r in frontier], [r['future_quality'] for r in frontier],
               s=46, color='#167d88', edgecolor='#faf9f6', linewidth=.7,
               label='Frontier across all three goals', zorder=3)
    ax.scatter(selected[field], selected['future_quality'], marker='*', s=210,
               color='#ad4c32', edgecolor='#faf9f6', linewidth=.8,
               label='Selected rule · on the frontier', zorder=5)
    ax.set_xlabel(label, labelpad=12, fontsize=10)
    ax.set_ylabel('Share of next six puzzles solved', labelpad=8, fontsize=10)
    ax.yaxis.set_major_formatter(PercentFormatter(1, decimals=0))
    ax.grid(axis='y', alpha=.22)
    ax.set_axisbelow(True)
    ax.margins(x=.04, y=.09)
    fig.legend(*ax.get_legend_handles_labels(), loc='lower left', bbox_to_anchor=(.085, .015), ncol=2, frameon=False, fontsize=9)
    fig.subplots_adjust(left=.10, right=.97, top=.85, bottom=.23)
    for suffix in ('png', 'svg'):
        path = OUT / f'selected-{stem}.{suffix}'
        fig.savefig(path, dpi=180)
        if suffix == 'svg':
            path.write_text('\n'.join(line.rstrip() for line in path.read_text(encoding='utf-8').splitlines()) + '\n', encoding='utf-8', newline='\n')
    plt.close(fig)
print('Rendered final participation/age and participation/exposure figures.')
