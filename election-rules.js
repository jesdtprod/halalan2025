// ==========================================================================
// Halalan 2025 Local Election Quotas & Seat Allocations
// ==========================================================================

/**
 * Returns the number of elected seats (winners) for a given local contest.
 * - Governor: 1
 * - Vice Governor: 1
 * - Congressman or Woman (House Representative): 1
 * - SBoard Member or SP (Sangguniang Panlalawigan): 5 each district
 * - Mayor: 1
 * - Vice Mayor: 1
 * - Councilor (Sangguniang Bayan / Panlungsod): 8 in regular municipalities, 10 in Tacurong City (and other chartered cities)
 */
export function getWinningSeats(contest) {
  if (!contest) return 1;
  const pos = (contest.position || '').toLowerCase();
  const name = (contest.name || '').toLowerCase();
  const area = (contest.area || '').toLowerCase();

  // 1. Governor & Vice Governor: 1 seat
  if (pos.includes('vice governor') || pos.includes('vice-governor') || name.includes('vice-governor')) return 1;
  if (pos.includes('governor') || name.includes('governor')) return 1;

  // 2. Congressman or Woman (House Representative): 1 seat
  if (pos.includes('representative') || name.includes('house of representatives') || name.includes('congressman')) return 1;

  // 3. SBoard Member or SP (Sangguniang Panlalawigan / Provincial Board Member): 5 each district
  if (pos.includes('board member') || name.includes('sangguniang panlalawigan') || pos.includes('provincial board')) return 5;

  // 4. Mayor & Vice Mayor: 1 seat
  if (pos.includes('vice mayor') || pos.includes('vice-mayor') || name.includes('vice-mayor')) return 1;
  if (pos.includes('mayor') || name.includes('mayor')) return 1;

  // 5. Councilor (Sangguniang Bayan / Sangguniang Panlungsod):
  if (pos.includes('councilor') || name.includes('sangguniang bayan') || name.includes('sangguniang panlungsod')) {
    // In Tacurong City: 10 (Also other cities with Sangguniang Panlungsod)
    if (name.includes('tacurong') || area.includes('tacurong') || name.includes('sangguniang panlungsod') || name.includes('city of')) {
      return 10;
    }
    // Municipalities: 8
    return 8;
  }

  // Fallback: 1 seat
  return 1;
}
