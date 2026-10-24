# Time Boss Community (prototype)

Static, no-build, no-database LMS/community prototype. Deploys as-is to here.now (or any static host).

- `index.html` / `styles.css` / `app.js`: the app (hash routing, vanilla JS)
- `data.js`: all editable content: companies, demo users (27 at Acme), courses + lessons, daily prompts and seed replies, community posts, masterclasses, cohort CTA, office hours Calendly link, AI system prompts

State lives in each browser's `localStorage`, so nothing is shared between visitors. Multi-tenancy is simulated in the client (fine for demos, not for real private data). Weekly Planning and Daily Review history for demo users is generated from each user's `habit` value in `data.js`; "Reset demo data" on the login screen regenerates it.

Run locally: `python3 -m http.server` in this folder.

## Habits

- **WPM streak:** consecutive weeks with a Weekly Planning Meeting. A meeting run Friday to Sunday plans the following week; Monday to Thursday plans the current week.
- **DRM streak:** consecutive workdays (Mon to Fri) with a Daily Review Meeting. Today counts once it's done.
- **Past month completion:** DRM over the last 30 days of workdays, WPM over the last 4 weeks.

Both meetings follow the Time Boss "Checklist for Your Week" (Reflect, Decide, Commit).

## Notes for the production build

- **RSVP sends a calendar invite.** When a member RSVPs to an event, email them a calendar invite (.ics attachment or Google/Microsoft calendar API) at their account email, and withdraw it when they cancel. The prototype shows a toast and offers an .ics download.
- **Office hours** are booked through the Calendly inline embed in `data.js` (`officeHours.calendlyUrl`), prefilled with the member's name and email. Calendly sends its own confirmation and invite.
- **Team detail** (roster, per-member drill-in) is visible to company admins (team leaders) and Time Boss coaches only. The streak leaderboard is visible to everyone on the team.
- Posts live only in the Community. Company spaces show habits, the leaderboard, and team progress, not a feed.
