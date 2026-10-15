# Assignment checklist

Authority: `~/Desktop/Requirement.pdf`, 14-page SmartFarm Crop IoT Dashboard assignment, read 2026-10-15. Supporting slides: `~/Downloads/Cloud-Based-Web_Slide.pdf`. The earlier named assignment copy was not found; Requirement.pdf is the user-designated authority.

Statuses: missing; partial; implemented (code exists, required runtime evidence outstanding); verified (stated checks executed). Rubric rows below cover all marking items; remaining acceptance scenarios are listed separately.

| Requirement / rubric item | Location | Verification and current status |
| --- | --- | --- |
| A1 React → Express (4) | frontend/vite.config.js, services/api.js | Verified: HTTP proxy returns SQLite rows; Chrome loads three cards at 5184 → 3101 |
| A2 Express JSON (4) | backend/app.js | Verified for CRUD and sensor failure contracts by backend tests; unexpected DB-failure test outstanding |
| A3 Exact schema, seeds, persistence (4), §6/17 | backend/db.js | Verified: CRUD tests and temporary-file close/reopen test; no duplicate seeds, nonempty table preserved, empty table seeded without Maize |
| A4 Read/validate raw feed (4), §7/8/13 | backend/sensor-data.js, app.js | Verified: tests exercise replacement, malformed JSON, missing file/field, wrong count, duplicate timestamp, recovery and POST failure with invalid feed |
| A5 Loading / initial failure / later failure / empty (4), §11 | frontend/src/App.jsx | Verified: isolated Chrome initial/later sensor failure, crop failure/Retry and empty state; see browser-acceptance.md |
| B1 Create available crop (5) | CropForm.jsx, analysis.js, app.js | Verified: API and isolated Chrome create/recreate, Faulty/N/A/Critical and reload persistence |
| B2 Read/display cards (4) | App.jsx, CropCard.jsx | Verified: API tests and three cards in Chrome |
| B3 Edit/recalculate (5) | CropForm.jsx, App.jsx, analysis.js | Verified: API, analysis tests and Chrome immediate Tomato recalculation plus reload persistence |
| B4 Delete without sensor writes (4) | app.js, App.jsx | Verified: API sensor-byte comparison and isolated Chrome delete/recreate |
| B5 Unique/immutable names (4) | db.js, app.js, CropForm.jsx | Verified: 409/400 API tests, Chrome readonly attribute and stale-form duplicate feedback |
| B6 Types, limits, notes, errors (3) | app.js | Verified for existing API test cases; exhaustive per-field/type matrix outstanding |
| C1 20 objects / five each / seven fields / valid distinct timestamps (4) | sensor-readings.json, sensor-data.js | Verified: dataset and structural validator tests; mixed order and exactly one older invalid reading |
| C2 AI prompt and correction record (3), §16/20 | README.md | Partial: provenance unknown, exact original prompt and genuine sensor correction unavailable; do not fabricate |
| C3 Exact case-sensitive key (4) | analysis.js, app.js | Verified by analysis/API tests |
| C4 Greatest timestamp (5) | analysis.js | Verified by shuffled-input and dataset tests |
| C5 Refresh/history (4) | App.jsx, SensorHistory.jsx | Verified in Chrome: successful refresh advances displayed time; Wheat history has five newest-first rows including historical Invalid Data. Failure paths pending |
| D1 Dry/Healthy/Too Wet and inclusive boundaries (5) | analysis.js | Verified by analysis tests |
| D2 Sensor Problem before Invalid Data (4) | analysis.js | Verified for Offline/Faulty with invalid values; Chrome historical Invalid Data |
| D3 Water/actions/temp/rain boundaries (3) | analysis.js | Verified by analysis tests; 35°C no alert, 5 mm rain alert |
| D4 Farm statuses / no crops / unavailable (4) | analysis.js, App.jsx | Verified: helper tests including rain alone; Chrome unavailable, Critical and No Crops states |
| D5 Cards/forms/labels/feedback/history (4), §14 | components, CSS | Partial: Chrome cards/forms/save/delete/history/keyboard checked; narrow ~562px checked; 320/375px unverified |
| E1 Setup/URLs/database/API README (3) | README.md | Implemented; new URLs run successfully; clean-install verification pending |
| E2 Ownership/matching/priority/timestamps README (3) | README.md | Implemented; review against brief performed |
| E3 AI prompt/correction/verification (3) | README.md | Partial; actual code correction documented; original sensor history remains unknown |
| E4 3–5 minute MP4 business flow (4), §19 | Not yet created | Missing: demo checklist, recording, playback/audio and LMS upload |
| E5 Genuine limitation (2) | README.md | Implemented: static simulated sensor feed |
| §4/5/12 scope and shared helpers | db.js, app.js, analysis.js, components | Implemented: configuration-only DB, read-only feed, React analysis, no unrelated services; full final audit pending |
| §19 source ZIP | Not yet created | Missing: package and clean extraction/run verification |

## Evidence and next checks

2026-10-15: Node 25.6.1; backend 6/6 tests and frontend 10/10 tests pass. Final frontend lint and production build pass. Port-edit lint initially failed due to missing Node process import; fixed and both checks rerun successfully. Tests bind ephemeral HTTP ports with sandbox permission. Temporary fixtures are removed in teardown; working sensor JSON remains unchanged.

Live frontend http://localhost:5184; backend http://localhost:3101. Chrome shows Tomato Dry/high temperature/500 L, Lettuce Healthy/0 L, Wheat Too Wet/rain/0 L, Watch status. Refresh changed 06:38:53 to 06:39:04. Wheat history contains five descending timestamps and 120% historical Invalid Data/N/A/Check reading. Browser captured no warnings/errors during these scenarios. Other projects' processes were left untouched.

Browser CRUD, duplicate feedback, pending save, edit/reload persistence, delete/recreate, first/later sensor failures, crop failure/Retry and empty state are now verified against isolated resources; see [browser evidence](browser-acceptance.md). Real Express process restart persistence is verified by an automated temporary-database test. Remaining checks: true 320/375px browser widths, comprehensive network trace, exhaustive API validation/error matrix, clean install and submission artifacts. Original sensor-generation provenance remains unresolved. Working database and sensor file were preserved.

Ordered work: (1) port configuration and API/persistence regression evidence; (2) isolated browser CRUD and failure-state tests, fixing demonstrated issues; (3) complete AI provenance record honestly, final rubric audit, source ZIP and demo checklist.

Branch `fix/development-ports` is based on `feat/crop-dashboard` commit `0d7a8ce`, which contains unmerged dashboard prerequisites. Do not base subsequent dependent work on older main. The earlier `test/api-feed-persistence` branch currently has the same base; its uncommitted tests were preserved during the branch change. GitHub CLI initially reported invalid credentials; push status must be confirmed separately.


Acceptance work branch: `test/dashboard-acceptance`, based on `fix/development-ports` at `c4eece4`. GitHub authentication was rechecked successfully with the student account; the port branch was pushed and its remote SHA confirmed.
