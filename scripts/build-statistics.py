"""Build scope statistics from saved official ERs, without counting a precinct twice.

Run after refreshing source data: python scripts/build-statistics.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'data'
LOCAL = {'004', '005', '006', '007', '008', '009', '010'}


def read(path):
    return json.loads(path.read_bytes())


def build():
    scopes = {}
    for code in ('6500000', '8700000', '8800000'):
        province = read(ROOT / f'{code}.json')
        totals = {'name': province['province'], 'registered': 0, 'cast': 0, 'published': 0, 'expected': 0, 'discovery_incomplete': False,
                  'entries': sum(len(c['candidates']) for c in province['contests'])}
        province_precincts = set()
        for area in province['municipalities']:
            matrix = read(ROOT / 'breakdowns' / code / f'{area["code"]}.json')
            expected = {p['code'] for p in matrix['precincts']} | set(matrix.get('unavailable', []))
            item = {'name': area['name'], 'registered': 0, 'cast': 0, 'published': 0, 'expected': len(expected),
                    'discovery_incomplete': bool(matrix.get('unavailable_barangays'))}
            for precinct in matrix['precincts']:
                pid = precinct['code']
                if pid in province_precincts:
                    raise ValueError(f'Duplicate precinct across municipalities: {pid}')
                province_precincts.add(pid)
                information = read(ROOT / 'source' / 'er' / pid[:3] / f'{pid}.json')['information']
                item['registered'] += int(information['numberOfRegisteredVoters'])
                item['cast'] += int(information['numberOfActuallyVoters'])
                item['published'] += 1
            coc = ROOT / 'source' / 'coc' / f'{area["code"]}.json'
            item['entries'] = sum(len(c['candidates']['candidates']) for c in read(coc)['local'] if c['contestCode'][:3] in LOCAL) if coc.exists() else sum(len(c['candidates']) for c in matrix['contests'])
            scopes[area['code']] = item
            for key in ('registered', 'cast', 'published', 'expected'):
                totals[key] += item[key]
            totals['discovery_incomplete'] |= item['discovery_incomplete']
        scopes[code] = totals
    (ROOT / 'statistics.json').write_text(json.dumps({'scopes': scopes}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    for code in ('6500000', '8700000', '8800000'):
        print(scopes[code]['name'], scopes[code])


if __name__ == '__main__':
    build()
