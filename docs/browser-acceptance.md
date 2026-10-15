# Browser acceptance evidence

Executed 2026-10-15 through the connected Chrome extension against the real React application and Express API. Main application: frontend 5184, API 3101. Isolated acceptance application: frontend 5185, API 3102, with a separate temporary SQLite file and sensor copy. No production routes or analysis rules are replaced by the harness.

## Reproduce safely

From `backend`, run `node scripts/acceptance-server.js`. It binds only 127.0.0.1:3102 and prints its newly created temporary fixture directory. From `frontend`, run `API_PROXY_TARGET=http://127.0.0.1:3102 npm run dev -- --port 5185`. Check those ports are available first. Neither command stops existing processes.

Open http://localhost:5185. The harness seeds a fresh test database through the same `openDatabase` implementation as the application. To test failure states, edit only the printed temporary files:

- Replace temporary `sensor-readings.json` with malformed JSON to exercise real structural validation; restore from the repository sensor file to recover.
- Set temporary `control.json` to `{"cropFailure":true}` for a crop-fetch failure, or `{"delay":1200}` to inspect pending feedback. Restore `{}` for normal responses.
- Do not edit `backend/data/sensor-readings.json` or delete the working database. Stop only the two acceptance processes after testing. Remove their printed disposable directory when no longer needed.

## Results

| Scenario | Observed evidence |
| --- | --- |
| Initial dashboard | Three seeded cards, Watch, Tomato Dry/500 L/high temperature, Lettuce Healthy/0 L, Wheat Too Wet/0 L/rain; only Maize initially available |
| Create Maize | Save feedback, four cards, latest timestamp 2026-08-05T09:00:00, Faulty → Sensor Problem/N/A/Check sensor, Critical |
| Reload persistence | Maize remains with saved configuration |
| Edit + recalculation | Tomato minimum 55 → 40 immediately changes Dry/500 L to Healthy/0 L; high-temperature alert remains; reload retains 40 |
| Immutable UI name | Edit crop-name input exposes readonly attribute |
| Delete/recreate | Maize deletion feedback; name available again; recreation matches same Faulty feed reading |
| Pending save | With delayed API, Saving… and every form field/button disabled until completion |
| Duplicate race | Open Maize creation form, create Maize through isolated API from another client, submit stale form; visible `crop_name already exists`, entered South Field retained |
| Later refresh failure | Malformed temporary feed returns 500; exact card-region text and overview text remain equal before/after, including Critical and refresh time; error banner shown |
| First feed failure | Reload with malformed temporary feed: four cards visible, Sensor Feed Unavailable, N/A readings/results, Never, Add disabled |
| Crop-fetch failure | Reload with cropFailure: application error and Retry only; no editable cards or forms |
| Retry recovery | Restore control file and click Retry; four cards and Critical restored with successful refresh time |
| Empty state | Delete all four disposable cards through UI; No crop cards yet, No Crops, count 0, all four names available |
| Successful refresh/history | Main app refresh advances displayed time; Wheat history has five newest-first rows, older 120% reading labelled Invalid Data/N/A/Check reading |
| Keyboard | Edit heading receives focus; Tab from readonly crop name reaches Location with solid outline; Cancel restores Crop Cards heading focus |
| Narrow layout | Requested 375-pixel viewport was clamped by the connected browser to an effective ~562 CSS pixels. Card, summary and buttons remained readable without document overflow; 375/320 widths remain unverified |
| Console | Captured warning/error entries were empty when inspected. Failure banners and server status responses were inspected separately; this does not claim a complete network trace |

Automated regressions additionally cover exact case, shuffled timestamps, all numeric business-range endpoints, moisture min/max, temperature 35, rainfall 5, sensor priority, JSON error propagation, invalid feed responses, unchanged sensor bytes and SQLite persistence across real Express process restart. See the requirements checklist for remaining gaps.

No product behaviour bug was demonstrated in these browser scenarios. The earlier Vite process-import lint correction is the recorded code correction; no additional correction is fabricated.

## UI refinement verification

The subsequent `feat/dashboard-polish` pass adds a farm header, separated overview metrics, explanatory status text, condition accents, prominent water recommendations, field guidance, a keyboard skip link, 44px minimum button height and a farm favicon. It does not change API or analysis behaviour.

Exact narrow-width testing is now reproducible at `/tests/fixtures/responsive.html` on the frontend. The page embeds the real app in 320, 375 and 768px frames; it is a test fixture, not a product page. Chrome's visible scrollbars reduced the content areas to 298, 352 and 745px. Initial testing found the existing `body { min-width: 320px }` caused 320px-frame overflow (scroll width 320 versus client width 298). Removing that constraint fixed it; scroll/client widths then matched at all three sizes.

Verified after refinement: 320px-frame edit/save changed Tomato 55 → 40 and immediately showed Healthy/0 L; notes remained visible; min=max form submission showed a validation error and could then be corrected and saved. The 375px history table scrolled inside its own region (888px content in 294px region) while the document stayed at 352px. Skip-link Enter focused Crop Cards with a visible outline. Main dashboard still displayed the seeded results. Failed later refresh preserved exact overview/card text; initial feed failure showed Never/N/A/Create disabled and explanatory unavailable text; crop failure still showed only Retry and no editable controls. All 16 automated tests, lint and build passed after the functional UI edits.

The final API audit raises automated coverage to 18 passing tests (8 backend, 10 frontend), including POST/PUT type/range matrices and accepted exact limits, malformed JSON, invalid IDs, readonly sensor routes, authoritative schema columns and a deliberate in-memory database failure returning only the required 500 JSON error. Its expected server stack trace is left visible in test output.

Successful changed-feed refresh was also verified: with the two disposable Maize/Tomato cards, change only the temporary latest Maize status to Online and Tomato temperature to 30. Refresh changed Critical → Normal, Maize Sensor Problem/N/A → Healthy/0 L, removed Tomato's high-temperature alert, reduced attention count 2 → 0 and advanced the displayed time 07:06:50 → 07:07:05, without restarting Express. The temporary sensor copy was restored afterward; the submitted sensor JSON was never edited.
