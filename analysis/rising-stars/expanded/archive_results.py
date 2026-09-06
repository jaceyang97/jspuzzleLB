"""Store complete generated grids compactly, with reproducible gzip headers."""
import gzip
import hashlib
import json
from pathlib import Path

DIRECTORY = Path(__file__).resolve().parent / 'results'
manifest = []
for source in sorted(DIRECTORY.glob('*_grid.json')):
    raw = source.read_bytes()
    compressed = gzip.compress(raw, compresslevel=9, mtime=0)
    target = source.with_suffix(source.suffix + '.gz')
    target.write_bytes(compressed)
    assert gzip.decompress(target.read_bytes()) == raw
    manifest.append({
        'file': target.name,
        'uncompressed_sha256': hashlib.sha256(raw).hexdigest(),
        'uncompressed_bytes': len(raw),
        'compressed_bytes': len(compressed),
    })
assert len(manifest) == 5, 'Generate all five study grids before archiving.'
(DIRECTORY / 'archives.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
print(f'Archived {len(manifest)} complete grids: {sum(item["compressed_bytes"] for item in manifest):,} bytes')
