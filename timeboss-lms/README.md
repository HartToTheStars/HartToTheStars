# Time Boss Community (prototype)

Static, no-build, no-database LMS/community prototype. Deploys as-is to here.now (or any static host).

- `index.html` / `styles.css` / `app.js`: the app (hash routing, vanilla JS)
- `data.js`: all editable content: companies, demo users (27 at Acme), courses + lessons, daily prompts and seed replies, community posts, masterclasses, cohort CTA, office hours Calendly link, AI system prompts

State lives in each browser's `localStorage`, so nothing is shared between visitors. Multi-tenancy is simulated in the client (fine for demos, not for real private data). Weekly Planning and Daily Review history for demo users is generated from each user's `habit` value in `data.js`; "Reset demo data" on the login screen regenerates it.

Run locally: `python3 -m http.server` in this folder.

Before publishing, bump the `?v=` tags on styles.css, data.js and app.js in `index.html` (any new value, e.g. the commit hash). here.now caches those files in browsers for up to a day, so an unchanged URL keeps serving the old version.

## Phases

1. **Unlock Your Week Workshop.** Everyone starts here. Finishing the workshop's lessons unlocks phase 2.
2. **Master Your Week Cohort.** Enroll from Home or the cohort page. In the prototype, "Demo: mark the cohort complete" on the cohort page stands in for finishing it.
3. **Maximize Your Week.** Ongoing education: all other courses unlock, plus masterclasses and live Weekly Planning Meetings.

Home shows the member's phase and the next step. Demo users in each phase: Sam Okafor (1), Dev Patel (2), Maria Chen (3). Each demo user's starting phase is the `phase` field in `data.js`.

## Habits

- **Weekly Planning Meeting streak:** consecutive weeks with a Weekly Planning Meeting. A meeting run Friday to Sunday plans the following week; Monday to Thursday plans the current week.
- **Daily Review Meeting streak:** consecutive workdays (Mon to Fri) with a Daily Review Meeting. Today counts once it's done.
- **Past month completion:** Daily Review Meetings over the last 30 days of workdays, Weekly Planning Meetings over the last 4 weeks.

Both meetings follow the Time Boss "Checklist for Your Week" (Reflect, Decide, Commit).

## Notes for the production build

- **RSVP sends a calendar invite.** When a member RSVPs to an event, email them a calendar invite (.ics attachment or Google/Microsoft calendar API) at their account email, and withdraw it when they cancel. The prototype shows a toast and offers an .ics download.
- **Office hours** are booked through the Calendly inline embed in `data.js` (`officeHours.calendlyUrl`), prefilled with the member's name and email. Calendly sends its own confirmation and invite.
- **Team detail** (roster, per-member drill-in) is visible to company admins (team leaders) and Time Boss coaches only. The streak leaderboard is visible to everyone on the team.
- Posts live only in the Community. Company spaces show habits, the leaderboard, and team progress, not a feed.
