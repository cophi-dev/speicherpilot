# Content capture scripts

## `linkedin-clips.mjs`

Records three LinkedIn-ready clips from the **live** site (`CONTENT_BASE_URL`, default `https://www.speicherpilot.app`):

- Playwright PNG frame capture (30 fps), dark mode, viewport 1080×1350
- `ffmpeg` → H.264 MP4 at **1080×1350** and **1080×1080** (center crop), no audio, last frame held 1.5 s

```bash
node scripts/content/linkedin-clips.mjs
```

Outputs under `CONTENT_OUT` (default `/opt/cursor/artifacts/linkedin-clips/`): MP4s, poster PNGs, QA first/middle/last frames, `report.json`.
