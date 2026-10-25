// Time Boss Community prototype. No backend: state lives in localStorage.
(() => {
  const SEED = window.TB_SEED;
  const KEY = "tb_lms_v3"; // bump when the saved data shape changes so browsers reload the demo data
  const DAY = 864e5;

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = (n) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const pad2 = (n) => String(n).padStart(2, "0");
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fmtDate = (t, o = { weekday: "short", month: "short", day: "numeric" }) => new Date(t).toLocaleDateString(undefined, o);
  const fmtTime = (t) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const ago = (t) => {
    const s = (Date.now() - t) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const paras = (txt) => esc(txt).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  const uid = () => Math.random().toString(36).slice(2, 10);
  const uidKey = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  // Seeded PRNG (mulberry32) so generated demo history is the same on every reset
  const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  // ---------- calendar math ----------
  const at = (date, h, m = 0) => { const d = new Date(date); d.setHours(h, m, 0, 0); return d.getTime(); };
  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d; };
  const isWorkday = (d) => d.getDay() > 0 && d.getDay() < 6;
  const prevWorkday = (d) => { const x = new Date(d); do x.setDate(x.getDate() - 1); while (!isWorkday(x)); return x; };
  const mondayOf = (t) => { const d = startOfDay(t); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
  // A Weekly Planning Meeting run Fri to Sun plans the following week; Mon to Thu plans the current week
  const plannedWeek = (t) => { const d = new Date(t), m = mondayOf(t); if (d.getDay() === 0 || d.getDay() >= 5) m.setDate(m.getDate() + 7); return dateKey(m); };

  // ---------- tools (Time Boss "Checklist for Your Week") ----------
  const TOOLS = {
    weekly: {
      title: "Weekly Planning Meeting",
      mins: 45,
      when: "Prior to the beginning of your work week",
      prompt: window.TB_PROMPTS.weekly,
      steps: [
        { phase: "Reflect", title: "Reflect on your week", guide: "In consideration of your Highest Sustainable Pace, what should you keep doing, start doing, and/or stop doing?",
          fields: [{ k: "keep", label: "Keep doing", type: "textarea", rows: 2 }, { k: "start", label: "Start doing", type: "textarea", rows: 2 }, { k: "stop", label: "Stop doing", type: "textarea", rows: 2 }] },
        { phase: "Reflect", title: "Dump what needs to be done", guide: "Add any new One-time Tasks to your Backlog.",
          fields: [{ k: "dump", label: "New One-time Tasks for your Backlog (one per line)", type: "textarea", rows: 7 }] },
        { phase: "Decide", title: "Decide what to do", guide: "Prioritize all One-time Tasks that would be valuable to move forward next week.",
          fields: [{ k: "priorities", label: "Prioritized One-time Tasks for next week, most important first", type: "textarea", rows: 6 }] },
        { phase: "Decide", title: "Decide how to do it", guide: "Break down the One-time Tasks that have to move forward next week into manageable subtasks with a clear definition of \"Done\" (2 hours max).",
          fields: [{ k: "subtasks", label: "Subtasks and their definition of Done", type: "textarea", rows: 6, ph: "Board deck: outline (Done = approved by CFO, 1.5h)" }] },
        { phase: "Decide", title: "Decide when to do it", guide: "Block your calendar in this order.",
          fields: [{ k: "personal", label: "Personal priorities are blocked", type: "check" }, { k: "recurring", label: "Recurring Tasks are blocked", type: "check" },
                   { k: "whirlwind", label: "Whirlwind time is blocked", type: "check" }, { k: "onetime", label: "Prioritized One-time Tasks are blocked, in order of priority from your Backlog", type: "check" }] },
        { phase: "Decide", title: "Decide what to do with what doesn't fit", guide: "Defer, delegate, digitize, downsize, or delete tasks that don't fit next week. Only \"do it\" to keep promises or commitments.",
          fields: [{ k: "nofit", label: "What doesn't fit, and what you'll do with it", type: "textarea", rows: 5, ph: "Vendor review: delegate to Sam" }] },
        { phase: "Commit", title: "Share your plan", guide: "Share your plan with someone to increase your commitment.", share: true,
          fields: [{ k: "shareWith", label: "Who you're sharing it with", type: "text" }, { k: "shared", label: "I shared my plan", type: "check" }] },
        { phase: "Commit", title: "Wholeheartedly commit to your plan", guide: "This is the plan. Commit to it.",
          fields: [{ k: "committed", label: "I wholeheartedly commit to my plan", type: "check" }, { k: "note", label: "Anything to remember this week (optional)", type: "text" }] },
      ],
    },
    daily: {
      title: "Daily Review Meeting",
      mins: 15,
      when: "End of your workday · 15 minutes",
      prompt: window.TB_PROMPTS.daily,
      steps: [
        { phase: "Reflect", title: "Reflect on your day", guide: "What worked? What didn't work? What needs course correction?",
          fields: [{ k: "worked", label: "What worked", type: "textarea", rows: 2 }, { k: "didnt", label: "What didn't work", type: "textarea", rows: 2 }, { k: "correct", label: "What needs course correction", type: "textarea", rows: 2 }] },
        { phase: "Decide", title: "Decide what to do with incomplete tasks", guide: "Each incomplete task goes to your Backlog or onto your Calendar.",
          fields: [{ k: "toBacklog", label: "Moved to Backlog", type: "textarea", rows: 3 }, { k: "toCalendar", label: "Moved onto Calendar (with when)", type: "textarea", rows: 3 }] },
        { phase: "Commit", title: "Review tomorrow's plan", guide: "Review tomorrow's plan, remind yourself of the value of each item, and make adjustments as needed.",
          fields: [{ k: "tomorrow", label: "Tomorrow's priorities and why each matters", type: "textarea", rows: 4 }, { k: "adjust", label: "Adjustments", type: "text" }] },
      ],
      during: ["Work the priorities on your Calendar",
               "Navigate Unknown Tasks: deflect them to your Parking Lot, or work them and \"time trade\" your scheduled task into your Whirlwind time",
               "Work your Whirlwind time: complete items on your Parking Lot, then work your inboxes (email, messages, voicemail)"],
    },
  };

  function runToMarkdown(tool, answers, ts) {
    const t = TOOLS[tool];
    let md = `# ${t.title}: ${fmtDate(ts, { weekday: "long", month: "long", day: "numeric" })}\n`;
    t.steps.forEach((s) => {
      const lines = s.fields.filter((f) => answers[f.k]).map((f) => f.type === "check" ? `- [x] ${f.label}` : `- **${f.label}:** ${String(answers[f.k]).replace(/\n/g, "\n  ")}`);
      if (lines.length) md += `\n## ${s.phase}: ${s.title}\n${lines.join("\n")}\n`;
    });
    return md;
  }

  // ---------- phases ----------
  // 1. Unlock Your Week Workshop → 2. Master Your Week Cohort → 3. Maximize Your Week (ongoing education)
  const WORKSHOP = "workshop";
  const PHASES = [
    { n: 1, name: "Unlock Your Week", sub: "Workshop" },
    { n: 2, name: "Master Your Week", sub: "Group Coaching Cohort" },
    { n: 3, name: "Maximize Your Week", sub: "Continuing Education" },
  ];

  // ---------- store ----------
  function freshState() {
    const now = Date.now();
    const users = SEED.users.map((u) => {
      const c = SEED.companies.find((x) => x.id === u.companyId);
      return { ...u, mywDone: u.phase === 3, mywEnrolled: u.phase === 3 || !!u.enrolled, email: u.email || `${u.name.split(" ")[0].toLowerCase()}@${c ? c.domain : "timeboss.us"}` };
    });
    const members = users.filter((u) => u.role !== "coach");
    const likers = (n, seed, exclude) => { const r = rng(seed); return users.filter((u) => u.id !== exclude).map((u) => [r(), u.id]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]); };

    // Generated meeting history: a Markov chain per user so streaks look like real habits
    const toolRuns = [];
    const answersFor = (tool, r) => Object.fromEntries(TOOLS[tool].steps.flatMap((s) => s.fields).map((f) => [f.k, f.type === "check" ? "Yes" : pick(r, SEED.sampleAnswers[tool][f.k] || [""])]));
    // Habits start with the cohort: none for people not yet enrolled, and only since the current cohort began for those in it
    members.filter((u) => u.phase === 3 || u.enrolled).forEach((u) => {
      const r = rng(uidKey(u.id)), base = u.habit ?? 0.35 + r() * 0.6;
      const weeksBack = u.phase === 3 ? 10 : SEED.cohort.currentWeek - 1;
      let prev = true;
      for (let i = u.phase === 3 ? 60 : weeksBack * 7 + 5; i >= 1; i--) {
        const d = startOfDay(now - i * DAY);
        if (!isWorkday(d)) continue;
        prev = r() < (prev ? Math.min(0.96, base + 0.05) : Math.max(0.15, base - 0.15));
        if (prev) toolRuns.push({ id: uid(), userId: u.id, tool: "daily", ts: at(d, 16, 30 + Math.floor(r() * 40)), answers: answersFor("daily", r) });
      }
      prev = true;
      for (let w = weeksBack; w >= 0; w--) {
        const sun = mondayOf(now - w * 7 * DAY);
        sun.setDate(sun.getDate() - 1);
        prev = r() < (prev ? Math.min(0.94, base + 0.02) : Math.max(0.2, base - 0.2));
        if (prev) toolRuns.push({ id: uid(), userId: u.id, tool: "weekly", ts: at(sun, 17, Math.floor(r() * 50)), answers: answersFor("weekly", r) });
      }
    });

    // Lesson progress: explicit where seeded, otherwise by phase (workshop first) and scaled to habit strength
    const wsIds = SEED.courses.find((c) => c.id === WORKSHOP).lessons.map((l) => l.id);
    const lessonIds = SEED.courses.filter((c) => c.id !== WORKSHOP).flatMap((c) => c.lessons.map((l) => l.id));
    const progress = {};
    members.forEach((u) => {
      const r = rng(uidKey(u.id) + 1);
      const ids = SEED.progress[u.id] || (u.phase === 1 ? wsIds.slice(0, Math.floor(r() * wsIds.length))
        : u.phase === 2 ? wsIds : [...wsIds, ...lessonIds.slice(0, Math.floor(lessonIds.length * (u.habit ?? 0.5) * (0.3 + r() * 0.6)))]);
      progress[u.id] = Object.fromEntries(ids.map((id, i) => [id, now - (ids.length - i) * DAY]));
    });

    // Prompt replies for today and the three previous days
    const promptReplies = {};
    for (let i = 0; i < 4; i++) {
      const d = new Date(now - i * DAY);
      promptReplies[dateKey(d)] = promptFor(d).replies.map((x, j) => ({ authorId: x.a, body: x.b, ts: i === 0 ? now - (j + 1) * 5400e3 : at(d, 9 + j * 2) }));
    }

    return {
      sessionUserId: null,
      companies: SEED.companies.slice(),
      users,
      posts: SEED.posts.map((p) => ({ id: p.id, authorId: p.authorId, body: p.body, ts: now - p.h * 3600e3, likes: likers(p.likes, uidKey(p.id), p.authorId),
        comments: p.comments.map((c) => ({ authorId: c.a, body: c.b, ts: now - c.h * 3600e3 })) })),
      progress,
      promptReplies, // dateKey -> [{authorId, ts, body}]
      rsvps: {}, // eventId -> [userId]
      toolRuns, // {id, userId, tool, ts, answers}
      drafts: {}, // userId|tool -> {step, answers, startedAt}
    };
  }
  function promptFor(d = new Date()) {
    const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / DAY);
    return SEED.dailyPrompts[day % SEED.dailyPrompts.length];
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || freshState(); } catch { S = freshState(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

  const me = () => S.users.find((u) => u.id === S.sessionUserId);
  const user = (id) => S.users.find((u) => u.id === id) || { name: "Unknown", id };
  const company = (id) => S.companies.find((c) => c.id === id);
  const isCoach = (u = me()) => u && u.role === "coach";
  const teamOf = (cid) => S.users.filter((u) => u.companyId === cid);
  const avatar = (u, size = "") => `<span class="avatar ${size}" style="background:${u.companyId ? company(u.companyId)?.color : "#5e8497"}">${esc(initials(u.name))}</span>`;

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove("show"), 2600);
  }
  async function copy(text, label = "Copied") {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = Object.assign(document.createElement("textarea"), { value: text });
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    toast(label);
  }

  // ---------- progress + habit metrics ----------
  const courseById = (id) => SEED.courses.find((c) => c.id === id);
  // Single-session courses (e.g. each Root Cause part) open straight to their content
  const courseHref = (c) => (c.lessons.length === 1 ? `#/learn/${c.id}/${c.lessons[0].id}` : `#/learn/${c.id}`);
  const seriesLen = (c) => SEED.courses.filter((x) => x.series === c.series).length;
  const nextInSeries = (c) => c.series && SEED.courses.find((x) => x.series === c.series && x.part === c.part + 1);
  const workshopDone = (id) => courseProgress(id, courseById(WORKSHOP)).pct === 100;
  const phaseOf = (u = me()) => (u.role === "coach" || u.mywDone ? 3 : workshopDone(u.id) ? 2 : 1);
  const unlocked = (c, u = me()) => c.id === WORKSHOP || phaseOf(u) === 3;
  // Habits (Weekly Planning + Daily Review Meetings, streaks) and Events open once someone starts Master Your Week (enrolls)
  const enrolled = (u = me()) => phaseOf(u) === 3 || (phaseOf(u) === 2 && !!u.mywEnrolled);
  const hasHabits = enrolled;
  const phaseLabel = (u) => (u.role === "coach" ? "Coach" : phaseOf(u) === 2 ? (enrolled(u) ? "Master Your Week, in the cohort" : "Master Your Week, ready to enroll") : PHASES[phaseOf(u) - 1].name);
  const nextLessonIn = (u, courses) => { for (const c of courses) { const l = c.lessons.find((x) => !done(u.id)[x.id]); if (l) return { c, l }; } return null; };
  const allLessons = () => SEED.courses.flatMap((c) => c.lessons.map((l) => ({ ...l, courseId: c.id })));
  const done = (userId) => S.progress[userId] || {};
  function courseProgress(userId, course) {
    const d = done(userId);
    const n = course.lessons.filter((l) => d[l.id]).length;
    return { n, total: course.lessons.length, pct: Math.round((n / course.lessons.length) * 100) };
  }
  function overallProgress(userId) {
    const ls = allLessons(), d = done(userId);
    const n = ls.filter((l) => d[l.id]).length;
    return { n, total: ls.length, pct: Math.round((n / ls.length) * 100) };
  }
  const runsOf = (userId, tool) => S.toolRuns.filter((r) => r.userId === userId && r.tool === tool);
  const drmDays = (id) => new Set(runsOf(id, "daily").map((r) => dateKey(new Date(r.ts))));
  const wpmWeeks = (id) => new Set(runsOf(id, "weekly").map((r) => plannedWeek(r.ts)));
  // Consecutive workdays with a Daily Review Meeting. Today only counts once it's done.
  function drmStreak(id) {
    const days = drmDays(id);
    let d = startOfDay(Date.now());
    if (!isWorkday(d) || !days.has(dateKey(d))) d = prevWorkday(d);
    let n = 0;
    while (days.has(dateKey(d))) { n++; d = prevWorkday(d); }
    return n;
  }
  // Consecutive planned weeks. Next week counts if it's already planned; this week gets grace until it ends.
  function wpmStreak(id) {
    const weeks = wpmWeeks(id), d = mondayOf(Date.now());
    const next = new Date(d); next.setDate(next.getDate() + 7);
    if (weeks.has(dateKey(next))) d.setTime(next.getTime());
    else if (!weeks.has(dateKey(d))) d.setDate(d.getDate() - 7);
    let n = 0;
    while (weeks.has(dateKey(d))) { n++; d.setDate(d.getDate() - 7); }
    return n;
  }
  // Past month completion: Daily Review Meetings over the last 30 days of workdays, Weekly Planning Meetings over the last 4 weeks
  function monthStats(id) {
    const days = drmDays(id), weeks = wpmWeeks(id);
    let de = 0, dg = 0, we = 0, wg = 0;
    for (let i = 1; i <= 30; i++) { const d = startOfDay(Date.now() - i * DAY); if (isWorkday(d)) { de++; if (days.has(dateKey(d))) dg++; } }
    for (let i = 0; i < 4; i++) { const d = mondayOf(Date.now()); d.setDate(d.getDate() - 7 * i); we++; if (weeks.has(dateKey(d))) wg++; }
    return { drm: Math.round((dg / de) * 100), wpm: Math.round((wg / we) * 100), all: Math.round(((dg + wg) / (de + we)) * 100) };
  }
  const bar = (pct, cls = "") => `<div class="bar ${cls}"><span style="width:${pct}%"></span></div>`;
  const avgOf = (list, f) => (list.length ? list.reduce((a, m) => a + f(m), 0) / list.length : 0);

  // ---------- schedule ----------
  function weeklyPlanningEvents() {
    const out = [], d = new Date();
    d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7)); // next Friday
    for (let i = 0; i < 4; i++) {
      const start = at(d, 14, 0);
      out.push({ id: "wp-" + dateKey(new Date(start)), type: "weekly", title: "Weekly Planning Meeting (live, group)", desc: "Plan next week alongside other Time Bosses, with a coach on hand.", start, mins: 45, host: "u_coach2" });
      d.setDate(d.getDate() + 7);
    }
    return out;
  }
  function masterclassEvents() {
    const out = [], now = new Date();
    for (let i = 0; out.length < 3 && i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      while (d.getDay() !== 4) d.setDate(d.getDate() + 1); // first Thursday
      const start = at(d, 12, 0);
      if (start < Date.now()) continue;
      const mc = SEED.masterclasses[out.length];
      out.push({ id: "mc-" + dateKey(d), type: "masterclass", title: "Masterclass: " + mc.title, desc: mc.desc, start, mins: 60, host: "u_andrew" });
    }
    return out;
  }
  const allEvents = () => [...masterclassEvents(), ...weeklyPlanningEvents()];
  const rsvpd = (eid, u = me().id) => (S.rsvps[eid] || []).includes(u);
  function icsFor(e) {
    const f = (t) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const x = (s) => String(s).replace(/[\\,;]/g, (c) => "\\" + c);
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Time Boss//Community//EN", "BEGIN:VEVENT", `UID:${e.id}@timeboss.us`, `DTSTAMP:${f(Date.now())}`,
      `DTSTART:${f(e.start)}`, `DTEND:${f(e.start + e.mins * 60e3)}`, `SUMMARY:${x(e.title)}`, `DESCRIPTION:${x(e.desc || "")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  }

  // Line icons in the timeboss.us style (feather-like, teal stroke)
  const ICON = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    community: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5c2.4 0 4 1.6 4.5 4"/>',
    company: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4"/>',
    learn: '<path d="M2 6.5 12 3l10 3.5-10 3.5z"/><path d="M6 8.5V14c0 1.7 2.7 3 6 3s6-1.3 6-3V8.5"/>',
    events: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    office: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    weekly: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    daily: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  };
  const icon = (k, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  // White logo from www.timeboss.us/images/Time_Boss_Logo_White.png, for dark (navy) backgrounds
  const LOGO = "assets/time-boss-logo-white.png";
  // Use the real logo only once it has loaded; otherwise show the wordmark (no flicker on re-render)
  let logoOk = false;
  Object.assign(new Image(), { onload: () => { logoOk = true; render(); }, src: LOGO });
  const wordmark = (sub) => `<div class="brand"><span class="logo">${icon("clock")}</span><div><b>TIME BOSS</b>${sub ? `<small>${sub}</small>` : ""}</div></div>`;
  const logo = (sub) => (logoOk ? `<img class="brand-img" src="${LOGO}" alt="Time Boss">${sub ? `<small class="brand-sub">${sub}</small>` : ""}` : wordmark(sub));

  // ---------- layout ----------
  function nav() {
    const u = me(), c = company(u.companyId), r = location.hash;
    const link = (href, label, ic, locked = false) => `<a href="${href}" class="${r === href || r.startsWith(href + "/") ? "active" : ""} ${locked ? "locked" : ""}">${icon(ic)}<span>${label}</span>${locked ? icon("lock", "ic lock nav-lock") : ""}</a>`;
    const lockH = !hasHabits(u);
    return `
      <div class="brand-wrap">${logo("Community")}</div>
      <nav>
        ${link("#/home", "Home", "home")}
        ${link("#/community", "Community", "community")}
        ${c ? link("#/company", esc(c.name), "company") : ""}
        ${isCoach() ? link("#/companies", "Companies", "company") : ""}
        <div class="navlabel">Learn</div>
        ${link("#/learn", "Courses", "learn")}
        <div class="navlabel">Live</div>
        ${link("#/events", "Events & RSVP", "events", lockH)}
        ${link("#/office-hours", "Office Hours", "office")}
        <div class="navlabel">Habits</div>
        ${link("#/tools/weekly", "Weekly Planning Meeting", "weekly", lockH)}
        ${link("#/tools/daily", "Daily Review Meeting", "daily", lockH)}
      </nav>
      ${mywCta()}
      <div class="me">${avatar(u)}<div><b>${esc(u.name)}</b><small>${c ? esc(c.name) : "Time Boss Team"}${u.role !== "member" ? " · " + u.role : ""}</small></div>
        <button class="ghost sm" data-action="logout" title="Switch user">Switch</button></div>`;
  }

  // The one "next step" card, same look everywhere (sidebar, community). Content follows the member's phase.
  function mywCta() {
    const u = me(), ph = phaseOf(u), c = SEED.cohort;
    if (ph === 1) {
      const p = courseProgress(u.id, courseById(WORKSHOP)), nx = nextLessonIn(u, [courseById(WORKSHOP)]);
      return `<div class="myw"><span class="myw-when">Step 1 of 3 · ${p.n} of ${p.total} lessons done</span>
        <h3>Unlock Your Week Workshop</h3><p>Finish the workshop to unlock the Master Your Week Cohort.</p>
        <a class="btn accent sm" href="#/learn/${WORKSHOP}/${nx.l.id}">Complete Workshop</a></div>`;
    }
    if (ph === 2 && enrolled(u)) return `<div class="myw"><span class="myw-when">Step 2 of 3 · week ${c.currentWeek} of ${c.weeks}</span>
      <h3>You're in ${esc(c.name)}</h3><p>Group Coaching Cohort. Keep your Weekly Planning Meeting and Daily Review Meeting going between sessions.</p>
      <a class="btn accent sm" href="#/cohort">View cohort</a></div>`;
    if (ph === 2) return `<div class="myw"><span class="myw-when">Step 2 of 3 · next cohort starts ${fmtDate(c.startsOn + "T12:00", { month: "long", day: "numeric" })}</span>
      <h3>${esc(c.name)} Cohort</h3><p>${c.weeks} weeks, live with a Time Boss coach. ${c.seatsLeft} seats left.</p>
      <button class="btn accent sm" data-action="enroll">Enroll in Cohort</button></div>`;
    const mc = masterclassEvents()[0], going = rsvpd(mc.id);
    return `<div class="myw"><span class="myw-when">Next masterclass · ${fmtDate(mc.start, { weekday: "short", month: "short", day: "numeric" })}</span>
      <h3>${esc(mc.title.replace("Masterclass: ", ""))}</h3><p>${esc(mc.desc)}</p>
      ${going ? `<a class="btn accent sm" href="#/events">✓ You're going</a>` : `<button class="btn accent sm" data-action="rsvp" data-id="${mc.id}">RSVP for Masterclass</button>`}</div>`;
  }

  // Home: where you are in the three phases, and the next step
  function phaseCard() {
    const u = me(), ph = phaseOf(u), c = SEED.cohort;
    const track = `<ol class="phase-track">${PHASES.map((p) => `<li class="${p.n < ph ? "done" : p.n === ph ? "current" : ""}"><span class="phase-n">${p.n < ph ? "✓" : p.n}</span><span class="phase-name"><b>${p.name}</b><small>${p.sub}</small></span>${p.n === ph ? `<span class="sr-only">(you are here)</span>` : ""}</li>`).join("")}</ol>`;
    let body;
    if (ph === 1) {
      const p = courseProgress(u.id, courseById(WORKSHOP)), nx = nextLessonIn(u, [courseById(WORKSHOP)]);
      body = `<h2>Complete the Unlock Your Week Workshop</h2><p>${p.n} of ${p.total} lessons done. Up next: ${esc(nx.l.title)} (${nx.l.mins} min). Finishing the workshop unlocks the Master Your Week Cohort.</p>
        ${bar(p.pct)}<div class="row"><a class="btn" href="#/learn/${WORKSHOP}/${nx.l.id}">Complete Workshop</a></div>`;
    } else if (ph === 2 && enrolled(u)) {
      body = `<h2>You're in the Master Your Week Cohort</h2><p>Week ${c.currentWeek} of ${c.weeks} of the Group Coaching Cohort. Your habits are open: run your Weekly Planning Meeting before each work week and your Daily Review Meeting at the end of each workday. Completing the cohort unlocks Maximize Your Week.</p>
        <div class="row"><a class="btn" href="#/tools/weekly">Run Weekly Planning Meeting</a><a class="btn ghost" href="#/cohort">View cohort</a></div>`;
    } else if (ph === 2) {
      body = `<h2>Enroll in the Master Your Week Cohort</h2><p>You finished the workshop. The next cohort starts ${fmtDate(c.startsOn + "T12:00", { weekday: "long", month: "long", day: "numeric" })}: ${c.weeks} weeks, live with a Time Boss coach, ${c.seatsLeft} seats left. Enrolling opens your habits: the Weekly Planning Meeting, the Daily Review Meeting, and live events.</p>
        <div class="row"><button class="btn" data-action="enroll">Enroll in Cohort</button><a class="btn ghost" href="#/cohort">About the cohort</a></div>`;
    } else {
      const nx = nextLessonIn(u, [...SEED.courses.filter((x) => x.kind === "mini"), ...SEED.courses.filter((x) => x.kind === "cohort")]), mc = masterclassEvents()[0], wp = weeklyPlanningEvents()[0];
      const rsvpBtn = (e, label) => rsvpd(e.id) ? `<a class="btn ghost" href="#/events">✓ Going ${fmtDate(e.start, { month: "short", day: "numeric" })}</a>` : `<button class="btn ghost" data-action="rsvp" data-id="${e.id}">${label}</button>`;
      body = `<h2>Maximize Your Week</h2><p>Ongoing education: mini courses, a monthly masterclass, and live Weekly Planning Meetings.${nx ? ` Up next: ${esc(nx.l.title)} in ${esc(nx.c.title)}.` : ""}</p>
        <div class="row">${nx ? `<a class="btn" href="#/learn/${nx.c.id}/${nx.l.id}">Watch Next Course</a>` : `<a class="btn" href="#/learn">Browse courses</a>`}
        ${rsvpBtn(mc, "RSVP for Next Masterclass")}${rsvpBtn(wp, "RSVP for Weekly Planning Meeting")}</div>`;
    }
    return `<section class="card phase-card" aria-label="Your phase">${track}<div class="phase-body">${body}</div></section>`;
  }

  const SOCIAL = {
    Instagram: ["https://www.instagram.com/timebossus", '<path d="M12 2.2c3.2 0 3.6 0 4.9.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85 0 3.2 0 3.58-.07 4.85-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.9.07-3.2 0-3.58 0-4.85-.07-3.26-.15-4.77-1.7-4.92-4.92C2.2 15.58 2.2 15.2 2.2 12c0-3.2 0-3.58.07-4.85C2.42 3.92 3.93 2.38 7.15 2.27 8.42 2.21 8.8 2.2 12 2.2Zm0 4.86a4.94 4.94 0 1 0 0 9.88 4.94 4.94 0 0 0 0-9.88Zm0 8.14a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm5.14-9.49a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Z"/>'],
    LinkedIn: ["https://www.linkedin.com/company/time-boss/", '<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.74v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.22 0Z"/>'],
  };
  // Mirrors the www.timeboss.us footer
  const footer = () => `<footer class="site-footer">
      <div class="footer-logo">${logo()}</div>
      <div class="footer-links"><a href="https://www.timeboss.us" target="_blank" rel="noopener">timeboss.us</a><a href="https://www.timeboss.us/privacy-policy/" target="_blank" rel="noopener">Privacy Policy</a><a href="https://www.timeboss.us/contact/" target="_blank" rel="noopener">Contact</a></div>
      <div class="footer-copy">&copy; ${new Date().getFullYear()} Time Boss</div>
      <div class="footer-social">${Object.entries(SOCIAL).map(([n, [href, path]]) => `<a href="${href}" aria-label="${n}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg></a>`).join("")}</div>
    </footer>`;

  // ---------- locked previews ----------
  // Example habit data shown behind the lock so members can see what they're working toward
  const SAMPLE = { weekly: { n: 6, len: 8, on: [0, 0, 1, 1, 1, 1, 1, 1] }, daily: { n: 12, len: 10, on: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] } };
  const sampleChain = (tool, light = false) => `<div class="chain ${light ? "light" : ""}" aria-hidden="true">${SAMPLE[tool].on.map((x) => `<span class="pip ${x ? "on" : ""}"></span>`).join("")}</div>`;
  const sampleHalf = (tool) => {
    const n = SAMPLE[tool].n;
    return `<div class="habits-half"><span class="habits-name">${TOOLS[tool].title}</span>
      <div class="habits-count"><b>${n}</b><span>${tool === "weekly" ? "weeks in a row" : "workdays in a row"}</span></div>${sampleChain(tool)}</div>`;
  };
  // Real-looking preview, dimmed and inert, with the lock message on top
  function lockedOver(preview, title, cls = "", { compact = false } = {}) {
    const nx = nextLessonIn(me(), [courseById(WORKSHOP)]), ph = phaseOf();
    return `<div class="locked-wrap ${cls}">
      <div class="locked-preview" aria-hidden="true" inert>${preview}</div>
      <div class="locked-overlay"><div class="locked-msg" role="note">
        <span class="locked-badge">${icon("lock", "ic lock")} Example</span>
        <h2>${esc(title)}</h2>
        ${compact ? "" : `<p class="muted">Your Weekly Planning Meeting, Daily Review Meeting, habit streaks, and live events open when you enroll in Master Your Week, the Group Coaching Cohort.${ph === 1 ? " Finish the Unlock Your Week Workshop first." : ""}</p>`}
        ${ph === 1 && nx ? `<a class="btn" href="#/learn/${WORKSHOP}/${nx.l.id}">Complete Workshop</a>` : `<button class="btn" data-action="enroll">Enroll in Cohort</button>`}
      </div></div></div>`;
  }

  // ---------- views ----------
  const V = {};

  V.login = () => `
    <div class="login">
      <div class="login-card">
        <div class="login-top">${logo("Community · prototype")}</div>
        <p class="muted">Pick a demo user. Each company sees its own private team space; everyone shares the Community.</p>
        <div class="login-group"><h4>One person at each step</h4><div class="picks">
          ${["u_sam", "u_tyler", "u_dev", "u_maria"].map((id) => { const u = user(id); return `<button class="user-pick" data-action="login" data-id="${u.id}">${avatar(u)}<span><b>${esc(u.name)}</b><small>Phase ${phaseOf(u)}: ${phaseLabel(u)}</small></span></button>`; }).join("")}
        </div></div>
        ${[null, ...SEED.companies.map((c) => c.id)].map((cid) => `
          <div class="login-group"><h4>${cid ? `${esc(company(cid).name)} · ${teamOf(cid).length}` : "Time Boss coaches"}</h4><div class="picks">
          ${S.users.filter((u) => u.companyId === cid).map((u) => `
            <button class="user-pick" data-action="login" data-id="${u.id}">${avatar(u)}<span><b>${esc(u.name)}</b><small>${esc(u.title)}${u.role !== "member" ? " · " + u.role : ""}${u.role === "coach" ? "" : ` · Phase ${phaseOf(u)}`}</small></span></button>`).join("")}
          </div></div>`).join("")}
        <details class="join"><summary>Join with a company code</summary>
          <form data-form="join" class="stack">
            <input name="name" placeholder="Your name" required>
            <input name="email" type="email" placeholder="Work email" required>
            <input name="title" placeholder="Your title">
            <select name="companyId">${S.companies.map((c) => `<option value="${c.id}">${esc(c.name)} (code: ${c.id.toUpperCase()})</option>`).join("")}<option value="__new">+ New company</option></select>
            <input name="newCompany" placeholder="New company name (if creating)">
            <button class="btn">Join</button>
          </form></details>
        <button class="link danger" data-action="reset">Reset demo data</button>
      </div>
    </div>`;

  // Habit chain: one pip per workday (Daily Review Meeting) or planned week (Weekly Planning Meeting), oldest to newest
  function chain(tool, id, len, { light = false, fresh = false } = {}) {
    const out = [];
    if (tool === "daily") {
      const days = drmDays(id);
      let d = startOfDay(Date.now());
      if (!isWorkday(d)) d = prevWorkday(d);
      for (let i = 0; i < len; i++) { out.unshift({ on: days.has(dateKey(d)), now: i === 0 && dateKey(d) === dateKey() }); d = prevWorkday(d); }
    } else {
      const weeks = wpmWeeks(id), d = mondayOf(Date.now());
      const next = new Date(d); next.setDate(next.getDate() + 7);
      if (weeks.has(dateKey(next))) d.setTime(next.getTime());
      for (let i = 0; i < len; i++) { out.unshift({ on: weeks.has(dateKey(d)), now: i === 0 }); d.setDate(d.getDate() - 7); }
    }
    return `<div class="chain ${light ? "light" : ""}" aria-hidden="true">${out.map((p, i) => `<span class="pip ${p.on ? "on" : p.now ? "now" : ""} ${fresh && i === out.length - 1 && p.on ? "new" : ""}"></span>`).join("")}</div>`;
  }
  function habitHalf(tool) {
    const t = TOOLS[tool], id = me().id, draft = S.drafts[id + "|" + tool];
    const n = tool === "weekly" ? wpmStreak(id) : drmStreak(id);
    const doneNow = tool === "daily" ? drmDays(id).has(dateKey()) : wpmWeeks(id).has(plannedWeek(Date.now()));
    const unit = tool === "weekly" ? (n === 1 ? "week in a row" : "weeks in a row") : (n === 1 ? "workday in a row" : "workdays in a row");
    return `<div class="habits-half">
      <span class="habits-name">${t.title}</span>
      <div class="habits-count"><b>${n}</b><span>${unit}</span></div>
      ${chain(tool, id, tool === "weekly" ? 8 : 10)}
      <div class="habits-foot">
        ${draft ? `<a class="btn sm" href="#/tools/${tool}">Resume</a><small>In progress, step ${draft.step + 1} of ${t.steps.length}</small>`
          : doneNow ? `<a class="btn ghost sm" href="#/tools/${tool}">View</a><small>Done ${tool === "daily" ? "today" : "for this week"}</small>`
          : tool === "daily" && !isWorkday(new Date()) ? `<a class="btn ghost sm" href="#/tools/${tool}">View</a><small>Next one Monday, end of day</small>`
          : `<a class="btn sm" href="#/tools/${tool}">Run now</a><small>${t.when}</small>`}
      </div></div>`;
  }
  // What to do next, in plain words, based on the clock and what's done
  function nextUp() {
    const id = me().id, now = new Date(), wd = isWorkday(now);
    if (!hasHabits()) return phaseOf() === 1 ? "Next up: your next Unlock Your Week Workshop lesson." : "Next up: enroll in the Master Your Week Cohort.";
    if (!wpmWeeks(id).has(plannedWeek(now)) && (now.getDay() >= 5 || now.getDay() === 0)) return "Next up: plan next week with your Weekly Planning Meeting.";
    if (wd && !drmDays(id).has(dateKey(now)) && now.getHours() >= 15) return "Next up: your Daily Review Meeting before you close the laptop.";
    if (wd) return "Work the priorities on your Calendar. Deflect Unknown Tasks to your Parking Lot.";
    return "Enjoy the weekend. Your habits will be here Monday.";
  }

  V.home = () => {
    const u = me(), op = overallProgress(u.id), p = promptFor(), ms = monthStats(u.id);
    const upcoming = allEvents().filter((e) => rsvpd(e.id)).sort((a, b) => a.start - b.start).slice(0, 3);
    return `
      <header class="page-head"><div><h1>Good ${["morning", "afternoon", "evening"][new Date().getHours() < 12 ? 0 : new Date().getHours() < 18 ? 1 : 2]}, ${esc(u.name.split(" ")[0])}</h1>
      <p class="muted">${fmtDate(Date.now(), { weekday: "long", month: "long", day: "numeric" })}. ${nextUp()}</p></div></header>

      ${phaseCard()}
      ${hasHabits(u) ? `<section class="habits" aria-label="Your habits">${habitHalf("weekly")}${habitHalf("daily")}</section>

      <div class="grid two">
        <div class="card stat"><span class="muted">Past month completion</span><b>${ms.all}%</b>${bar(ms.all)}<small>Weekly Planning Meeting ${ms.wpm}% · Daily Review Meeting ${ms.drm}%</small></div>
        ${phaseOf(u) < 3 ? (() => { const w = courseProgress(u.id, courseById(WORKSHOP)); return `<div class="card stat"><span class="muted">Workshop progress</span><b>${w.pct}%</b>${bar(w.pct)}<small>${w.n} of ${w.total} lessons</small></div>`; })()
          : `<div class="card stat"><span class="muted">Course progress</span><b>${op.pct}%</b>${bar(op.pct)}<small>${op.n} of ${op.total} lessons</small></div>`}
      </div>` : lockedOver(`<section class="habits">${sampleHalf("weekly")}${sampleHalf("daily")}</section>`, "Your habits start when you join Master Your Week", "habits-lock", { compact: true })}

      <div class="grid two">
        <div class="card prompt-card">
          <span class="pinned-label">${icon("pin", "ic pin")} Today's prompt</span>
          <h3>${esc(p.q)}</h3>
          <p class="muted">${plural((S.promptReplies[dateKey()] || []).length, "reply", "replies")} today</p>
          <a class="btn accent sm" href="#/community">Answer in Community</a>
        </div>
        <div class="card">
          <h3>On your calendar</h3>
          ${!hasHabits(u) ? `<p class="muted">Live events open when you join Master Your Week. Office hours with a coach are open now.</p>` : upcoming.length ? `<ul class="list">${upcoming.map((e) => `<li><b>${esc(e.title)}</b><small>${fmtDate(e.start)} · ${fmtTime(e.start)}</small></li>`).join("")}</ul>`
            : `<p class="muted">Nothing booked yet.</p>`}
          <div class="row">${hasHabits(u) ? `<a class="btn ghost sm" href="#/events">See events</a>` : ""}<a class="btn ghost sm" href="#/office-hours">Book office hours</a></div>
        </div>
      </div>`;
  };

  // community: pinned daily prompt, then the feed
  let freshReply = 0; // ts of the reply just posted, so it can animate in once
  function pinnedPrompt() {
    const p = promptFor(), replies = (S.promptReplies[dateKey()] || []).slice().sort((a, b) => b.ts - a.ts);
    const reply = (r) => { const a = user(r.authorId); return `<div class="reply ${r.ts === freshReply ? "fresh" : ""}">${avatar(a, "sm")}<div><b>${esc(a.name)}</b> <small class="muted">${ago(r.ts)}</small><div>${esc(r.body)}</div></div></div>`; };
    return `<section class="card prompt-card pinned">
      <div class="row between"><span class="pinned-label">${icon("pin", "ic pin")} Today's prompt, pinned</span><small class="muted">${plural(replies.length, "reply", "replies")}</small></div>
      <h3>${esc(p.q)}</h3>
      <form data-form="reply" class="reply-form">${avatar(me(), "sm")}<input name="body" placeholder="Your answer..." required><button class="btn accent sm">Reply</button></form>
      <div class="replies">${replies.slice(0, 3).map(reply).join("")}
        ${replies.length > 3 ? `<details><summary>Show all ${replies.length} replies</summary>${replies.slice(3).map(reply).join("")}</details>` : ""}</div>
    </section>`;
  }
  function postCard(p) {
    const a = user(p.authorId), liked = p.likes.includes(me().id);
    return `<article class="card post">
      <div class="post-head">${avatar(a)}<div><b>${esc(a.name)}</b>${a.role === "coach" ? '<span class="tag">Coach</span>' : ""}<small>${esc(a.title)}${a.companyId ? " · " + esc(company(a.companyId).name) : ""} · ${ago(p.ts)}</small></div></div>
      <div class="post-body">${paras(p.body)}</div>
      <div class="post-actions">
        <button class="ghost sm ${liked ? "liked" : ""}" data-action="like" data-id="${p.id}">${liked ? "♥" : "♡"} ${p.likes.length || ""}</button>
        <span class="muted sm">${plural(p.comments.length, "comment", "comments")}</span>
      </div>
      <div class="comments">
        ${p.comments.map((c) => { const ca = user(c.authorId); return `<div class="comment">${avatar(ca, "sm")}<div><b>${esc(ca.name)}</b> <small class="muted">${ago(c.ts)}</small><div>${esc(c.body)}</div></div></div>`; }).join("")}
        <form data-form="comment" data-id="${p.id}" class="comment-form"><input name="body" placeholder="Write a comment..." required><button class="ghost sm">Reply</button></form>
      </div>
    </article>`;
  }
  V.community = () => {
    const posts = S.posts.slice().sort((a, b) => b.ts - a.ts);
    const past = [1, 2, 3].map((i) => { const d = new Date(Date.now() - i * DAY); return { d, k: dateKey(d), q: promptFor(d).q }; });
    return `
      <header class="page-head"><div><h1>Community</h1><p class="muted">Everyone in Time Boss, every company. Share wins, questions, and what's working.</p></div></header>
      <div class="feed-wrap"><div>
        ${pinnedPrompt()}
        <form class="card composer" data-form="post">${avatar(me())}<textarea name="body" rows="2" placeholder="Share a win, a question, or a task you deflected to your Parking Lot..." required></textarea><button class="btn">Post</button></form>
        ${posts.map(postCard).join("")}
      </div>
      <aside class="side">${mywCta()}
        <div class="card"><h3>Previous prompts</h3>
          <ul class="list">${past.map((p) => `<li><b>${esc(p.q)}</b><small>${fmtDate(p.d)} · ${plural((S.promptReplies[p.k] || []).length, "reply", "replies")}</small></li>`).join("")}</ul></div>
      </aside></div>`;
  };

  // team space (company): leaderboard for everyone, member detail for leaders and coaches
  let lbSort = "drm";
  const canManage = (cid) => isCoach() || (me().role === "admin" && me().companyId === cid);
  const memberHref = (m) => (isCoach() ? `#/companies/${m.companyId}/${m.id}` : `#/company/${m.id}`);
  function leaderboard(cid) {
    const ms = teamOf(cid).filter((m) => hasHabits(m)).map((m) => ({ m, wpm: wpmStreak(m.id), drm: drmStreak(m.id) }));
    const other = lbSort === "drm" ? "wpm" : "drm";
    ms.sort((a, b) => b[lbSort] - a[lbSort] || b[other] - a[other] || a.m.name.localeCompare(b.m.name));
    const link = canManage(cid);
    return `<div class="card"><div class="card-head"><h3>Streak leaderboard</h3>
        </div><div class="seg"><button class="${lbSort === "drm" ? "on" : ""}" data-action="lb-sort" data-id="drm">Daily Review Meeting</button><button class="${lbSort === "wpm" ? "on" : ""}" data-action="lb-sort" data-id="wpm">Weekly Planning Meeting</button></div>
      <ol class="lb">${ms.map((x, i) => {
        const inner = `<span class="rank">${i + 1}</span>${avatar(x.m, "sm")}<span class="grow">${esc(x.m.name)}</span><span class="num ${lbSort === "wpm" ? "hi" : ""}">${x.wpm}<small>wk</small></span><span class="num ${lbSort === "drm" ? "hi" : ""}">${x.drm}<small>day</small></span>`;
        return `<li class="${x.m.id === me().id ? "you" : ""}">${link ? `<a href="${memberHref(x.m)}">${inner}</a>` : `<div>${inner}</div>`}</li>`;
      }).join("")}</ol>
      <small class="muted">Weeks in a row with a Weekly Planning Meeting, and workdays in a row with a Daily Review Meeting. ${hasHabits() ? "People join the leaderboard when they enroll in Master Your Week." : "You'll join the leaderboard when you enroll in Master Your Week."}</small></div>`;
  }
  function vsTeam(u, all) {
    const team = all.filter((m) => hasHabits(m));
    if (u && !hasHabits(u)) {
      const avg = avgOf(all, (m) => courseProgress(m.id, courseById(WORKSHOP)).pct), you = courseProgress(u.id, courseById(WORKSHOP)).pct;
      return `<div class="card"><h3>You vs. the team average</h3>
        <div class="vs"><div class="row between"><b>Unlock Your Week Workshop</b><span><b>${you}%</b> <span class="muted">vs ${Math.round(avg)}%</span></span></div>
          <div class="bar vs-bar"><span style="width:${you}%"></span><i style="left:${avg}%" title="Team average"></i></div></div>
        <small class="muted">Habit streaks start when you enroll in Master Your Week. ${team.length} of ${all.length} teammates have.</small></div>`;
    }
    const maxW = Math.max(1, ...team.map((m) => wpmStreak(m.id))), maxD = Math.max(1, ...team.map((m) => drmStreak(m.id)));
    const rows = [
      ["Weekly Planning Meeting streak", (id) => wpmStreak(id), maxW, " wks"],
      ["Daily Review Meeting streak", (id) => drmStreak(id), maxD, " days"],
      ["Past month completion", (id) => monthStats(id).all, 100, "%"],
      ["Course progress", (id) => overallProgress(id).pct, 100, "%"],
    ];
    return `<div class="card"><h3>${u ? "You vs. the team average" : "Team averages"}</h3>
      ${rows.map(([label, f, max, unit]) => {
        const avg = avgOf(team, (m) => f(m.id)), you = u ? f(u.id) : null;
        const show = (v) => (unit === "%" ? Math.round(v) : Math.round(v * 10) / 10) + unit;
        return `<div class="vs"><div class="row between"><b>${label}</b><span>${u ? `<b>${show(you)}</b> <span class="muted">vs ${show(avg)}</span>` : `<b>${show(avg)}</b>`}</span></div>
          <div class="bar vs-bar">${u ? `<span style="width:${Math.min(100, (you / max) * 100)}%"></span>` : `<span class="avg-fill" style="width:${Math.min(100, (avg / max) * 100)}%"></span>`}${u ? `<i style="left:${Math.min(100, (avg / max) * 100)}%" title="Team average"></i>` : ""}</div></div>`;
      }).join("")}
      ${u ? `<small class="muted"><i class="avg-key"></i> marks the team average across the ${team.length} people who've started Master Your Week.</small>` : ""}</div>`;
  }
  function roster(cid) {
    const team = teamOf(cid).map((m) => ({ m, wpm: wpmStreak(m.id), drm: drmStreak(m.id), ms: monthStats(m.id), op: overallProgress(m.id).pct })).sort((a, b) => b.ms.all - a.ms.all);
    const hab = team.filter((x) => hasHabits(x.m)), avg = (f) => Math.round(avgOf(hab, f));
    return `<div class="card"><div class="card-head"><h3>Team members</h3><small class="muted">Only team leaders and coaches see this. Select a name for detail.</small></div>
      <div class="table-wrap"><table class="team">
        <thead><tr><th>Member</th><th>Phase</th><th>Weekly Planning<br>Meeting streak</th><th>Daily Review<br>Meeting streak</th><th>Weekly Planning<br>past month</th><th>Daily Review<br>past month</th><th>Courses</th></tr></thead>
        <tbody>${team.map((x) => `<tr><td><a href="${memberHref(x.m)}" title="${esc(x.m.title)}">${avatar(x.m, "sm")} ${esc(x.m.name)}</a></td>
          <td><span class="phase-pill p${phaseOf(x.m)}" title="${PHASES[phaseOf(x.m) - 1].name}">${phaseOf(x.m)} · ${phaseOf(x.m) === 2 && !enrolled(x.m) ? "Ready to enroll" : PHASES[phaseOf(x.m) - 1].sub}</span></td>${hasHabits(x.m) ? `<td>${x.wpm} wk</td><td>${x.drm} day</td><td>${pctCell(x.ms.wpm)}</td><td>${pctCell(x.ms.drm)}</td>` : `<td colspan="4" class="muted">Habits start when they join Master Your Week</td>`}<td>${x.op}%</td></tr>`).join("")}</tbody>
        <tfoot><tr><td>Team average</td><td></td><td>${(avgOf(hab, (x) => x.wpm)).toFixed(1)} wk</td><td>${(avgOf(hab, (x) => x.drm)).toFixed(1)} day</td><td>${avg((x) => x.ms.wpm)}%</td><td>${avg((x) => x.ms.drm)}%</td><td>${Math.round(avgOf(team, (x) => x.op))}%</td></tr></tfoot>
      </table></div></div>`;
  }
  const pctCell = (p) => `<span class="pct ${p >= 80 ? "good" : p < 50 ? "low" : ""}">${p}%</span>`;
  function teamView(cid) {
    const c = company(cid), team = teamOf(cid), u = me().companyId === cid ? me() : null;
    return `
      <header class="page-head"><div><h1>${esc(c.name)}</h1>
      <p class="muted">Your private team space. ${team.length} members. Only ${esc(c.name)} and Time Boss coaches can see it.</p></div></header>
      <div class="team-grid">
        <div>${vsTeam(u, team)}</div>
        <aside>${leaderboard(cid)}</aside>
      </div>
      ${canManage(cid) ? roster(cid) : ""}`;
  }
  function memberView(id) {
    const m = S.users.find((x) => x.id === id);
    if (!m || !(canManage(m.companyId) || m.id === me().id)) return notFound();
    const ms = monthStats(m.id), op = overallProgress(m.id), days = drmDays(m.id), weeks = wpmWeeks(m.id);
    const runs = S.toolRuns.filter((r) => r.userId === m.id).sort((a, b) => b.ts - a.ts);
    const cells = [];
    for (let i = 29; i >= 0; i--) {
      const d = startOfDay(Date.now() - i * DAY), k = dateKey(d), planned = runs.some((r) => r.tool === "weekly" && dateKey(new Date(r.ts)) === k);
      cells.push(`<span class="day-cell ${!isWorkday(d) ? "off" : days.has(k) ? "on" : i === 0 ? "" : "miss"} ${planned ? "plan" : ""}" title="${fmtDate(d)}${days.has(k) ? ", Daily Review Meeting" : ""}${planned ? ", Weekly Planning Meeting" : ""}"></span>`);
    }
    return `<a class="back" href="${isCoach() ? `#/companies/${m.companyId}` : "#/company"}">← ${esc(company(m.companyId)?.name || "Team")}</a>
      <header class="page-head member-head"><div class="row">${avatar(m, "lg")}<div><h1>${esc(m.name)}</h1><p class="muted">${esc(m.title)} · ${esc(m.email)} · Phase ${phaseOf(m)}: ${phaseLabel(m)}</p></div></div></header>
      ${!hasHabits(m) ? `<div class="card"><h3>Habits start when they join Master Your Week</h3><p class="muted">${esc(m.name.split(" ")[0])} ${phaseOf(m) === 1 ? `is in Unlock Your Week, ${courseProgress(m.id, courseById(WORKSHOP)).n} of ${courseProgress(m.id, courseById(WORKSHOP)).total} workshop lessons done` : "finished the workshop and hasn't enrolled in the cohort yet"}. Weekly Planning Meeting and Daily Review Meeting streaks show here once they enroll.</p></div>` : `<div class="grid stats">
        <div class="card stat"><span class="muted">Weekly Planning streak</span><b>${wpmStreak(m.id)}</b>${chain("weekly", m.id, 8, { light: true })}<small>weeks in a row</small></div>
        <div class="card stat"><span class="muted">Daily Review streak</span><b>${drmStreak(m.id)}</b>${chain("daily", m.id, 10, { light: true })}<small>workdays in a row</small></div>
        <div class="card stat"><span class="muted">Past month</span><b>${ms.all}%</b>${bar(ms.all)}<small>Weekly Planning Meeting ${ms.wpm}% · Daily Review Meeting ${ms.drm}%</small></div>
        <div class="card stat"><span class="muted">Courses</span><b>${op.pct}%</b>${bar(op.pct)}<small>${op.n} of ${op.total} lessons</small></div>
      </div>
      <div class="card"><div class="card-head"><h3>Last 30 days</h3><small class="muted"><i class="day-cell on key"></i> Daily Review Meeting <i class="day-cell plan key"></i> Weekly Planning Meeting <i class="day-cell miss key"></i> missed</small></div>
        <div class="days">${cells.join("")}</div></div>`}
      <div class="grid two">
        <div class="card"><h3>Recent meetings</h3>
          ${runs.slice(0, 10).map((r) => `<details class="run"><summary><b>${TOOLS[r.tool].title}</b> ${fmtDate(r.ts, { weekday: "short", month: "short", day: "numeric" })} <small class="muted">${fmtTime(r.ts)}</small></summary><pre>${esc(runToMarkdown(r.tool, r.answers, r.ts))}</pre></details>`).join("") || `<p class="muted">No meetings yet.</p>`}
        </div>
        <div class="card"><h3>Course progress</h3>
          ${SEED.courses.map((c) => { const p = courseProgress(m.id, c); return `<div class="course-row"><div class="row between"><span>${esc(c.title)}</span><small class="muted">${p.n}/${p.total}</small></div>${bar(p.pct, "thin")}</div>`; }).join("")}
        </div>
      </div>`;
  }
  V.company = (mid) => (!me().companyId ? V.companies() : mid ? memberView(mid) : teamView(me().companyId));
  V.companies = (cid, mid) => {
    if (!isCoach()) return `<div class="card">Coaches only.</div>`;
    if (mid) return memberView(mid);
    if (cid && company(cid)) return teamView(cid);
    return `<header class="page-head"><div><h1>Companies</h1><p class="muted">Coach view across teams.</p></div></header>
      <div class="grid three">${S.companies.map((c) => {
        const ms = teamOf(c.id), avg = Math.round(avgOf(ms, (m) => monthStats(m.id).all));
        return `<a class="card company-tile" href="#/companies/${c.id}" style="border-top:4px solid ${c.color}"><h3>${esc(c.name)}</h3><p class="muted">${plural(ms.length, "member", "members")}</p>${bar(avg)}<small>${avg}% past month Weekly Planning Meeting and Daily Review Meeting completion</small></a>`;
      }).join("")}</div>`;
  };

  // learn
  V.learn = (courseId, lessonId) => {
    if (lessonId) return lessonView(courseId, lessonId);
    if (courseId) return courseView(courseId);
    const u = me(), ph = phaseOf(u), c = SEED.cohort;
    const kindTag = (x) => (x.kind === "workshop" ? "Workshop" : x.kind === "cohort" ? (ph === 3 ? "Review" : "Cohort session") : "Mini course");
    const tile = (x) => {
      if (!unlocked(x, u)) return `<div class="card course locked" aria-disabled="true"><div class="row between"><span class="tag">${kindTag(x)}</span><small class="muted">${icon("lock", "ic lock")} ${x.kind === "cohort" ? "In the cohort" : "Locked"}</small></div><h3>${esc(x.title)}</h3>${x.series ? `<small class="series">${esc(x.series)} · Part ${x.part} of ${seriesLen(x)}</small>` : ""}<p class="muted">${esc(x.blurb)}</p><small>${x.kind === "cohort" ? "Covered live in the cohort, then open here for review" : "Unlocks after the Master Your Week Cohort"}</small></div>`;
      const p = courseProgress(u.id, x);
      return `<a class="card course" href="${courseHref(x)}"><div class="row between"><span class="tag">${kindTag(x)}</span><small class="muted">${x.series ? `Part ${x.part} of ${seriesLen(x)}` : plural(x.lessons.length, "lesson", "lessons")}</small></div><h3>${esc(x.title)}</h3>${x.series ? `<small class="series">${esc(x.series)}</small>` : ""}<div class="accent-line"></div><p class="muted">${esc(x.blurb)}</p>${bar(p.pct)}<small>${p.pct === 100 ? "Complete ✓" : p.n ? `${p.n}/${p.total} done` : "Not started"}</small></a>`;
    };
    const level = (n, body) => `<section class="level ${n < ph ? "done" : n === ph ? "current" : "ahead"}"><h2 class="level-head"><span class="phase-n">${n < ph ? "✓" : n}</span>${PHASES[n - 1].name}<span class="level-sub">${PHASES[n - 1].sub}</span>${n === ph ? `<small>You are here</small>` : ""}</h2>${body}</section>`;
    return `
      <header class="page-head"><div><h1>Courses</h1><p class="muted">Three steps. Each one unlocks the next.</p></div></header>
      ${level(1, `<div class="grid two">${tile(courseById(WORKSHOP))}</div>`)}
      ${level(2, `<div class="card level-cohort"><div><h3>${esc(c.name)} Cohort</h3><p class="muted">${c.weeks} weeks, live with a Time Boss coach. Next cohort starts ${fmtDate(c.startsOn + "T12:00", { month: "long", day: "numeric" })}.</p></div>
        ${ph === 1 ? `<small class="muted">${icon("lock", "ic lock")} Complete the workshop first</small>` : ph === 2 && !enrolled(u) ? `<button class="btn" data-action="enroll">Enroll in Cohort</button>` : ph === 2 ? `<span class="tag">Enrolled · week ${c.currentWeek} of ${c.weeks}</span>` : `<span class="tag">Complete ✓</span>`}</div>
        <p class="muted level-note">${ph === 3 ? "What the cohort covered, open for review any time." : "The cohort covers these live. They open here for review once you complete it."}</p>
        <div class="grid three">${SEED.courses.filter((x) => x.kind === "cohort").map(tile).join("")}</div>`)}
      ${level(3, `${ph < 3 ? `<p class="muted level-note">Ongoing education unlocks when you complete the Master Your Week Cohort: mini courses, a monthly masterclass, and live Weekly Planning Meetings.</p>` : `<p class="muted level-note">Mini courses to keep sharpening your week, plus a monthly masterclass and live Weekly Planning Meetings in <a href="#/events">Events</a>.</p>`}
        <div class="grid three">${SEED.courses.filter((x) => x.kind === "mini").map(tile).join("")}</div>`)}`;
  };
  const lockedView = () => `<a class="back" href="#/learn">← Courses</a><div class="card locked-card">${icon("lock", "ic lock big")}<h2>Unlocks after the Master Your Week Cohort</h2>
    <p class="muted">Cohort sessions open here for review, and Maximize Your Week courses unlock, once you complete the cohort.</p>${mywCta()}</div>`;
  function courseView(id) {
    const c = courseById(id); if (!c) return notFound();
    if (!unlocked(c)) return lockedView();
    const d = done(me().id), p = courseProgress(me().id, c);
    return `<a class="back" href="#/learn">← Courses</a>
      <header class="page-head"><div><span class="tag">${c.kind === "workshop" ? "Unlock Your Week Workshop" : c.kind === "cohort" ? "Master Your Week · review" : "Maximize Your Week · mini course"}</span><h1>${esc(c.title)}</h1><p class="muted">${esc(c.blurb)}</p></div></header>
      <div class="card">${bar(p.pct)}<small>${p.n}/${p.total} lessons complete</small>
        <ol class="lessons">${c.lessons.map((l) => `<li class="${d[l.id] ? "done" : ""}"><a href="#/learn/${c.id}/${l.id}"><span class="check">${d[l.id] ? "✓" : ""}</span><span><b>${esc(l.title)}</b><small>${l.question ? esc(l.question) + " · " : ""}${l.mins} min</small></span></a></li>`).join("")}</ol></div>`;
  }
  function lessonView(cid, lid) {
    const c = SEED.courses.find((x) => x.id === cid), i = c?.lessons.findIndex((l) => l.id === lid);
    if (!c || i < 0) return notFound();
    if (!unlocked(c)) return lockedView();
    const l = c.lessons[i], next = c.lessons[i + 1], isDone = !!done(me().id)[l.id];
    const nextSession = !next && nextInSeries(c);
    return `<a class="back" href="${c.lessons.length === 1 ? "#/learn" : `#/learn/${c.id}`}">← ${c.lessons.length === 1 ? "Courses" : esc(c.title)}</a>
      <article class="card lesson">
        <span class="eyebrow">${c.series ? `${esc(c.series)} · Part ${c.part} of ${seriesLen(c)}` : `Lesson ${i + 1} of ${c.lessons.length}`} · ${l.mins} min</span>
        <h1>${esc(l.title)}</h1>
        ${l.question ? `<p class="lesson-question">${esc(l.question)}</p>` : ""}
        <div class="video">▶ Video placeholder</div>
        ${l.body.map((p) => `<p>${esc(p)}</p>`).join("")}
        <div class="action-box"><b>Your action</b><p>${esc(l.action)}</p></div>
        <div class="row between">
          <button class="btn ${isDone ? "ghost" : ""}" data-action="toggle-lesson" data-id="${l.id}">${isDone ? "✓ Completed (undo)" : "Mark complete"}</button>
          ${next ? `<a class="btn ghost" href="#/learn/${c.id}/${next.id}">Next: ${esc(next.title)}</a>` : nextSession ? `<a class="btn ghost" href="${courseHref(nextSession)}">Next: ${esc(nextSession.title)}</a>` : c.id === WORKSHOP && workshopDone(me().id) && phaseOf() === 2 && !enrolled() ? `<button class="btn" data-action="enroll">Enroll in Cohort</button>` : `<a class="btn ghost" href="#/learn">Back to courses</a>`}
        </div>
      </article>`;
  }

  // events
  V.events = () => (hasHabits() ? eventsPage() : lockedOver(eventsPage(), "Live events open when you join Master Your Week", "page"));
  function eventsPage() {
    const ev = (e) => {
      const n = (S.rsvps[e.id] || []).length + (e.type === "masterclass" ? 41 : 12);
      const on = rsvpd(e.id);
      return `<div class="card event"><div class="date-chip"><b>${new Date(e.start).getDate()}</b><small>${fmtDate(e.start, { month: "short" })}</small></div>
        <div class="event-body"><h3>${esc(e.title)}</h3><p class="muted">${fmtDate(e.start, { weekday: "long" })} · ${fmtTime(e.start)} · ${e.mins} min · with ${esc(user(e.host).name)}</p>${e.desc ? `<p>${esc(e.desc)}</p>` : ""}<small class="muted">${n} going</small></div>
        <div class="event-actions"><button class="btn ${on ? "ghost" : ""}" data-action="rsvp" data-id="${e.id}">${on ? "✓ Going" : "RSVP"}</button>
          ${on ? `<a class="btn ghost sm" download="${e.id}.ics" href="data:text/calendar;charset=utf-8,${encodeURIComponent(icsFor(e))}">Add to calendar</a>` : ""}</div></div>`;
    };
    return `<header class="page-head"><div><h1>Events</h1><p class="muted">Live sessions with the Time Boss team. RSVP and we'll send a calendar invite to ${esc(me().email)}.</p></div></header>
      <h2 class="section">Monthly masterclass</h2>${masterclassEvents().map(ev).join("")}
      <h2 class="section">Weekly Planning Meeting (live, group)</h2><p class="muted">Plan next week alongside other Time Bosses. Prefer solo? Run the <a href="#/tools/weekly">Weekly Planning Meeting</a> tool.</p>${weeklyPlanningEvents().map(ev).join("")}`;
  }

  // office hours: Calendly inline embed, prefilled with the member's name and email
  V["office-hours"] = () => {
    const u = me(), q = new URLSearchParams({ embed_type: "Inline", hide_gdpr_banner: "1", background_color: "fefcf8", text_color: "15253c", primary_color: "3c768d", name: u.name, email: u.email });
    return `<header class="page-head"><div><h1>Micro office hours</h1><p class="muted">${SEED.officeHours.mins} minutes with a Time Boss coach. Bring one specific question.</p></div></header>
      <div class="card calendly"><iframe src="${esc(SEED.officeHours.calendlyUrl)}?${esc(q.toString())}" title="Book micro office hours" loading="lazy"></iframe></div>
      <p class="muted sm">Booking runs through Calendly, which sends your confirmation and calendar invite. <a href="${esc(SEED.officeHours.calendlyUrl)}" target="_blank" rel="noopener">Open in a new tab</a></p>`;
  };

  // tools
  let justSaved = null; // {tool, before}: shows the completion moment once, right after a meeting is saved
  const streakOf = (tool, id) => (tool === "weekly" ? wpmStreak(id) : drmStreak(id));
  function celebrate(tool, before) {
    const t = TOOLS[tool], id = me().id, n = streakOf(tool, id), grew = n > before;
    const unit = tool === "weekly" ? (n === 1 ? "week in a row" : "weeks in a row") : (n === 1 ? "workday in a row" : "workdays in a row");
    const line = !grew && tool === "daily" ? "Saved. Weekend reviews don't change your workday streak, but they still count for you."
      : tool === "weekly" ? "Your week is planned. Share it with someone and protect the blocks." : "Incomplete tasks have a home. Tomorrow's plan is reviewed. You can close the laptop.";
    return `<section class="celebrate" aria-live="polite">
      <h1>${t.title} done</h1><p>${line}</p>
      <span class="big" ${grew ? `data-from="${before}"` : ""}>${n}</span><span class="unit">${unit}</span>
      ${chain(tool, id, tool === "weekly" ? 8 : 10, { fresh: grew })}
      <div class="row"><a class="btn accent" href="#/home">Back to home</a><a class="btn ghost" href="#/community">Share a win in Community</a></div>
    </section>`;
  }
  function toolView(tool, { sample = false } = {}) {
    if (justSaved?.tool === tool) { const html = celebrate(tool, justSaved.before); justSaved = null; return html; }
    const t = TOOLS[tool], dk = me().id + "|" + tool, draft = sample ? null : S.drafts[dk];
    const history = sample ? [] : runsOf(me().id, tool).sort((a, b) => b.ts - a.ts);
    const streakN = sample ? SAMPLE[tool].n : tool === "weekly" ? wpmStreak(me().id) : drmStreak(me().id);
    const aiPanel = `<div class="card ai"><span class="eyebrow">Prefer your own AI?</span><h4>Run this in Claude, ChatGPT, or any assistant</h4>
      <p class="muted">Copy the system prompt, paste it into a new chat, and say "start". It walks you through the same steps.</p>
      <details><summary>Preview prompt</summary><pre>${esc(t.prompt)}</pre></details>
      <div class="row"><button class="btn sm" data-action="copy-prompt" data-tool="${tool}">Copy system prompt</button>
      <a class="btn ghost sm" href="https://claude.ai/new" target="_blank" rel="noopener">Open Claude</a><a class="btn ghost sm" href="https://chatgpt.com" target="_blank" rel="noopener">Open ChatGPT</a></div></div>`;

    if (!draft) {
      let lastPhase = "";
      return `<header class="page-head"><div><h1>${t.title}</h1><p class="muted">${t.when}. ${t.steps.length} steps in three parts: Reflect, Decide, Commit.</p></div></header>
        <div class="feed-wrap"><div>
          <div class="card tool-intro"><div><b>Current streak: ${plural(streakN, tool === "weekly" ? "week" : "workday", tool === "weekly" ? "weeks" : "workdays")}</b></div>${sample ? sampleChain(tool, true) : chain(tool, me().id, tool === "weekly" ? 8 : 10, { light: true })}</div>
          ${t.during ? `<div class="card"><h3>During the day, Monday to Friday: work your calendar</h3><ol class="steps-preview">${t.during.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></div>` : ""}
          <div class="card"><ol class="steps-preview">${t.steps.map((s) => { const h = s.phase !== lastPhase ? `<li class="phase-label">${s.phase}</li>` : ""; lastPhase = s.phase; return `${h}<li><b>${esc(s.title)}</b><small>${esc(s.guide)}</small></li>`; }).join("")}</ol>
          <button class="btn big" data-action="start-tool" data-tool="${tool}">Run your ${t.title}</button></div>
          ${history.length ? `<h2 class="section">History</h2>${history.slice(0, 12).map((r) => `<details class="card run"><summary><b>${fmtDate(r.ts, { weekday: "long", month: "short", day: "numeric" })}</b> <small class="muted">${fmtTime(r.ts)}</small></summary><pre>${esc(runToMarkdown(tool, r.answers, r.ts))}</pre><button class="ghost sm" data-action="copy-run" data-id="${r.id}">Copy as markdown</button></details>`).join("")}` : ""}
        </div><aside class="side">${aiPanel}</aside></div>`;
    }
    const s = t.steps[draft.step], last = draft.step === t.steps.length - 1;
    const field = (f) => {
      const v = draft.answers[f.k] ?? "";
      if (f.type === "textarea") return `<label>${esc(f.label)}<textarea name="${f.k}" rows="${f.rows || 4}" placeholder="${esc(f.ph || "")}">${esc(v)}</textarea></label>`;
      if (f.type === "check") return `<label class="check-row"><input type="checkbox" name="${f.k}" value="Yes" ${v ? "checked" : ""}><span>${esc(f.label)}</span></label>`;
      return `<label>${esc(f.label)}<input type="${f.type}" name="${f.k}" value="${esc(v)}" placeholder="${esc(f.ph || "")}"></label>`;
    };
    return `<header class="page-head"><div><span class="eyebrow">${t.title} · ${s.phase} · step ${draft.step + 1} of ${t.steps.length}</span><h1>${esc(s.title)}</h1></div>
        <div class="timer" id="timer" data-start="${draft.startedAt}" data-budget="${t.mins}">--:--</div></header>
      <div class="stepper">${t.steps.map((x, i) => `<span class="${i < draft.step ? "done" : i === draft.step ? "cur" : ""}" title="${esc(x.phase)}: ${esc(x.title)}"></span>`).join("")}</div>
      <div class="feed-wrap"><div>
        <form class="card tool-step" data-form="tool-step" data-tool="${tool}">
          <p class="guide">${esc(s.guide)}</p>
          ${s.fields.map(field).join("")}
          ${s.share ? `<button type="button" class="btn ghost sm share-btn" data-action="copy-draft" data-tool="${tool}">Copy my plan to share</button>` : ""}
          <div class="row between">
            <span>${draft.step > 0 ? `<button type="button" class="ghost" data-action="tool-back" data-tool="${tool}">← Back</button>` : ""}<button type="button" class="ghost danger" data-action="tool-abandon" data-tool="${tool}">Discard</button></span>
            <button class="btn">${last ? "Finish & save" : "Next →"}</button>
          </div>
        </form>
      </div><aside class="side">${aiPanel}</aside></div>`;
  }
  V.tools = (tool) => (!TOOLS[tool] ? notFound() : hasHabits() ? toolView(tool)
    : lockedOver(toolView(tool, { sample: true }), `Your ${TOOLS[tool].title} opens when you join Master Your Week`, "page"));

  V.cohort = () => {
    const c = SEED.cohort;
    return `<div class="cohort-hero">
      <span class="eyebrow">Next cohort · starts ${fmtDate(c.startsOn + "T12:00", { weekday: "long", month: "long", day: "numeric" })}</span>
      <h1>${esc(c.name)}</h1>
      <p class="lead">Step 2 of 3. A ${c.weeks}-week live cohort that installs the Time Boss habits for good: the Weekly Planning Meeting, the Daily Review Meeting, and a pace you can actually hold.</p>
      <ul class="checks">${c.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}<li>Includes everything in this community</li></ul>
      ${phaseOf() === 1 ? `<div class="row"><a class="btn accent" href="#/learn/${WORKSHOP}">Complete Workshop first</a><span class="muted">The cohort opens once you finish the Unlock Your Week Workshop.</span></div>`
        : phaseOf() === 2 && !enrolled() ? `<div class="row"><button class="btn accent" data-action="enroll">Enroll in Cohort</button><span class="muted">${c.seatsLeft} seats left</span></div>`
        : phaseOf() === 2 ? `<div class="row"><a class="btn accent" href="#/tools/weekly">Run Weekly Planning Meeting</a><span class="muted">You're enrolled. Week ${c.currentWeek} of ${c.weeks}.</span></div>
          <button class="link demo-link" data-action="complete-cohort">Demo: mark the cohort complete</button>`
        : `<div class="row"><a class="btn accent" href="#/learn">Go to Maximize Your Week</a><span class="muted">${isCoach() ? "Coaches see every phase." : "You completed Master Your Week."}</span></div>`}
    </div>`;
  };

  const notFound = () => `<div class="card"><h2>Not found</h2><a href="#/home">Go home</a></div>`;

  // ---------- router ----------
  function render() {
    const root = document.getElementById("app");
    if (!me()) { root.className = "logged-out"; root.innerHTML = V.login() + footer(); return; }
    let [, view, a, b] = location.hash.split("/");
    if (!view || !V[view]) { location.hash = "#/home"; return; }
    root.className = "";
    root.innerHTML = `<div class="topbar"><button class="menu-btn" data-action="menu" aria-label="Open menu">${icon("menu")}</button><a href="#/home" class="topbar-logo">${logo()}</a></div>
      <aside class="sidebar">${nav()}</aside><div class="content"><main id="main">${V[view](a, b)}</main>${footer()}</div>`;
    tickTimer();
    countUp();
  }
  // Count the streak up from the previous number on the completion screen
  function countUp() {
    const el = document.querySelector(".celebrate .big[data-from]");
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const to = el.textContent;
    el.textContent = el.dataset.from;
    setTimeout(() => { el.textContent = to; el.classList.add("bump"); }, 1000); // lands as the new pip drops into the chain
  }
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

  let timerInt;
  function tickTimer() {
    clearInterval(timerInt);
    const el = document.getElementById("timer");
    if (!el) return;
    const upd = () => {
      const s = Math.floor((Date.now() - +el.dataset.start) / 1000);
      el.textContent = `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
      el.classList.toggle("over", s / 60 > +el.dataset.budget);
    };
    upd(); timerInt = setInterval(upd, 1000);
  }

  // ---------- actions ----------
  function readForm(form) { return Object.fromEntries(new FormData(form).entries()); }
  function saveStep(tool, form) {
    const d = S.drafts[me().id + "|" + tool], fd = new FormData(form);
    TOOLS[tool].steps[d.step].fields.forEach((f) => { d.answers[f.k] = f.type === "check" ? (fd.has(f.k) ? "Yes" : "") : fd.get(f.k) ?? ""; });
  }

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const { action, id, tool } = el.dataset;
    const A = {
      login: () => { S.sessionUserId = id; save(); location.hash = "#/home"; render(); },
      logout: () => { S.sessionUserId = null; document.body.classList.remove("menu-open"); save(); render(); },
      reset: () => { if (confirm("Reset all demo data?")) { S = freshState(); save(); render(); } },
      menu: () => document.body.classList.toggle("menu-open"),
      like: () => { const p = S.posts.find((x) => x.id === id), i = p.likes.indexOf(me().id); i < 0 ? p.likes.push(me().id) : p.likes.splice(i, 1); save(); render(); },
      "lb-sort": () => { lbSort = id; render(); },
      // Production: Enroll goes to checkout (SEED.cohort.url) and marks the member enrolled on payment
      enroll: () => { me().mywEnrolled = true; save(); location.hash = "#/home"; render(); toast("You're enrolled in Master Your Week. Your habits and live events are open."); },
      "complete-cohort": () => { me().mywDone = true; me().mywEnrolled = true; save(); location.hash = "#/home"; render(); toast("Master Your Week complete. Maximize Your Week is unlocked."); },
      "toggle-lesson": () => {
        const d = (S.progress[me().id] ||= {});
        const before = phaseOf();
        if (d[id]) delete d[id]; else { d[id] = Date.now(); toast(before === 1 && phaseOf() === 2 ? "Workshop complete. The Master Your Week Cohort is unlocked." : "Lesson complete ✓"); }
        save(); render();
      },
      rsvp: () => {
        const l = (S.rsvps[id] ||= []), i = l.indexOf(me().id);
        // Production: RSVP emails the member a calendar invite (.ics / Google Calendar API) and removes it on cancel
        if (i < 0) { l.push(me().id); toast(`You're in. Calendar invite sent to ${me().email}`); } else { l.splice(i, 1); toast("RSVP cancelled. Calendar invite withdrawn."); }
        save(); render();
      },
      "start-tool": () => { S.drafts[me().id + "|" + tool] = { step: 0, answers: {}, startedAt: Date.now() }; save(); render(); },
      "tool-back": () => { saveStep(tool, document.querySelector("[data-form=tool-step]")); S.drafts[me().id + "|" + tool].step--; save(); render(); },
      "tool-abandon": () => { if (confirm("Discard this session?")) { delete S.drafts[me().id + "|" + tool]; save(); render(); } },
      "copy-draft": () => { saveStep(tool, document.querySelector("[data-form=tool-step]")); save(); copy(runToMarkdown(tool, S.drafts[me().id + "|" + tool].answers, Date.now()), "Plan copied. Send it to your person."); },
      "copy-prompt": () => copy(TOOLS[tool].prompt, "System prompt copied. Paste it into your AI."),
      "copy-run": () => { const r = S.toolRuns.find((x) => x.id === id); copy(runToMarkdown(r.tool, r.answers, r.ts)); },
    };
    if (A[action]) { e.preventDefault(); A[action](); }
  });

  document.addEventListener("submit", (e) => {
    const f = e.target, kind = f.dataset.form;
    if (!kind) return;
    e.preventDefault();
    const v = readForm(f);
    if (kind === "post") S.posts.push({ id: uid(), authorId: me().id, ts: Date.now(), body: v.body.trim(), likes: [], comments: [] });
    if (kind === "comment") S.posts.find((p) => p.id === f.dataset.id).comments.push({ authorId: me().id, ts: Date.now(), body: v.body.trim() });
    if (kind === "reply") { freshReply = Date.now(); (S.promptReplies[dateKey()] ||= []).push({ authorId: me().id, ts: freshReply, body: v.body.trim() }); }
    if (kind === "join") {
      let cid = v.companyId;
      if (cid === "__new") {
        if (!v.newCompany.trim()) return toast("Name the new company");
        cid = v.newCompany.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid();
        if (!company(cid)) S.companies.push({ id: cid, name: v.newCompany.trim(), color: `hsl(${Math.random() * 360 | 0} 40% 40%)`, seats: 10 });
      }
      const isFirst = !S.users.some((u) => u.companyId === cid);
      const u = { id: "u_" + uid(), name: v.name.trim(), email: v.email.trim(), title: v.title.trim() || "Member", companyId: cid, role: isFirst ? "admin" : "member" };
      S.users.push(u); S.sessionUserId = u.id; location.hash = "#/home";
    }
    if (kind === "tool-step") {
      const tool = f.dataset.tool, dk = me().id + "|" + tool, d = S.drafts[dk];
      saveStep(tool, f);
      if (d.step < TOOLS[tool].steps.length - 1) d.step++;
      else {
        justSaved = { tool, before: streakOf(tool, me().id) };
        S.toolRuns.push({ id: uid(), userId: me().id, tool, ts: Date.now(), answers: d.answers });
        delete S.drafts[dk];
      }
    }
    save(); render();
  });

  // Close the mobile tray on navigation or a tap outside it
  document.addEventListener("click", (e) => {
    if (e.target.closest(".sidebar a") || (document.body.classList.contains("menu-open") && !e.target.closest(".sidebar, .menu-btn"))) document.body.classList.remove("menu-open");
  });

  render();
})();
