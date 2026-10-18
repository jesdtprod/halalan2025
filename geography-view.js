import { createCandidateFilter, filterCandidateRows, getCandidateFilterKey, closeCandidateFilter } from './candidate-filter.js';
import { appendResultsPdf } from './results-card-actions.js?v=20261017-pdf';
import { getWinningSeats } from './election-rules.js';

const $ = (selector) => document.querySelector(selector);
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number = (value) => Number(value || 0).toLocaleString('en-PH');
export const viewMode = location.pathname.includes('municipality-breakdown') ? 'municipality' : location.pathname.includes('barangay-breakdown') ? 'barangay' : location.pathname.includes('election-returns-breakdown') ? 'er' : 'overview';
const labels = {municipality: 'By City/Municipality', barangay: 'By Barangay', er: 'By Election Result'};
const cache = new Map();
let generation = 0;
let visibleExport = null;
export function resetGeography() { generation++; visibleExport = null; cache.clear(); }
export function geographyExport() { return visibleExport; }

export function buildMatrix(contest, mode, municipality = 'all', barangay = 'all') {
  const columns = new Map();
  const mapping = new Map();
  for (const column of contest.columns) {
    if (mode === 'municipality' && municipality !== 'all' && column.code !== municipality) continue;
    if (mode === 'er' && barangay !== 'all' && column.barangay_code !== barangay) continue;
    const code = mode === 'barangay' ? column.barangay_code : column.code;
    columns.set(code, {code, name: mode === 'barangay' ? column.barangay : column.name, source: mode === 'barangay' ? undefined : column.source});
    mapping.set(column.code, code);
  }
  const rows = contest.candidates.map((candidate) => {
    const votes = {};
    for (const [source, target] of mapping) {
      if (Object.hasOwn(candidate.votes, source)) votes[target] = (votes[target] || 0) + Number(candidate.votes[source]);
    }
    return {name: candidate.name, votes, total: Object.values(votes).reduce((a, b) => a + b, 0)};
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  return {columns: [...columns.values()], rows};
}

export async function renderGeography(snapshot) {
  const id = ++generation;
  visibleExport = null;
  const province = snapshot.code;
  const municipality = $('#municipality-select').value;
  if (viewMode !== 'municipality' && municipality === 'all') {
    $('#result-message').textContent = 'Select a city / municipality to see its results.';
    $('#coverage-warning').hidden = true;
    $('#groups-container').innerHTML = '<p class="local-empty">Select a city / municipality to see its results.</p>';
    return;
  }
  const path = `data/breakdowns/${province}/${viewMode === 'municipality' ? 'municipalities' : municipality}.json`;
  $('#result-title').textContent = `${snapshot.province} · ${labels[viewMode]}`;
  $('#result-message').textContent = 'Loading geographic breakdown…';
  try {
    if (!cache.has(path)) {
      const response = await fetch(path, {cache: 'no-store'});
      if (!response.ok) throw new Error(`Breakdown file unavailable (${response.status}).`);
      cache.set(path, await response.json());
    }
    if (id !== generation) return;
    const data = cache.get(path);
    const barangaySelect = $('#barangay-select');
    const oldBarangay = barangaySelect.value;
    if (viewMode === 'er') {
      barangaySelect.innerHTML = '<option value="all">All barangays</option>' + data.barangays.map((area) => `<option value="${escape(area.code)}">${escape(area.name)}</option>`).join('');
      barangaySelect.value = data.barangays.some((area) => area.code === oldBarangay) ? oldBarangay : 'all';
    }
    const warning = [...(data.unavailable || []), ...(data.unavailable_barangays || [])];
    $('#coverage-warning').hidden = warning.length === 0;
    $('#coverage-warning').textContent = `Unavailable official source data: ${warning.join(', ')}. Totals include available files only.`;
    const search = $('#candidate-search').value.trim().toLocaleLowerCase();
    const container = $('#groups-container');
    const scrollTop = window.scrollY;
    const horizontalScroll = [...container.querySelectorAll('.table-wrap')].map((wrap) => wrap.scrollLeft);
    container.replaceChildren();
    const exportContests = [];
    for (const contest of data.contests) {
      const {columns, rows} = buildMatrix(contest, viewMode, municipality, barangaySelect.value);
      if (!columns.length) continue;
      const key = getCandidateFilterKey(`${province}:${municipality}:${viewMode}`, contest.code);
      const matching = rows.filter((row) => !search || `${row.name} ${contest.name}`.toLocaleLowerCase().includes(search));
      if (!matching.length) continue;
      const shown = filterCandidateRows(key, matching);
      exportContests.push({...contest, columns, candidates: shown});
      const winningSeats = getWinningSeats(contest);
      let rank = 0;
      const rowsHtml = shown.map((row, index) => {
        if (index === 0 || row.total !== shown[index - 1].total) rank = index + 1;
        const isWinner = rank <= winningSeats;
        const ballotNo = row.name.match(/^\d+/)?.[0] || '—';
        const cleanName = row.name.replace(/^\d+\.\s*/, '').replace(/\s*\([^)]+\)$/, '').trim();
        const party = (row.name.match(/\(([^)]+)\)$/)?.[1] || '').trim();
        const rankBadgeHtml = isWinner
          ? `<div class="rank-badge-wrap">
               <span class="rank-badge ${rank === 1 ? 'rank-badge-gold' : 'rank-badge-blue'}" title="Rank ${rank} of ${winningSeats} seats">${rank}</span>
             </div>`
          : `<span class="rank-num-plain">${rank}</span>`;

        return `<tr class="${isWinner ? 'is-winner-row' : ''}">
          <td class="rank-col">${rankBadgeHtml}</td>
          <td class="party-cell sticky-col">
            <div class="candidate-cell-wrap">
              <span class="ballot-tag">${escape(ballotNo)}</span>
              <span class="candidate-name-main">${escape(cleanName)}</span>
              ${party ? `<span class="candidate-party-pill">${escape(party)}</span>` : ''}
            </div>
          </td>
          ${columns.map((column) => `<td class="province-num-cell">${Object.hasOwn(row.votes, column.code) ? number(row.votes[column.code]) : '—'}</td>`).join('')}
          <td class="votes-column vote-total highlight-total ${isWinner ? 'is-winner-votes' : ''}">${number(row.total)}</td>
        </tr>`;
      }).join('');

      const pos = String(contest.position || '').toLowerCase();
      let posSlug = 'general';
      if (pos.includes('vice governor') || pos.includes('vice-governor')) posSlug = 'vice-governor';
      else if (pos.includes('governor')) posSlug = 'governor';
      else if (pos.includes('house') || pos.includes('representative') || pos.includes('congress')) posSlug = 'representative';
      else if (pos.includes('board') || pos.includes('panlalawigan')) posSlug = 'board-member';
      else if (pos.includes('vice mayor') || pos.includes('vice-mayor')) posSlug = 'vice-mayor';
      else if (pos.includes('mayor')) posSlug = 'mayor';
      else if (pos.includes('councilor') || pos.includes('bayan') || pos.includes('panlungsod')) posSlug = 'councilor';
      else if (pos.includes('party')) posSlug = 'party-list';
      else if (pos.includes('district')) posSlug = 'district';
      else if (pos.includes('sectoral')) posSlug = 'sectoral';

      const card = document.createElement('article');
      card.className = `group-card card-pos-${posSlug}`;
      card.innerHTML = `<header class="group-card-header">
        <div class="group-header-title-block">
          <div class="group-badge-row">
            <span class="local-position pos-badge-${posSlug}">${escape(contest.position)}</span>
            <span class="seats-pill"><i data-lucide="award"></i> Top ${winningSeats} ${winningSeats === 1 ? 'Seat' : 'Seats'}</span>
          </div>
          <h3>${escape(contest.name)}</h3>
        </div>
        <div class="group-header-actions"></div>
      </header>
      <div class="table-wrap province-table-wrap">
        <table class="results-table province-results-table">
          <caption class="sr-only">${escape(contest.name)} — ${labels[viewMode]}</caption>
          <thead>
            <tr>
              <th scope="col" class="rank-col">RANK</th>
              <th scope="col" class="party-col sticky-col">CANDIDATE</th>
              ${columns.map((column) => `<th scope="col" class="province-header-col">${column.source ? `<a href="${escape(column.source)}" target="_blank" rel="noopener">${escape(column.name)}</a>` : escape(column.name)}</th>`).join('')}
              <th scope="col" class="votes-column">TOTAL VOTES</th>
            </tr>
          </thead>
          <tbody>${rowsHtml || `<tr><td colspan="${columns.length + 3}" class="local-empty">No candidates selected.</td></tr>`}</tbody>
        </table>
      </div>`;
      createCandidateFilter({mount: card.querySelector('.group-header-actions'), card, categoryKey: `${province}:${municipality}:${viewMode}`, title: contest.code, rows: matching, onChange: () => renderGeography(snapshot)});
      appendResultsPdf(card.querySelector('.group-header-actions'), {
        contest, rows: shown,
        columns: columns.map((column) => ({label: column.name, value: (row) => row.votes[column.code] ?? null})),
        province: snapshot.province, municipality: municipality === 'all' ? '' : $('#municipality-select').selectedOptions[0].textContent,
        view: labels[viewMode], note: `${viewMode === 'municipality' ? 'COC' : 'ER'} totals${warning.length ? ' - Incomplete source coverage' : ''}`,
      });
      container.append(card);
    }
    if (!exportContests.length) container.innerHTML = '<p class="local-empty">No results match these filters.</p>';
    [...container.querySelectorAll('.table-wrap')].forEach((wrap, index) => { wrap.scrollLeft = horizontalScroll[index] || 0; });
    window.scrollTo({top: scrollTop});
    visibleExport = {province: snapshot.province, view: labels[viewMode], municipality, downloaded_at: data.downloaded_at, unavailable: warning, contests: exportContests};
    $('#modal-source').innerHTML = '<a href="https://2025electionresults.comelec.gov.ph/dashboard" target="_blank" rel="noopener">Official COMELEC 2025 ' + (viewMode === 'municipality' ? 'COC' : 'ER') + ' JSON</a>';
    $('#modal-files').textContent = viewMode === 'municipality' ? `${snapshot.municipalities.length - (data.unavailable || []).length} municipal COC files` : `${data.precincts.length} precinct ER files`;
    $('#modal-timestamp').textContent = new Date(data.downloaded_at).toLocaleString('en-PH', {timeZone: 'Asia/Manila'});
    $('#result-message').textContent = `${exportContests.length} contests · ${viewMode === 'municipality' ? 'Official city / municipal COC totals' : `${data.precincts.length} available precinct ER files · ${data.municipality}`} · Dash = no entry in source`;
    $('#footer-updated-time').textContent = `Downloaded: ${new Date(data.downloaded_at).toLocaleString('en-PH', {timeZone: 'Asia/Manila'})} (Philippine time)`;
    document.querySelector('.footer-note').textContent = viewMode === 'municipality' ? 'Official municipal COC totals, grouped by contest. Totals reflect the selected columns.' : 'Official precinct election returns. Barangay totals sum distinct available precincts; ER totals can differ from COC totals.';
    window.lucide?.createIcons();
  } catch (error) {
    if (id !== generation) return;
    visibleExport = null;
    $('#groups-container').innerHTML = '';
    $('#result-message').textContent = `${error.message} Run python scripts/download-breakdowns.py to refresh downloaded breakdowns.`;
  }
}

document.addEventListener('click', (event) => {
  if (event.target.closest('.party-filter-control')) return;
  if (closeCandidateFilter()) document.dispatchEvent(new Event('geography-filter-close'));
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && closeCandidateFilter()) document.dispatchEvent(new Event('geography-filter-close'));
});
