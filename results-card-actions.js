import { createBreakdownPdfExportButton } from './breakdown-pdf-export.js?v=20261017-final';

export function appendResultsPdf(mount, {contest, rows, columns = [], province, municipality = '', view = 'Local Results', note = ''}) {
  const safeName = `${province}-${municipality}-${contest.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const button = createBreakdownPdfExportButton({
    reportTitle: 'Halalan 2025 - Election Results',
    subtitle: `2025 National and Local Elections | ${view}${note ? ` | ${note}` : ''}`,
    scopeLabel: contest.position,
    tableTitle: contest.name,
    categoryKey: 'local', province, municipality, rows, columns,
    winningSeats: contest.winningSeats,
    filename: `${safeName}.pdf`,
    onError: (message) => { document.querySelector('#result-message').textContent = message; },
  });
  button.disabled = rows.length === 0;
  mount.append(button);
}
