import { viewMode, renderGeography, resetGeography, geographyExport } from './geography-view.js?v=20261017-scoped-stats';
import { createCandidateFilter, filterCandidateRows, getCandidateFilterKey } from './candidate-filter.js';
import { appendResultsPdf } from './results-card-actions.js?v=20261017-final';
import { renderStatistics, resetStatistics } from './scope-statistics.js?v=20261017-scoped-stats';
import { getWinningSeats } from './election-rules.js';
import { showToast } from './toast.js';

const $ = (selector) => document.querySelector(selector);
const number = (value) => Number(value || 0).toLocaleString('en-PH');
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const positions = ['Governor', 'Vice Governor', 'Provincial Board Member', 'House Representative', 'Mayor', 'Vice Mayor', 'Councilor'];
let snapshot;
let municipalityResults;
let requestId = 0;

export function getPositionSlug(position = '') {
  const pos = String(position).toLowerCase();
  if (pos.includes('vice governor') || pos.includes('vice-governor')) return 'vice-governor';
  if (pos.includes('governor')) return 'governor';
  if (pos.includes('house') || pos.includes('representative') || pos.includes('congress')) return 'representative';
  if (pos.includes('board') || pos.includes('panlalawigan')) return 'board-member';
  if (pos.includes('vice mayor') || pos.includes('vice-mayor')) return 'vice-mayor';
  if (pos.includes('mayor')) return 'mayor';
  if (pos.includes('councilor') || pos.includes('bayan') || pos.includes('panlungsod')) return 'councilor';
  if (pos.includes('party')) return 'party-list';
  if (pos.includes('district')) return 'district';
  if (pos.includes('sectoral') || pos.includes('women') || pos.includes('youth') || pos.includes('ulama')) return 'sectoral';
  return 'general';
}

export function getLocalResultsSkeletonHtml() {
  const cards = [
    { posW: '96px', titleW: '320px', rows: 4, posClass: 'card-pos-governor', badgeClass: 'pos-badge-governor' },
    { posW: '115px', titleW: '340px', rows: 3, posClass: 'card-pos-vice-governor', badgeClass: 'pos-badge-vice-governor' },
    { posW: '150px', titleW: '390px', rows: 3, posClass: 'card-pos-representative', badgeClass: 'pos-badge-representative' }
  ];
  return cards.map((c) => `
    <article class="group-card ${c.posClass}">
      <header class="group-card-header">
        <div class="group-header-title-block">
          <div class="group-badge-row">
            <span class="skeleton local-position ${c.badgeClass}" style="width:${c.posW};height:20px;border-radius:9999px;"></span>
            <span class="skeleton seats-pill" style="width:96px;height:20px;border-radius:9999px;"></span>
          </div>
          <div class="skeleton" style="width:${c.titleW};max-width:85%;height:22px;border-radius:6px;margin-top:2px;"></div>
        </div>
        <div class="group-header-stats">
          <span class="skeleton stat-pill" style="width:105px;height:32px;border-radius:6px;"></span>
          <span class="skeleton btn" style="width:105px;height:32px;border-radius:6px;"></span>
          <span class="skeleton btn" style="width:34px;height:32px;border-radius:6px;"></span>
          <span class="skeleton btn" style="width:34px;height:32px;border-radius:6px;"></span>
        </div>
      </header>
      <div class="table-wrap">
        <table class="results-table">
          <thead>
            <tr>
              <th scope="col" class="ballot-col">NO.</th>
              <th scope="col" class="rank-col">RANK</th>
              <th scope="col">CANDIDATE</th>
              <th scope="col" class="share-col">VOTE SHARE</th>
              <th scope="col" class="votes-column">TOTAL VOTES</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from({length: c.rows}).map(() => `
              <tr class="skeleton-row">
                <td class="ballot-col"><span class="skeleton" style="width:26px;height:24px;border-radius:6px;display:inline-block;"></span></td>
                <td class="rank-col"><span class="skeleton" style="width:25px;height:25px;border-radius:50%;display:inline-block;"></span></td>
                <td class="party-cell">
                  <div class="candidate-cell-wrap" style="display:flex;flex-direction:column;gap:5px;">
                    <span class="skeleton" style="width:170px;max-width:80%;height:15px;border-radius:4px;"></span>
                    <span class="skeleton" style="width:70px;max-width:50%;height:13px;border-radius:9999px;"></span>
                  </div>
                </td>
                <td class="share-col">
                  <div class="share-cell" style="display:flex;align-items:center;gap:10px;">
                    <span class="skeleton" style="width:48px;height:16px;border-radius:4px;flex-shrink:0;"></span>
                    <span class="skeleton" style="width:1in;height:8px;border-radius:9999px;flex-shrink:0;"></span>
                  </div>
                </td>
                <td class="votes-column vote-total">
                  <span class="skeleton" style="width:75px;height:18px;border-radius:4px;display:inline-block;"></span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </article>
  `).join('');
}

function overviewContests() {
  const area = $('#municipality-select').value;
  if (area === 'all') return snapshot.contests;
  return (municipalityResults?.contests || [])
    .filter((contest) => contest.columns.some((column) => column.code === area))
    .map((contest) => ({...contest,
      source: `https://2025electionresults.comelec.gov.ph/data/coc/${area}.json`,
      candidates: contest.candidates.filter((candidate) => Object.hasOwn(candidate.votes, area))
        .map((candidate) => ({name: candidate.name, votes: candidate.votes[area]})),
    }));
}

