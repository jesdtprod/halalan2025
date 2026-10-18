# Halalan 2025

Static local election dashboard using downloaded JSON from the official [COMELEC 2025 results site](https://2025electionresults.comelec.gov.ph/dashboard).

The landing page supports Sultan Kudarat (default), Maguindanao del Norte and Maguindanao del Sur. Contests cover Governor, Vice Governor, Provincial Board Member, House Representative, Mayor, Vice Mayor and Councilor. Supabase is not used by the landing page.

Refresh the saved official JSON from the repository root on Windows:

```powershell
python scripts/download-results.py
```

Province snapshots are `data/6500000.json`, `data/8700000.json` and `data/8800000.json`. Original source responses are saved under `data/source/`. A failed province download stops the script; unavailable municipal sources are recorded in the snapshot and displayed in a coverage notice. The current Maguindanao del Sur snapshot excludes municipal results for Datu Salibo because its official COC endpoint returns HTTP 403.

Run locally:

Double-click `start-local.bat` to start the server and open the dashboard. Keep its window open while using the site. Alternatively:

```powershell
python -m http.server 8085 --bind 127.0.0.1
```

Open http://localhost:8085. Refresh Data reloads the saved snapshot; run the downloader again to update the files. The displayed download timestamp is not the source publication time. Vote shares and ranks are calculated within each complete contest, even when searching. Rankings are not declarations of winners.

The draggable Halalan floating icon opens All Contests, By City/Municipality, By Barangay and By Election Result. Navigation preserves the selected province, municipality. All breakdown pages use shared styles and a shared controller. Each results card provides the BPE candidate checkbox filter and an adjacent PDF download icon. PDFs use the Halalan logo and include only the selected candidates and displayed geographic columns. PDF libraries are bundled locally.

Build or retry the geographic breakdowns:

```powershell
python scripts/download-breakdowns.py
```

The downloader retains valid source JSON, discovers barangays and precincts, and writes one compact precinct matrix per municipality under `data/breakdowns/<province>/`. Barangay totals aggregate each distinct precinct once. City/municipality matrices use official municipal COC totals; barangay and election-result matrices use ER totals. Missing files are listed in each snapshot and shown in the UI. ER totals may differ from COC totals.

The earlier BARMM 2026 JavaScript controllers and Supabase migration files are legacy files and are not loaded by the active pages.

The four stat cards follow the selected province or city/municipality: Registered Voters, Total Cast Votes, Published ERs, and Entries (candidate entries across Governor-to-Councilor contests). Voter totals sum distinct published precinct ERs; unavailable returns are excluded. Rebuild these cards from saved files with `python scripts/build-statistics.py`; the breakdown downloader also runs this step automatically.
