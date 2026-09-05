"""Generate standalone figures from saved study results (matplotlib required)."""
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import PercentFormatter

ROOT = Path(__file__).parent
RESULTS = ROOT / 'results'
OUT = ROOT / 'figures'
OUT.mkdir(exist_ok=True)

def read(name):
    return json.loads((RESULTS / name).read_text(encoding='utf-8'))

def save_figure(fig, stem):
    for suffix in ['png', 'svg']:
        path = OUT / f'{stem}.{suffix}'
        fig.savefig(path, dpi=180)
        if suffix == 'svg':
            # Matplotlib puts trailing spaces inside multiline path attributes.
            # Normalize its text output for portable, clean repository diffs.
            lines = path.read_text(encoding='utf-8').splitlines()
            path.write_text('\n'.join(line.rstrip() for line in lines) + '\n',
                            encoding='utf-8', newline='\n')

plt.rcParams.update({
    'font.family': 'DejaVu Sans', 'font.size': 10, 'axes.titlesize': 12,
    'axes.labelcolor': '#394150', 'text.color': '#172232',
    'axes.edgecolor': '#cbd2db', 'xtick.color': '#536174', 'ytick.color': '#536174',
    'axes.spines.top': False, 'axes.spines.right': False,
    'figure.facecolor': '#fafbfd', 'axes.facecolor': '#fafbfd',
    'svg.fonttype': 'none',
})

validation = read('validation.json')
rows = list({r['behavior_hash']: r for r in validation['rows'] if r['meets_95pct_fill']}.values())
frontier = validation['pareto']
recommended = next(r for r in rows if 'W12-S3-E1-raw' in r['equivalent_config_ids'])
fig, axes = plt.subplots(1, 2, figsize=(12.5, 5.5))
for ax, field, label in zip(axes,
    ['average_post_debut_exposure', 'annualized_unique_reach'],
    ['Average puzzles after debut in displayed records  (lower = newer)',
     'Expected distinct names shown per year  (higher = broader)']):
    ax.scatter([r[field] for r in rows], [r['future_quality'] for r in rows], s=30,
               color='#bfc8d4', alpha=.72, label='Other eligible configurations', zorder=2)
    ax.scatter([r[field] for r in frontier], [r['future_quality'] for r in frontier], s=65,
               color='#1b7786', edgecolor='white', linewidth=.8, label='Three-objective Pareto frontier', zorder=3)
    ax.scatter([recommended[field]], [recommended['future_quality']], marker='*', s=240,
               color='#bb3f38', edgecolor='white', linewidth=.8, label='12 months / 3 solves / raw rate', zorder=4)
    ax.set_xlabel(label, fontsize=9, labelpad=12)
    ax.yaxis.set_major_formatter(PercentFormatter(1, decimals=0))
    ax.grid(axis='y', alpha=.25)
    ax.set_axisbelow(True)
axes[0].set_ylabel('Share of the next six published puzzles solved')
axes[0].set_title('Reliability versus newer records', loc='left', pad=15)
axes[1].set_title('Reliability versus more names', loc='left', pad=15)
axes[0].annotate('12 months / 3 solves',
    (recommended['average_post_debut_exposure'], recommended['future_quality']),
    xytext=(12,-31), textcoords='offset points', color='#bb3f38', fontsize=10,
    arrowprops={'arrowstyle':'-', 'color':'#bb3f38', 'lw':.8})
handles, labels = axes[0].get_legend_handles_labels()
fig.legend(handles, labels, loc='lower center', bbox_to_anchor=(.5,.055), ncol=3, frameon=False, fontsize=9)
fig.suptitle('Rising stars: there is a trade-off, not one universal winner', x=.065, ha='left', fontsize=17, fontweight='bold')
fig.text(.065,.902,'Validation: Jan 2023–Jun 2024 · 240 rules · only lists with ≥95% occupancy qualify', fontsize=10, color='#536174')
fig.text(.065,.015,'Two projections of the same three-objective frontier. Reach assumes independent choices within boundary ties.', fontsize=9, color='#536174')
fig.subplots_adjust(left=.065,right=.98,top=.80,bottom=.24,wspace=.27)
save_figure(fig, 'validation-frontier')
plt.close(fig)

holdout = {r['config_id']: r for r in read('holdout_selected.json')['rows']}
choices = [
 ('W6-S2-E1-raw','6 months · 2 solves'),
 ('W12-S2-E1-raw','12 months · 2 solves'),
 ('W12-S3-E1-raw','12 months · 3 solves'),
 ('W12-S4-E1-raw','12 months · 4 solves'),
 ('W12-S3-E1-wilson','12 months · Wilson'),
 ('W12-S3-E1-beta','12 months · Bayesian'),
 ('W12-S3-E1-count','12 months · total solves'),
 ('W18-S2-E1-wilson','18 months · Wilson'),
]
fig, axes = plt.subplots(1,3,figsize=(12.5,5.5),sharey=True,gridspec_kw={'width_ratios':[1.2,1,1]})
for i,(key,label) in enumerate(choices):
    row=holdout[key]
    color='#bb3f38' if key=='W12-S3-E1-raw' else '#1b7786'
    y=len(choices)-1-i
    for ax,field,fmt in zip(axes,
        ['future_quality','average_post_debut_exposure','annualized_unique_reach'],
        [lambda x:f'{x:.1%}',lambda x:f'{x:.2f}',lambda x:f'{x:.1f}']):
        value=row[field]
        ax.barh(y,value,height=.46,color=color,alpha=.92)
        ax.text(value,y,'  '+fmt(value),va='center',fontsize=10,color=color)
axes[0].set_yticks(range(len(choices)),[label for _,label in reversed(choices)])
axes[0].set_xlim(0,.65)
axes[0].xaxis.set_major_formatter(PercentFormatter(1,decimals=0))
axes[1].set_xlim(0,12)
axes[2].set_xlim(0,155)
for ax,title in zip(axes,['Future participation ↑','Record age after debut ↓','Expected annual reach ↑']):
    ax.set_title(title,loc='left',pad=15,fontsize=11)
    ax.grid(axis='x',alpha=.2)
    ax.set_axisbelow(True)
    ax.spines['left'].set_visible(False)
    ax.tick_params(axis='y',length=0)
fig.suptitle('The later-period test: three solves remains a reasonable balance',x=.035,ha='left',fontsize=17,fontweight='bold')
fig.text(.035,.9,'Frozen shortlist · Jan 2025–Feb 2026 · 14 origins · next six completed, published puzzles',fontsize=10,color='#536174')
fig.text(.035,.045,'Point estimates, not proof of a unique optimum. Displayed-record age is not detection time; reach is tie-policy dependent.',fontsize=9,color='#536174')
fig.text(.035,.013,'Data snapshot: 6 Sep 2026 (Asia/Shanghai). The report includes block-resampling and stable-tie sensitivity checks.',fontsize=9,color='#536174')
fig.subplots_adjust(left=.205,right=.96,top=.79,bottom=.16,wspace=.26)
save_figure(fig, 'holdout-comparison')
plt.close(fig)
print('Saved four standalone figures to',OUT)
