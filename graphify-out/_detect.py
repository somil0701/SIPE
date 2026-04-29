import json
from graphify.detect import detect
from pathlib import Path

result = detect(Path('.'))
with open('graphify-out/.graphify_detect.json', 'w') as f:
    json.dump(result, f)

files = result.get('files', {})
total = result.get('total_files', 0)
words = result.get('total_words', 0)
print(f"Corpus: {total} files · ~{words:,} words")
for ftype, flist in files.items():
    if flist:
        exts = set()
        for fp in flist[:5]:
            from pathlib import Path as P
            exts.add(P(fp).suffix)
        print(f"  {ftype}: {len(flist)} files {' '.join(sorted(exts))}")