function render() {
  if (!snapshot) return;
  renderStatistics(snapshot.code, $('#municipality-select').value);
  if (viewMode !== 'overview') { renderGeography(snapshot); return; }
  const area = $('#municipality-select').value;
  const search = $('#candidate-search').value.trim().toLocaleLowerCase();
  const contests = [...overviewContests()].sort((a, b) => positions.indexOf(a.position) - positions.indexOf(b.position) || a.name.localeCompare(b.name));
  let visible = 0;
  const actions = [];
  const scrollTop = window.scrollY;
  $('#groups-container').innerHTML = contests.map((contest) => {
    // Rank and denominator always use the entire contest, even during search.
    const sorted = [...contest.candidates].sort((a, b) => Number(b.votes) - Number(a.votes) || a.name.localeCompare(b.name));
    const total = sorted.reduce((sum, candidate) => sum + Number(candidate.votes || 0), 0);
    const categoryKey = `${snapshot.code}:${area}:overview`;
    const matching = sorted.filter((candidate) => !search || `${candidate.name} ${contest.name} ${contest.position}`.toLocaleLowerCase().includes(search));
    if (!matching.length) return '';
    const selected = filterCandidateRows(getCandidateFilterKey(categoryKey, contest.code), matching);
    const names = new Set(selected.map((candidate) => candidate.name));
    const reportRows = [];
    const winningSeats = getWinningSeats(contest);
    let rank = 0;
    const rows = sorted.map((candidate, index) => {
      if (index === 0 || candidate.votes !== sorted[index - 1].votes) rank = index + 1;
      if (!names.has(candidate.name)) return '';
      const share = total ? Number(candidate.votes) / total * 100 : 0;
      const isWinner = rank <= winningSeats;
      const ballotNo = candidate.name.match(/^\d+/)?.[0] || '—';
      const cleanName = candidate.name.replace(/^\d+\.\s*/, '').replace(/\s*\([^)]+\)$/, '').trim();
      const party = (candidate.name.match(/\(([^)]+)\)$/)?.[1] || '').trim();
      reportRows.push({...candidate, total: Number(candidate.votes), rank, share: `${share.toFixed(2)}%`, ballot: ballotNo, isWinner});

      const rankBadgeHtml = isWinner
        ? `<div class="rank-badge-wrap">
             <span class="rank-badge ${rank === 1 ? 'rank-badge-gold' : 'rank-badge-blue'}" title="Rank ${rank} of ${winningSeats} seats">${rank}</span>
           </div>`
        : `<span class="rank-num-plain">${rank}</span>`;

      return `<tr class="${isWinner ? 'is-winner-row' : ''}">
        <td class="ballot-col"><span class="ballot-tag">${escape(ballotNo)}</span></td>
        <td class="rank-col">${rankBadgeHtml}</td>
        <td class="party-cell">
          <div class="candidate-cell-wrap">
            <span class="candidate-name-main">${escape(cleanName)}</span>
            ${party ? `<span class="candidate-party-pill">${escape(party)}</span>` : ''}
          </div>
        </td>
        <td class="share-col">
          <div class="share-cell">
            <span class="share-pct">${share.toFixed(2)}%</span>
            <div class="local-share-track" title="${share.toFixed(2)}% vote share">
              <div class="share-track-fill ${isWinner ? (rank === 1 ? 'track-gold' : 'track-blue') : 'track-muted'}" style="width:${Math.min(100, Math.max(0, share))}%"></div>
            </div>
          </div>
        </td>
        <td class="votes-column vote-total ${isWinner ? 'is-winner-votes' : ''}">${number(candidate.votes)}</td>
      </tr>`;
    }).join('');
    actions.push({contest, categoryKey, matching, rows: reportRows});
    visible++;
    const posSlug = getPositionSlug(contest.position);
    return `<article class="group-card card-pos-${posSlug}">
      <header class="group-card-header">
        <div class="group-header-title-block">
          <div class="group-badge-row">
            <span class="local-position pos-badge-${posSlug}">${escape(contest.position)}</span>
            <span class="seats-pill"><i data-lucide="award"></i> Top ${winningSeats} ${winningSeats === 1 ? 'Seat' : 'Seats'}</span>
          </div>
          <h3>${escape(contest.name)}</h3>
        </div>
        <div class="group-header-stats">
          <span class="stat-pill"><i data-lucide="vote"></i> ${number(total)} votes</span>
          <a class="btn btn-outline" href="${escape(contest.source)}" target="_blank" rel="noopener">
            <i data-lucide="file-json" class="btn-icon"></i>
            <span>Source JSON</span>
          </a>
          <div class="group-header-actions"></div>
        </div>
      </header>
      <div class="table-wrap">
        <table class="results-table">
          <caption class="sr-only">${escape(contest.name)}</caption>
          <thead>
            <tr>
              <th scope="col" class="ballot-col">NO.</th>
              <th scope="col" class="rank-col">RANK</th>
              <th scope="col">CANDIDATE</th>
              <th scope="col" class="share-col">VOTE SHARE</th>
              <th scope="col" class="votes-column">TOTAL VOTES</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5" class="local-empty">No candidates selected.</td></tr>'}</tbody>
        </table>
      </div>
    </article>`;
  }).join('') || '<p class="local-empty">No results match these filters. Try another municipality or candidate.</p>';
  document.querySelectorAll('#groups-container .group-card').forEach((card, index) => {
    const action = actions[index];
    const mount = card.querySelector('.group-header-actions');
    createCandidateFilter({mount, card, categoryKey: action.categoryKey, title: action.contest.code, rows: action.matching, onChange: render});
    appendResultsPdf(mount, {contest: action.contest, rows: action.rows,
      columns: [{label: 'Ballot No.', value: (row) => row.ballot, total: false}],
      province: snapshot.province, municipality: area === 'all' ? '' : $('#municipality-select').selectedOptions[0].textContent,
      note: 'Official COC totals',
    });
  });
  window.scrollTo({top: scrollTop});
  window.lucide?.createIcons();
  $('#result-title').textContent = `${snapshot.province} · ${area === 'all' ? 'Local Results' : $('#municipality-select').selectedOptions[0].textContent}`;
  $('#result-message').textContent = `${visible} contests shown · Downloaded official 2025 COC totals`;
}

