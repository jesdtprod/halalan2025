"""Save 2025 local ERs and build municipality/barangay/precinct matrices.

Run: python scripts/download-breakdowns.py
Valid source files are reused. Missing source files are retried on the next run.
"""
import concurrent.futures
import datetime
import json
from pathlib import Path
import importlib.util
import sys

spec = importlib.util.spec_from_file_location('results', Path(__file__).with_name('download-results.py'))
results = importlib.util.module_from_spec(spec)
spec.loader.exec_module(results)
ROOT, POSITIONS = results.ROOT, results.POSITIONS


def get(path):
    target = ROOT / 'source' / path.removeprefix('/data/')
    if target.exists():
        try:
            return json.loads(target.read_bytes())
        except (ValueError, OSError):
            pass
    return results.download(path)


def local(payload):
    return [c for c in payload.get('local', []) if c['contestCode'][:3] in POSITIONS]


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


def matrix(records):
    contests = {}
    for column, payload in records:
        for c in local(payload):
            code = c['contestCode']
            group = contests.setdefault(code, {'code': code, 'name': c['contestName'], 'position': POSITIONS[code[:3]], 'columns': [], 'candidates': {}})
            group['columns'].append(column)
            for candidate in c.get('candidates', {}).get('candidates', []):
                row = group['candidates'].setdefault(candidate['name'], {'name': candidate['name'], 'votes': {}})
                row['votes'][column['code']] = int(candidate.get('votes') or 0)
    for group in contests.values():
        group['candidates'] = list(group['candidates'].values())
    return list(contests.values())


def province(code, name):
    snapshot = json.loads((ROOT / f'{code}.json').read_text(encoding='utf-8'))
    municipalities = snapshot['municipalities']
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    municipal_records, missing = [], []
    for area in municipalities:
        try:
            municipal_records.append((area, get(f'/data/coc/{area["code"]}.json')))
        except Exception:
            missing.append(area['name'])
    save(ROOT / 'breakdowns' / code / 'municipalities.json', {'downloaded_at': now, 'contests': matrix(municipal_records), 'unavailable': missing})

    unavailable_discovery = {}

    def discovery(area):
        try:
            barangays = get(f'/data/regions/local/{area["code"]}.json')['regions']
            return area, barangays
        except Exception as error:
            unavailable_discovery[area['code']] = f'{area["name"]} barangay list'
            return area, []

    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        areas = list(pool.map(discovery, municipalities))
    tasks = [(area, barangay) for area, barangays in areas for barangay in barangays]

    def discover_precincts(task):
        area, barangay = task
        try:
            return area, barangay, get(f'/data/regions/precinct/{code[:2]}/{barangay["code"]}.json')['regions'], None
        except Exception as error:
            return area, barangay, [], str(error)

    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        discovered = list(pool.map(discover_precincts, tasks))
    print(f'{name}: discovered {sum(len(p) for _, _, p, _ in discovered)} precinct references', flush=True)
    er_tasks = [(area, barangay, precinct) for area, barangay, precincts, _ in discovered for precinct in precincts]

    def fetch_er(task):
        area, barangay, precinct = task
        pid = precinct['code']
        try:
            payload = get(f'/data/er/{pid[:3]}/{pid}.json')
            return area, barangay, precinct, payload, None
        except Exception as error:
            return area, barangay, precinct, None, str(error)

    by_area = {area['code']: [] for area in municipalities}
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        for index, row in enumerate(pool.map(fetch_er, er_tasks), 1):
            by_area[row[0]['code']].append(row)
            if index % 200 == 0:
                print(f'{name}: {index}/{len(er_tasks)} precinct references processed', flush=True)
    for area, barangays in areas:
        rows = by_area[area['code']]
        # A clustered precinct may appear under multiple barangays. Keep one
        # canonical location per precinct to avoid counting a return twice.
        unique = {}
        for _, barangay, precinct, payload, error in rows:
            if payload is not None:
                actual = payload.get('information', {}).get('location', '').split(',')[-1].strip().upper()
                match = next((b for b in barangays if b['name'].upper() == actual), barangay)
                unique[precinct['code']] = (match, precinct, payload)
        records = [({'code': pid, 'name': pid, 'barangay_code': b['code'], 'barangay': b['name'], 'source': f'{results.BASE}/data/er/{pid[:3]}/{pid}.json'}, payload) for pid, (b, precinct, payload) in sorted(unique.items())]
        missing_ers = sorted({precinct['code'] for _, _, precinct, payload, error in rows if error})
        missing_lists = [b['name'] for a, b, precincts, error in discovered if a['code'] == area['code'] and error]
        if area['code'] in unavailable_discovery:
            missing_lists.append(unavailable_discovery[area['code']])
        save(ROOT / 'breakdowns' / code / f'{area["code"]}.json', {'province': name, 'municipality': area['name'], 'downloaded_at': now, 'barangays': barangays, 'precincts': [c for c, _ in records], 'contests': matrix(records), 'unavailable': missing_ers, 'unavailable_barangays': missing_lists})
        print(f'  {area["name"]}: {len(records)} ERs, {len(missing_ers)} unavailable', flush=True)


if __name__ == '__main__':
    for code, name in results.PROVINCES.items():
        if len(sys.argv) == 1 or code in sys.argv[1:]:
            province(code, name)


    import runpy
    runpy.run_path(str(Path(__file__).with_name('build-statistics.py')), run_name='__main__')
