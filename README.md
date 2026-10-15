# GreenFields SmartFarm

React + Express + SQLite crop dashboard. Requirements are tracked in [docs/requirements.md](docs/requirements.md).

## Run locally

Use Node.js 24 or later (tested with Node 25.6.1) and npm. Install locked dependencies with `npm ci` in both `backend` and `frontend`. Run these in separate terminals:

```sh
cd backend
npm start
```

```sh
cd frontend
npm run dev
```

Frontend: http://localhost:5184. Backend: http://localhost:3101. These defaults avoid another project on 5173 and older SmartFarm servers on 3001 and 5174. Vite uses a strict port so it cannot silently move the dashboard to a different URL.

If occupied, start the backend with `PORT=3102 npm start`, and the frontend with `API_PROXY_TARGET=http://localhost:3102 npm run dev -- --port 5185`. Change both together; the browser uses relative `/api` requests through Vite. Existing processes are never stopped automatically.

On backend startup, `backend/db.js` creates `backend/data/smartfarm.db` and the authoritative crops schema. Tomato, Lettuce and Wheat are seeded only when the table is empty; Maize is created through the UI. Records survive restarts. The ignored local database is not required for a fresh installation and must not be deleted to run tests.

## API and ownership

`GET /api/crops`, `GET /api/crops/:id`, `POST /api/crops`, `PUT /api/crops/:id`, `DELETE /api/crops/:id` manage configuration only. Create returns 201; other successful operations return 200. Delete returns `{ "deleted": true, "id": 4 }`. Failed requests return `{ "error": "message" }`, with 400 for invalid input, 409 for duplicate names, 404 for missing records and 500 for server or sensor-file failure.

`GET /api/readings` rereads and structurally validates the read-only `backend/data/sensor-readings.json` on every request. It returns raw readings, including the historical out-of-range value; there are no sensor mutation routes. SQLite holds no readings, recommendations, conditions, alerts or refresh time.

React matches crop names with exact case-sensitive equality and independently selects the greatest fixed-format timestamp. One shared analysis helper serves cards and history. Priority: Offline/Faulty → Sensor Problem; invalid Online values → Invalid Data; below minimum → Dry; inclusive range → Healthy; above maximum → Too Wet. Only valid Online readings receive temperature >35°C and rainfall ≥5 mm alerts. Rain alone does not raise farm status.

React keeps raw readings and the last successful refresh time. A failed later refresh preserves both. First sensor failure keeps cards visible with unavailable results and Create disabled. Crop-request failure blocks editable content until Retry succeeds. Empty cards take priority as No Crops.

## Verification and AI use

Run `npm test` in each application; also run `npm run lint` and `npm run build` in `frontend`. Backend tests use in-memory or temporary databases and temporary sensor fixtures. They do not reset the working database or change the submitted sensor file.

Codex assisted the current requirements audit, port configuration, regression tests and documentation. The original sensor-generation tool and exact prompt are not recorded in the repository; this remains a submission gap. No generation prompt or manual data correction is claimed retrospectively. The current data passes the existing dataset tests, including required latest cases and one older invalid reading.

A real correction in this session: adding environment loading to Vite initially caused ESLint's `process is not defined` error; importing `process` from `node:process` corrected it. See the checklist for actual verification evidence and remaining work.

Responsive browser testing later found that the existing 320px body minimum width caused horizontal overflow once a narrow viewport's scrollbar consumed space. Removing the body minimum fixed the real-app 320/375/768px frame checks. The UI also adds field-limit explanations and a keyboard skip link. The reproducible browser results are in [docs/browser-acceptance.md](docs/browser-acceptance.md).

An explainable decision: keep the browser API URL relative and configure the development proxy in one place, so moving the backend does not require editing React components.

A limitation: readings are a static simulated feed; refresh rereads the file but does not collect measurements from hardware.

## Submission preparation

From a Git checkout, run `python3 scripts/package-source.py` to create `output/greenfields-smartfarm-source.zip` from tracked files. Include intended new files in Git before packaging. The archive excludes dependencies, secrets, local databases and generated builds. It contains both lockfiles, `db.js`, tests and the sensor JSON. No Git checkout is needed to install and run the extracted application.

The source ZIP was extracted to a fresh temporary directory: `npm ci` succeeded in each app, backend 6/6 and frontend 10/10 tests passed, lint/build passed, and Chrome loaded three newly seeded cards using the extracted frontend/API on temporary ports 5186/3103. These verification servers are separate from the main 5184/3101 application.

Use [the timed video checklist](docs/video-demo.md) to record the required 3–5 minute MP4 with audio. Upload both source ZIP and MP4 directly to the LMS; GitHub is not a substitute. Before submission, resolve the sensor-generation provenance gap and perform the outstanding checks in [the requirements checklist](docs/requirements.md). The MP4 and LMS upload remain outstanding.
