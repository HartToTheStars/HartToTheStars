// Seed content + demo data. Everything here is editable copy for the prototype.
// Course text is placeholder written to the Time Boss frameworks; swap in the real curriculum.

window.TB_SEED = {
  companies: [
    { id: "acme", name: "Acme Logistics", color: "#3c768d", seats: 30, domain: "acmelogistics.com" },
    { id: "northwind", name: "Northwind Health", color: "#2f8f6f", seats: 12, domain: "northwindhealth.org" },
    { id: "brightline", name: "Brightline Studio", color: "#b5733a", seats: 8, domain: "brightline.studio" },
  ],

  // phase: 1 = Unlock Your Week (workshop), 2 = Master Your Week (enrolled: true = in the current cohort; otherwise ready to enroll), 3 = Maximize Your Week (completed the cohort)
  // habit (0 to 1) is how consistent each person is; it drives the generated Weekly Planning / Daily Review history; omit for a random one
  users: [
    { id: "u_andrew", name: "Andrew Hartman", title: "Founder, Time Boss", companyId: null, role: "coach", email: "andrew@timeboss.us" },
    { id: "u_coach2", name: "Jordan Reyes", title: "Time Boss Coach", companyId: null, role: "coach", email: "jordan@timeboss.us" },

    { id: "u_maria", name: "Maria Chen", title: "VP Operations", companyId: "acme", role: "admin", phase: 3, habit: 0.93 },
    { id: "u_victor", name: "Victor Hughes", title: "CEO", companyId: "acme", role: "admin", phase: 3, habit: 0.78 },
    { id: "u_patrick", name: "Patrick Doyle", title: "CFO", companyId: "acme", role: "member", phase: 3, habit: 0.7, private: true },
    { id: "u_dev", name: "Dev Patel", title: "Dispatch Manager", companyId: "acme", role: "member", phase: 2, enrolled: true, habit: 0.88 },
    { id: "u_sam", name: "Sam Okafor", title: "Account Lead", companyId: "acme", role: "member", phase: 1, habit: 0.45 },
    { id: "u_priya", name: "Priya Raman", title: "Director of Finance", companyId: "acme", role: "member", phase: 3, habit: 0.96 },
    { id: "u_marcus", name: "Marcus Bell", title: "Fleet Manager", companyId: "acme", role: "member", phase: 2, enrolled: true, habit: 0.62 },
    { id: "u_hannah", name: "Hannah Brooks", title: "HR Business Partner", companyId: "acme", role: "member", phase: 3, habit: 0.84 },
    { id: "u_luis", name: "Luis Ortega", title: "Warehouse Supervisor", companyId: "acme", role: "member", phase: 1, habit: 0.55 },
    { id: "u_grace", name: "Grace Kim", title: "Customer Success Manager", companyId: "acme", role: "member", phase: 3, habit: 0.91 },
    { id: "u_tyler", name: "Tyler Nguyen", title: "Logistics Analyst", companyId: "acme", role: "member", phase: 2, habit: 0.74 },
    { id: "u_aisha", name: "Aisha Mohammed", title: "Procurement Lead", companyId: "acme", role: "member", phase: 3, habit: 0.86 },
    { id: "u_ben", name: "Ben Carter", title: "Safety Coordinator", companyId: "acme", role: "member", phase: 1, habit: 0.38 },
    { id: "u_chloe", name: "Chloe Martin", title: "Marketing Manager", companyId: "acme", role: "member", phase: 3, habit: 0.8 },
    { id: "u_jamal", name: "Jamal Washington", title: "Regional Sales Director", companyId: "acme", role: "member", phase: 2, enrolled: true, habit: 0.67 },
    { id: "u_erin", name: "Erin Walsh", title: "Controller", companyId: "acme", role: "member", phase: 3, habit: 0.9 },
    { id: "u_diego", name: "Diego Alvarez", title: "Routing Planner", companyId: "acme", role: "member", phase: 1, habit: 0.58 },
    { id: "u_nina", name: "Nina Petrova", title: "IT Manager", companyId: "acme", role: "member", phase: 3, habit: 0.82 },
    { id: "u_owen", name: "Owen Price", title: "Driver Lead", companyId: "acme", role: "member", phase: 1, habit: 0.3 },
    { id: "u_rachel", name: "Rachel Adams", title: "Executive Assistant", companyId: "acme", role: "member", phase: 3, habit: 0.95 },
    { id: "u_kenji", name: "Kenji Sato", title: "Data Engineer", companyId: "acme", role: "member", phase: 3, habit: 0.72 },
    { id: "u_sofia", name: "Sofia Rossi", title: "Operations Coordinator", companyId: "acme", role: "member", phase: 3, habit: 0.87 },
    { id: "u_caleb", name: "Caleb Johnson", title: "Account Executive", companyId: "acme", role: "member", phase: 2, habit: 0.5 },
    { id: "u_leah", name: "Leah Goldberg", title: "Billing Specialist", companyId: "acme", role: "member", phase: 2, habit: 0.77 },
    { id: "u_andre", name: "Andre Thompson", title: "Maintenance Supervisor", companyId: "acme", role: "member", phase: 2, enrolled: true, habit: 0.64 },
    { id: "u_mei", name: "Mei Lin", title: "Product Manager", companyId: "acme", role: "member", phase: 3, habit: 0.89 },
    { id: "u_zoe", name: "Zoe Bennett", title: "Recruiter", companyId: "acme", role: "member", phase: 1, habit: 0.42 },

    { id: "u_lena", name: "Lena Fischer", title: "Clinic Director", companyId: "northwind", role: "admin", phase: 3, habit: 0.85 },
    { id: "u_omar", name: "Omar Haddad", title: "Practice Manager", companyId: "northwind", role: "member", phase: 2, enrolled: true, habit: 0.7 },
    { id: "u_tess", name: "Tess Morgan", title: "Creative Director", companyId: "brightline", role: "admin", phase: 3, habit: 0.76 },
  ],

  coaches: ["u_andrew", "u_coach2"],

  // Demo profile photos (assets/avatars, Unsplash placeholders). Members get them in order, except these, who stay on initials
  // so the stored random avatar colors show. Coaches never get one (Andrew is a real person).
  demoPhotos: { count: 33, initialsOnly: ["u_sam", "u_ben", "u_owen", "u_zoe", "u_kenji"] },
  // Random avatar background colors, picked once per person and stored with them
  avatarColors: ["#3c768d", "#5e8497", "#2f6b5f", "#4a6fa5", "#7a6a9a", "#8a5a6e", "#b0612a", "#a07a2c", "#6b7f3a", "#2f4f6f", "#7d5a3c", "#3f7f6a"],

  // Extra community members at other companies so community-wide counts ("67 Time Bosses ran theirs") look real.
  // They post nothing and don't appear on the login screen.
  communityFill: {
    perCompany: 16,
    companies: [
      { id: "summit", name: "Summit Partners", color: "#5a6f8f", seats: 20, domain: "summitpartners.com", background: true },
      { id: "harbor", name: "Harbor Health Group", color: "#3f7f6a", seats: 20, domain: "harborhealth.org", background: true },
      { id: "pinecrest", name: "Pinecrest Builders", color: "#8a6a4a", seats: 20, domain: "pinecrest.build", background: true },
      { id: "lumen", name: "Lumen Advisory", color: "#6b5b8a", seats: 20, domain: "lumenadvisory.com", background: true },
    ],
    firstNames: ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn", "Jamie", "Drew", "Reese", "Parker", "Elena", "Marco", "Aaliyah", "Noah", "Hana", "Omari", "Lucia", "Theo", "Ines", "Kofi", "Maya", "Felix", "Rosa", "Arjun", "Nadia", "Simon", "Yara", "Ethan", "Leila", "Mateo"],
    lastNames: ["Brennan", "Castillo", "Duarte", "Ellison", "Faraday", "Garza", "Holloway", "Ibarra", "Jensen", "Kowalski", "Lindqvist", "Mendez", "Novak", "Okoro", "Petrov", "Quintero", "Reyes", "Sorensen", "Tanaka", "Underwood", "Vance", "Whitaker", "Yilmaz", "Zamora"],
    titles: ["Operations Manager", "Director", "Project Lead", "Account Manager", "Controller", "Team Lead", "Program Manager", "VP Sales", "Office Manager", "Engineering Manager", "Practice Lead", "Partner"],
  },

  // Office hours booking (Calendly inline embed)
  officeHours: { calendlyUrl: "https://calendly.com/d/d3mx-5nj-rrw/time-boss-micro-office-hours", mins: 15 },

  // Workshop (phase 1), Master Your Week cohort curriculum (open for review after the cohort), and mini courses (Maximize Your Week). Lessons: { id, title, mins, body (html-ish paragraphs), action }
  courses: [
    {
      id: "workshop",
      kind: "workshop",
      title: "Unlock Your Week Workshop",
      blurb: "The foundation. Take back your calendar by naming what actually steals your time.",
      lessons: [
        { id: "ws1", title: "Why time management fails", mins: 8,
          body: ["Most systems assume the problem is organization. It usually isn't. The problem is that your time is being taken by things you never consciously chose.",
                 "Time Boss starts from a different question: what is diverting you, and why does it keep working?"],
          action: "Write down the last three times you ended a day thinking 'where did it go?'" },
        { id: "ws2", title: "Being the boss of your time", mins: 10,
          body: ["A Time Boss decides in advance. Reactive people decide in the moment, which means someone else decides for them.",
                 "Your calendar is a statement of priorities. If it's mostly other people's priorities, that's information."],
          action: "Audit tomorrow's calendar. Mark each block: mine, theirs, or nobody's." },
        { id: "ws3", title: "Your weekly habits", mins: 12,
          body: ["Two meetings run the whole system: a Weekly Planning Meeting with yourself and a Daily Review Meeting.",
                 "Weekly sets direction. Daily keeps you honest. Everything else is execution."],
          action: "Block your Weekly Planning Meeting before your work week starts and a 15-minute Daily Review Meeting at the end of each workday, recurring." },
      ],
    },
    {
      id: "diversions",
      kind: "cohort",
      title: "Dealing with Diversions",
      blurb: "Spot the interruptions, detours, and shiny objects pulling you off plan, and respond on purpose.",
      lessons: [
        { id: "dv1", title: "What counts as a diversion", mins: 7,
          body: ["A diversion is anything that moves your attention off the thing you decided mattered most. Some are external (pings, drop-ins). Many are internal (avoidance, perfectionism, 'quick' checks).",
                 "Not all diversions are bad. The goal is choosing them, not eliminating them."],
          action: "Keep a diversion log for one day: time, what pulled you, internal or external." },
        { id: "dv2", title: "The four responses", mins: 9,
          body: ["Every diversion gets one of four responses: Do it now (under 2 minutes and truly urgent), Defer it (schedule it), Delegate it, or Decline it.",
                 "The default response most people use is a fifth one: absorb it and lose the afternoon."],
          action: "Pick your top recurring diversion. Pre-decide which of the four responses it gets." },
        { id: "dv3", title: "Designing your defenses", mins: 10,
          body: ["Defenses are environmental: notification settings, office hours for your team, a closed door, a parking-lot list.",
                 "Willpower is a terrible defense. Design beats discipline."],
          action: "Implement one environmental defense today and note what changed." },
      ],
    },
    {
      id: "rc-relationships",
      kind: "cohort",
      series: "Solving the Root Cause of Diversions",
      part: 1,
      title: "Root Cause: Relationships",
      blurb: "How can I make priorities happen and be available to others?",
      lessons: [
        { id: "rc1", title: "Relationships", mins: 9,
          question: "How can I make priorities happen and be available to others?",
          body: ["Many recurring diversions come from the people you work with: drop-ins, pings, and requests that land on your calendar without a plan.",
                 "The fix is rarely being less available. It's agreeing on when and how you're available, so your priorities and other people's needs both have a place."],
          action: "Pick the relationship that diverts you most. Propose one agreement on when and how to reach you." },
      ],
    },
    {
      id: "rc-environment",
      kind: "cohort",
      series: "Solving the Root Cause of Diversions",
      part: 2,
      title: "Root Cause: Environment",
      blurb: "How can I set up my physical and digital space to focus?",
      lessons: [
        { id: "rc2", title: "Environment", mins: 8,
          question: "How can I set up my physical and digital space to focus?",
          body: ["Your surroundings make some behaviors easy and others hard: notifications, open tabs, a phone on the desk, a door that's always open.",
                 "Design beats discipline. Change the space so focus is the default."],
          action: "Make one change to your physical space and one to your digital space before your next focus block." },
      ],
    },
    {
      id: "rc-systems",
      kind: "cohort",
      series: "Solving the Root Cause of Diversions",
      part: 3,
      title: "Root Cause: Systems",
      blurb: "How can I set up my systems to help my future self focus?",
      lessons: [
        { id: "rc3", title: "Systems", mins: 10,
          question: "How can I set up my systems to help my future self focus?",
          body: ["If the same diversion shows up three times, it isn't an interruption. It's a missing system: a checklist, a template, an owner, or a Recurring Task.",
                 "Build it once so your future self doesn't have to decide again."],
          action: "Choose your most repeated diversion and build the system that handles it without you." },
      ],
    },
    {
      id: "rc-yourself",
      kind: "cohort",
      series: "Solving the Root Cause of Diversions",
      part: 4,
      title: "Root Cause: Yourself",
      blurb: "With all other diversions handled, how do I get out of my own way?",
      lessons: [
        { id: "rc4", title: "Yourself", mins: 9,
          question: "With all other diversions handled, how do I get out of my own way?",
          body: ["Some diversions start inside: avoidance, perfectionism, a quick check that turns into an hour, a belief that you have to be available.",
                 "Name the pattern, notice when it shows up, and decide in advance what you'll do instead."],
          action: "Write down the internal diversion you see most in yourself and your planned response to it." },
      ],
    },
    {
      id: "hsp",
      kind: "cohort",
      title: "Your Highest Sustainable Pace",
      blurb: "Find the output level you can hold for months, not days, and plan around it.",
      lessons: [
        { id: "hsp1", title: "Sprinting isn't a strategy", mins: 7,
          body: ["Heroic weeks feel productive and borrow from the next three. Your Highest Sustainable Pace (HSP) is the most you can do while keeping energy, health, and judgment intact.",
                 "Plans built above HSP fail predictably. Plans built at HSP compound."],
          action: "Rate your last 4 weeks: under pace, at pace, or over pace." },
        { id: "hsp2", title: "Measuring your pace", mins: 10,
          body: ["Track three signals weekly: focused hours delivered, energy (1 to 5), and how many planned priorities got done.",
                 "Your HSP is the focused-hour number where energy stays at 3+ week over week."],
          action: "Start the weekly tracker in the Weekly Planning tool." },
        { id: "hsp3", title: "Planning at pace", mins: 8,
          body: ["Once you know your number, plan to it. Leave margin for diversions you can't prevent.",
                 "A good week planned at pace beats a perfect week planned at fantasy."],
          action: "Cap next week's planned focus blocks at your HSP number." },
      ],
    },
    { id: "ai", kind: "mini", title: "Time Boss x AI", blurb: "Use AI to run your Weekly Planning Meeting, your Daily Review Meeting, and the 5 D's.",
      lessons: [
        { id: "ai1", title: "Your Weekly Planning Meeting with AI", mins: 8, body: ["Give your AI the Weekly Planning Meeting prompt, your Backlog, and next week's calendar. Let it walk you through Reflect, Decide, and Commit, and push back when your plan doesn't fit."], action: "Copy the Weekly Planning Meeting prompt from the Habits menu and run it once with your AI." },
        { id: "ai2", title: "Your Daily Review Meeting with AI", mins: 6, body: ["Fifteen minutes at the end of the day: tell your AI what worked, what didn't, and what's incomplete. It helps you decide Backlog or Calendar for each task and reviews tomorrow's plan with you."], action: "Run tonight's Daily Review Meeting with the Daily Review Meeting prompt." },
        { id: "ai3", title: "AI and the 5 D's", mins: 8, body: ["When something doesn't fit next week, AI can help you defer, delegate, digitize, downsize, or delete it: drafting the handoff, building the template, or trimming the scope."], action: "Take one task that didn't fit this week and ask your AI to help you digitize or downsize it." },
      ] },
    { id: "energy", kind: "mini", title: "Energy", blurb: "Match your hardest work to your best hours.",
      lessons: [
        { id: "en1", title: "Mapping your energy curve", mins: 6, body: ["Track energy hourly for 3 days. Most people find a 2 to 3 hour peak window."], action: "Log energy at the top of each hour for 3 days." },
        { id: "en2", title: "Protecting peak hours", mins: 6, body: ["Peak hours are for deep work. Meetings and email go in the valleys."], action: "Move one meeting out of your peak window this week." },
      ] },
    { id: "email", kind: "mini", title: "Email", blurb: "Process email in batches instead of living in it.",
      lessons: [
        { id: "em1", title: "Batching", mins: 5, body: ["Check email at set times, 2 to 4 per day. Close it between."], action: "Pick your email windows and put them on your calendar." },
        { id: "em2", title: "Zero-touch triage", mins: 7, body: ["Each email gets one touch: reply, schedule, delegate, archive."], action: "Run one batch today with the one-touch rule." },
      ] },
    { id: "delegating", kind: "mini", title: "Delegating", blurb: "Hand off outcomes, not tasks.",
      lessons: [
        { id: "dl1", title: "What to delegate", mins: 6, body: ["If someone else can do it 80% as well, delegate it. Your 100% is expensive."], action: "List 5 things you did last week someone else could have done." },
        { id: "dl2", title: "The delegation brief", mins: 8, body: ["Define the outcome, the deadline, the constraints, and the check-in. Skip any one and it comes back to you."], action: "Delegate one item using the four-part brief." },
      ] },
    { id: "meetings", kind: "mini", title: "Meetings", blurb: "Fewer, shorter, better.",
      lessons: [
        { id: "mt1", title: "Should this be a meeting?", mins: 5, body: ["A meeting is for decisions and discussion. Updates go async."], action: "Cancel or convert one recurring meeting to async." },
        { id: "mt2", title: "Running a tight meeting", mins: 7, body: ["Agenda in advance, a decision owner, end with who-does-what-by-when."], action: "Use the 3-line agenda on your next meeting." },
      ] },
    { id: "prompts", kind: "mini", title: "Prompts", blurb: "Use AI to plan, review, and draft faster.",
      lessons: [
        { id: "pr1", title: "AI as your chief of staff", mins: 6, body: ["Give your AI your goals, calendar, and constraints. Let it challenge your plan."], action: "Copy the Weekly Planning system prompt into your AI and run it once." },
        { id: "pr2", title: "Prompt patterns that work", mins: 8, body: ["Role, context, task, format. Ask it to ask you questions first."], action: "Rewrite one prompt you use often with role/context/task/format." },
      ] },
    { id: "quarterly", kind: "mini", title: "Quarterly Goals", blurb: "Set 3 outcomes per quarter and connect every week to them.",
      lessons: [
        { id: "qg1", title: "Choosing three", mins: 7, body: ["More than three goals means none of them are goals. Pick the three that make everything else easier."], action: "Write your 3 quarterly outcomes." },
        { id: "qg2", title: "Weekly line of sight", mins: 6, body: ["Every weekly Big 3 should move at least one quarterly goal."], action: "Tag next week's Big 3 with the goal each one moves." },
      ] },
  ],

  // One prompt per day, rotating. Seed replies make the pinned prompt look alive in the demo.
  dailyPrompts: [
    { q: "What's one task you deflected to your Parking Lot yesterday instead of letting it hijack your day?", replies: [
      { a: "u_dev", b: "A driver asked for a route change at 9am. Parked it, handled it in Whirlwind at 2. Nothing caught fire." },
      { a: "u_grace", b: "A 'quick' client report request. Parked it, and by Whirlwind time they'd found the answer themselves." },
      { a: "u_kenji", b: "Dashboard bug that wasn't urgent. Old me would have lost the morning to it." } ] },
    { q: "When is your energy highest today, and what One-time Task did you block there?", replies: [
      { a: "u_priya", b: "8 to 10am. Budget variance analysis, phone in another room." },
      { a: "u_mei", b: "Right after lunch, oddly. Blocked the roadmap draft 1 to 3." },
      { a: "u_hannah", b: "Early. Writing the new onboarding plan before anyone else is online." } ] },
    { q: "What meeting this week could have been an email?", replies: [
      { a: "u_jamal", b: "Monday pipeline review. Everyone read numbers off a slide we all already had." },
      { a: "u_rachel", b: "Half of Victor's 1:1s are status updates. Proposing a shared doc instead." },
      { a: "u_tyler", b: "The weekly metrics sync. Converting it to a Loom this week." } ] },
    { q: "What's one thing you're doing that someone else should own?", replies: [
      { a: "u_maria", b: "Approving every PTO request in ops. Moving that to team leads this month." },
      { a: "u_luis", b: "Counting inventory myself on Fridays. Training Sofia's team to run it." },
      { a: "u_patrick", b: "Formatting the board pack. Erin's team does it better anyway." } ] },
    { q: "If you only finished one thing today, what would make it a win?", replies: [
      { a: "u_aisha", b: "Signing the new packaging vendor. Everything else can wait." },
      { a: "u_chloe", b: "Shipping the Q4 campaign brief to the agency." },
      { a: "u_nina", b: "Getting the laptop refresh order placed before pricing changes." } ] },
    { q: "Which of the 5 D's (defer, delegate, digitize, downsize, delete) did you use most last week?", replies: [
      { a: "u_erin", b: "Digitize. Automated the vendor statement reconciliation and got two hours back." },
      { a: "u_victor", b: "Delete. Dropped two recurring meetings and nobody noticed." },
      { a: "u_sofia", b: "Downsize. Weekly ops report is now one page instead of six." } ] },
    { q: "Are you above, at, or below your Highest Sustainable Pace this week? Why?", replies: [
      { a: "u_marcus", b: "Above. Peak season plus two drivers out. Cutting back on the side projects next week." },
      { a: "u_leah", b: "At. First time in a while. Whirlwind blocks are doing the heavy lifting." },
      { a: "u_dev", b: "Slightly above, but I can see it now instead of finding out on Friday." } ] },
    { q: "What did last week's plan get right, and what did it get wrong?", replies: [
      { a: "u_grace", b: "Right: blocking renewals early in the week. Wrong: zero buffer for escalations." },
      { a: "u_andre", b: "Planned 30 hours of One-time Tasks. Did 14. Whirlwind needs more room." } ] },
    { q: "What's the hardest thing on your list this week, and when is it blocked?", replies: [
      { a: "u_zoe", b: "Offer conversation with a candidate we're about to lose. Tuesday 9am." },
      { a: "u_priya", b: "The 2027 budget model. Wednesday and Thursday mornings, door closed." },
      { a: "u_caleb", b: "Cold outreach to the three logos I keep avoiding. Monday 10 to 11." } ] },
    { q: "How much Whirlwind time did you block this week, and was it enough?", replies: [
      { a: "u_sam", b: "None. Which explains a lot. Adding an hour a day starting Monday." },
      { a: "u_rachel", b: "90 minutes a day and it's finally enough. Inbox is under control." },
      { a: "u_owen", b: "Driver calls ARE my Whirlwind. Trying to batch them into two windows." } ] },
    { q: "What would you delegate if you trusted it would be done right?", replies: [
      { a: "u_victor", b: "Customer escalations. Grace's team is ready, I'm the bottleneck." },
      { a: "u_kenji", b: "Pipeline monitoring. Writing the runbook so someone else can own it." } ] },
    { q: "Who did you share your weekly plan with, and did it change anything?", replies: [
      { a: "u_mei", b: "Shared with my manager. She caught a conflict I'd missed before Monday even started." },
      { a: "u_tyler", b: "Shared it with Diego. We're now planning our route analysis blocks together." },
      { a: "u_hannah", b: "My partner. Turns out saying it out loud makes me less likely to skip the gym block." } ] },
    { q: "What's one recurring task you finally put on your calendar?", replies: [
      { a: "u_erin", b: "Month-end close prep. It used to ambush me every 28th." },
      { a: "u_ben", b: "Weekly safety walk. It kept getting bumped because it lived in my head." },
      { a: "u_aisha", b: "Supplier scorecards, first Monday of the month." } ] },
    { q: "What does a sustainable week look like for you, in one sentence?", replies: [
      { a: "u_maria", b: "Home by 6 with my One-time Tasks moved forward and nothing I promised dropped." },
      { a: "u_diego", b: "Routes planned by Tuesday, no weekend Slack." },
      { a: "u_lena", b: "Clinic runs without me in every meeting." } ] },
  ],

  masterclasses: [
    { title: "AI-Infused Productivity", desc: "Build an AI chief of staff that plans your week, triages your inbox, and preps your meetings." },
    { title: "Leading a Time Boss Team", desc: "Install weekly planning and diversion defenses across your whole team." },
    { title: "Q1 Goal Setting Intensive", desc: "Leave with three quarterly outcomes and a 13-week plan." },
  ],

  cohort: {
    name: "Master Your Week",
    startsOn: "2026-11-02",
    weeks: 6,
    currentWeek: 3, // the cohort enrolled members are in now; their habit history starts when it did
    seatsLeft: 9,
    url: "https://timeboss.us",
    bullets: [
      "6 weeks, live with a Time Boss coach",
      "Install weekly planning + daily review for good",
      "Small cohort, real accountability",
    ],
  },

  // Community posts. h = hours ago, likes = how many people liked it. On comments, l = likes (random if left out), r = replies.
  posts: [
    { id: "p1", authorId: "u_andrew", h: 3, likes: 18, body: "Welcome to everyone who joined from Acme this month. Introduce yourself below: name, role, and the one task that always seems to hijack your Tuesday.",
      comments: [{ a: "u_sofia", h: 2.5, b: "Sofia, ops coordinator. Tuesday is 'can you pull this number real quick' day." },
                 { a: "u_ben", h: 2, l: 6, b: "Ben, safety. Incident reports that land at 4:55pm.",
                   r: [{ a: "u_dev", h: 1.8, b: "Ben, I feel this. Friday at 4:55 is the worst version." }] },
                 { a: "u_mei", h: 1, b: "Mei, product. Roadmap questions in Slack DMs. All of them." }] },
    { id: "p2", authorId: "u_priya", h: 6, likes: 14, body: "Six weeks in a row of Weekly Planning Meetings. Biggest change: I stopped putting 'finish budget' on my calendar and started blocking subtasks with a definition of Done. Two hours max, every time. It's boring and it works.",
      comments: [{ a: "u_erin", h: 5, b: "The 2 hour rule changed how I scope everything.",
                   r: [{ a: "u_priya", h: 4.5, l: 3, b: "Same. If a task runs over two hours, I haven't figured out Done yet." }] },
                 { a: "u_andrew", h: 4, b: "Boring and it works is the whole system in four words." }] },
    { id: "p3", authorId: "u_sam", h: 9, likes: 11, body: "Honest post: I've skipped my Daily Review three days running. By 5pm I'm fried and it feels like one more meeting. How do you all make it stick?",
      comments: [{ a: "u_grace", h: 8.5, l: 7, b: "I do it standing up, 10 minutes, before I close the laptop. If I sit down it turns into email.",
                   r: [{ a: "u_sam", h: 6, l: 2, b: "Standing up is a good trick. Trying it today." }] },
                 { a: "u_dev", h: 8, b: "Calendar block at 4:45 with an alarm. Treat it like a meeting with your boss, because it is." },
                 { a: "u_coach2", h: 7, l: 9, b: "Shrink it. Just answer: what worked, what didn't, and where do incomplete tasks go. Three minutes beats zero.",
                   r: [{ a: "u_sam", h: 6.5, b: "Three minutes I can do. Thank you." }, { a: "u_owen", h: 5, b: "This is how I do mine in the truck. Works." }] }] },
    { id: "p4", authorId: "u_dev", h: 14, likes: 9, body: "Time trade win today. Unplanned fleet issue came in at 10. Worked it, moved my scheduled route audit into my Whirlwind block at 3, and still finished both. A month ago that would have been a lost day and a guilty evening." ,
      comments: [{ a: "u_marcus", h: 13, b: "Same issue hit my side. Your call kept it from spreading, thanks." }] },
    { id: "p5", authorId: "u_victor", h: 20, likes: 22, body: "Leadership team note: we're running the Weekly Planning Meeting together on Friday afternoons now, 45 minutes, then everyone shares their plan in our channel. Fewer surprises on Monday, and I'm not chasing status all week.",
      comments: [{ a: "u_maria", h: 19, b: "First Friday was rough, second one took 35 minutes. Already worth it." },
                 { a: "u_patrick", h: 18, b: "Sharing the plan is the part I underestimated. Hard to blow off something you told 8 people." }] },
    { id: "p6", authorId: "u_lena", h: 26, likes: 7, body: "Trying 'front desk office hours' 2 to 3pm so staff batch their questions. Week two: interruptions down by about half. Parking Lot sticky notes on the desk help too." ,
      comments: [{ a: "u_omar", h: 24, b: "Can confirm, I'm one of the people who used to walk in every 20 minutes." }] },
    { id: "p7", authorId: "u_rachel", h: 30, likes: 16, body: "Tip for EAs and anyone managing someone else's calendar: block their Whirlwind time first. Once that's protected, the One-time Tasks actually stay where you put them.",
      comments: [{ a: "u_victor", h: 29, b: "This is why my calendar finally works. Thank you, Rachel." }] },
    { id: "p8", authorId: "u_marcus", h: 34, likes: 6, body: "Peak season question: how do you plan at your Highest Sustainable Pace when the work itself is above it for 8 weeks straight?",
      comments: [{ a: "u_andrew", h: 33, l: 8, b: "Name it as a sprint, put an end date on it, and plan the recovery week now. A sprint without a finish line is just your new pace.",
                   r: [{ a: "u_marcus", h: 32, b: "Putting the recovery week on the calendar today." }] },
                 { a: "u_luis", h: 30, b: "We stagger who's 'on' each week in the warehouse. Not everyone sprints at once." }] },
    { id: "p9", authorId: "u_grace", h: 40, likes: 12, body: "Deleted my Friday 'catch up on everything' block. Replaced it with Whirlwind time every day at 3. Friday is now for actual work, and nothing piles up." ,
      comments: [] },
    { id: "p10", authorId: "u_kenji", h: 46, likes: 8, body: "Built a little script that pulls my calendar into a Backlog view for Weekly Planning. Happy to share if anyone on the data side wants it.",
      comments: [{ a: "u_tyler", h: 45, b: "Yes please." }, { a: "u_nina", h: 44, b: "Send it over, I'll check it against our security policy and we can roll it out.",
                   r: [{ a: "u_kenji", h: 43, b: "Will do. It only reads the calendar, never writes, so it should be a quick review." }] }] },
    { id: "p11", authorId: "u_tess", h: 52, likes: 9, body: "Studio rule since last month: no meetings before 11am. Peak hours are for making. Client complaints so far: zero.", comments: [] },
    { id: "p12", authorId: "u_chloe", h: 58, likes: 10, body: "Ran my first Weekly Planning Meeting in this app. Decide What To Do With What Doesn't Fit was the eye opener. I had 11 things that didn't fit. Deferred 4, delegated 3, deleted 4. Deleting felt illegal.",
      comments: [{ a: "u_hannah", h: 56, l: 5, b: "Deleting felt illegal is going on a sticky note.", r: [{ a: "u_chloe", h: 55, b: "Make it two sticky notes." }] }, { a: "u_coach2", h: 50, b: "Welcome to the club. It gets less scary." }] },
    { id: "p13", authorId: "u_erin", h: 66, likes: 5, body: "Month-end close used to eat the last three days of the month. Blocked it as a Recurring Task with subtasks, two hours each. Closed a day early this month.", comments: [] },
    { id: "p14", authorId: "u_owen", h: 72, likes: 7, body: "Not a desk guy. Running my Daily Review on my phone in the truck before I head home. Takes 5 minutes. Still counts.",
      comments: [{ a: "u_maria", h: 70, b: "Absolutely counts. Love this." }] },
    { id: "p15", authorId: "u_andrew", h: 80, likes: 25, body: "Reminder: the point of the Daily Review isn't to grade your day. It's to decide what happens to the incomplete tasks so they don't follow you home. Backlog or Calendar. That's it.",
      comments: [{ a: "u_sam", h: 78, b: "Needed this one." }] },
    { id: "p16", authorId: "u_jamal", h: 90, likes: 6, body: "Sales team experiment: every rep shares their weekly plan in our Monday huddle. Pipeline meetings went from 60 minutes to 25.", comments: [] },
    { id: "p17", authorId: "u_hannah", h: 100, likes: 11, body: "Rolling Time Boss into new hire onboarding at Acme. Week one now includes their first Weekly Planning Meeting with their manager. Feedback welcome.",
      comments: [{ a: "u_zoe", h: 98, b: "Candidates are asking about it in interviews already." }] },
    { id: "p18", authorId: "u_aisha", h: 110, likes: 4, body: "Question for the group: do you put your Parking Lot in a notes app, on paper, or straight into your task manager?",
      comments: [{ a: "u_rachel", h: 108, b: "Paper. Crossing things off is half the joy." }, { a: "u_kenji", h: 107, b: "Task manager inbox, processed during Whirlwind." }, { a: "u_diego", h: 100, b: "Sticky note on my monitor. Thrown away daily.", r: [{ a: "u_aisha", h: 99, b: "Thrown away daily is the part I need. Thanks all." }] }] },
    { id: "p19", authorId: "u_omar", h: 124, likes: 5, body: "First Weekly Planning Meeting took 40 minutes, but I actually knew what Monday was for. Small win.", comments: [] },
    { id: "p20", authorId: "u_mei", h: 140, likes: 9, body: "Breaking big projects into subtasks with a clear definition of Done has fixed my 'I worked all day and nothing is finished' feeling. Highly recommend.", comments: [] },
    { id: "p21", authorId: "u_leah", h: 160, likes: 3, body: "Wholeheartedly commit sounded cheesy to me until I tried it. Saying 'this is the plan' out loud makes it easier to say no to the stuff that isn't.", comments: [] },
    { id: "p22", authorId: "u_coach2", h: 180, likes: 13, body: "Masterclass this Thursday: AI-Infused Productivity. We'll build a prompt that runs your Weekly Planning Meeting with you. RSVP in Events.",
      comments: [{ a: "u_tyler", h: 178, b: "RSVP'd. Bringing questions." }] },
    { id: "p23", authorId: "u_andre", h: 200, likes: 4, body: "Maintenance team blocked two hours of Whirlwind every afternoon for the radio and walk-ups. Mornings are for scheduled PMs only. Fewer half-finished jobs.", comments: [] },
    { id: "p24", authorId: "u_diego", h: 220, likes: 6, body: "Small win: planned next week's routes on Friday instead of Monday morning. Monday felt like a normal day for once.", comments: [] },
  ],

  // Answer pools used to generate realistic meeting history for demo users
  sampleAnswers: {
    weekly: {
      keep: ["Blocking Whirlwind time daily", "Planning on Friday afternoon", "Phone in another room for deep work", "Sharing my plan with the team"],
      start: ["Breaking tasks into 2-hour subtasks", "Protecting a lunch break", "Blocking personal priorities first", "Ending the day with a Daily Review"],
      stop: ["Checking email before 9am", "Saying yes to every meeting", "Working past 6pm", "Leaving incomplete tasks in my head"],
      dump: ["Vendor contract renewal\nQ4 headcount plan\nUpdate SOP for returns", "Customer QBR deck\nFix reporting dashboard\nInterview loop for analyst", "Budget reforecast\nSafety training schedule\nReply to RFP"],
      priorities: ["1. Q4 headcount plan\n2. Vendor contract renewal\n3. Returns SOP", "1. Customer QBR deck\n2. Analyst interviews\n3. Dashboard fix", "1. Budget reforecast\n2. RFP response\n3. Training schedule"],
      subtasks: ["Headcount plan: draft roles list (Done = shared with VP, 1.5h)\nVendor renewal: redline contract (Done = sent to legal, 2h)", "QBR deck: pull metrics (Done = numbers in slide 3, 1h)\nQBR deck: narrative (Done = draft sent to Grace, 2h)"],
      nofit: ["Process audit: defer to next month\nWebsite copy review: delegate to Chloe", "Old report cleanup: delete\nWeekly status email: digitize with a template", "Offsite planning: downsize to one afternoon"],
      shareWith: ["Maria", "My manager", "Leadership team channel", "My accountability partner"],
      note: ["Protect Thursday morning", "One thing at a time", "Home by 6 every day", ""],
    },
    daily: {
      worked: ["Morning block on the One-time Task held", "Parked three interruptions and cleared them in Whirlwind", "Started on time, finished on time", "Delegated the vendor follow-up"],
      didnt: ["Meetings ran over", "Got pulled into a customer escalation", "Skipped Whirlwind and email piled up", "Started late after a long commute"],
      correct: ["Add 15 minute buffers after meetings", "Move deep work earlier", "Block Whirlwind before lunch", "Say no to the 4pm add-on"],
      toBacklog: ["Process doc update", "Team survey draft", "Expense cleanup", ""],
      toCalendar: ["Finish forecast draft: tomorrow 9am", "Call supplier: tomorrow 2pm", "Review contract: Thursday 10am", ""],
      tomorrow: ["Forecast draft (unblocks the board pack)\nTwo interviews (we need the hire)", "Client QBR prep (renewal on the line)\nRoute review (saves fuel)", "Close the vendor deal (cost savings)\n1:1 with Dev (he's stuck)"],
      adjust: ["Moved the team sync to Thursday", "Shortened lunch meeting to 30 min", "None needed", "Pushed report to Friday"],
    },
  },

  // Explicit lesson progress for the demo users in each phase; everyone else gets generated progress
  progress: {
    u_sam: ["ws1"], // phase 1: partway through the workshop
    u_dev: ["ws1", "ws2", "ws3"], // phase 2: workshop done, cohort next
    u_maria: ["ws1", "ws2", "ws3", "dv1", "dv2", "dv3", "hsp1", "hsp2", "en1"], // phase 3
    u_lena: ["ws1", "ws2", "ws3", "dv1", "dv2", "dv3", "rc1", "qg1", "qg2"],
    u_omar: ["ws1", "ws2", "ws3"],
    u_tess: ["ws1", "ws2", "ws3", "mt1", "mt2", "en1", "en2"],
  },
};

