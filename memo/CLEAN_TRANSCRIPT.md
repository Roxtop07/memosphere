
This project now filters out meeting platform UI noise (Google Meet / Zoom / Teams) so PDFs only contain **spoken content** and **voice notes**.

## What Was Happening
Raw DOM scraping captured interface labels (buttons, tooltips, meeting code, icon names) producing huge noisy transcripts like:

```
keyboard_arrow_up
mic
videocam_off
meeting_room
domain_disabled
...
```

## Solution Overview

1. Narrow capture selectors in `content_script.js` (Google Meet) to actual caption containers.
2. Introduced `isNoiseText()` in content script for early filtering.
3. Added `cleanTranscriptLine()` in `utils/meeting.js` for secondary filtering + deduplication.
4. Sanitizes again during PDF generation to ensure nothing slips through.

## Filtering Rules

The following are removed:

- Icon / control labels (e.g., `mic`, `videocam_off`, `call_end`)
- Meeting code pattern: `xxx-xxxx-xxx`
- UI phrases (e.g., `learn more`, `dismiss`, `backgrounds and effects`)
- Lines beginning with `Unknown:` that only wrap UI tokens
- Lines with ≥60% UI tokens
- Consecutive duplicate lines

## Key Code

### content_script.js
```javascript
function isNoiseText(text) { /* heuristic filters */ }
if (isNoiseText(caption.text)) return; // before sending
```

### utils/meeting.js
```javascript
cleanTranscriptLine(line) { /* final scrub + dedupe */ }
```

### PDF Generation Safety
During `generatePDFFromBackend()` each transcript line is cleaned again:
```javascript
meeting.transcript.map(t => {
  const cleaned = cleanTranscriptLine(t.text);
  return cleaned ? `${t.speaker}: ${cleaned}` : null;
}).filter(Boolean)
```

## Extending Filters

Add UI tokens to the arrays in both files when a new platform introduces noise. Prefer **precise tokens** over broad regex to avoid deleting real speech.

## Future Enhancements

- ML-based VAD + diarization
- Per‑speaker grouping in PDF
- Real-time noise learning (auto-suggest new tokens)

## Result
Generated PDFs now contain only meaningful spoken content and voice notes—no interface clutter.

✅ Clean transcripts  ✅ Smaller PDFs  ✅ Higher AI summary quality

