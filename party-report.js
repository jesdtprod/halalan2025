import { showToast } from "./toast.js";

const report = JSON.parse(sessionStorage.getItem("bpe-party-report") || "null");
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]
  );

const PALETTE = [
  "#0038a8", // Halalan Philippine Royal Blue
  "#ce1126", // Halalan Flag Scarlet Red
  "#d97706", // Halalan Sun Gold & Stars
  "#0a1c42", // Halalan Deep Navy
  "#0284c7", // Sky Blue
  "#ea580c", // Deep Orange
  "#6366f1", // Indigo
  "#e11d48", // Crimson Rose
  "#0d9488", // Teal
  "#8b5cf6", // Violet
  "#2563eb", // Vibrant Blue
  "#10b981", // Mint
  "#f59e0b", // Warm Gold
  "#ec4899", // Pink
  "#64748b", // Slate Grey
];

function generatePieChartSvg(candidates, voteTotal) {
  if (!candidates.length || !voteTotal) return "";

  // Clean, focused donut dimensions
  const width = 440;
  const height = 440;
  const cx = 220;
  const cy = 220;
  const r = 190; // Bold prominent donut radius
  const innerR = 88; // Clean cutout ring

  let currentAngle = 0;
  const rawSlices = [];

  candidates.forEach((cand, index) => {
    const color = PALETTE[index % PALETTE.length];
    const share = voteTotal > 0 ? (cand.votes / voteTotal) * 100 : 0;
    const angle = (share / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const rad1 = ((startAngle - 90) * Math.PI) / 180;
    const rad2 = ((endAngle - 90) * Math.PI) / 180;

    const x1Out = cx + r * Math.cos(rad1);
    const y1Out = cy + r * Math.sin(rad1);
    const x2Out = cx + r * Math.cos(rad2);
    const y2Out = cy + r * Math.sin(rad2);

    const x1In = cx + innerR * Math.cos(rad2);
    const y1In = cy + innerR * Math.sin(rad2);
    const x2In = cx + innerR * Math.cos(rad1);
    const y2In = cy + innerR * Math.sin(rad1);

    const largeArc = angle > 180 ? 1 : 0;
    const pathD = `M ${x1Out.toFixed(2)} ${y1Out.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2Out.toFixed(2)} ${y2Out.toFixed(2)} L ${x1In.toFixed(2)} ${y1In.toFixed(2)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2In.toFixed(2)} ${y2In.toFixed(2)} Z`;

    rawSlices.push({
      candidate: cand,
      index,
      color,
      share,
      pathD,
    });
  });

  const sliceElements = rawSlices
    .map(
      (s) => `
      <path 
        d="${s.pathD}" 
        fill="${s.color}" 
        class="pie-slice" 
        data-party-idx="${s.index}"
        tabindex="0"
        role="graphics-symbol"
        aria-label="${escapeHtml(s.candidate.name)}: ${s.candidate.votes.toLocaleString()} votes, ${s.share.toFixed(1)}%"
      >
        <title>${escapeHtml(s.candidate.name)}: ${s.candidate.votes.toLocaleString()} votes (${s.share.toFixed(1)}%)</title>
      </path>
    `
    )
    .join("");

  return `
    <svg class="pie-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="pieShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.10"/>
        </filter>
      </defs>

      <!-- Donut Slices -->
      <g class="pie-slices-layer" filter="url(#pieShadow)">
        ${sliceElements}
      </g>

      <!-- Center Badge -->
      <g class="pie-center-badge" pointer-events="none">
        <circle cx="${cx}" cy="${cy}" r="${innerR - 2}" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
        <text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="22" font-weight="900" fill="#0f172a" letter-spacing="-0.02em">${voteTotal.toLocaleString()}</text>
        <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="11" font-weight="800" fill="#047857" letter-spacing="0.08em">TOTAL VOTES</text>
      </g>
    </svg>
  `;
}

if (!report) {
  document.body.innerHTML =
    '<main class="report-shell"><p class="empty-state">Open this report from the election dashboard.</p></main>';
} else {
  const candidates = [...report.candidates].sort(
    (a, b) => b.votes - a.votes || a.name.localeCompare(b.name)
  );
  const voteTotal = candidates.reduce(
    (total, candidate) => total + candidate.votes,
    0
  );
  const leader = candidates[0];
  const subjectPlural = report.categoryKey === "party_list" ? "Parties" : "Candidates";
  const leaderShare = voteTotal > 0 && leader ? ((leader.votes / voteTotal) * 100).toFixed(1) : "0.0";

  document.title = `${report.title} — Official Report`;
  document.querySelector("#report-title").textContent = report.title;
  document.querySelector("#report-generated").textContent = `Generated on ${report.generatedAt}`;
  document.querySelector("#party-count").textContent = candidates.length.toLocaleString();
  document.querySelector("#vote-total").textContent = voteTotal.toLocaleString();
  document.querySelector("#leading-party").textContent = leader?.name || "—";
  const leaderSub = document.querySelector("#leading-party-sub");
  if (leaderSub) {
    leaderSub.textContent = `${leaderShare}% of visible votes`;
  }

  // 1. Render Big Pie Chart & Modern Legend Grid
  const chartContainer = document.querySelector("#vote-chart");
  if (chartContainer) {
    const pieSvg = generatePieChartSvg(candidates, voteTotal);
    const legendRows = candidates
      .map((candidate, index) => {
        const color = PALETTE[index % PALETTE.length];
        const share = voteTotal ? (candidate.votes / voteTotal) * 100 : 0;
        const rank = candidate.rank || index + 1;

        let rankBadgeClass = "rank-pill-default";
        if (rank === 1) rankBadgeClass = "rank-pill-1";
        else if (rank === 2) rankBadgeClass = "rank-pill-2";
        else if (rank === 3) rankBadgeClass = "rank-pill-3";

        return `
          <tr class="legend-row" data-party-idx="${index}" style="--party-color: ${color};">
            <td class="td-rank">
              <span class="rank-pill ${rankBadgeClass}">#${rank}</span>
            </td>
            <td class="td-party">
              <div class="party-name-stack">
                <div class="party-title-line">
                  <span class="legend-swatch" style="background-color: ${color};"></span>
                  <span class="legend-party-name" title="${escapeHtml(candidate.name)}">${escapeHtml(candidate.name)}</span>
                </div>
                <span class="legend-ballot-pill">Ballot #${candidate.ballotOrder || "—"}</span>
              </div>
            </td>
            <td class="td-share">
              <div class="share-cell-compact">
                <span class="legend-share-badge" style="background-color: ${color}14; color: ${color}; border-color: ${color}30;">
                  ${share.toFixed(1)}%
                </span>
                <div class="legend-progress-track">
                  <div class="legend-progress-fill" style="width: ${share}%; background-color: ${color};"></div>
                </div>
              </div>
            </td>
            <td class="td-votes">
              <strong class="votes-number">${candidate.votes.toLocaleString()}</strong>
            </td>
          </tr>
        `;
      })
      .join("");

    chartContainer.innerHTML = `
      <div class="pie-chart-wrapper">
        ${pieSvg}
      </div>
      <div class="pie-legend-section">
        <div class="pie-legend-heading">
          <div class="legend-heading-left">
            <span class="legend-badge">All ${candidates.length} Parties</span>
            <span class="legend-note">Comprehensive vote share breakdown</span>
          </div>
        </div>
        <div class="legend-table-wrap">
          <table class="legend-table" aria-label="Political party vote share breakdown">
            <thead>
              <tr>
                <th scope="col" class="th-rank">Rank</th>
                <th scope="col" class="th-party">Political Party</th>
                <th scope="col" class="th-share">Vote Share</th>
                <th scope="col" class="th-votes">Votes</th>
              </tr>
            </thead>
            <tbody>
              ${legendRows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Interactive synchronized hover highlights between pie and legend
    chartContainer.querySelectorAll("[data-party-idx]").forEach((el) => {
      const idx = el.dataset.partyIdx;
      el.addEventListener("mouseenter", () => {
        chartContainer.querySelectorAll(`[data-party-idx="${idx}"]`).forEach((target) => {
          target.classList.add("is-highlighted");
        });
      });
      el.addEventListener("mouseleave", () => {
        chartContainer.querySelectorAll(`[data-party-idx="${idx}"]`).forEach((target) => {
          target.classList.remove("is-highlighted");
        });
      });
    });
  }

  // Initialize Lucide icons
  if (typeof window !== "undefined" && window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

document.querySelector("#print-report")?.addEventListener("click", () => {
  showToast("Preparing printable report...", "info", 2000);
  setTimeout(() => window.print(), 350);
});
