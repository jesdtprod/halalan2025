"""Download official 2025 COMELEC COC JSON for the three supported provinces.

Run from the repository root: python scripts/download-results.py
Raw source files are retained beside a compact local-contest snapshot.
"""
import concurrent.futures
import datetime
import json
from pathlib import Path
import subprocess

BASE = 'https://2025electionresults.comelec.gov.ph'
ROOT = Path(__file__).resolve().parents[1] / 'data'
PROVINCES = {'6500000': 'Sultan Kudarat', '8700000': 'Maguindanao del Norte', '8800000': 'Maguindanao del Sur'}
POSITIONS = {'004': 'Governor', '005': 'Vice Governor', '006': 'Provincial Board Member', '007': 'House Representative', '008': 'Mayor', '009': 'Vice Mayor', '010': 'Councilor'}


def download(path):
    result = subprocess.run(['curl.exe', '--fail', '--silent', '--show-error', '--location', '--retry', '2', '--max-time', '35', BASE + path], capture_output=True, check=True)
    payload = json.loads(result.stdout)
    target = ROOT / 'source' / path.removeprefix('/data/')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(result.stdout)
    return payload


def province(item):
    code, name = item
    regions = download(f'/data/regions/local/{code}.json')['regions']
    areas = [{'code': code, 'name': name}, *regions]
    unavailable = []

    def area_results(area):
        try:
            payload = download(f'/data/coc/{area["code"]}.json')
        except subprocess.CalledProcessError as error:
            if area['code'] == code:
                raise
            unavailable.append({'code': area['code'], 'name': area['name'], 'error': error.stderr.decode(errors='replace').strip()})
            return []
        contests = []
        for contest in payload.get('local', []):
            prefix = contest['contestCode'][:3]
            # Province COCs supply province/district contests; city/municipal
            # COCs supply municipal contests only, avoiding repeated totals.
            if prefix not in POSITIONS or (area['code'] != code and prefix not in ('008', '009', '010')):
                continue
            contests.append({
                'code': contest['contestCode'], 'name': contest['contestName'],
                'position': POSITIONS[prefix], 'area_code': area['code'],
                'area': area['name'], 'received_percent': payload.get('totalCocReceived'),
                'statistics': contest.get('statistic', {}),
                'candidates': contest.get('candidates', {}).get('candidates', []),
                'source': f'{BASE}/data/coc/{area["code"]}.json',
            })
        return contests

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        contests = [contest for group in pool.map(area_results, areas) for contest in group]
    if not contests or not any(c['position'] == 'Councilor' for c in contests):
        raise RuntimeError(f'Incomplete contests for {name}')
    snapshot = {'province': name, 'code': code, 'source': BASE + '/dashboard', 'downloaded_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'municipalities': regions, 'unavailable': sorted(unavailable, key=lambda area: area['code']), 'contests': contests}
    (ROOT / f'{code}.json').write_text(json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{name}: {len(contests)} contests, {sum(len(c["candidates"]) for c in contests)} candidate entries', flush=True)
    for area in unavailable:
        print(f'  Source unavailable: {area["name"]} ({area["code"]})', flush=True)


if __name__ == '__main__':
    ROOT.mkdir(exist_ok=True)
    for item in PROVINCES.items():
        province(item)