async function load() {
  const id = ++requestId;
  const province = $('#province-select').value;
  snapshot = null;
  municipalityResults = null;
  resetGeography();
  resetStatistics();
  $('#refresh-btn').disabled = true;
  $('#download-json').disabled = true;
  const provinceName = $('#province-select').selectedOptions[0]?.textContent || 'Sultan Kudarat';
  $('#result-title').textContent = `${provinceName} · Local Results`;
  $('#result-message').textContent = 'Loading official COMELEC JSON…';

  // Skeleton loading states for KPIs and results container
  for (const selector of ['#kpi-returns-val', '#kpi-votes-val', '#kpi-leader-val', '#kpi-parties-val']) {
    $(selector).className = 'kpi-value skeleton skeleton-text';
    $(selector).textContent = '...';
  }

  $('#groups-container').innerHTML = getLocalResultsSkeletonHtml();

  $('#coverage-warning').hidden = true;
  $('#municipality-select').innerHTML = '<option value="all">All cities / municipalities</option>';
  $('#municipality-select').value = 'all';

  try {
    const response = await fetch(`data/${province}.json`, {cache: 'no-store'});
    if (!response.ok) throw new Error(`Snapshot unavailable (${response.status}).`);
    const data = await response.json();
    let municipalData = null;
    if (viewMode === 'overview') {
      const municipalityResponse = await fetch(`data/breakdowns/${province}/municipalities.json`, {cache: 'no-store'});
      if (!municipalityResponse.ok) throw new Error('Municipal contest totals are unavailable.');
      municipalData = await municipalityResponse.json();
    }
    if (id !== requestId) return;
    municipalityResults = municipalData;
    if (data.code !== province || !Array.isArray(data.contests)) throw new Error('Invalid province snapshot.');
    snapshot = data;
    $('#municipality-select').innerHTML += data.municipalities.map((area) => `<option value="${escape(area.code)}">${escape(area.name)}</option>`).join('');
    const selectedMunicipality = new URLSearchParams(location.search).get('municipality');
    if (data.municipalities.some((area) => area.code === selectedMunicipality)) $('#municipality-select').value = selectedMunicipality;
    else if (['barangay', 'er'].includes(viewMode)) $('#municipality-select').value = data.municipalities[0]?.code || 'all';

    // Remove skeleton states on success
    for (const selector of ['#kpi-returns-val', '#kpi-votes-val', '#kpi-leader-val', '#kpi-parties-val']) {
      $(selector).classList.remove('skeleton', 'skeleton-text');
    }

    const municipalCodes = new Set(data.contests.filter((contest) => ['Mayor', 'Vice Mayor', 'Councilor'].includes(contest.position)).map((contest) => contest.area_code));
    const unavailable = data.unavailable || [];
    $('#coverage-warning').hidden = unavailable.length === 0;
    $('#coverage-warning').textContent = `Official municipal COC JSON unavailable for: ${unavailable.map((area) => area.name).join(', ')}. Their municipal results are not included. Provincial totals are taken directly from the provincial COC.`;
    const timestamp = new Date(data.downloaded_at).toLocaleString('en-PH', {timeZone: 'Asia/Manila'});
    $('#footer-updated-time').textContent = `Downloaded: ${timestamp} (Philippine time)`;
    $('#modal-source').innerHTML = '<a href="https://2025electionresults.comelec.gov.ph/dashboard" target="_blank" rel="noopener">COMELEC 2025 results dashboard</a>';
    $('#modal-files').textContent = `${1 + municipalCodes.size} province / municipal files`;
    $('#modal-timestamp').textContent = timestamp;
    $('#download-json').disabled = false;
    render();
  } catch (error) {
    if (id !== requestId) return;
    for (const selector of ['#kpi-returns-val', '#kpi-votes-val', '#kpi-leader-val', '#kpi-parties-val']) {
      $(selector).classList.remove('skeleton', 'skeleton-text');
      $(selector).textContent = '—';
    }
    $('#result-message').textContent = `Unable to load results. ${error.message} Use Refresh Data to retry.`;
    $('#footer-updated-time').textContent = '';
    showToast(`Error: ${error.message}`, 'error');
  } finally {
    if (id === requestId) $('#refresh-btn').disabled = false;
  }
}

