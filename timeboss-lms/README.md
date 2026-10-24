# Time Boss Community (prototype)

Static, no-build, no-database LMS/community prototype. Deploys as-is to here.now (or any static host).

- `index.html` / `styles.css` / `app.js`: the app (hash routing, vanilla JS)
- `data.js`: all editable content: companies, demo users, courses + lessons, daily prompts, masterclasses, cohort CTA, AI system prompts

State lives in each browser's `localStorage`, so nothing is shared between visitors. Multi-tenancy is simulated in the client (fine for demos, not for real private data).

Run locally: `python3 -m http.server` in this folder.
