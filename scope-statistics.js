const $ = (selector) => document.querySelector(selector);
const number = (value) => Number(value).toLocaleString('en-PH');
let dataPromise;
let generation = 0;
export function resetStatistics() { generation++; dataPromise = null; }

export async function renderStatistics(province, municipality) {
  const id = ++generation;
  try {
    dataPromise ||= fetch('data/statistics.json', {cache: 'no-store'}).then(async (response) => {
      if (!response.ok) throw new Error('Scope statistics unavailable');
      return response.json();
    });
    const data = await dataPromise;
    if (id !== generation) return;
    const stats = data.scopes[municipality === 'all' ? province : municipality];
    if (!stats) throw new Error('Scope statistics unavailable');
    $('#kpi-returns-val').className = 'kpi-value';
    $('#kpi-returns-val').textContent = stats.published ? number(stats.registered) : '—';
    $('#kpi-returns-sub').textContent = `Across published ERs · ${stats.name}`;
    $('#kpi-votes-val').textContent = stats.published ? number(stats.cast) : '—';
    $('#kpi-votes-sub').textContent = stats.registered ? `${(stats.cast / stats.registered * 100).toFixed(1)}% of ${number(stats.registered)} registered voters` : 'No published voter information';
    $('#kpi-leader-val').textContent = `${number(stats.published)} / ${number(stats.expected)}`;
    $('#kpi-leader-share').textContent = stats.discovery_incomplete ? 'Partial precinct discovery; known ERs only' : stats.expected ? `${(stats.published / stats.expected * 100).toFixed(1)}% of total ERs` : 'No precincts found';
    $('#kpi-parties-val').textContent = number(stats.entries);
    $('#kpi-participants-sub').textContent = `Governor to Councilor · ${stats.name}`;
  } catch {
    if (id !== generation) return;
    for (const selector of ['#kpi-returns-val', '#kpi-votes-val', '#kpi-leader-val', '#kpi-parties-val']) $(selector).textContent = '—';
    $('#kpi-returns-sub').textContent = 'Scope statistics unavailable';
  }
}
