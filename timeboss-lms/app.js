// Time Boss Community prototype. No backend: state lives in localStorage.
(() => {
  const SEED = window.TB_SEED;
  const KEY = "tb_lms_v6"; // bump when the saved data shape changes so browsers reload the demo data
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
  // "Saturday, October 24th"
  const longDate = (d = new Date()) => { const n = d.getDate(), sfx = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"; return `${d.toLocaleDateString("en-US", { weekday: "long" })}, ${d.toLocaleDateString("en-US", { month: "long" })} ${n}${sfx}`; };
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
    // Community fill: members at other companies, mostly past the cohort, so community-wide counts look real
    const F = SEED.communityFill, fr = rng(4242);
    F.companies.forEach((c) => {
      for (let i = 0; i < F.perCompany; i++) {
        const first = pick(fr, F.firstNames), last = pick(fr, F.lastNames), phase = fr() < 0.8 ? 3 : 2;
        users.push({ id: `u_${c.id}${i}`, name: `${first} ${last}`, title: pick(fr, F.titles), companyId: c.id, role: "member", phase, enrolled: phase === 2, habit: 0.5 + fr() * 0.45,
          mywDone: phase === 3, mywEnrolled: true, fill: true, email: `${first.toLowerCase()}@${c.domain}` });
      }
    });
    // Each person gets a stored random avatar color, and most demo members a placeholder photo
    const colorRng = rng(777), photoQueue = Array.from({ length: SEED.demoPhotos.count }, (_, i) => `assets/avatars/${String(i + 1).padStart(2, "0")}.jpg`);
    users.forEach((u) => {
      u.color = pick(colorRng, SEED.avatarColors);
      if (u.role !== "coach" && !SEED.demoPhotos.initialsOnly.includes(u.id) && photoQueue.length && (!u.fill || colorRng() < 0.25)) u.photo = photoQueue.shift();
    });
    const members = users.filter((u) => u.role !== "coach");
    const likers = (n, seed, exclude) => { const r = rng(seed); return users.filter((u) => u.id !== exclude).map((u) => [r(), u.id]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]); };
    // Comments and prompt replies: a few likes each (or l from data.js) and any seeded replies (r)
    const seedNote = (id, a, b, ts, l, r = []) => ({ id, authorId: a, body: b, ts, likes: likers(l ?? Math.floor(rng(uidKey(id))() * 6), uidKey(id + "l"), a),
      replies: r.map((x, k) => seedNote(`${id}-r${k}`, x.a, x.b, now - x.h * 3600e3, x.l)) });

    // Generated meeting history: a Markov chain per user so streaks look like real habits
    const toolRuns = [];
    const answersFor = (tool, r) => Object.fromEntries(TOOLS[tool].steps.flatMap((s) => s.fields).map((f) => [f.k, f.type === "check" ? "Yes" : pick(r, SEED.sampleAnswers[tool][f.k] || [""])]));
    // Habits start with the cohort: none for people not yet enrolled, and only since the current cohort began for those in it
    members.filter((u) => u.phase === 3 || u.enrolled).forEach((u) => {
      const r = rng(uidKey(u.id)), base = u.habit ?? 0.35 + r() * 0.6;
      const weeksBack = u.phase === 3 ? 10 : SEED.cohort.currentWeek - 1;
      let prev = true;
      const drmHour = 14 + Math.floor(r() * 4); // each person has a usual end-of-day time
      for (let i = u.phase === 3 ? 60 : weeksBack * 7 + 5; i >= 0; i--) {
        const d = startOfDay(now - i * DAY);
        if (!isWorkday(d)) continue;
        prev = r() < (prev ? Math.min(0.96, base + 0.05) : Math.max(0.15, base - 0.15));
        const ts = at(d, drmHour, Math.floor(r() * 60));
        if (prev && ts < now) toolRuns.push({ id: uid(), userId: u.id, tool: "daily", ts, answers: answersFor("daily", r) });
      }
      // Each person plans at a habitual time: Friday afternoon, Saturday morning, Sunday evening, or Monday early
      const slot = pick(r, [[-3, 15], [-2, 9], [-1, 17], [0, 7]]);
      prev = true;
      for (let k = weeksBack; k >= -1; k--) {
        const target = mondayOf(now); target.setDate(target.getDate() - 7 * k + slot[0]);
        const ts = at(target, slot[1], Math.floor(r() * 50));
        if (ts > now) continue;
        prev = r() < (prev ? Math.min(0.94, base + 0.02) : Math.max(0.2, base - 0.2));
        if (prev) toolRuns.push({ id: uid(), userId: u.id, tool: "weekly", ts, answers: answersFor("weekly", r) });
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
      const k = dateKey(d);
      promptReplies[k] = promptFor(d).replies.map((x, j) => seedNote(`${k}-r${j}`, x.a, x.b, i === 0 ? now - (j + 1) * 5400e3 : at(d, 9 + j * 2)));
    }

    return {
      sessionUserId: null,
      createdAt: now,
      notifSeen: {}, // userId -> ts of the last visit to Notifications
      companies: [...SEED.companies, ...SEED.communityFill.companies],
      users,
      posts: SEED.posts.map((p) => ({ id: p.id, authorId: p.authorId, body: p.body, ts: now - p.h * 3600e3, likes: likers(p.likes, uidKey(p.id), p.authorId),
        comments: p.comments.map((c, j) => seedNote(`${p.id}-c${j}`, c.a, c.b, now - c.h * 3600e3, c.l, c.r)) })),
      progress,
      promptReplies, // dateKey -> [{id, authorId, ts, body, likes, replies}]
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
  // Time zone defaults to the device's; reminder times are in that zone
  const deviceZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles"; } catch { return "America/Los_Angeles"; } })();
  const TIME_ZONES = [
    ["America/New_York", "Eastern Time"], ["America/Chicago", "Central Time"], ["America/Denver", "Mountain Time"], ["America/Phoenix", "Arizona"],
    ["America/Los_Angeles", "Pacific Time"], ["America/Anchorage", "Alaska"], ["Pacific/Honolulu", "Hawaii"], ["America/Toronto", "Toronto"],
    ["America/Mexico_City", "Mexico City"], ["America/Sao_Paulo", "São Paulo"], ["Europe/London", "London"], ["Europe/Berlin", "Berlin, Paris, Madrid"],
    ["Africa/Johannesburg", "Johannesburg"], ["Asia/Dubai", "Dubai"], ["Asia/Kolkata", "India"], ["Asia/Singapore", "Singapore"],
    ["Asia/Tokyo", "Tokyo"], ["Australia/Sydney", "Sydney"], ["Pacific/Auckland", "Auckland"],
  ];
  const zoneLabel = (z) => (TIME_ZONES.find((x) => x[0] === z)?.[1] || z.replace(/_/g, " ").split("/").pop());
  const DEFAULT_SETTINGS = { private: false, remindWeekly: true, weeklyWhen: "Friday 8:00 AM", remindDaily: true, dailyWhen: "4:30 PM", digest: true, digestWhen: "7:00 AM", timeZone: deviceZone };
  const settingsOf = (u) => ({ ...DEFAULT_SETTINGS, private: !!u.private, ...(u.settings || {}) });
  // Private members' habits and streaks are visible only to themselves, their team leaders, and coaches
  const visibleTo = (u) => !settingsOf(u).private || u.id === me().id || isCoach() || (me().role === "admin" && me().companyId === u.companyId);
  const user = (id) => S.users.find((u) => u.id === id) || { name: "Unknown", id };
  const company = (id) => S.companies.find((c) => c.id === id);
  const isCoach = (u = me()) => u && u.role === "coach";
  const teamOf = (cid) => S.users.filter((u) => u.companyId === cid);
  // Avatar ring shows the member's phase (sand: Unlock Your Week, light teal: Master Your Week, teal: Maximize Your Week)
  // "Acme Logistics · 3h ago" under a name in comments and replies; coaches show Time Boss
  const whereWhen = (u, ts) => `<small class="meta">${esc(u.companyId ? company(u.companyId)?.name : "Time Boss")} · ${ago(ts)}</small>`;
  const avatar = (u, size = "") => `<span class="avatar ${size} ${u.photo ? "photo" : ""} ${u.role === "coach" || !u.companyId ? "ring-coach" : `ring-p${phaseOf(u)}`}" style="background:${u.color || (u.companyId ? company(u.companyId)?.color : "#5e8497")}${u.photo ? `;background-image:url('${u.photo}')` : ""}">${u.photo ? "" : esc(initials(u.name))}</span>`;

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
  // Profile picture with three badges beneath it: phase (left), Weekly Planning Meeting streak (middle), Daily Review Meeting streak (right)
  function profileBadges(u) {
    if (u.role === "coach" || !u.companyId) return "";
    const ph = phaseOf(u), on = hasHabits(u), shown = on && visibleTo(u);
    const why = !on ? "starts in Master Your Week" : "private";
    const b = (pos, n, label, cls = "") => `<span class="pb pb-${pos} ${cls}" title="${label}">${n}</span>`;
    const lock = icon("lock", "ic pb-lock");
    return `<span class="pbs">${b("l", ph, `Phase ${ph}: ${esc(phaseLabel(u))}`, `phase p${ph}`)}${b("c", shown ? wpmStreak(u.id) : lock, `Weekly Planning Meeting streak: ${shown ? `${wpmStreak(u.id)} weeks in a row` : why}`, shown ? "wpm" : "locked")}${b("r", shown ? drmStreak(u.id) : lock, `Daily Review Meeting streak: ${shown ? `${drmStreak(u.id)} workdays in a row` : why}`, shown ? "drm" : "locked")}</span>`;
  }
  function profileAvatar(u, size = "", { link = true } = {}) {
    // Coaches get the same layout, with a Coach label where members show their numbers
    const inner = u.role === "coach" || !u.companyId
      ? `<span class="pav pav-${size || "md"}">${avatar(u, size)}<span class="pbs"><span class="pb coach-pb">Coach</span></span></span>`
      : `<span class="pav pav-${size || "md"}">${avatar(u, size)}${profileBadges(u)}</span>`;
    // Tapping a profile picture opens that person's public profile
    return link ? `<a class="pav-link" href="#/people/${u.id}" aria-label="View ${esc(u.name)}'s profile">${inner}</a>` : inner;
  }
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
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    reply: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  };
  // Card header that mirrors the menu: icon, title, divider. Links to that page when there is one.
  const cardHead = (ic, title, href) => href ? `<a class="card-hd" href="${href}">${icon(ic)}<span>${title}</span></a>` : `<div class="card-hd">${icon(ic)}<span>${title}</span></div>`;
  const icon = (k, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  // White logo from www.timeboss.us/images/Time_Boss_Logo_White.png, for dark (navy) backgrounds
  const LOGO = "assets/time-boss-logo-white.png";
  // Use the real logo only once it has loaded; otherwise show the wordmark (no flicker on re-render)
  let logoOk = false;
  // Skip the re-render while a celebration is playing so it isn't cut short; the logo appears on the next render
  Object.assign(new Image(), { onload: () => { logoOk = true; if (!document.querySelector(".celebrate:not(.settled)")) render(); }, src: LOGO });
  const wordmark = (sub) => `<div class="brand"><span class="logo">${icon("clock")}</span><div><b>TIME BOSS</b>${sub ? `<small>${sub}</small>` : ""}</div></div>`;
  const logo = (sub) => (logoOk ? `<img class="brand-img" src="${LOGO}" alt="Time Boss">${sub ? `<small class="brand-sub">${sub}</small>` : ""}` : wordmark(sub));

  // ---------- layout ----------
  function nav() {
    const u = me(), c = company(u.companyId), r = location.hash;
    const link = (href, label, ic, locked = false) => `<a href="${href}" class="${r === href || r.startsWith(href + "/") ? "active" : ""} ${locked ? "locked" : ""}">${icon(ic)}<span>${label}</span>${locked ? icon("lock", "ic lock nav-lock") : ""}</a>`;
    const lockH = !hasHabits(u);
    return `
      <div class="brand-wrap">${logo()}</div>
      <nav>
        ${link("#/home", "Home", "home")}
        ${link("#/community", "Community", "community")}
        ${c ? link("#/company", esc(c.name), "company") : ""}
        ${isCoach() ? link("#/companies", "Companies", "company") : ""}
        <div class="navlabel">Learn</div>
        ${link("#/learn", "Courses", "learn")}
        <div class="navlabel">Live</div>
        ${link("#/events", "Upcoming Events", "events", lockH)}
        ${link("#/office-hours", "Office Hours", "office")}
        <div class="navlabel">Habits</div>
        ${link("#/tools/weekly", "Weekly Planning Meeting", "weekly", lockH)}
        ${link("#/tools/daily", "Daily Review Meeting", "daily", lockH)}
      </nav>
      ${mywCta()}
      <div class="me">${profileAvatar(u)}<div><b>${esc(u.name)}</b><small>${c ? esc(c.name) : "Time Boss Team"}${u.role !== "member" ? " · " + u.role : ""}</small></div>
        <button class="ghost sm" data-action="logout" title="Switch user">Switch</button></div>`;
  }

  // The one "next step" card, same look everywhere (sidebar, community). Content follows the member's phase.
  function mywCta() {
    const u = me(), ph = phaseOf(u), c = SEED.cohort;
    if (ph === 1) {
      const p = courseProgress(u.id, courseById(WORKSHOP)), nx = nextLessonIn(u, [courseById(WORKSHOP)]);
      return `<div class="myw"><span class="myw-head">Your Next Step</span><span class="myw-when">Step 1 of 3 · ${p.n} of ${p.total} lessons done</span>
        <h3>Unlock Your Week Workshop</h3><p>Finish the workshop to unlock the Master Your Week Cohort.</p>
        <a class="btn accent sm" href="#/learn/${WORKSHOP}/${nx.l.id}">Complete Workshop</a></div>`;
    }
    if (ph === 2 && enrolled(u)) return `<div class="myw"><span class="myw-head">Your Next Step</span><span class="myw-when">Step 2 of 3 · week ${c.currentWeek} of ${c.weeks}</span>
      <h3>You're in ${esc(c.name)}</h3><p>Group Coaching Cohort. Keep your Weekly Planning Meeting and Daily Review Meeting going between sessions.</p>
      <a class="btn accent sm" href="#/cohort">View Cohort</a></div>`;
    if (ph === 2) return `<div class="myw"><span class="myw-head">Your Next Step</span><span class="myw-when">Step 2 of 3 · next cohort starts ${fmtDate(c.startsOn + "T12:00", { month: "long", day: "numeric" })}</span>
      <h3>${esc(c.name)} Cohort</h3><p>${c.weeks} weeks, live with a Time Boss coach. ${c.seatsLeft} seats left.</p>
      <button class="btn accent sm" data-action="enroll">Enroll in Cohort</button></div>`;
    const mc = masterclassEvents()[0], going = rsvpd(mc.id);
    return `<div class="myw"><span class="myw-head">Your Next Step</span><span class="myw-when">Next masterclass · ${fmtDate(mc.start, { weekday: "short", month: "short", day: "numeric" })}</span>
      <h3>${esc(mc.title.replace("Masterclass: ", ""))}</h3><p>${esc(mc.desc)}</p>
      ${going ? `<a class="btn accent sm" href="#/events">✓ You're Going</a>` : `<button class="btn accent sm" data-action="rsvp" data-id="${mc.id}">RSVP for Masterclass</button>`}</div>`;
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
        <div class="row"><a class="btn" href="#/tools/weekly">Run Weekly Planning Meeting</a><a class="btn ghost" href="#/cohort">View Cohort</a></div>`;
    } else if (ph === 2) {
      body = `<h2>Enroll in the Master Your Week Cohort</h2><p>You finished the workshop. The next cohort starts ${fmtDate(c.startsOn + "T12:00", { weekday: "long", month: "long", day: "numeric" })}: ${c.weeks} weeks, live with a Time Boss coach, ${c.seatsLeft} seats left. Enrolling opens your habits: the Weekly Planning Meeting, the Daily Review Meeting, and live events.</p>
        <div class="row"><button class="btn" data-action="enroll">Enroll in Cohort</button><a class="btn ghost" href="#/cohort">About the Cohort</a></div>`;
    } else {
      const nx = nextLessonIn(u, [...SEED.courses.filter((x) => x.kind === "mini"), ...SEED.courses.filter((x) => x.kind === "cohort")]), mc = masterclassEvents()[0], wp = weeklyPlanningEvents()[0];
      const rsvpBtn = (e, label) => rsvpd(e.id) ? `<a class="btn ghost" href="#/events">✓ Going ${fmtDate(e.start, { month: "short", day: "numeric" })}</a>` : `<button class="btn ghost" data-action="rsvp" data-id="${e.id}">${label}</button>`;
      body = `<h2>Maximize Your Week</h2><p>Ongoing education: mini courses, a monthly masterclass, and live Weekly Planning Meetings.${nx ? ` Up next: ${esc(nx.l.title)} in ${esc(nx.c.title)}.` : ""}</p>
        <div class="row">${nx ? `<a class="btn" href="#/learn/${nx.c.id}/${nx.l.id}">Watch Next Course</a>` : `<a class="btn" href="#/learn">Browse Courses</a>`}
        ${rsvpBtn(mc, "RSVP for Next Masterclass")}${rsvpBtn(wp, "RSVP for Weekly Planning Meeting")}</div>`;
    }
    return `<section class="card phase-card" aria-label="Your phase">${track}<div class="phase-body myw"><span class="myw-head">Your Next Step</span>${body}</div></section>`;
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

  // ---------- who ran it (social proof) ----------
  // Daily Review Meeting counts today once anyone has run it, otherwise the last workday
  function drmDay() {
    const t = startOfDay(Date.now());
    if (isWorkday(t) && S.toolRuns.some((r) => r.tool === "daily" && dateKey(new Date(r.ts)) === dateKey(t))) return t;
    return prevWorkday(t);
  }
  function periodLabel(tool) {
    if (tool === "weekly") return plannedWeek(Date.now()) === dateKey(mondayOf(Date.now())) ? "this week" : "for next week";
    const d = drmDay(), today = startOfDay(Date.now()), yest = startOfDay(Date.now() - DAY);
    return dateKey(d) === dateKey(today) ? "today" : dateKey(d) === dateKey(yest) ? "yesterday" : `on ${d.toLocaleDateString("en-US", { weekday: "long" })}`;
  }
  // Everyone who ran the meeting in the current period, newest first
  function ranList(tool) {
    const wk = plannedWeek(Date.now()), day = dateKey(drmDay()), latest = {};
    S.toolRuns.forEach((r) => {
      if (r.tool !== tool || (tool === "weekly" ? plannedWeek(r.ts) !== wk : dateKey(new Date(r.ts)) !== day)) return;
      if (!latest[r.userId] || latest[r.userId] < r.ts) latest[r.userId] = r.ts;
    });
    return Object.entries(latest).map(([id, ts]) => ({ u: user(id), ts })).filter((x) => x.u.companyId && visibleTo(x.u)).sort((a, b) => b.ts - a.ts);
  }
  // Lead with your own team when at least three teammates ran it; otherwise the whole community
  function proofScope(tool) {
    const all = ranList(tool), u = me(), others = all.filter((x) => x.u.id !== u.id);
    const team = u.companyId ? others.filter((x) => x.u.companyId === u.companyId) : [];
    const useTeam = team.length >= 3;
    return { all, others, team, list: useTeam ? team : others, where: useTeam ? `at ${company(u.companyId).name}` : "in the community", scope: useTeam ? "team" : "all", iRan: all.some((x) => x.u.id === u.id) };
  }
  const avatarStack = (list, n = 5) => `<span class="av-stack">${list.slice(0, n).map((x) => avatar(x.u, "sm")).join("")}${list.length > n ? `<span class="stack-more">+${list.length - n}</span>` : ""}</span>`;
  function socialProof(tool, { compact = false } = {}) {
    const p = proofScope(tool), n = p.list.length;
    if (!n) return "";
    const period = periodLabel(tool), planned = period === "for next week" ? "next week" : "this week";
    const did = tool === "weekly" ? `already planned ${planned}` : `already run their Daily Review Meeting ${period}`;
    const text = p.iRan ? (tool === "weekly" ? `You and ${n} other${n === 1 ? "" : "s"} ${p.where} have planned ${planned}.` : `You and ${n} other${n === 1 ? "" : "s"} ${p.where} ran it ${period}.`)
      : `Join ${n} Time Boss${n === 1 ? "" : "es"} ${p.where} who've ${compact && tool === "daily" ? `run theirs ${period}` : did}.`;
    return `<div class="proof ${compact ? "compact" : ""}">${avatarStack(p.list)}<span class="proof-text">${esc(text)} <button class="link proof-all" data-action="show-ran" data-tool="${tool}" data-id="${p.scope}">View All</button></span></div>`;
  }
  let ranModal = null; // {tool, scope}
  function ranModalView() {
    if (!ranModal) return "";
    const { tool } = ranModal, p = proofScope(tool), u = me(), scope = u.companyId ? ranModal.scope : "all";
    const list = scope === "team" ? p.all.filter((x) => x.u.companyId === u.companyId) : p.all;
    return `<div class="modal-backdrop" data-action="close-modal"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ran-title">
        <div class="modal-head"><h2 id="ran-title">Ran their ${TOOLS[tool].title} ${periodLabel(tool)}</h2><button class="ghost sm" data-action="close-modal" aria-label="Close">Close</button></div>
        ${u.companyId ? `<div class="seg"><button class="${scope === "team" ? "on" : ""}" data-action="ran-scope" data-id="team">${esc(company(u.companyId).name)} (${p.all.filter((x) => x.u.companyId === u.companyId).length})</button><button class="${scope === "all" ? "on" : ""}" data-action="ran-scope" data-id="all">Everyone (${p.all.length})</button></div>` : ""}
        <ul class="ran-list">${list.map((x) => `<li>${profileAvatar(x.u)}<div><b>${esc(x.u.name)}${x.u.id === u.id ? " (you)" : ""}</b><small>${esc(x.u.title)} · ${esc(company(x.u.companyId).name)} · ${ago(x.ts)}</small></div></li>`).join("") || `<li class="muted">Nobody yet. Be the first.</li>`}</ul>
      </div>`;
  }

  // ---------- locked previews ----------
  // Example habit data shown behind the lock so members can see what they're working toward
  const SAMPLE = { weekly: { n: 6, len: 8, on: [0, 0, 1, 1, 1, 1, 1, 1] }, daily: { n: 12, len: 10, on: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] } };
  const sampleChain = (tool, light = false) => `<div class="chain ${light ? "light" : ""}" aria-hidden="true">${SAMPLE[tool].on.map((x) => `<span class="pip ${x ? "on" : ""}"></span>`).join("")}</div>`;
  const sampleHalf = (tool) => {
    const n = SAMPLE[tool].n;
    return `<div class="habits-half">${cardHead(tool, TOOLS[tool].title)}
      <div class="habits-count"><b>${n}</b><span>${tool === "weekly" ? "weeks in a row" : "workdays in a row"}</span></div>${sampleChain(tool)}</div>`;
  };
  // Real-looking preview, dimmed and inert, with the lock message on top
  function lockedOver(preview, title, cls = "", { compact = false, proofTool = null } = {}) {
    const ran = proofTool ? ranList(proofTool) : [];
    const nx = nextLessonIn(me(), [courseById(WORKSHOP)]), ph = phaseOf();
    return `<div class="locked-wrap ${cls}">
      <div class="locked-preview" aria-hidden="true" inert>${preview}</div>
      <div class="locked-overlay"><div class="locked-msg" role="note">
        <span class="locked-badge">${icon("lock", "ic lock")} Example</span>
        <h2>${esc(title)}</h2>
        ${ran.length ? `<div class="proof center">${avatarStack(ran)}<span class="proof-text">${ran.length} people in the community ran their ${TOOLS[proofTool].title} ${periodLabel(proofTool)}.</span></div>` : ""}
        ${compact ? "" : `<p class="muted">${ph === 1 ? "First, finish the Unlock Your Week Workshop." : "Habits and live events open together when you enroll."}</p>`}
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
            <select name="companyId">${S.companies.filter((c) => !c.background).map((c) => `<option value="${c.id}">${esc(c.name)} (code: ${c.id.toUpperCase()})</option>`).join("")}<option value="__new">+ New company</option></select>
            <input name="newCompany" placeholder="New company name (if creating)">
            <button class="btn">Join</button>
          </form></details>
        <button class="link danger" data-action="reset">Reset Demo Data</button>
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
      ${cardHead(tool, t.title, `#/tools/${tool}`)}
      <div class="habits-count"><b>${n}</b><span>${unit}</span></div>
      ${chain(tool, id, tool === "weekly" ? 8 : 10)}
      ${socialProof(tool, { compact: true })}
      <div class="habits-foot">
        ${draft ? `<a class="btn sm" href="#/tools/${tool}">Resume</a><small>In progress, step ${draft.step + 1} of ${t.steps.length}</small>`
          : doneNow ? `<a class="btn ghost sm" href="#/tools/${tool}">View</a><small>Done ${tool === "daily" ? "today" : "for this week"}</small>`
          : tool === "daily" && !isWorkday(new Date()) ? `<a class="btn ghost sm" href="#/tools/${tool}">View</a><small>Next one Monday, end of day</small>`
          : `<a class="btn sm" href="#/tools/${tool}">Run Now</a><small>${t.when}</small>`}
      </div></div>`;
  }


  V.home = () => {
    const u = me(), op = overallProgress(u.id), p = promptFor(), ms = monthStats(u.id);
    return `
      <header class="page-head"><div><h1>Good ${["morning", "afternoon", "evening"][new Date().getHours() < 12 ? 0 : new Date().getHours() < 18 ? 1 : 2]}, ${esc(u.name.split(" ")[0])}</h1>
</div></header>

      ${phaseCard()}
      ${hasHabits(u) ? `<section class="habits" aria-label="Your habits">${habitHalf("weekly")}${habitHalf("daily")}</section>

      <div class="grid two">
        <div class="card stat">${cardHead("daily", "Habits")}<span class="muted">Past month completion</span><b>${ms.all}%</b>${bar(ms.all)}<small>Weekly Planning Meeting ${ms.wpm}% · Daily Review Meeting ${ms.drm}%</small></div>
        ${phaseOf(u) < 3 ? (() => { const w = courseProgress(u.id, courseById(WORKSHOP)); return `<div class="card stat">${cardHead("learn", "Courses", "#/learn")}<span class="muted">Workshop progress</span><b>${w.pct}%</b>${bar(w.pct)}<small>${w.n} of ${w.total} lessons</small></div>`; })()
          : `<div class="card stat">${cardHead("learn", "Courses", "#/learn")}<span class="muted">Course progress</span><b>${op.pct}%</b>${bar(op.pct)}<small>${op.n} of ${op.total} lessons</small></div>`}
      </div>` : lockedOver(`<section class="habits">${sampleHalf("weekly")}${sampleHalf("daily")}</section>`, "You unlock Habits when you join the Master Your Week group coaching cohort", "habits-lock", { compact: true })}

      <div class="grid two">
        <div class="card prompt-card">
          ${cardHead("community", "Community", "#/community")}
          <span class="pinned-label">${icon("pin", "ic pin")} Today's Prompt</span><small class="prompt-date">${longDate()}</small>
          <h3>${esc(p.q)}</h3>
          <p class="muted">${plural((S.promptReplies[dateKey()] || []).length, "reply", "replies")} today</p>
          <a class="btn accent sm" href="#/community">Answer in Community</a>
        </div>
        <div class="card office-card">
          ${cardHead("office", "Office Hours", "#/office-hours")}
          <h3>15 minutes with a Time Boss coach</h3>
          <p class="muted">Get help on any challenge related to time.</p>
          <a class="btn ghost sm" href="#/office-hours">Book Office Hours</a>
        </div>
      </div>
      ${hasHabits(u) ? eventsCard() : lockedOver(eventsCard({ sample: true }), "You unlock live events when you join the Master Your Week group coaching cohort", "events-lock", { compact: true })}`;
  };
  // Home: the next live events with RSVP right there
  function eventsCard({ sample = false } = {}) {
    const list = allEvents().sort((a, b) => a.start - b.start).slice(0, 3);
    const row = (e) => `<li class="ev-row"><span class="date-chip sm"><b>${new Date(e.start).getDate()}</b><small>${fmtDate(e.start, { month: "short" })}</small></span>
      <div class="ev-main"><b>${esc(e.title)}</b><small>${fmtDate(e.start, { weekday: "short" })} · ${fmtTime(e.start)} · ${e.mins} min</small></div>
      ${!sample && rsvpd(e.id) ? `<a class="btn ghost sm" href="#/events">✓ Going</a>` : `<button class="btn sm" ${sample ? "" : `data-action="rsvp" data-id="${e.id}"`}>RSVP</button>`}</li>`;
    return `<div class="card events-card">${cardHead("events", "Upcoming Events", "#/events")}<ul class="ev-list">${list.map(row).join("")}</ul>
      <a class="link-all" href="#/events">See All Events</a></div>`;
  }

  // One writing box everywhere: my avatar beside a text box that grows, with a character count and the action below
  function composeBox({ form, attrs = "", rows = 2, max = 1000, placeholder, button, cls = "", btnCls = "" }) {
    return `<form data-form="${form}" ${attrs} class="compose ${cls}">
      <div class="compose-row">${avatar(me(), "sm")}<textarea name="body" rows="${rows}" maxlength="${max}" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" data-autogrow data-counter required></textarea></div>
      <div class="compose-actions"><small class="char-count" aria-live="polite">0 / ${max.toLocaleString()}</small><button class="btn sm ${btnCls}">${button}</button></div></form>`;
  }

  // community: pinned daily prompt, then the feed
  let freshNote = 0; // ts of the comment or reply just posted, so it can animate in once
  let replyTo = null; // {id, name}: the thread whose reply box is open
  // A comment (or prompt reply) with Like and Reply, its replies indented under it, one level deep
  function note(n, cls, dark, parent = null) {
    const a = user(n.authorId), liked = n.likes.includes(me().id), top = parent || n, first = esc(a.name.split(" ")[0]);
    const body = `<div class="note ${cls} ${n.ts === freshNote ? "fresh" : ""}" id="n-${n.id}">${profileAvatar(a, parent ? "sm" : "md")}<div class="note-main"><b>${esc(a.name)}</b>${whereWhen(a, n.ts)}<div>${esc(n.body)}</div>
      <div class="note-actions"><button class="note-act ${liked ? "liked" : ""}" data-action="like-note" data-id="${n.id}" aria-pressed="${liked}" aria-label="${liked ? "Unlike" : "Like"}">${liked ? "♥" : "♡"} ${n.likes.length || "Like"}</button><button class="note-act" data-action="reply-note" data-id="${top.id}" data-name="${first}">Reply</button></div></div></div>`;
    if (parent) return body;
    const open = replyTo?.id === n.id, kids = n.replies.map((r) => note(r, cls, dark, n)).join("");
    return `<div class="note-thread">${body}${kids || open ? `<div class="note-replies">${kids}${open ? composeBox({ form: "note-reply", attrs: `data-id="${n.id}"`, rows: 1, placeholder: `Reply to ${replyTo.name}...`, button: "Reply", cls: `note-reply-form ${dark ? "reply-form" : ""}`, btnCls: dark ? "accent" : "" }) : ""}</div>` : ""}</div>`;
  }
  const allNotes = () => [...S.posts.flatMap((p) => p.comments), ...Object.values(S.promptReplies).flat()].flatMap((n) => [n, ...n.replies]);
  // The daily prompt: pinned on Community for today, or on its own page (all replies) from Previous Prompts and notifications
  function pinnedPrompt(k = dateKey(), all = false) {
    const d = new Date(k + "T12:00"), today = k === dateKey(), p = promptFor(d), replies = (S.promptReplies[k] || []).slice().sort((a, b) => b.ts - a.ts);
    const reply = (r) => note(r, "reply", true), shown = all ? replies.length : 3;
    return `<section class="card prompt-card pinned">
      <div class="row between"><div><span class="pinned-label">${icon("pin", "ic pin")} ${today ? "Today's Prompt" : "Daily Prompt"}</span><small class="prompt-date">${longDate(d)}</small></div><small class="muted">${plural(replies.length, "reply", "replies")}</small></div>
      <h3>${esc(p.q)}</h3>
      ${today ? composeBox({ form: "reply", rows: 2, placeholder: "Your answer...", button: "Reply", cls: "reply-form", btnCls: "accent" }) : ""}
      <div class="replies">${replies.slice(0, shown).map(reply).join("")}
        ${replies.length > shown ? `<details><summary>Show all ${replies.length} replies</summary>${replies.slice(shown).map(reply).join("")}</details>` : ""}</div>
    </section>`;
  }
  function postCard(p, full = false) {
    const a = user(p.authorId), liked = p.likes.includes(me().id), href = `#/post/${p.id}`;
    const shown = full ? p.comments : p.comments.slice(-2);
    return `<article class="card post" id="post-${p.id}">
      <div class="post-head">${profileAvatar(a, "lgp")}<div><b>${esc(a.name)}</b><small>${esc(a.title)}${a.companyId ? " · " + esc(company(a.companyId).name) : ""} · <a class="post-time" href="${href}">${ago(p.ts)}</a></small></div></div>
      <div class="post-body">${paras(p.body)}</div>
      <div class="post-actions">
        <button class="ghost sm ${liked ? "liked" : ""}" data-action="like" data-id="${p.id}">${liked ? "♥" : "♡"} ${p.likes.length || ""}</button>
        ${full ? `<span class="muted sm">${plural(p.comments.length, "comment", "comments")}</span>` : `<a class="muted sm post-count" href="${href}">${plural(p.comments.length, "comment", "comments")}</a>`}
      </div>
      <div class="comments">
        ${shown.length < p.comments.length ? `<a class="view-all" href="${href}">View All ${p.comments.length} Comments</a>` : ""}
        ${shown.map((c) => note(c, "comment", false)).join("")}
        ${composeBox({ form: "comment", attrs: `data-id="${p.id}"`, rows: 1, placeholder: "Write a comment...", button: "Comment", cls: "comment-form" })}
      </div>
    </article>`;
  }
  V.community = () => {
    const posts = S.posts.slice().sort((a, b) => b.ts - a.ts);
    const past = [1, 2, 3].map((i) => { const d = new Date(Date.now() - i * DAY); return { d, k: dateKey(d), q: promptFor(d).q }; });
    return `
      <div class="feed-wrap"><div>
        ${pinnedPrompt()}
        ${composeBox({ form: "post", rows: 2, max: 3000, placeholder: "Share a win, a question, or what's working...", button: "Post", cls: "card post-box" })}
        ${posts.map((p) => postCard(p)).join("")}
      </div>
      <aside class="side">${mywCta()}
        <div class="card"><h3>Previous prompts</h3>
          <ul class="list">${past.map((p) => `<li><a class="past-prompt" href="#/prompt/${p.k}"><b>${esc(p.q)}</b><small>${fmtDate(p.d)} · ${plural((S.promptReplies[p.k] || []).length, "reply", "replies")}</small></a></li>`).join("")}</ul></div>
      </aside></div>`;
  };
  // Post and prompt detail pages; a notification passes the comment to scroll to and highlight
  let scrollTarget = null, scrolledFor = null; // scroll and highlight once per arrival, not on every re-render (like, reply)
  V.post = (id, noteId) => {
    const p = S.posts.find((x) => x.id === id);
    if (!p) return notFound();
    scrollTarget = noteId ? "n-" + noteId : null;
    return `<div class="detail"><a class="back" href="#" data-action="back">← Back</a>${postCard(p, true)}</div>`;
  };
  V.prompt = (k, noteId) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k || "")) return notFound();
    scrollTarget = noteId ? "n-" + noteId : null;
    return `<div class="detail"><a class="back" href="#" data-action="back">← Back</a>${pinnedPrompt(k, true)}</div>`;
  };

  // ---------- notifications: likes, comments, and replies on my posts, comments, and prompt answers ----------
  // Seeded likes have no time, so each gets a stable one within two days of the item
  const likeAt = (x, uid) => x.likeTs?.[uid] ?? x.ts + rng(uidKey(x.id + uid))() * Math.max(0, Math.min(2 * DAY, S.createdAt - x.ts));
  function notifications(u = me()) {
    const out = [];
    const likes = (x, what, href) => {
      const ids = x.likes.filter((id) => id !== u.id).map((id) => [likeAt(x, id), id]).sort((a, b) => b[0] - a[0]);
      if (ids.length) out.push({ kind: "like", who: ids.map((i) => i[1]), ts: ids[0][0], text: `liked ${what}`, snippet: x.body, href });
    };
    const answer = (n, href, what) => { // replies under one of my comments or answers, and likes on everything I wrote
      if (n.authorId === u.id) {
        likes(n, `your ${what}`, href(n));
        n.replies.filter((r) => r.authorId !== u.id).forEach((r) => out.push({ kind: "reply", who: [r.authorId], ts: r.ts, text: `replied to your ${what}`, snippet: r.body, href: href(r) }));
      }
      n.replies.forEach((r) => r.authorId === u.id && likes(r, "your reply", href(r)));
    };
    S.posts.forEach((p) => {
      const href = (n) => `#/post/${p.id}${n ? "/" + n.id : ""}`;
      if (p.authorId === u.id) {
        likes(p, "your post", href());
        p.comments.filter((c) => c.authorId !== u.id).forEach((c) => out.push({ kind: "reply", who: [c.authorId], ts: c.ts, text: "commented on your post", snippet: c.body, href: href(c) }));
      }
      p.comments.forEach((c) => answer(c, href, "comment"));
    });
    Object.entries(S.promptReplies).forEach(([k, list]) => list.forEach((n) => answer(n, (x) => `#/prompt/${k}/${x.id}`, "answer")));
    return out.sort((a, b) => b.ts - a.ts);
  }
  const seenAt = () => S.notifSeen?.[me().id] ?? S.createdAt - 12 * 3600e3;
  const unreadCount = () => notifications().filter((n) => n.ts > seenAt()).length;
  const bell = () => { const n = unreadCount(); return `<a class="bell" href="#/notifications" aria-label="Notifications${n ? `, ${n} unread` : ""}">${icon("bell")}${n ? `<span class="bell-n">${n > 9 ? "9+" : n}</span>` : ""}</a>`; };
  V.notifications = () => {
    const list = notifications(), seen = seenAt();
    (S.notifSeen ||= {})[me().id] = Date.now(); save();
    const who = (ids) => { const names = ids.map((id) => `<b>${esc(user(id).name)}</b>`); return ids.length === 1 ? names[0] : ids.length === 2 ? `${names[0]} and ${names[1]}` : `${names[0]} and ${ids.length - 1} others`; };
    const row = (n) => `<a class="notif ${n.ts > seen ? "unread" : ""}" href="${n.href}"><span class="notif-av">${avatar(user(n.who[0]), "md")}<span class="notif-ic ${n.kind}">${icon(n.kind === "like" ? "heart" : "reply")}</span></span>
      <span class="notif-main"><span class="notif-text">${who(n.who)} ${n.text}</span><span class="notif-snip">${esc(n.snippet)}</span><small class="muted">${ago(n.ts)}</small></span>${n.ts > seen ? `<span class="notif-dot" aria-label="Unread"></span>` : ""}</a>`;
    return `<header class="page-head"><div><h1>Notifications</h1><p class="muted">Likes, comments, and replies on your posts and comments.</p></div></header>
      ${list.length ? `<div class="card notif-list">${list.map(row).join("")}</div>` : `<div class="card empty"><p>No notifications yet. When someone likes or replies to your posts and comments, it shows up here.</p><a class="btn sm" href="#/community">Go to Community</a></div>`}`;
  };

  // team space (company): leaderboard for everyone, member detail for leaders and coaches
  let lbSort = "drm";
  const canManage = (cid) => isCoach() || (me().role === "admin" && me().companyId === cid);
  const memberHref = (m) => (isCoach() ? `#/companies/${m.companyId}/${m.id}` : `#/company/${m.id}`);
  function leaderboard(cid) {
    const ms = teamOf(cid).filter((m) => hasHabits(m) && visibleTo(m)).map((m) => ({ m, wpm: wpmStreak(m.id), drm: drmStreak(m.id) }));
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
        <tbody>${team.map((x) => `<tr><td class="t-name"><a href="${memberHref(x.m)}" title="${esc(x.m.title)}">${avatar(x.m, "sm")} ${esc(x.m.name)}</a></td>
          <td class="t-phase"><span class="phase-pill p${phaseOf(x.m)}" title="${PHASES[phaseOf(x.m) - 1].name}"><span class="pill-pre">Phase </span>${phaseOf(x.m)}<span class="pill-sub"> · ${phaseOf(x.m) === 2 && !enrolled(x.m) ? "Ready to enroll" : PHASES[phaseOf(x.m) - 1].sub}</span></span></td>${hasHabits(x.m) ? `<td data-label="Weekly Planning streak">${x.wpm} wk</td><td data-label="Daily Review streak">${x.drm} day</td><td data-label="Weekly Planning, past month">${pctCell(x.ms.wpm)}</td><td data-label="Daily Review, past month">${pctCell(x.ms.drm)}</td>` : `<td colspan="4" class="muted t-wide">Habits unlock when they join the cohort</td>`}<td data-label="Courses">${x.op}%</td></tr>`).join("")}</tbody>
        <tfoot><tr><td class="t-name">Team average</td><td class="t-phase"></td><td data-label="Weekly Planning streak">${(avgOf(hab, (x) => x.wpm)).toFixed(1)} wk</td><td data-label="Daily Review streak">${(avgOf(hab, (x) => x.drm)).toFixed(1)} day</td><td data-label="Weekly Planning, past month">${avg((x) => x.ms.wpm)}%</td><td data-label="Daily Review, past month">${avg((x) => x.ms.drm)}%</td><td data-label="Courses">${Math.round(avgOf(team, (x) => x.op))}%</td></tr></tfoot>
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
      <header class="page-head member-head"><div class="row">${profileAvatar(m, "lg", { link: false })}<div><h1>${esc(m.name)}</h1><p class="muted">${esc(m.title)} · ${esc(m.email)} · Phase ${phaseOf(m)}: ${phaseLabel(m)}</p></div></div></header>
      ${!hasHabits(m) ? `<div class="card"><h3>Habits unlock when they join the Master Your Week group coaching cohort</h3><p class="muted">${esc(m.name.split(" ")[0])} ${phaseOf(m) === 1 ? `is in Unlock Your Week, ${courseProgress(m.id, courseById(WORKSHOP)).n} of ${courseProgress(m.id, courseById(WORKSHOP)).total} workshop lessons done` : "finished the workshop and hasn't enrolled in the cohort yet"}. Weekly Planning Meeting and Daily Review Meeting streaks show here once they enroll.</p></div>` : `<div class="grid stats">
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
      <div class="grid three">${S.companies.filter((c) => !c.background).map((c) => {
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
    const level = (n, body) => `<section class="level ${n < ph ? "done" : n === ph ? "current" : "ahead"}"><h2 class="level-head"><span class="phase-n">${n < ph ? "✓" : n}</span><span class="level-title">${PHASES[n - 1].name}<span class="level-sub">${PHASES[n - 1].sub}${n === ph ? `<small>You are here</small>` : ""}</span></span></h2>${body}</section>`;
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
          <button class="btn ${isDone ? "ghost" : ""}" data-action="toggle-lesson" data-id="${l.id}">${isDone ? "✓ Completed (Undo)" : "Mark Complete"}</button>
          ${next ? `<a class="btn ghost" href="#/learn/${c.id}/${next.id}">Next: ${esc(next.title)}</a>` : nextSession ? `<a class="btn ghost" href="${courseHref(nextSession)}">Next: ${esc(nextSession.title)}</a>` : c.id === WORKSHOP && workshopDone(me().id) && phaseOf() === 2 && !enrolled() ? `<button class="btn" data-action="enroll">Enroll in Cohort</button>` : `<a class="btn ghost" href="#/learn">Back to Courses</a>`}
        </div>
      </article>`;
  }

  // events
  V.events = () => (hasHabits() ? eventsPage() : lockedOver(eventsPage(), "You unlock live events when you join the Master Your Week group coaching cohort", "page"));
  function eventsPage() {
    const ev = (e) => {
      const n = (S.rsvps[e.id] || []).length + (e.type === "masterclass" ? 41 : 12);
      const on = rsvpd(e.id);
      return `<div class="card event"><div class="date-chip"><b>${new Date(e.start).getDate()}</b><small>${fmtDate(e.start, { month: "short" })}</small></div>
        <div class="event-body"><h3>${esc(e.title)}</h3><p class="muted">${fmtDate(e.start, { weekday: "long" })} · ${fmtTime(e.start)} · ${e.mins} min · with ${esc(user(e.host).name)}</p>${e.desc ? `<p>${esc(e.desc)}</p>` : ""}<small class="muted">${n} going</small></div>
        <div class="event-actions"><button class="btn ${on ? "ghost" : ""}" data-action="rsvp" data-id="${e.id}">${on ? "✓ Going" : "RSVP"}</button>
          ${on ? `<a class="btn ghost sm" download="${e.id}.ics" href="data:text/calendar;charset=utf-8,${encodeURIComponent(icsFor(e))}">Add to Calendar</a>` : ""}</div></div>`;
    };
    return `<header class="page-head"><div><h1>Upcoming Events</h1><p class="muted">Live sessions with the Time Boss team. RSVP and we'll send a calendar invite to ${esc(me().email)}.</p></div></header>
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
  function celebrate(tool, before, { preview = null } = {}) {
    const t = TOOLS[tool], id = me().id, n = preview ?? streakOf(tool, id), grew = n > before;
    const unit = tool === "weekly" ? (n === 1 ? "week in a row" : "weeks in a row") : (n === 1 ? "workday in a row" : "workdays in a row");
    const line = !grew && tool === "daily" ? "Saved. Weekend reviews don't change your workday streak, but they still count for you."
      : tool === "weekly" ? "Your week is planned. Share it with someone and protect the blocks." : "Incomplete tasks have a home. Tomorrow's plan is reviewed. You can close the laptop.";
    const milestone = grew && (n === 1 ? "Day one of a new streak." : n % 5 === 0 ? `Milestone: ${n} ${tool === "weekly" ? "weeks" : "workdays"} in a row.` : "");
    // Play the animations only on arrival (or Replay); later re-renders, like opening the profile menu, show the finished state
    const play = celebrateFresh; celebrateFresh = false;
    return `<section class="celebrate ${play ? "" : "settled"}" aria-live="polite">
      <h1>${t.title} done</h1><p>${line}</p>
      <div class="big-wrap"><span class="big" ${grew ? `data-from="${before}"` : ""}>${n}</span>${grew ? `<span class="plus-one" aria-hidden="true">+1</span>` : ""}</div>
      <span class="unit">${unit}</span>
      ${milestone ? `<span class="milestone">${milestone}</span>` : ""}
      ${preview == null ? chain(tool, id, tool === "weekly" ? 8 : 10, { fresh: grew }) : previewChain(tool, n)}
      <div class="row"><a class="btn accent" href="#/home">Back to Home</a><a class="btn ghost" href="#/community">Share a Win in Community</a></div>
    </section>`;
  }
  // A full chain ending in the new pip, for previews
  const previewChain = (tool, n) => { const len = tool === "weekly" ? 8 : 10; return `<div class="chain" aria-hidden="true">${Array.from({ length: len }, (_, i) => `<span class="pip ${i >= len - n ? "on" : ""} ${i === len - 1 ? "new" : ""}"></span>`).join("")}</div>`; };

  // Preview the completion celebration without saving anything: #/preview/weekly, #/preview/daily, add /10 for a milestone
  V.preview = (tool = "weekly", count) => {
    if (!TOOLS[tool]) tool = "weekly";
    const n = Math.max(1, Math.min(999, parseInt(count, 10) || (tool === "weekly" ? 4 : 7)));
    const link = (t, c, label) => `<a class="btn ghost sm ${t === tool && (c ?? "") === (count ?? "") ? "on" : ""}" href="#/preview/${t}${c ? `/${c}` : ""}">${label}</a>`;
    return `<div class="preview-bar card"><div><b>Celebration preview</b><small class="muted">Nothing is saved. This is what members see after finishing a meeting.</small></div>
        <div class="row">${link("weekly", null, "Weekly Planning Meeting")}${link("daily", null, "Daily Review Meeting")}${link(tool, "10", "Milestone (10)")}${link(tool, "1", "Day One")}
        <button class="btn sm" data-action="replay">Replay</button></div></div>
      ${celebrate(tool, n - 1, { preview: n })}`;
  };
  function toolView(tool, { sample = false } = {}) {
    if (justSaved?.tool === tool) return celebrate(tool, justSaved.before); // stays up until the member navigates away
    const t = TOOLS[tool], dk = me().id + "|" + tool, draft = sample ? null : S.drafts[dk];
    const history = sample ? [] : runsOf(me().id, tool).sort((a, b) => b.ts - a.ts);
    const streakN = sample ? SAMPLE[tool].n : tool === "weekly" ? wpmStreak(me().id) : drmStreak(me().id);
    const aiPanel = `<div class="card ai"><span class="eyebrow">Prefer your own AI?</span><h4>Run this in Claude, ChatGPT, or any assistant</h4>
      <p class="muted">Copy the system prompt, paste it into a new chat, and say "start". It walks you through the same steps.</p>
      <details><summary>Preview prompt</summary><pre>${esc(t.prompt)}</pre></details>
      <div class="row"><button class="btn sm" data-action="copy-prompt" data-tool="${tool}">Copy System Prompt</button>
      <a class="btn ghost sm" href="https://claude.ai/new" target="_blank" rel="noopener">Open Claude</a><a class="btn ghost sm" href="https://chatgpt.com" target="_blank" rel="noopener">Open ChatGPT</a></div></div>`;

    if (!draft) {
      let lastPhase = "";
      return `<header class="page-head"><div><h1>${t.title}</h1><p class="muted">${t.when}. ${t.steps.length} steps in three parts: Reflect, Decide, Commit.</p></div></header>
        <div class="feed-wrap"><div>
          <div class="card tool-intro"><div><b>Current streak: ${plural(streakN, tool === "weekly" ? "week" : "workday", tool === "weekly" ? "weeks" : "workdays")}</b></div>${sample ? sampleChain(tool, true) : chain(tool, me().id, tool === "weekly" ? 8 : 10, { light: true })}</div>
          ${t.during ? `<div class="card"><h3>During the day, Monday to Friday: work your calendar</h3><ol class="steps-preview">${t.during.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></div>` : ""}
          <div class="card"><ol class="steps-preview">${t.steps.map((s) => { const h = s.phase !== lastPhase ? `<li class="phase-label">${s.phase}</li>` : ""; lastPhase = s.phase; return `${h}<li><b>${esc(s.title)}</b><small>${esc(s.guide)}</small></li>`; }).join("")}</ol>
          ${sample ? "" : socialProof(tool)}
          <div class="row"><button class="btn big" data-action="start-tool" data-tool="${tool}">Run Your ${t.title}</button><a class="preview-link" href="#/preview/${tool}">Preview the Celebration</a></div></div>
          ${history.length ? `<h2 class="section">History</h2>${history.slice(0, 12).map((r) => `<details class="card run"><summary><b>${fmtDate(r.ts, { weekday: "long", month: "short", day: "numeric" })}</b> <small class="muted">${fmtTime(r.ts)}</small></summary><pre>${esc(runToMarkdown(tool, r.answers, r.ts))}</pre><button class="ghost sm" data-action="copy-run" data-id="${r.id}">Copy as Markdown</button></details>`).join("")}` : ""}
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
          ${s.share ? `<button type="button" class="btn ghost sm share-btn" data-action="copy-draft" data-tool="${tool}">Copy My Plan to Share</button>` : ""}
          <div class="row between">
            <span>${draft.step > 0 ? `<button type="button" class="ghost" data-action="tool-back" data-tool="${tool}">← Back</button>` : ""}<button type="button" class="ghost danger" data-action="tool-abandon" data-tool="${tool}">Discard</button></span>
            <button class="btn">${last ? "Finish & Save" : "Next →"}</button>
          </div>
        </form>
      </div><aside class="side">${aiPanel}</aside></div>`;
  }
  V.tools = (tool) => (!TOOLS[tool] ? notFound() : hasHabits() ? toolView(tool)
    : lockedOver(toolView(tool, { sample: true }), `You unlock the ${TOOLS[tool].title} when you join the Master Your Week group coaching cohort`, "page", { proofTool: tool }));

  V.cohort = () => {
    const c = SEED.cohort;
    return `<div class="cohort-hero">
      <span class="eyebrow">${phaseOf() === 2 && enrolled() ? `Your cohort · week ${c.currentWeek} of ${c.weeks}` : `Next cohort · starts ${fmtDate(c.startsOn + "T12:00", { weekday: "long", month: "long", day: "numeric" })}`}</span>
      <h1>${esc(c.name)}</h1>
      <p class="lead">Step 2 of 3. A ${c.weeks}-week live cohort that installs the Time Boss habits for good: the Weekly Planning Meeting, the Daily Review Meeting, and a pace you can actually hold.</p>
      <ul class="checks">${c.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}<li>Includes everything in this community</li></ul>
      ${phaseOf() === 1 ? `<div class="row"><a class="btn accent" href="#/learn/${WORKSHOP}">Complete Workshop First</a><span class="muted">The cohort opens once you finish the Unlock Your Week Workshop.</span></div>`
        : phaseOf() === 2 && !enrolled() ? `<div class="row"><button class="btn accent" data-action="enroll">Enroll in Cohort</button><span class="muted">${c.seatsLeft} seats left</span></div>`
        : phaseOf() === 2 ? `<div class="row"><a class="btn accent" href="#/tools/weekly">Run Weekly Planning Meeting</a><span class="muted">You're enrolled. Week ${c.currentWeek} of ${c.weeks}.</span></div>
          <button class="link demo-link" data-action="complete-cohort">Demo: Mark the Cohort Complete</button>`
        : `<div class="row"><a class="btn accent" href="#/learn">Go to Maximize Your Week</a><span class="muted">${isCoach() ? "Coaches see every phase." : "You completed Master Your Week."}</span></div>`}
    </div>`;
  };

  const notFound = () => `<div class="card"><h2>Not found</h2><a href="#/home">Go home</a></div>`;

  // ---------- profile menu (top right) ----------
  let pmOpen = false;
  function profileMenu() {
    const u = me();
    return `<div class="pm"><button class="pm-btn" data-action="pm-toggle" aria-haspopup="menu" aria-expanded="${pmOpen}" aria-label="Your profile menu">${profileAvatar(u, "menu-av", { link: false })}<svg class="ic pm-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      ${pmOpen ? `<div class="pm-menu" role="menu"><div class="pm-who">${avatar(u)}<div><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div></div>
        <a href="#/profile" role="menuitem">Profile</a><a href="#/settings" role="menuitem">Settings</a><button class="pm-item" role="menuitem" data-action="logout">Switch User</button></div>` : ""}</div>`;
  }

  // Public profile: what anyone in the community sees when they tap someone's picture
  V.people = (id) => {
    const p = S.users.find((x) => x.id === id);
    if (!p) return notFound();
    const isMe = p.id === me().id, isCoachP = p.role === "coach" || !p.companyId, c = company(p.companyId);
    const streakCard = (tool) => {
      const n = tool === "weekly" ? wpmStreak(p.id) : drmStreak(p.id);
      return `<div class="card stat">${cardHead(tool, TOOLS[tool].title)}<b>${n}</b>${chain(tool, p.id, tool === "weekly" ? 8 : 10, { light: true })}<small>${tool === "weekly" ? (n === 1 ? "week" : "weeks") : n === 1 ? "workday" : "workdays"} in a row</small></div>`;
    };
    const habits = isCoachP ? "" : !hasHabits(p) ? `<div class="card">${cardHead("weekly", "Habits")}<p class="muted">${isMe ? "Your habits unlock when you join" : `${esc(p.name.split(" ")[0])}'s habits unlock when they join`} the Master Your Week group coaching cohort.</p></div>`
      : !visibleTo(p) ? `<div class="card">${cardHead("weekly", "Habits")}<p class="muted">${isMe ? "Your activity is private." : `${esc(p.name.split(" ")[0])} keeps their activity private.`}</p></div>`
      : `<div class="grid two">${streakCard("weekly")}${streakCard("daily")}</div>`;
    // Completed courses, grouped by the phase they belong to
    const d = done(p.id), groups = [
      [PHASES[0], SEED.courses.filter((x) => x.kind === "workshop")],
      [PHASES[1], SEED.courses.filter((x) => x.kind === "cohort")],
      [PHASES[2], SEED.courses.filter((x) => x.kind === "mini")],
    ];
    const courses = isCoachP ? "" : `<div class="card">${cardHead("learn", "Completed Courses")}${groups.map(([ph, list]) => {
      const fin = list.filter((x) => x.lessons.every((l) => d[l.id]));
      return `<div class="pp-group"><div class="row between"><b>${ph.name}</b><small class="muted">${fin.length} of ${list.length}</small></div>
        ${fin.length ? `<ul class="pp-courses">${fin.map((x) => `<li>${icon("daily", "ic pp-check")}${esc(x.title)}</li>`).join("")}</ul>` : `<p class="muted sm">None yet</p>`}</div>`;
    }).join("")}</div>`;
    return `<a class="back" href="#" data-action="back">← Back</a>
      <section class="card pp-hero">${avatar(p, "xl")}
        <div><h1>${esc(p.name)}</h1><p class="muted">${esc(p.title)}${c ? ` · ${esc(c.name)}` : p.title.includes("Time Boss") ? "" : " · Time Boss"}</p>
        ${isCoachP ? `<span class="phase-pill p3">Time Boss Coach</span>` : `<span class="phase-pill p${phaseOf(p)}">Phase ${phaseOf(p)}: ${esc(phaseLabel(p))}</span>`}
        ${isMe ? `<p class="pp-note">This is how others see you. <a href="#/profile">Edit Profile</a></p>` : !isCoachP && canManage(p.companyId) ? `<p class="pp-note"><a href="${memberHref(p)}">See team detail</a></p>` : ""}</div>
      </section>
      ${habits}${courses}`;
  };

  V.profile = () => {
    const u = me();
    return `<header class="page-head"><div><h1>Profile</h1><p class="muted">How you appear to your team and the community.</p></div></header>
      <form class="card profile-form" data-form="profile">
        <div class="photo-row">${avatar(u, "xl")}<div class="stack">
          <label class="btn ghost sm file-btn">Upload Photo<input type="file" name="photoFile" accept="image/*" data-action-change="photo"></label>
          ${u.photo ? `<button type="button" class="link" data-action="remove-photo">Remove Photo</button>` : `<small class="muted">JPG or PNG. Square photos look best.</small>`}</div></div>
        <label>Name<input name="name" value="${esc(u.name)}" required></label>
        <label>Role<input name="title" value="${esc(u.title)}" placeholder="e.g. VP Operations"></label>
        <div class="row"><button class="btn">Save Profile</button></div>
      </form>`;
  };
  V.settings = () => {
    const u = me(), st = settingsOf(u), habitsOn = hasHabits(u) || isCoach();
    const opt = (list, v) => list.map((x) => `<option ${x === v ? "selected" : ""}>${x}</option>`).join("");
    // One card per reminder: the on/off checkbox and its send time live together
    const remindCard = (k, on, title, desc, whenK, list, when) => `<div class="remind-card"><label class="remind-head"><input type="checkbox" name="${k}" value="1" ${on ? "checked" : ""}><span><b>${title}</b><small>${desc}</small></span></label>
      <label class="remind-time"><span>Send at</span><select name="${whenK}">${opt(list, when)}</select></label></div>`;
    return `<header class="page-head"><div><h1>Settings</h1><p class="muted">Your activity and emails.</p></div></header>
      <form class="card settings-form" data-form="settings">
        <h3>Activity</h3>
        <label class="check-row"><input type="radio" name="visibility" value="public" ${st.private ? "" : "checked"}><span><b>Public</b><small>Your streaks and meeting completions show on the leaderboard, in who-ran-it lists, and under your profile.</small></span></label>
        <label class="check-row"><input type="radio" name="visibility" value="private" ${st.private ? "checked" : ""}><span><b>Private</b><small>Only you, your team leaders, and Time Boss coaches see your streaks and meetings. Your posts stay visible.</small></span></label>
        <h3 class="settings-gap">Emails</h3>
        <p class="muted sm">Sent to ${esc(u.email)}.${habitsOn ? "" : " Habit reminders start when you enroll in Master Your Week."}</p>
        <label class="tz-field">Time zone<select name="timeZone">${[...(TIME_ZONES.some((x) => x[0] === st.timeZone) ? [] : [[st.timeZone, zoneLabel(st.timeZone)]]), ...TIME_ZONES].map(([z, n]) => `<option value="${esc(z)}" ${z === st.timeZone ? "selected" : ""}>${esc(n)}${z === deviceZone ? " (this device)" : ""}</option>`).join("")}</select><small class="muted">Reminder times below are in this time zone.</small></label>
        ${remindCard("remindWeekly", st.remindWeekly, "Weekly Planning Meeting", "A reminder to plan before your work week starts.", "weeklyWhen", ["Friday 8:00 AM", "Friday 3:00 PM", "Saturday 9:00 AM", "Sunday 5:00 PM", "Monday 7:00 AM"], st.weeklyWhen)}
        ${remindCard("remindDaily", st.remindDaily, "Daily Review Meeting", "A reminder at the end of each workday, Monday to Friday.", "dailyWhen", ["3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM"], st.dailyWhen)}
        ${remindCard("digest", st.digest, "Daily Notifications", "One email a day with all your notifications: likes, comments, and replies on your posts and comments. Skipped on days with nothing new.", "digestWhen", ["6:00 AM", "7:00 AM", "8:00 AM", "12:00 PM", "5:00 PM", "8:00 PM"], st.digestWhen)}
        <div class="row"><button class="btn">Save Settings</button></div>
      </form>`;
  };
  // Shrink an uploaded photo to a small square so it fits in local storage
  function loadPhoto(file) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const n = 160, cv = Object.assign(document.createElement("canvas"), { width: n, height: n }), side = Math.min(img.width, img.height);
        cv.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, n, n);
        URL.revokeObjectURL(url); resolve(cv.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject; img.src = url;
    });
  }

  // ---------- router ----------
  function render() {
    const root = document.getElementById("app");
    if (!me()) { root.className = "logged-out"; root.innerHTML = V.login() + footer(); return; }
    let [, view, a, b] = location.hash.split("/");
    if (!view || !V[view]) { location.hash = "#/home"; return; }
    root.className = "";
    const main = V[view](a, b); // first, so a page that marks notifications read updates the bell
    root.innerHTML = `<div class="topbar"><button class="menu-btn" data-action="menu" aria-label="Open menu">${icon("menu")}</button><a href="#/home" class="topbar-logo">${logo()}</a><div class="hdr-right">${bell()}${profileMenu()}</div></div>
      <aside class="sidebar">${nav()}</aside><div class="content"><div class="content-top"><div class="hdr-right">${bell()}${profileMenu()}</div></div><main id="main">${main}</main>${footer()}</div>${ranModalView()}`;
    document.body.classList.toggle("modal-open", !!ranModal);
    if (scrollTarget && location.hash !== scrolledFor) {
      const el = document.getElementById(scrollTarget);
      scrolledFor = location.hash;
      if (el) requestAnimationFrame(() => { el.scrollIntoView({ block: "center" }); el.classList.add("target"); });
    }
    scrollTarget = null;
    freshNote = 0; // a new comment animates in once, not again on the next re-render
    tickTimer();
    countUp();
  }
  // Count the streak up from the previous number on the completion screen
  let celebrateFresh = true;
  function countUp() {
    if (!document.querySelector(".celebrate:not(.settled)") || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    confetti();
    const el = document.querySelector(".celebrate .big[data-from]");
    if (!el) return;
    const to = el.textContent;
    el.textContent = el.dataset.from;
    setTimeout(() => { el.textContent = to; el.classList.add("bump"); }, 1000); // lands as the new pip drops into the chain
  }
  // A short burst of confetti in Time Boss colors over the completion screen
  function confetti() {
    const host = document.querySelector(".celebrate");
    const colors = ["#9fc2d0", "#3c768d", "#ffffff", "#E8D9C8", "#4a8aa3"];
    const box = document.createElement("div");
    box.className = "confetti";
    box.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 90; i++) {
      const p = document.createElement("i");
      const x = (Math.random() - 0.5) * 2;
      p.style.cssText = `--x:${(x * 340).toFixed(0)}px;--y:${(-140 - Math.random() * 260).toFixed(0)}px;--fall:${(420 + Math.random() * 260).toFixed(0)}px;--r:${(Math.random() * 900 - 450).toFixed(0)}deg;--d:${(Math.random() * 0.25).toFixed(2)}s;background:${colors[i % colors.length]};width:${6 + Math.random() * 6}px;height:${8 + Math.random() * 8}px;border-radius:${Math.random() < 0.3 ? "50%" : "2px"}`;
      box.appendChild(p);
    }
    host.appendChild(box);
    setTimeout(() => box.remove(), 3200);
  }
  window.addEventListener("hashchange", () => { scrolledFor = null; ranModal = null; pmOpen = false; justSaved = null; celebrateFresh = true; render(); window.scrollTo(0, 0); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ranModal) { ranModal = null; render(); } });

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

  // Likes keep their time so notifications can sort them
  function toggleLike(x) {
    const u = me().id, i = x.likes.indexOf(u);
    if (i < 0) { x.likes.push(u); (x.likeTs ||= {})[u] = Date.now(); } else { x.likes.splice(i, 1); delete x.likeTs?.[u]; }
    save(); render();
  }
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const { action, id, tool } = el.dataset;
    const A = {
      login: () => { S.sessionUserId = id; save(); location.hash = "#/home"; render(); },
      logout: () => { pmOpen = false; S.sessionUserId = null; document.body.classList.remove("menu-open"); save(); render(); },
      reset: () => { if (confirm("Reset all demo data?")) { S = freshState(); save(); render(); } },
      menu: () => document.body.classList.toggle("menu-open"),
      like: () => toggleLike(S.posts.find((x) => x.id === id)),
      "like-note": () => toggleLike(allNotes().find((x) => x.id === id)),
      "reply-note": () => { replyTo = { id, name: el.dataset.name }; render(); const t = document.querySelector(".note-reply-form textarea"); t?.focus({ preventScroll: true }); t?.closest("form")?.scrollIntoView({ block: "center" }); },
      "lb-sort": () => { lbSort = id; render(); },
      back: () => (history.length > 1 ? history.back() : (location.hash = "#/community")),
      "show-ran": () => { ranModal = { tool, scope: id }; render(); document.querySelector(".modal .ghost")?.focus(); },
      "ran-scope": () => { ranModal.scope = id; render(); },
      "close-modal": () => { ranModal = null; render(); },
      replay: () => { celebrateFresh = true; render(); },
      "pm-toggle": () => { pmOpen = !pmOpen; render(); },
      "remove-photo": () => { delete me().photo; save(); render(); toast("Photo removed"); },
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
    if (kind === "post") S.posts.push({ id: uid(), authorId: me().id, ts: Date.now(), body: v.body.trim().slice(0, 3000), likes: [], comments: [] });
    const newNote = () => ({ id: uid(), authorId: me().id, ts: (freshNote = Date.now()), body: v.body.trim().slice(0, 1000), likes: [], replies: [] });
    if (kind === "comment") S.posts.find((p) => p.id === f.dataset.id).comments.push(newNote());
    if (kind === "reply") (S.promptReplies[dateKey()] ||= []).push(newNote());
    if (kind === "note-reply") { const { replies, ...r } = newNote(); allNotes().find((n) => n.id === f.dataset.id).replies.push(r); replyTo = null; }
    if (kind === "profile") {
      const u = me();
      u.name = v.name.trim() || u.name; u.title = v.title.trim();
      toast("Profile saved");
    }
    if (kind === "settings") {
      const u = me();
      u.settings = { private: v.visibility === "private", remindWeekly: !!v.remindWeekly, weeklyWhen: v.weeklyWhen, remindDaily: !!v.remindDaily, dailyWhen: v.dailyWhen, digest: !!v.digest, digestWhen: v.digestWhen, timeZone: v.timeZone };
      // Production: these drive the reminder emails and who can see this member's activity
      toast("Settings saved");
    }
    if (kind === "join") {
      let cid = v.companyId;
      if (cid === "__new") {
        if (!v.newCompany.trim()) return toast("Name the new company");
        cid = v.newCompany.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid();
        if (!company(cid)) S.companies.push({ id: cid, name: v.newCompany.trim(), color: `hsl(${Math.random() * 360 | 0} 40% 40%)`, seats: 10 });
      }
      const isFirst = !S.users.some((u) => u.companyId === cid);
      const u = { id: "u_" + uid(), color: SEED.avatarColors[Math.floor(Math.random() * SEED.avatarColors.length)], name: v.name.trim(), email: v.email.trim(), title: v.title.trim() || "Member", companyId: cid, role: isFirst ? "admin" : "member" };
      S.users.push(u); S.sessionUserId = u.id; location.hash = "#/home";
    }
    if (kind === "tool-step") {
      const tool = f.dataset.tool, dk = me().id + "|" + tool, d = S.drafts[dk];
      saveStep(tool, f);
      if (d.step < TOOLS[tool].steps.length - 1) d.step++;
      else {
        justSaved = { tool, before: streakOf(tool, me().id) };
        celebrateFresh = true;
        S.toolRuns.push({ id: uid(), userId: me().id, tool, ts: Date.now(), answers: d.answers });
        delete S.drafts[dk];
      }
    }
    save(); render();
  });

  // Text boxes that grow with their copy, with a live character count where asked
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.maxLength > 0 && t.value.length > t.maxLength) t.value = t.value.slice(0, t.maxLength);
    if (t.matches("textarea[data-autogrow]")) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }
    if (t.matches("textarea[data-counter]")) {
      const c = t.form?.querySelector(".char-count"), max = +t.maxLength;
      if (c) { c.textContent = `${t.value.length.toLocaleString()} / ${max.toLocaleString()}`; c.classList.toggle("near", t.value.length >= max * 0.9); }
    }
  });
  // Photo upload on the Profile page
  document.addEventListener("change", async (e) => {
    if (e.target.dataset.actionChange !== "photo" || !e.target.files[0]) return;
    try { me().photo = await loadPhoto(e.target.files[0]); save(); render(); toast("Photo updated"); } catch { toast("That file isn't an image we can read. Try a JPG or PNG."); }
  });
  // Close the profile menu on a click outside it
  document.addEventListener("click", (e) => { if (pmOpen && !e.target.closest(".pm")) { pmOpen = false; render(); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && pmOpen) { pmOpen = false; render(); } });
  // Close the mobile tray on navigation or a tap outside it
  document.addEventListener("click", (e) => {
    if (e.target.closest(".sidebar a") || (document.body.classList.contains("menu-open") && !e.target.closest(".sidebar, .menu-btn"))) document.body.classList.remove("menu-open");
  });

  render();
})();
