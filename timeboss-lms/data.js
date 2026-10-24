// Seed content + demo data. Everything here is editable copy for the prototype.
// Course text is placeholder written to the Time Boss frameworks; swap in the real curriculum.

window.TB_SEED = {
  companies: [
    { id: "acme", name: "Acme Logistics", color: "#2f6fed", seats: 25 },
    { id: "northwind", name: "Northwind Health", color: "#13a37f", seats: 12 },
    { id: "brightline", name: "Brightline Studio", color: "#b4479d", seats: 8 },
  ],

  users: [
    { id: "u_andrew", name: "Andrew Hartman", title: "Founder, Time Boss", companyId: null, role: "coach" },
    { id: "u_coach2", name: "Jordan Reyes", title: "Time Boss Coach", companyId: null, role: "coach" },
    { id: "u_maria", name: "Maria Chen", title: "VP Operations", companyId: "acme", role: "admin" },
    { id: "u_dev", name: "Dev Patel", title: "Dispatch Manager", companyId: "acme", role: "member" },
    { id: "u_sam", name: "Sam Okafor", title: "Account Lead", companyId: "acme", role: "member" },
    { id: "u_lena", name: "Lena Fischer", title: "Clinic Director", companyId: "northwind", role: "admin" },
    { id: "u_omar", name: "Omar Haddad", title: "Practice Manager", companyId: "northwind", role: "member" },
    { id: "u_tess", name: "Tess Morgan", title: "Creative Director", companyId: "brightline", role: "admin" },
  ],

  coaches: ["u_andrew", "u_coach2"],

  // Core program + mini courses. Lessons: { id, title, mins, body (html-ish paragraphs), action }
  courses: [
    {
      id: "workshop",
      kind: "core",
      title: "The Time Boss Workshop",
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
        { id: "ws3", title: "Your weekly operating rhythm", mins: 12,
          body: ["Two meetings run the whole system: a weekly planning meeting with yourself and a daily review.",
                 "Weekly sets direction. Daily keeps you honest. Everything else is execution."],
          action: "Block 45 minutes for weekly planning and 10 minutes for daily review on your calendar, recurring." },
      ],
    },
    {
      id: "diversions",
      kind: "core",
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
      id: "rootcause",
      kind: "core",
      title: "Solving the Root Cause of Diversions",
      blurb: "Stop playing whack-a-mole. Find the system, habit, or belief that keeps producing the same diversion.",
      lessons: [
        { id: "rc1", title: "Symptoms vs. sources", mins: 8,
          body: ["If the same diversion shows up three times, it isn't an interruption. It's a process.",
                 "Recurring diversions usually trace back to one of: unclear ownership, missing systems, unclear priorities, or a personal belief ('I have to be available')."],
          action: "From your diversion log, circle anything that appeared 3+ times." },
        { id: "rc2", title: "The 5 Whys for your calendar", mins: 10,
          body: ["Ask why the diversion happened. Then ask why that happened. Keep going until you hit something you can change once and benefit from forever.",
                 "You'll know you've hit the root when the fix is a decision, a document, or a conversation, not a reminder to try harder."],
          action: "Run 5 Whys on your top recurring diversion. Write the root and the one-time fix." },
        { id: "rc3", title: "Installing the fix", mins: 9,
          body: ["Root-cause fixes need an owner, a date, and a check-in. Treat them like projects, not resolutions.",
                 "Track the diversion for two weeks after the fix. If it drops, you found it."],
          action: "Schedule your fix and a 2-week follow-up in your weekly plan." },
      ],
    },
    {
      id: "hsp",
      kind: "core",
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

  dailyPrompts: [
    "What's one diversion you said no to yesterday? How did it feel?",
    "Where is your energy highest today, and what are you putting there?",
    "What meeting this week could have been an email?",
    "What's one thing you're doing that someone else should own?",
    "What would make today a win if it were the only thing you finished?",
    "Which recurring diversion are you most ready to solve at the root?",
    "Are you above, at, or below your Highest Sustainable Pace this week? Why?",
    "What did you learn from last week's plan vs. what actually happened?",
    "What's the hardest thing on your list, and when are you doing it?",
    "Name one boundary that protected your time this week.",
    "What would you delegate if you trusted it would be done right?",
    "Which of your quarterly goals got the least attention this week?",
    "What's one AI prompt that saved you time recently? Share it.",
    "What does a sustainable week look like for you, in one sentence?",
  ],

  masterclasses: [
    { title: "AI-Infused Productivity", desc: "Build an AI chief of staff that plans your week, triages your inbox, and preps your meetings." },
    { title: "Leading a Time Boss Team", desc: "Install weekly planning and diversion defenses across your whole team." },
    { title: "Q1 Goal Setting Intensive", desc: "Leave with three quarterly outcomes and a 13-week plan." },
  ],

  cohort: {
    name: "Master Your Week",
    startsOn: "2026-11-16",
    weeks: 6,
    seatsLeft: 9,
    url: "https://timeboss.us",
    bullets: [
      "6 weeks, live with a Time Boss coach",
      "Install weekly planning + daily review for good",
      "Small cohort, real accountability",
    ],
  },

  posts: [
    { id: "p1", scope: "common", authorId: "u_andrew", ts: -3600e3 * 5, body: "Welcome to the Time Boss community. Introduce yourself: name, role, and the one diversion you'd love to never see again.", likes: ["u_maria", "u_lena", "u_tess"],
      comments: [{ authorId: "u_lena", ts: -3600e3 * 4, body: "Lena, clinic director. 'Got a sec?' drop-ins. Every day." },
                 { authorId: "u_tess", ts: -3600e3 * 3, body: "Tess here. Slack. Just... Slack." }] },
    { id: "p2", scope: "common", authorId: "u_omar", ts: -3600e3 * 26, body: "Ran my first weekly planning meeting with the tool here. Took 40 min, but I actually knew what Monday was for. Small win.", likes: ["u_andrew", "u_dev"], comments: [] },
    { id: "p3", scope: "acme", authorId: "u_maria", ts: -3600e3 * 8, body: "Team: let's all finish Dealing with Diversions by Friday. We'll compare diversion logs in Monday's ops sync.", likes: ["u_dev"],
      comments: [{ authorId: "u_dev", ts: -3600e3 * 7, body: "On it. Mine is 90% radio calls from drivers." }] },
    { id: "p4", scope: "northwind", authorId: "u_lena", ts: -3600e3 * 30, body: "Trying a 'front desk office hours' block 2 to 3pm so staff batch questions. Will report back.", likes: ["u_omar"], comments: [] },
    { id: "p5", scope: "brightline", authorId: "u_tess", ts: -3600e3 * 12, body: "Studio rule starting Monday: no meetings before 11am. Peak hours are for making.", likes: [], comments: [] },
  ],

  // Seed progress so dashboards don't look empty
  progress: {
    u_maria: ["ws1", "ws2", "ws3", "dv1", "dv2", "hsp1", "en1"],
    u_dev: ["ws1", "ws2", "dv1"],
    u_sam: ["ws1"],
    u_lena: ["ws1", "ws2", "ws3", "dv1", "dv2", "dv3", "rc1", "qg1", "qg2"],
    u_omar: ["ws1", "ws2", "ws3", "hsp1", "hsp2"],
    u_tess: ["ws1", "mt1", "mt2", "en1", "en2"],
  },
};

window.TB_PROMPTS = {
  weekly: `You are my Time Boss weekly planning coach. Run my weekly planning meeting with me, one step at a time. Ask one question, wait for my answer, then move on. Be direct and push back when my plan is unrealistic.

Framework (Time Boss):
- Highest Sustainable Pace (HSP): the amount of focused work I can sustain week after week with energy at 3/5 or better. Never let me plan above it.
- Diversions: anything that pulls me off what I decided matters. Each gets one response: Do, Defer, Delegate, or Decline. Recurring diversions need a root-cause fix.
- Big 3: the three outcomes that make this week a win. Each should move a quarterly goal.

Steps:
1. Review last week: wins, misses, what diverted me, energy (1-5), focused hours.
2. Brain dump: everything on my mind. Help me sort it.
3. Quarterly check: remind me of my 3 quarterly goals (ask me if you don't know them).
4. Big 3: help me choose this week's Big 3 and tie each to a goal.
5. Pace check: count my focus blocks against my HSP. Cut if over.
6. Diversion plan: name the 2-3 diversions most likely this week and pre-decide my response.
7. Calendar: have me block time for the Big 3 in my peak energy hours.
8. Commit: summarize the plan in a tight bulleted list I can paste into my calendar or notes.

Start with step 1.`,

  daily: `You are my Time Boss daily review coach. Run a 10-minute end-of-day review with me. One question at a time, short and direct.

Framework (Time Boss):
- Diversions get one of four responses: Do, Defer, Delegate, Decline. Recurring ones need a root-cause fix.
- Highest Sustainable Pace: I should end the day with enough energy for tomorrow.

Steps:
1. Wins: what did I finish today? Did I move my weekly Big 3?
2. Diversions: what pulled me off plan? For each, which response did I use, and which should I have used? Flag anything that's happened 3+ times as a root-cause candidate.
3. Energy: rate 1-5. If under 3, ask what drained me.
4. Tomorrow: what are my top 3? What's the first thing I do?
5. One improvement for tomorrow.
6. Summarize in 5 bullets I can save.

Start with step 1.`,
};