// Global Centralized Toast Notifications
export { showToast };

$('#province-select').addEventListener('change', load);
$('#municipality-select').addEventListener('change', render);
$('#candidate-search').addEventListener('input', render);
$('#barangay-select').addEventListener('change', render);
document.addEventListener('geography-filter-close', render);
$('#refresh-btn').addEventListener('click', () => {
  load();
  showToast('Reloading live snapshot data...', 'info', 2000);
});
$('#download-json').addEventListener('click', () => {
  if (!snapshot) return;
  const payload = viewMode === 'overview' ? {...snapshot, municipality: $('#municipality-select').value, contests: overviewContests()} : geographyExport();
  if (!payload) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${snapshot.province.toLowerCase().replaceAll(' ', '-')}-2025.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('JSON snapshot downloaded successfully!', 'success');
});
const modal = $('#modal-backdrop');
let modalTrigger;
function closeModal() { modal.hidden = true; modalTrigger?.focus(); }
$('#info-modal-btn').addEventListener('click', (event) => { modalTrigger = event.currentTarget; modal.hidden = false; $('#modal-close-btn').focus(); });
for (const selector of ['#modal-close-btn', '#modal-cancel-btn']) $(selector).addEventListener('click', closeModal);
$('#modal-save-btn').addEventListener('click', async () => {
  const saveBtn = $('#modal-save-btn');
  const originalHtml = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Reloading...';
  try {
    closeModal();
    await load();
    showToast('Snapshot reloaded successfully!', 'success');
  } catch (err) {
    showToast('Failed to reload snapshot.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHtml;
  }
});
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => {
  if (modal.hidden) return;
  if (event.key === 'Escape') closeModal();
  if (event.key === 'Tab') {
    const controls = [...modal.querySelectorAll('button, a[href]')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
const initialParams = new URLSearchParams(location.search);
if (['6500000', '8700000', '8800000'].includes(initialParams.get('province'))) $('#province-select').value = initialParams.get('province');
$('#barangay-field').hidden = viewMode !== 'er';
if (viewMode !== 'overview') {
  const label = {municipality: 'By City/Municipality', barangay: 'By Barangay', er: 'By Election Result'}[viewMode];
  $('#page-title').textContent = `Halalan 2025 · ${label}`;
  document.title = `Halalan 2025 | ${label}`;
  document.querySelector('.brand-subtitle').textContent = 'Governor to Councilor · Geographic vote breakdown';
}
window.lucide?.createIcons();
load();