window.TB_PROMPTS = {
  weekly: `You are my Time Boss coach. Run my Weekly Planning Meeting with me, one step at a time. Ask one question, wait for my answer, then move on. Be direct and push back when my plan doesn't fit my week.

Timing: prior to the beginning of my work week.

Time Boss terms:
- Highest Sustainable Pace (HSP): the pace I can hold week after week without burning out. Never let me plan above it.
- Backlog: my list of One-time Tasks not yet scheduled.
- Recurring Tasks: work that repeats on a schedule.
- Whirlwind time: blocks for unplanned work, my Parking Lot, and my inboxes.

REFLECT
1. Reflect on my week: in consideration of my HSP, what should I keep doing, start doing, and stop doing?
2. Dump what needs to be done: help me add any new One-time Tasks to my Backlog.

DECIDE
3. Decide what to do: prioritize all One-time Tasks that would be valuable to move forward next week.
4. Decide how to do it: break down the One-time Tasks that have to move forward next week into manageable subtasks with a clear definition of "Done" (2 hours max each).
5. Decide when to do it, in this order: (a) personal priorities are blocked, (b) Recurring Tasks are blocked, (c) Whirlwind time is blocked, (d) block my prioritized One-time Tasks in order of priority from my Backlog.
6. Decide what to do with what doesn't fit: defer, delegate, digitize, downsize, or delete. Only "do it" to keep promises or commitments.

COMMIT
7. Share my plan: ask who I'll share it with, and give me a short summary I can send them.
8. Wholeheartedly commit to my plan.

Start with step 1.`,

  daily: `You are my Time Boss coach. Run my Daily Review Meeting with me at the end of my workday. 15 minutes. One question at a time, short and direct.

Time Boss terms:
- Backlog: my list of One-time Tasks not yet scheduled.
- Whirlwind time: blocks for unplanned work, my Parking Lot, and my inboxes.

REFLECT
1. What worked? What didn't work? What needs course correction?

DECIDE
2. Decide what to do with incomplete tasks: each one goes to my Backlog or onto my Calendar.

COMMIT
3. Review tomorrow's plan with me. Remind me of the value of each item, and help me make adjustments as needed.

Finish with a 5-bullet summary I can save. Start with step 1.`,
};
