# Time Boss Community (prototype)

Static, no-build, no-database LMS/community prototype. Deploys as-is to here.now (or any static host).

- `index.html` / `styles.css` / `app.js`: the app (hash routing, vanilla JS)
- `data.js`: all editable content: companies, demo users (27 at Acme), courses + lessons, daily prompts and seed replies, community posts, masterclasses, cohort CTA, office hours Calendly link, AI system prompts

State lives in each browser's `localStorage`, so nothing is shared between visitors. Multi-tenancy is simulated in the client (fine for demos, not for real private data). Weekly Planning and Daily Review history for demo users is generated from each user's `habit` value in `data.js`; "Reset demo data" on the login screen regenerates it.

Run locally: `python3 -m http.server` in this folder.

Before publishing, bump the `?v=` tags on styles.css, data.js and app.js in `index.html` (any new value, e.g. the commit hash). here.now caches those files in browsers for up to a day, so an unchanged URL keeps serving the old version.

## Phases

1. **Unlock Your Week** (Workshop). Everyone starts here. Finishing the workshop's lessons moves the member to phase 2. Habits and Events are locked in this phase.
2. **Master Your Week** (Group Coaching Cohort). Finishing the workshop makes a member ready to enroll. Habits (Weekly Planning Meeting, Daily Review Meeting, streaks, leaderboard) and Events open when they enroll. In the prototype, Enroll in Cohort enrolls immediately (production: checkout first), and "Demo: mark the cohort complete" on the cohort page stands in for finishing it.
   The cohort's sessions open in the app for review once the cohort is complete: Dealing with Diversions; the four Solving the Root Cause of Diversions sessions (Relationships, Environment, Systems, Yourself); and Your Highest Sustainable Pace.
3. **Maximize Your Week** (Continuing Education). The mini courses (starting with Time Boss x AI), plus masterclasses and live Weekly Planning Meetings.

Home shows the member's phase and the next step. Demo users at each step: Sam Okafor (Unlock Your Week), Tyler Nguyen (Master Your Week, ready to enroll), Dev Patel (Master Your Week, in the cohort), Maria Chen (Maximize Your Week). Each demo user's starting phase is the `phase` field in `data.js` (`enrolled: true` for phase 2 members in the current cohort). If the saved data shape changes, bump `KEY` in `app.js` so browsers reload the demo data.

## Habits

- **Weekly Planning Meeting streak:** consecutive weeks with a Weekly Planning Meeting. A meeting run Friday to Sunday plans the following week; Monday to Thursday plans the current week.
- **Daily Review Meeting streak:** consecutive workdays (Mon to Fri) with a Daily Review Meeting. Today counts once it's done.
- **Past month completion:** Daily Review Meetings over the last 30 days of workdays, Weekly Planning Meetings over the last 4 weeks.

Both meetings follow the Time Boss "Checklist for Your Week" (Reflect, Decide, Commit).

## Previewing the celebration

Open `#/preview/weekly` or `#/preview/daily` (add a number for a streak, e.g. `#/preview/daily/10` for a milestone), or use "Preview the celebration" on a meeting's page. Nothing is saved; Replay plays it again.

## Avatars

Each person gets a random background color from `avatarColors` in `data.js`, stored with them. Most demo members also get a placeholder portrait from `assets/avatars/` (Unsplash, see `CREDITS.txt`); people listed in `demoPhotos.initialsOnly` and the coaches stay on initials. Members can upload their own photo on the Profile page.

## Community features

- **Who ran it:** while a member hasn't run a meeting for the current period, Home and the meeting page show "Join N Time Bosses at <company> who've already planned next week" (or run their Daily Review Meeting today) with an avatar stack and View all. Leads with the member's company when at least three teammates ran it, otherwise the whole community. Weekly counts the week being planned; daily counts today, or the last workday until someone runs it today. `communityFill` in `data.js` adds background members at four other companies so community counts look real; they don't appear on the login screen.
- **Profile menu** (top right): Profile (photo, name, role) and Settings (public or private activity; time zone, defaulting to the device; email reminders for the Weekly Planning Meeting, default Friday 8:00 AM, and the Daily Review Meeting, default 4:30 PM). Private members' streaks and meetings are visible only to themselves, their team leaders, and coaches.

## Notes for the production build

- **RSVP sends a calendar invite.** When a member RSVPs to an event, email them a calendar invite (.ics attachment or Google/Microsoft calendar API) at their account email, and withdraw it when they cancel. The prototype shows a toast and offers an .ics download.
- **Office hours** are booked through the Calendly inline embed in `data.js` (`officeHours.calendlyUrl`), prefilled with the member's name and email. Calendly sends its own confirmation and invite.
- **Team detail** (roster, per-member drill-in) is visible to company admins (team leaders) and Time Boss coaches only. The streak leaderboard is visible to everyone on the team.
- **Reminder emails** follow each member's Settings (on/off and time). The prototype stores the choice only.
- Posts live only in the Community. Company spaces show habits, the leaderboard, and team progress, not a feed.
