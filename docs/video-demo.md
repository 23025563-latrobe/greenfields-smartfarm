# 4–5 minute demonstration checklist

Record an MP4 with working audio. Use the main dashboard at http://localhost:5184 and the API at http://localhost:3101. Close unrelated tabs and check microphone levels first. Do a rehearsal before recording. Do not delete the working database to prepare: if its crop list has changed, use the isolated acceptance setup in browser-acceptance.md for a fresh three-card demo and disclose its 5185/3102 URLs.

| Time | Demonstrate and explain |
| --- | --- |
| 0:00–0:35 | Introduce React, Express and SQLite. Show initial three cards and Watch status. Explain Tomato Dry/500 L/high temperature, Lettuce Healthy/0 L, Wheat Too Wet/rain/0 L. Show last refresh time. |
| 0:35–1:15 | Add Crop Card: show only Maize available. Enter South Field, min 50, max 70, normal water 600 L, optional notes. Save. Show four cards, success feedback, Maize Faulty → Sensor Problem/N/A/Check sensor and Critical. |
| 1:15–1:50 | Edit Tomato: show readonly crop name. Change minimum 55 to 40 and save. Explain immediate Healthy/0 L recalculation using the unchanged moisture 42. Reload to show persistence. Restore 55 if time permits. |
| 1:50–2:30 | Delete Maize and confirm the message that only configuration is removed. Open Add and show Maize available again. Recreate it with the same values; show the same latest Faulty reading. Explain sensor JSON was not changed. |
| 2:30–3:05 | Open Wheat Sensor History. Show five rows newest first and the older 120% Invalid Data row with N/A and Check reading. Explain that structurally valid numeric errors reach React. Close history. |
| 3:05–3:35 | Click Refresh Sensor Data and show successful feedback and a later browser-time refresh value. Explain that Express rereads the file; a static file can yield unchanged readings. |
| 3:35–4:10 | Show analysis.js briefly: exact `crop_name === cropName`, greatest timestamp, shared analyseCrop helper. Explain Sensor Problem priority, inclusive moisture targets, >35°C and ≥5 mm alerts; rain alone does not raise farm status. |
| 4:10–4:35 | Explain ownership: SQLite configuration, read-only JSON measurements, React derived results and refresh time. State static feed limitation. Mention isolated failure-state verification and the documented AI-use/provenance status accurately. |

Before uploading: confirm duration is 3–5 minutes, export as `.mp4`, play the whole video and verify readable text and audible narration. Upload both the source ZIP and MP4 directly to the LMS. Do not substitute GitHub or video-sharing links. The recording and LMS submission are user actions and remain outstanding.

Optional rehearsal checks outside the timed recording: show 409 duplicate rejection, first sensor failure, failed-refresh preservation, Retry after crop failure and the No Crops empty state using only isolated fixtures. Instructions and observed results are in browser-acceptance.md.
