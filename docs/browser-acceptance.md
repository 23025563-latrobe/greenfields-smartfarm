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
