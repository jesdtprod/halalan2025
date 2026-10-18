// ===========================================================================
// Breakdown PDF Export Engine - Executive Civic Edition
// Handles Political Party, Sectoral, and District Representative Tabulations
// ===========================================================================

import { getWinningSeats } from "./election-rules.js";
import { showToast } from "./toast.js";

function refreshLucide() {
  if (typeof window !== "undefined" && window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

export async function generateBreakdownPdfDoc({
  reportTitle = "Province Vote Breakdown",
  subtitle = "Political Party, District and Sectoral Tabulation by Province",
  scopeLabel = "Provincial Returns",
  tableTitle = "Vote Breakdown",
  categoryKey = "",
  province = "",
  municipality = "",
  rows = [],
  columns = [],
  groups = null,
  winningSeats = null,
}) {
  const JsPdf = window.jspdf?.jsPDF;
  if (!JsPdf) {
    throw new Error("PDF export engine is unavailable. Please check that jsPDF is loaded.");
  }

  // 1. Contest Category Identification
  const isLocal = categoryKey === "local";
  const isDistrict = categoryKey === "district";
  const isParty = categoryKey === "party_list" || (!isDistrict && tableTitle.toLowerCase().includes("party"));
  const isSectoral = categoryKey === "sectoral" || (!isDistrict && !isParty);

  // Tailored Titles & Document References
  const effectiveReportTitle = isParty
    ? (reportTitle || "Political Party Vote Breakdown")
    : isSectoral
    ? (reportTitle || `${tableTitle} — Tabulation`)
    : (reportTitle || `${tableTitle}`);

  const effectiveSubtitle = subtitle || (
    isParty
      ? "Bangsamoro Parliamentary Elections 2026 • Official Party-List Tabulation"
      : isSectoral
      ? "Bangsamoro Parliamentary Elections 2026 • Official Sectoral Tabulation"
      : "Bangsamoro Parliamentary Elections 2026 • Official Legislative District Tabulation"
  );

  const effectiveScopeBadge = (scopeLabel || (
    isParty ? "PARTY-LIST TABULATION" : isSectoral ? "SECTORAL TABULATION" : "DISTRICT TABULATION"
  )).toUpperCase();

  const docRef = isLocal ? "HALALAN2025-LOCAL" : isParty
    ? "BPE2026-ER-PARTY"
    : isSectoral
    ? "BPE2026-ER-SECTORAL"
    : "BPE2026-ER-DISTRICT";

  const candidateColHeader = isLocal ? "Candidate" : isParty
    ? "Political Party"
    : isSectoral
    ? "Candidate / Sectoral Nominee"
    : "District Candidate";

  const entityLabel = isLocal ? "Candidates" : isParty
    ? "Political Parties"
    : isSectoral
    ? "Sectoral Nominees"
    : "District Candidates";

  // 2. Geographic Scope description & Winning Seats
  const effectiveWinningSeats = winningSeats || getWinningSeats({
    position: scopeLabel,
    name: tableTitle,
    area: municipality || province,
  });

  let geoScopeVal = "Territorial Coverage";
  let geoScopeSub = "Official COMELEC Return Coverage";
  if (municipality) {
    geoScopeVal = municipality.toUpperCase();
    geoScopeSub = province ? `Province of ${province} • Municipal Tabulation` : "Municipal Jurisdiction Tabulation";
  } else if (province) {
    geoScopeVal = `${province.toUpperCase()} PROVINCE`;
    geoScopeSub = "Provincial Territorial Tabulation";
  } else if (columns.length > 0) {
    geoScopeVal = `${columns.length} Reporting Units`;
    geoScopeSub = "Regional Tabulation Coverage";
  }

  // 3. Document Setup (A4 Landscape = 841.89 pt x 595.28 pt)
  const doc = new JsPdf({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // 4. Executive Civic Palette Tokens - Halalan 2025
  const C_PRIMARY = [0, 56, 168];      // Halalan Philippine Blue #0038A8
  const C_PRIMARY_DARK = [0, 41, 122];  // Deep Navy #00297A
  const C_RED = [206, 17, 38];         // Halalan Flag Red #CE1126
  const C_GOLD = [217, 119, 6];        // Halalan Sun Gold #D97706
  const C_SLATE_900 = [15, 23, 42];    // Primary text #0f172a
  const C_SLATE_700 = [51, 65, 85];    // Dark text #334155
  const C_SLATE_500 = [100, 116, 139]; // Muted text #64748b
  const C_SLATE_400 = [148, 163, 184]; // Secondary muted #94a3b8
  const C_BG_CARD = [248, 250, 252];   // Light card fill #f8fafc
  const C_BORDER = [226, 232, 240];    // Crisp border #e2e8f0

  // 5. Load Official Halalan Logo as PNG data URL for reliable jsPDF rendering
  let logoDataUrl = null;
  if (typeof window !== "undefined" && window.document) {
    try {
      const img = new Image();
      img.src = "assets/halalan2025-logo.webp";
      await new Promise((resolve) => { img.onload = img.onerror = resolve; });
      if (img.naturalWidth) {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        logoDataUrl = canvas.toDataURL("image/png");
      }
    } catch (e) {
      console.warn("Logo loading notice:", e);
    }
  }

  const nowFormatted = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Helper: Draw Main Executive Header on Page 1
  function drawPage1Header() {
    // Top Civic Stripes - Halalan 2025 Tri-Color (Blue 60%, Red 22%, Gold 18%)
    doc.setFillColor(...C_PRIMARY);
    doc.rect(0, 0, pageWidth * 0.60, 3.5, "F");
    doc.setFillColor(...C_RED);
    doc.rect(pageWidth * 0.60, 0, pageWidth * 0.22, 3.5, "F");
    doc.setFillColor(...C_GOLD);
    doc.rect(pageWidth * 0.82, 0, pageWidth * 0.18, 3.5, "F");

    const headerTopY = 16;
    const logoW = 66;
    const logoH = 41;
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", margin, headerTopY + 1, logoW, logoH);
    }

    const brandX = margin + logoW + 14;

    // Eyebrow Badge 1: COMELEC OFFICIAL SNAPSHOT
    const badge1Text = "COMELEC OFFICIAL SNAPSHOT";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    const b1TextWidth = doc.getTextWidth(badge1Text);
    const b1Width = b1TextWidth + 12;
    const b1Height = 13;
    const badgeY = headerTopY + 1;

    doc.setFillColor(238, 245, 255);
    doc.setDrawColor(189, 212, 238);
    doc.setLineWidth(0.6);
    doc.roundedRect(brandX, badgeY, b1Width, b1Height, 2.5, 2.5, "FD");
    doc.setTextColor(...C_PRIMARY);
    doc.text(badge1Text, brandX + 6, badgeY + 9);

    // Eyebrow Badge 2: Scope Label
    const b2TextWidth = doc.getTextWidth(effectiveScopeBadge);
    const b2X = brandX + b1Width + 6;
    const b2Width = b2TextWidth + 18;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...C_BORDER);
    doc.roundedRect(b2X, badgeY, b2Width, b1Height, 2.5, 2.5, "FD");
    doc.setFillColor(...C_PRIMARY);
    doc.circle(b2X + 6.5, badgeY + 6.5, 2, "F");
    doc.setTextColor(...C_SLATE_700);
    doc.text(effectiveScopeBadge, b2X + 12, badgeY + 9);

    // Main Report Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...C_SLATE_900);
    doc.text(effectiveReportTitle, brandX, headerTopY + 27);

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C_SLATE_500);
    doc.text(doc.splitTextToSize(effectiveSubtitle, pageWidth - margin - 200 - brandX).slice(0, 2), brandX, headerTopY + 39);

    // Right-Side Executive Meta Box
    const metaCardWidth = 190;
    const metaCardHeight = 42;
    const metaCardX = pageWidth - margin - metaCardWidth;
    const metaCardY = headerTopY;

    doc.setFillColor(...C_BG_CARD);
    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.6);
    doc.roundedRect(metaCardX, metaCardY, metaCardWidth, metaCardHeight, 3, 3, "FD");

    doc.setFillColor(...C_PRIMARY);
    doc.rect(metaCardX, metaCardY, metaCardWidth, 2.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...C_SLATE_400);
    doc.text("DOCUMENT REF", metaCardX + 9, metaCardY + 12);
    doc.setTextColor(...C_SLATE_900);
    doc.text(docRef, metaCardX + metaCardWidth - 9, metaCardY + 12, { align: "right" });

    doc.setTextColor(...C_SLATE_400);
    doc.text("TIMESTAMP", metaCardX + 9, metaCardY + 23);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_SLATE_700);
    doc.text(nowFormatted, metaCardX + metaCardWidth - 9, metaCardY + 23, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_SLATE_400);
    doc.text("DATA SOURCE", metaCardX + 9, metaCardY + 34);
    doc.setTextColor(...C_PRIMARY);
    doc.text("Official COMELEC COC Totals", metaCardX + metaCardWidth - 9, metaCardY + 34, { align: "right" });
  }

  // Helper: Draw Compact Running Header on Subsequent Pages
  function drawRunningHeader(groupTitle = "") {
    doc.setFillColor(...C_PRIMARY);
    doc.rect(0, 0, pageWidth * 0.60, 3.5, "F");
    doc.setFillColor(...C_RED);
    doc.rect(pageWidth * 0.60, 0, pageWidth * 0.22, 3.5, "F");
    doc.setFillColor(...C_GOLD);
    doc.rect(pageWidth * 0.82, 0, pageWidth * 0.18, 3.5, "F");

    const headerTopY = 12;
    const logoW = 44;
    const logoH = 27;
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", margin, headerTopY, logoW, logoH);
    }

    const brandX = margin + logoW + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...C_SLATE_900);
    doc.text(effectiveReportTitle, brandX, headerTopY + 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C_SLATE_500);
    doc.text(doc.splitTextToSize(groupTitle || effectiveSubtitle, pageWidth - margin - 200 - brandX).slice(0, 2), brandX, headerTopY + 22);

    // Right-side reference text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...C_SLATE_400);
    doc.text(`${docRef} • ${nowFormatted}`, pageWidth - margin, headerTopY + 14, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C_PRIMARY);
    doc.text("COMELEC OFFICIAL SNAPSHOT", pageWidth - margin, headerTopY + 24, { align: "right" });
  }

  // Draw Page 1 Main Header
  drawPage1Header();

  // 6. Executive KPI Metric Cards (Page 1 Only - 3 Balanced Cards with High Visual Impact)
  const grandTotalVotes = rows.reduce((sum, r) => sum + Number(r.total || 0), 0);
  const topEntity = rows[0];
  const topEntityVotes = Number(topEntity?.total || 0);
  const topEntityShare = topEntity?.share ?? (grandTotalVotes > 0
    ? ((topEntityVotes / grandTotalVotes) * 100).toFixed(1) + "%"
    : "0.0%");

  const kpiCards = [
    {
      label: "TOTAL VOTES TABULATED",
      value: grandTotalVotes.toLocaleString(),
      sub: "Across all tabulated units",
      accentColor: C_PRIMARY,
    },
    {
      label: isParty ? "TOP POLITICAL PARTY" : "TOP DISPLAYED CANDIDATE",
      value: topEntity ? topEntity.name : "—",
      sub: `${topEntityVotes.toLocaleString()} votes (${topEntityShare})`,
      accentColor: C_GOLD,
    },
    {
      label: "GEOGRAPHIC SCOPE",
      value: geoScopeVal,
      sub: geoScopeSub,
      accentColor: C_PRIMARY_DARK,
    },
  ];

  const kpiY = 66;
  const kpiH = 39;
  const kpiGap = 10;
  const kpiW = (contentWidth - (kpiCards.length - 1) * kpiGap) / kpiCards.length;

  kpiCards.forEach((kpi, idx) => {
    const kX = margin + idx * (kpiW + kpiGap);
    doc.setFillColor(...C_BG_CARD);
    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.6);
    doc.roundedRect(kX, kpiY, kpiW, kpiH, 3, 3, "FD");

    doc.setFillColor(...kpi.accentColor);
    doc.rect(kX, kpiY, kpiW, 2.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...C_SLATE_500);
    doc.text(kpi.label, kX + 10, kpiY + 12);

    // Auto-fit font size so no value ever clips or truncates
    let valFontSize = 10.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(valFontSize);
    while (doc.getTextWidth(kpi.value) > (kpiW - 20) && valFontSize > 6.8) {
      valFontSize -= 0.3;
      doc.setFontSize(valFontSize);
    }
    doc.setTextColor(...C_SLATE_900);
    doc.text(kpi.value, kX + 10, kpiY + 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C_SLATE_400);
    doc.text(kpi.sub, kX + 10, kpiY + 34);
  });

  // 7. Determine Groups to Tabulate
  // If groups provided (e.g. barangays in election returns), each group starts on a new page (group 0 on page 1).
  // If groups not provided, columns are treated as 1 single group.
  let effectiveGroups = [];
  if (Array.isArray(groups) && groups.length > 0) {
    effectiveGroups = groups;
  } else {
    let effectiveCols = columns;
    if (isDistrict) {
      const activeCols = columns.filter((col) =>
        rows.some((row) => {
          const val = typeof col.value === "function" ? col.value(row) : row[col.label];
          return Number(val || 0) > 0;
        })
      );
      if (activeCols.length > 0) {
        effectiveCols = activeCols;
      } else {
        const matched = columns.find((col) => tableTitle.toLowerCase().includes(col.label.toLowerCase()));
        if (matched) effectiveCols = [matched];
      }
    }
    effectiveGroups = [{
      name: isLocal ? tableTitle : municipality ? `Municipality of ${municipality}` : (province ? `Province of ${province}` : ""),
      columns: effectiveCols,
    }];
  }

  // 8. Tabulate Each Group with Column Chunking & Page Flow
  const MAX_COLS_PER_BATCH = 6; // Fits comfortably in A4 Landscape without column squeezing

  for (let gIdx = 0; gIdx < effectiveGroups.length; gIdx++) {
    const group = effectiveGroups[gIdx];
    const groupName = group.name || "";
    const groupCols = group.columns || [];

    // Filter columns for district if needed
    let renderCols = groupCols;
    if (isDistrict) {
      const activeCols = groupCols.filter((col) =>
        rows.some((row) => {
          const val = typeof col.value === "function" ? col.value(row) : row[col.label];
          return Number(val || 0) > 0;
        })
      );
      if (activeCols.length > 0) renderCols = activeCols;
    }

    // Chunk columns into batches of max 6 columns ("extend it below")
    const batches = [];
    if (renderCols.length <= 7) {
      batches.push(renderCols);
    } else {
      for (let i = 0; i < renderCols.length; i += MAX_COLS_PER_BATCH) {
        batches.push(renderCols.slice(i, i + MAX_COLS_PER_BATCH));
      }
    }

    // "every new municipality of barangay new pages"
    if (gIdx > 0) {
      doc.addPage();
      drawRunningHeader(groupName);
    }

    // Group Banner Header
    let currentY = gIdx === 0 ? 114 : 48;

    if (groupName) {
      doc.setFillColor(...C_BG_CARD);
      doc.setDrawColor(...C_BORDER);
      doc.setLineWidth(0.6);
      const bannerLines = isLocal ? doc.splitTextToSize(groupName.toUpperCase(), contentWidth - 140).slice(0, 2) : [groupName.toUpperCase()];
      const bannerHeight = 22 + (bannerLines.length - 1) * 10;
      doc.roundedRect(margin, currentY, contentWidth, bannerHeight, 3, 3, "FD");

      doc.setFillColor(...C_PRIMARY);
      doc.rect(margin, currentY, 3, bannerHeight, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...C_SLATE_900);
      const upperName = groupName.toUpperCase();
      const groupBannerLabel = isLocal ? bannerLines : upperName.startsWith("BARANGAY") || upperName.startsWith("MUNICIPALITY") || upperName.startsWith("PROVINCE")
        ? upperName
        : `BARANGAY: ${upperName}`;
      doc.text(groupBannerLabel, margin + 10, currentY + 14.5);

      const colCountLabel = isLocal
        ? `${rows.length} Official Candidates • COC Totals`
        : `${renderCols.length} Tabulated ${renderCols.length === 1 ? "Unit" : "Units"}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C_SLATE_500);
      doc.text(colCountLabel, pageWidth - margin - 10, currentY + 14.5, { align: "right" });

      currentY += bannerHeight + 6;
    } else if (gIdx === 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...C_SLATE_900);
      doc.text(tableTitle, margin, currentY + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C_SLATE_500);
      doc.text(
        `Official breakdown • Sorted by Total Votes • ${rows.length} Entries`,
        pageWidth - margin,
        currentY + 8,
        { align: "right" }
      );
      currentY += 16;
    }

    // Render Batches for this Group
    for (let bIdx = 0; bIdx < batches.length; bIdx++) {
      const batchCols = batches[bIdx];
      const isMultiBatch = batches.length > 1;

      // Check vertical space for extending below
      const estimatedTableHeight = 22 + 20 + rows.length * 15;
      const neededHeight = isMultiBatch ? estimatedTableHeight + 18 : estimatedTableHeight;
      const bottomLimit = pageHeight - 38;
      const lastTableBottom = doc.lastAutoTable ? doc.lastAutoTable.finalY : currentY;

      let startY;
      if (bIdx === 0) {
        startY = currentY;
      } else {
        // "make it work if not fit in the paper size extend it below"
        if (lastTableBottom + neededHeight <= bottomLimit) {
          // Fits on current page: extend below!
          startY = lastTableBottom + 18;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(...C_SLATE_700);
          const rangeLabel = `${batchCols[0].label} – ${batchCols[batchCols.length - 1].label}`;
          doc.text(`Extension (Part ${bIdx + 1} of ${batches.length}): ${rangeLabel}`, margin, startY - 5);
        } else {
          // Not enough vertical space: add new page and start at top!
          doc.addPage();
          drawRunningHeader(groupName);
          startY = 54;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(...C_SLATE_700);
          const rangeLabel = `${batchCols[0].label} – ${batchCols[batchCols.length - 1].label}`;
          doc.text(`Extension (Part ${bIdx + 1} of ${batches.length}): ${rangeLabel}`, margin, startY - 5);
        }
      }

      const isLastGrid = (gIdx === effectiveGroups.length - 1) && (bIdx === batches.length - 1);

      // Format batch column headers
      const formattedBatchCols = batchCols.map((col) => {
        let label = col.label || "";
        if (label === "Special Geographic Area") label = "Special Geo. Area";
        return { ...col, label };
      });

      const tableHead = isLastGrid
        ? [["#", candidateColHeader, ...formattedBatchCols.map((col) => col.label), "Total Votes", "Share"]]
        : [["#", candidateColHeader, ...formattedBatchCols.map((col) => col.label)]];

      const tableBody = rows.map((row, idx) => {
        const rank = row.rank ?? idx + 1;
        const total = Number(row.total || 0);
        const share = row.share ?? (grandTotalVotes > 0
          ? ((total / grandTotalVotes) * 100).toFixed(1) + "%"
          : "0.0%");

        const cells = [
          rank.toString(),
          row.name,
          ...formattedBatchCols.map((col) => {
            const val = typeof col.value === "function" ? col.value(row) : row[col.label];
            return isLocal && val == null ? "—" : Number(val || 0).toLocaleString();
          }),
        ];

        if (isLastGrid) {
          cells.push(total.toLocaleString(), share);
        }

        return cells;
      });

      const batchColTotals = formattedBatchCols.map((col) =>
        col.total === false ? "" : rows.reduce((sum, r) => {
          const val = typeof col.value === "function" ? col.value(r) : r[col.label];
          return sum + Number(val || 0);
        }, 0)
      );

      const footCells = [
        "",
        "Total Tabulated Votes",
        ...batchColTotals.map((t) => t === "" ? "" : t.toLocaleString()),
      ];

      if (isLastGrid) {
        footCells.push(
          grandTotalVotes.toLocaleString(),
          rows.some((row) => row.share != null) ? `${rows.reduce((sum, row) => sum + parseFloat(row.share || 0), 0).toFixed(2)}%` : "100.0%"
        );
      }

      const tableFoot = [footCells];

      const colRankW = 28;
      const colTotalW = 74;
      const colShareW = 46;
      const numBatchCols = formattedBatchCols.length;
      let colNameW;
      let batchColWidth = 0;

      if (isLastGrid) {
        // Summary grid: includes Total Votes (74pt) and Share (46pt)
        if (numBatchCols === 0) {
          colNameW = contentWidth - colRankW - colTotalW - colShareW;
        } else if (numBatchCols === 1) {
          batchColWidth = 55;
          colNameW = contentWidth - colRankW - colTotalW - colShareW - batchColWidth;
        } else {
          const maxForRemaining = contentWidth - colRankW - colTotalW - colShareW;
          colNameW = Math.max(260, Math.min(350, maxForRemaining - numBatchCols * 55));
          batchColWidth = (maxForRemaining - colNameW) / numBatchCols;
        }
      } else {
        // Intermediate grid: NO Total Votes and NO Share columns
        // Available width = contentWidth - colRankW (741.89pt)
        if (numBatchCols === 0) {
          colNameW = contentWidth - colRankW;
        } else {
          const maxForRemaining = contentWidth - colRankW;
          colNameW = Math.max(260, Math.min(350, maxForRemaining - numBatchCols * 70));
          batchColWidth = (maxForRemaining - colNameW) / numBatchCols;
        }
      }

      const columnStylesConfig = {
        0: { cellWidth: colRankW, halign: "center", fontStyle: "bold" },
        1: { cellWidth: colNameW, halign: "left", fontStyle: "bold" },
      };

      formattedBatchCols.forEach((col, i) => {
        const isBallot = col.label && col.label.toLowerCase().includes("ballot");
        columnStylesConfig[2 + i] = { cellWidth: batchColWidth, halign: isBallot ? "center" : "right" };
      });

      if (isLastGrid) {
        const totalColIdx = 2 + formattedBatchCols.length;
        const shareColIdx = totalColIdx + 1;

        columnStylesConfig[totalColIdx] = {
          cellWidth: colTotalW,
          halign: "right",
          fontStyle: "bold",
          textColor: C_PRIMARY_DARK,
        };
        columnStylesConfig[shareColIdx] = {
          cellWidth: colShareW,
          halign: "right",
          fontStyle: "bold",
          textColor: C_SLATE_500,
        };
      }

      // Draw autoTable with sequence badges
      doc.autoTable({
        startY,
        head: tableHead,
        body: tableBody,
        foot: tableFoot,
        theme: "plain",
        margin: { left: margin, right: margin, bottom: 32 },
        styles: {
          font: "helvetica",
          fontSize: 7.5,
          cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
          textColor: C_SLATE_900,
          lineColor: [241, 245, 249],
          lineWidth: 0.5,
          valign: "middle",
          overflow: "ellipsize",
        },
        headStyles: {
          fillColor: C_PRIMARY_DARK,
          textColor: 255,
          fontStyle: "bold",
          fontSize: 7.5,
          cellPadding: { top: 6, bottom: 6, left: 5, right: 5 },
          lineColor: C_PRIMARY_DARK,
          lineWidth: 0,
        },
        alternateRowStyles: {
          fillColor: C_BG_CARD,
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: C_SLATE_900,
          fontStyle: "bold",
          fontSize: 7.5,
          lineColor: [203, 213, 225],
          lineWidth: { top: 1, bottom: 0.5 },
          cellPadding: { top: 6, bottom: 6, left: 5, right: 5 },
        },
        columnStyles: columnStylesConfig,
        didParseCell: (data) => {
          const numBatchDataCols = 2 + formattedBatchCols.length;
          if (data.section === "head") {
            if (data.column.index === 0) data.cell.styles.halign = "center";
            else if (data.column.index === 1) data.cell.styles.halign = "left";
            else if (data.column.index >= 2 && data.column.index < numBatchDataCols) {
              const colDef = formattedBatchCols[data.column.index - 2];
              const isBallot = colDef?.label && colDef.label.toLowerCase().includes("ballot");
              data.cell.styles.halign = isBallot ? "center" : "right";
            } else {
              data.cell.styles.halign = "right";
            }
          }
          if (data.section === "body" && data.column.index === 0) {
            data.cell.text = [];
          }
          if (data.section === "body" && data.column.index === 1) {
            // Strictly enforce 1-line candidate name
            const rawText = Array.isArray(data.cell.text) ? data.cell.text.join(" ") : String(data.cell.text || "");
            const cleanLine = rawText.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
            data.cell.text = [cleanLine];

            // Dynamically scale font size if candidate text is long so it NEVER wraps onto line 2
            const cellInnerW = (data.column.width || colNameW) - 10;
            doc.setFont("helvetica", "bold");
            let fs = 7.5;
            doc.setFontSize(fs);
            while (doc.getTextWidth(cleanLine) > cellInnerW && fs > 6.0) {
              fs -= 0.3;
              doc.setFontSize(fs);
            }
            data.cell.styles.fontSize = fs;
          }
          if (data.section === "body" && data.column.index >= 2 && data.column.index < numBatchDataCols) {
            const colDef = formattedBatchCols[data.column.index - 2];
            if (colDef?.label && colDef.label.toLowerCase().includes("ballot")) {
              data.cell.styles.halign = "center";
            }
          }
          if (data.section === "foot") {
            if (data.column.index >= 2) data.cell.styles.halign = "right";
          }
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            const rowObj = rows[data.row.index];
            const rank = rowObj?.rank ?? (data.row.index + 1);
            const isWinner = rowObj?.isWinner ?? (rank <= effectiveWinningSeats);

            const badgeW = 16;
            const badgeH = 12.5;
            const bx = data.cell.x + (data.cell.width - badgeW) / 2;
            const by = data.cell.y + (data.cell.height - badgeH) / 2;

            if (isWinner) {
              let bg, border, textCol;
              if (rank === 1) {
                bg = [254, 240, 138];     // Radiant Minted Gold #fef08a
                border = [202, 138, 4];   // Polished Gold Border #ca8a04
                textCol = [113, 63, 18];  // Deep Gold #713f12
              } else {
                bg = [224, 242, 254];     // Halalan Sky Blue #e0f2fe
                border = [56, 148, 224];  // Blue Border
                textCol = [3, 105, 161];  // Deep Sky Blue #0369a1
              }

              doc.setFillColor(...bg);
              doc.setDrawColor(...border);
              doc.setLineWidth(0.65);
              doc.roundedRect(bx, by, badgeW, badgeH, 3, 3, "FD");

              doc.setFont("helvetica", "bold");
              doc.setFontSize(6.8);
              doc.setTextColor(...textCol);
              doc.text(String(rank), bx + badgeW / 2, by + badgeH / 2 + 2.4, { align: "center" });
            } else {
              // Non-winner: clean subtle plain number (only winners get badges)
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7.2);
              doc.setTextColor(...C_SLATE_500);
              doc.text(String(rank), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 2.5, { align: "center" });
            }
          }
        },
      });
    }
  }

  // 9. Standardized Executive Running Page Footers Across All Pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pHeight = doc.internal.pageSize.getHeight();
    const pWidth = doc.internal.pageSize.getWidth();

    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.75);
    doc.line(margin, pHeight - 22, pWidth - margin, pHeight - 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C_SLATE_400);
    doc.text(
      "COMELEC 2025 Downloaded Results - Halalan 2025 - Available / Filtered Entries",
      margin,
      pHeight - 12
    );

    doc.text(
      `Page ${p} of ${totalPages} - Downloaded Results Report`,
      pWidth - margin,
      pHeight - 12,
      { align: "right" }
    );

    // Bottom Halalan Tri-Color Accent Line
    doc.setFillColor(...C_PRIMARY);
    doc.rect(margin, pHeight - 5, contentWidth - 140, 2, "F");
    doc.setFillColor(...C_RED);
    doc.rect(margin + contentWidth - 140, pHeight - 5, 70, 2, "F");
    doc.setFillColor(...C_GOLD);
    doc.rect(margin + contentWidth - 70, pHeight - 5, 70, 2, "F");
  }

  return doc;
}

export function createBreakdownPdfExportButton({
  reportTitle = "Province Vote Breakdown",
  subtitle = "Political Party, District and Sectoral Tabulation by Province",
  scopeLabel = "Provincial Returns",
  tableTitle = "Vote Breakdown",
  categoryKey = "",
  province = "",
  municipality = "",
  rows = [],
  columns = [],
  groups = null,
  winningSeats = null,
  filename = "vote-breakdown.pdf",
  onError,
  onSuccess,
}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-ghost btn-icon-only party-filter-button party-report-button";
  button.title = `Export ${tableTitle} as PDF`;
  button.setAttribute("aria-label", `Export ${tableTitle} as PDF`);
  const defaultIconHtml = '<i data-lucide="download" aria-hidden="true"></i>';
  button.innerHTML = defaultIconHtml;

  button.onclick = async () => {
    button.disabled = true;
    button.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span>';

    try {
      const doc = await generateBreakdownPdfDoc({
        reportTitle,
        subtitle,
        scopeLabel,
        tableTitle,
        categoryKey,
        province,
        municipality,
        rows,
        columns,
        groups,
        winningSeats,
      });

      const safeFilename = filename || `${tableTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
      doc.save(safeFilename);

      const successMsg = `${tableTitle} PDF exported successfully!`;
      showToast(successMsg, "success");
      if (onSuccess) {
        onSuccess(successMsg);
      }
    } catch (err) {
      console.error("PDF export error:", err);
      const errMsg = err.message || "Failed to generate PDF. Please try again.";
      showToast(errMsg, "error");
      if (onError) onError(errMsg);
    } finally {
      button.disabled = false;
      button.innerHTML = defaultIconHtml;
      refreshLucide();
    }
  };

  // Ensure Lucide icon renders
  if (typeof window !== "undefined" && window.lucide?.createIcons) {
    requestAnimationFrame(() => window.lucide.createIcons());
  }

  return button;
}
