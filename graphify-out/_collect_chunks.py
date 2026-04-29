import json
from pathlib import Path

# Merge all chunk files that exist, plus build a minimal semantic graph from what AST found
chunks = []
for i in range(3):
    chunk_path = Path(f'graphify-out/.graphify_chunk_{i}.json')
    if chunk_path.exists():
        try:
            data = json.loads(chunk_path.read_text())
            if 'nodes' in data and 'edges' in data:
                chunks.append(data)
                print(f'Chunk {i}: {len(data["nodes"])} nodes, {len(data["edges"])} edges')
            else:
                print(f'Chunk {i}: invalid JSON structure')
        except Exception as e:
            print(f'Chunk {i}: parse error - {e}')
    else:
        print(f'Chunk {i}: MISSING from disk')

if not chunks:
    print('No chunks found - writing empty semantic result')
    result = {'nodes': [], 'edges': [], 'hyperedges': [], 'input_tokens': 0, 'output_tokens': 0}
else:
    all_nodes = []
    all_edges = []
    all_hyperedges = []
    seen = set()
    for c in chunks:
        for n in c.get('nodes', []):
            if n['id'] not in seen:
                seen.add(n['id'])
                all_nodes.append(n)
        all_edges.extend(c.get('edges', []))
        all_hyperedges.extend(c.get('hyperedges', []))
    result = {
        'nodes': all_nodes,
        'edges': all_edges,
        'hyperedges': all_hyperedges,
        'input_tokens': sum(c.get('input_tokens', 0) for c in chunks),
        'output_tokens': sum(c.get('output_tokens', 0) for c in chunks),
    }

Path('graphify-out/.graphify_semantic_new.json').write_text(json.dumps(result, indent=2))
print(f'Semantic new: {len(result["nodes"])} nodes, {len(result["edges"])} edges')
