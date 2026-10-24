// Time Boss Community prototype. No backend: state lives in localStorage.
(() => {
  const SEED = window.TB_SEED;
  const KEY = "tb_lms_v1";
  const DAY = 864e5;

  // ---------- store ----------
  function freshState() {
    const now = Date.now();
    return {
      sessionUserId: null,
      companies: SEED.companies.slice(),
      users: SEED.users.slice(),
      posts: SEED.posts.map((p) => ({ ...p, ts: now + p.ts, comments: p.comments.map((c) => ({ ...c, ts: now + c.ts })) })),
      progress: Object.fromEntries(Object.entries(SEED.progress).map(([u, ids]) => [u, Object.fromEntries(ids.map((id, i) => [id, now - (ids.length - i) * DAY]))])),
      promptReplies: {}, // dateKey -> [{authorId, ts, body}]
      rsvps: {}, // eventId -> [userId]
      bookings: [], // {slotId, coachId, start, userId, topic}
      toolRuns: [], // {id, userId, tool, ts, answers}
      drafts: {}, // userId|tool -> {step, answers, startedAt}
    };
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || freshState(); } catch { S = freshState(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

  const me = () => S.users.find((u) => u.id === S.sessionUserId);
  const user = (id) => S.users.find((u) => u.id === id) || { name: "Unknown", id };
  const company = (id) => S.companies.find((c) => c.id === id);
  const isCoach = (u = me()) => u && u.role === "coach";
  const uid = () => Math.random().toString(36).slice(2, 10);

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = (n) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const avatar = (u, size = "") => `<span class="avatar ${size}" style="background:${u.companyId ? company(u.companyId)?.color : "#2E7A8C"}">${esc(initials(u.name))}</span>`;
  const dateKey = (d = new Date()) => d.toISOString().slice(0, 10);
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

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove("show"), 2200);
  }
  async function copy(text, label = "Copied") {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = Object.assign(document.createElement("textarea"), { value: text });
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    toast(label);
  }

  // ---------- progress ----------
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
  function streak(userId) {
    const days = new Set();
    Object.values(done(userId)).forEach((t) => days.add(dateKey(new Date(t))));
    S.toolRuns.filter((r) => r.userId === userId).forEach((r) => days.add(dateKey(new Date(r.ts))));
    Object.entries(S.promptReplies).forEach(([k, rs]) => rs.some((r) => r.authorId === userId) && days.add(k));
    let n = 0, d = new Date();
    if (!days.has(dateKey(d))) d = new Date(Date.now() - DAY);
    while (days.has(dateKey(d))) { n++; d = new Date(d.getTime() - DAY); }
    return n;
  }
  const bar = (pct, cls = "") => `<div class="bar ${cls}"><span style="width:${pct}%"></span></div>`;

  // ---------- schedule ----------
  function at(date, h, m = 0) { const d = new Date(date); d.setHours(h, m, 0, 0); return d.getTime(); }
  function weeklyPlanningEvents() {
    const out = [], d = new Date();
    d.setDate(d.getDate() + ((1 - d.getDay() + 7) % 7 || 7)); // next Monday
    for (let i = 0; i < 4; i++) {
      const start = at(d, 8, 0);
      out.push({ id: "wp-" + dateKey(new Date(start)), type: "weekly", title: "Weekly Planning (live, group)", start, mins: 45, host: "u_coach2" });
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
  function officeHourSlots() {
    const slots = [], d = new Date();
    d.setHours(0, 0, 0, 0);
    const windows = { u_andrew: [10, 11], u_coach2: [14, 16] };
    for (let i = 0, added = 0; added < 6; i++) {
      const day = new Date(d.getTime() + i * DAY);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      added++;
      for (const [coachId, [h0, h1]] of Object.entries(windows)) {
        for (let m = h0 * 60; m < h1 * 60; m += 15) {
          const start = at(day, Math.floor(m / 60), m % 60);
          if (start < Date.now() + 3600e3) continue;
          const id = coachId + "|" + start;
          // deterministic "already booked by someone else" so the grid looks real
          const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
          slots.push({ id, coachId, start, takenByOther: h % 4 === 0 });
        }
      }
    }
    return slots;
  }
  const rsvpd = (eid, u = me().id) => (S.rsvps[eid] || []).includes(u);
  const myBookings = () => S.bookings.filter((b) => b.userId === me().id && b.start > Date.now() - 900e3).sort((a, b) => a.start - b.start);

  // ---------- tools ----------
  const TOOLS = {
    weekly: {
      title: "Weekly Planning Meeting",
      mins: 45,
      prompt: window.TB_PROMPTS.weekly,
      steps: [
        { title: "Review last week", mins: 7, guide: "Look back before you look forward. Be honest, not harsh.",
          fields: [{ k: "wins", label: "Wins", type: "textarea" }, { k: "misses", label: "Misses and why", type: "textarea" },
                   { k: "hours", label: "Focused hours delivered", type: "number" }, { k: "energy", label: "Average energy (1 to 5)", type: "range" }] },
        { title: "Brain dump", mins: 5, guide: "Everything on your mind. Tasks, worries, ideas. Get it out of your head.",
          fields: [{ k: "dump", label: "Brain dump", type: "textarea", rows: 8 }] },
        { title: "Quarterly check", mins: 3, guide: "What are your 3 quarterly outcomes? Every Big 3 item should move one.",
          fields: [{ k: "q", label: "Quarterly goals", type: "textarea" }] },
        { title: "Choose your Big 3", mins: 8, guide: "If only these three things happened, the week was a win.",
          fields: [{ k: "b1", label: "Big 1", type: "text" }, { k: "b2", label: "Big 2", type: "text" }, { k: "b3", label: "Big 3", type: "text" }] },
        { title: "Pace check", mins: 5, guide: "Your Highest Sustainable Pace is the focused-hour number you can hold with energy at 3+. Plan to it, not above it.",
          fields: [{ k: "hsp", label: "Your HSP (focused hours/week)", type: "number" }, { k: "planned", label: "Focused hours planned this week", type: "number" }] },
        { title: "Diversion plan", mins: 7, guide: "Name the diversions most likely to hit this week. Pre-decide: Do, Defer, Delegate, or Decline.",
          fields: [{ k: "div", label: "Likely diversions and your response", type: "textarea", ph: "Client fire drills → Defer to 4pm triage block" }] },
        { title: "Calendar it", mins: 8, guide: "Block your Big 3 in your peak energy hours. Put email and meetings in the valleys.",
          fields: [{ k: "blocks", label: "Blocks you created", type: "textarea" }] },
        { title: "Commit", mins: 2, guide: "One sentence. What kind of week is this going to be?",
          fields: [{ k: "commit", label: "My commitment", type: "text" }] },
      ],
    },
    daily: {
      title: "Daily Review",
      mins: 10,
      prompt: window.TB_PROMPTS.daily,
      steps: [
        { title: "Wins", mins: 2, guide: "What got done? Did you move a Big 3?", fields: [{ k: "wins", label: "Today's wins", type: "textarea" }] },
        { title: "Diversions", mins: 3, guide: "What pulled you off plan? Which response did you use, which should you have? Flag repeats.",
          fields: [{ k: "div", label: "Diversions", type: "textarea" }, { k: "repeat", label: "Root-cause candidate (seen 3+ times)?", type: "text" }] },
        { title: "Energy", mins: 1, guide: "Rate it. If under 3, what drained you?", fields: [{ k: "energy", label: "Energy (1 to 5)", type: "range" }, { k: "drain", label: "What drained or fueled you", type: "text" }] },
        { title: "Tomorrow", mins: 3, guide: "Top 3 for tomorrow, and the very first thing you'll do.",
          fields: [{ k: "t1", label: "Top 1", type: "text" }, { k: "t2", label: "Top 2", type: "text" }, { k: "t3", label: "Top 3", type: "text" }, { k: "first", label: "First move tomorrow", type: "text" }] },
        { title: "One improvement", mins: 1, guide: "One small change for tomorrow.", fields: [{ k: "improve", label: "Improvement", type: "text" }] },
      ],
    },
  };

  function runToMarkdown(tool, answers, ts) {
    const t = TOOLS[tool];
    let md = `# ${t.title}: ${fmtDate(ts, { weekday: "long", month: "long", day: "numeric" })}\n`;
    t.steps.forEach((s) => {
      const lines = s.fields.filter((f) => answers[f.k]).map((f) => `- **${f.label}:** ${String(answers[f.k]).replace(/\n/g, "\n  ")}`);
      if (lines.length) md += `\n## ${s.title}\n${lines.join("\n")}\n`;
    });
    return md;
  }

  // Line icons in the timeboss.us style (feather-like, teal stroke)
  const ICON = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    community: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5c2.4 0 4 1.6 4.5 4"/>',
    company: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4"/>',
    prompt: '<path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z"/>',
    learn: '<path d="M2 6.5 12 3l10 3.5-10 3.5z"/><path d="M6 8.5V14c0 1.7 2.7 3 6 3s6-1.3 6-3V8.5"/>',
    events: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    office: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    weekly: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    daily: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  const icon = (k, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  const LOGO = "https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2157407052/settings_images/5e0128-cfd4-1143-d6f7-0f3224163ce_d738fc1-5d2-fe-cfa5-26b76167ca6_70b8dc-88d4-d7d-6ca2-f8fdeacce_Time-Boss-Logo-White-1.png";
  // Use the real logo only once it has loaded; otherwise show the wordmark (no flicker on re-render)
  let logoOk = false;
  Object.assign(new Image(), { onload: () => { logoOk = true; if (me()) render(); }, src: LOGO });
  const wordmark = (sub) => `<div class="brand"><span class="logo">${icon("clock")}</span><div><b>TIME BOSS</b><small>${sub}</small></div></div>`;

  // ---------- layout ----------
  function nav() {
    const u = me(), c = company(u.companyId), r = location.hash;
    const link = (href, label, ic) => `<a href="${href}" class="${r === href || r.startsWith(href + "/") ? "active" : ""}">${icon(ic)}<span>${label}</span></a>`;
    return `
      <div class="brand-wrap">${logoOk ? `<img class="brand-img" src="${LOGO}" alt="Time Boss"><small class="brand-sub">Community</small>` : wordmark("Community")}</div>
      <nav>
        ${link("#/home", "Home", "home")}
        ${link("#/community", "Community", "community")}
        ${c ? link("#/company", esc(c.name), "company") : ""}
        ${isCoach() ? link("#/companies", "Companies", "company") : ""}
        ${link("#/prompt", "Daily Prompt", "prompt")}
        <div class="navlabel">Learn</div>
        ${link("#/learn", "Courses", "learn")}
        <div class="navlabel">Live</div>
        ${link("#/events", "Events & RSVP", "events")}
        ${link("#/office-hours", "Office Hours", "office")}
        <div class="navlabel">Tools</div>
        ${link("#/tools/weekly", "Weekly Planning", "weekly")}
        ${link("#/tools/daily", "Daily Review", "daily")}
      </nav>
      <a class="cohort-mini" href="#/cohort"><b>Master Your Week</b><span>Next cohort ${fmtDate(SEED.cohort.startsOn + "T12:00", { month: "short", day: "numeric" })} · ${SEED.cohort.seatsLeft} seats</span></a>
      <div class="me">${avatar(u)}<div><b>${esc(u.name)}</b><small>${c ? esc(c.name) : "Time Boss Team"}${u.role !== "member" ? " · " + u.role : ""}</small></div>
        <button class="ghost sm" data-action="logout" title="Switch user">Switch</button></div>`;
  }

  function cohortBanner() {
    const c = SEED.cohort;
    return `<div class="cohort-banner">
      <div><span class="eyebrow">Next cohort · starts ${fmtDate(c.startsOn + "T12:00", { month: "long", day: "numeric" })}</span>
      <h3>Join ${esc(c.name)}</h3><p>${c.bullets.map(esc).join(" · ")}</p></div>
      <a class="btn accent" href="#/cohort">Save my seat</a></div>`;
  }

  // ---------- views ----------
  const V = {};

  V.login = () => `
    <div class="login">
      <div class="login-card">
        <div class="login-top">${wordmark("Community · prototype")}</div>
        <p class="muted">Pick a demo user. Each company sees its own private space; everyone shares the common area.</p>
        ${[null, ...SEED.companies.map((c) => c.id)].map((cid) => `
          <div class="login-group"><h4>${cid ? esc(company(cid).name) : "Time Boss coaches"}</h4>
          ${S.users.filter((u) => u.companyId === cid).map((u) => `
            <button class="user-pick" data-action="login" data-id="${u.id}">${avatar(u)}<span><b>${esc(u.name)}</b><small>${esc(u.title)}${u.role !== "member" ? " · " + u.role : ""}</small></span></button>`).join("")}
          </div>`).join("")}
        <details class="join"><summary>Join with a company code</summary>
          <form data-form="join" class="stack">
            <input name="name" placeholder="Your name" required>
            <input name="title" placeholder="Your title">
            <select name="companyId">${S.companies.map((c) => `<option value="${c.id}">${esc(c.name)} (code: ${c.id.toUpperCase()})</option>`).join("")}<option value="__new">+ New company</option></select>
            <input name="newCompany" placeholder="New company name (if creating)">
            <button class="btn">Join</button>
          </form></details>
        <button class="link danger" data-action="reset">Reset demo data</button>
      </div>
    </div>`;

  V.home = () => {
    const u = me(), op = overallProgress(u.id), prompt = todaysPrompt();
    const replied = (S.promptReplies[dateKey()] || []).some((r) => r.authorId === u.id);
    const upcoming = [...weeklyPlanningEvents(), ...masterclassEvents()].filter((e) => rsvpd(e.id)).sort((a, b) => a.start - b.start).slice(0, 3);
    const nextCourse = SEED.courses.find((c) => courseProgress(u.id, c).pct < 100);
    const nextLesson = nextCourse?.lessons.find((l) => !done(u.id)[l.id]);
    const runs = S.toolRuns.filter((r) => r.userId === u.id);
    const lastWeekly = runs.filter((r) => r.tool === "weekly").sort((a, b) => b.ts - a.ts)[0];
    const lastDaily = runs.filter((r) => r.tool === "daily").sort((a, b) => b.ts - a.ts)[0];
    const energies = runs.filter((r) => r.answers.energy).sort((a, b) => a.ts - b.ts).slice(-10).map((r) => +r.answers.energy);
    return `
      <header class="page-head"><div><h1>Good ${["morning", "afternoon", "evening"][new Date().getHours() < 12 ? 0 : new Date().getHours() < 18 ? 1 : 2]}, ${esc(u.name.split(" ")[0])}</h1>
      <p class="muted">${fmtDate(Date.now(), { weekday: "long", month: "long", day: "numeric" })}</p></div></header>

      <div class="grid stats">
        <div class="card stat"><span class="muted">Course progress</span><b>${op.pct}%</b>${bar(op.pct)}<small>${op.n} of ${op.total} lessons</small></div>
        <div class="card stat"><span class="muted">Streak</span><b>${streak(u.id)}</b><small>days in a row showing up</small></div>
        <div class="card stat"><span class="muted">Weekly plans</span><b>${runs.filter((r) => r.tool === "weekly").length}</b><small>${lastWeekly ? "last " + ago(lastWeekly.ts) : "none yet"}</small></div>
        <div class="card stat"><span class="muted">Daily reviews</span><b>${runs.filter((r) => r.tool === "daily").length}</b><small>${lastDaily ? "last " + ago(lastDaily.ts) : "none yet"}</small></div>
      </div>

      <div class="grid two">
        <div class="card prompt-card">
          <span class="eyebrow">Daily prompt</span>
          <h3>${esc(prompt)}</h3>
          <p class="muted">${plural((S.promptReplies[dateKey()] || []).length, "reply", "replies")} today</p>
          <a class="btn ${replied ? "ghost" : ""}" href="#/prompt">${replied ? "See replies" : "Reply"}</a>
        </div>
        <div class="card">
          <span class="eyebrow">Continue learning</span>
          ${nextLesson ? `<h3>${esc(nextLesson.title)}</h3><p class="muted">${esc(nextCourse.title)} · ${nextLesson.mins} min</p>
            ${bar(courseProgress(u.id, nextCourse).pct)}
            <a class="btn" href="#/learn/${nextCourse.id}/${nextLesson.id}">Resume</a>` : `<h3>All courses complete 🎉</h3><p class="muted">Time to teach someone else.</p>`}
        </div>
      </div>

      <div class="grid two">
        <div class="card">
          <div class="row between"><span class="eyebrow">Your week</span></div>
          <div class="quick">
            <a href="#/tools/weekly" class="quick-tile">${icon("weekly")}<b>Run weekly planning</b><small>45 min · Big 3, pace, diversions</small></a>
            <a href="#/tools/daily" class="quick-tile">${icon("daily")}<b>Run daily review</b><small>10 min · wins, diversions, tomorrow</small></a>
            <a href="#/office-hours" class="quick-tile">${icon("office")}<b>Book office hours</b><small>15 min with a coach</small></a>
          </div>
          ${energies.length > 1 ? `<div class="spark"><span class="muted">Energy trend</span>${sparkline(energies)}</div>` : ""}
        </div>
        <div class="card">
          <span class="eyebrow">On your calendar</span>
          ${upcoming.length || myBookings().length ? `<ul class="list">
            ${myBookings().slice(0, 2).map((b) => `<li><b>Office hours with ${esc(user(b.coachId).name)}</b><small>${fmtDate(b.start)} · ${fmtTime(b.start)}</small></li>`).join("")}
            ${upcoming.map((e) => `<li><b>${esc(e.title)}</b><small>${fmtDate(e.start)} · ${fmtTime(e.start)}</small></li>`).join("")}
          </ul>` : `<p class="muted">Nothing booked. RSVP for weekly planning or the next masterclass.</p>`}
          <a class="btn ghost" href="#/events">See events</a>
        </div>
      </div>
      ${cohortBanner()}`;
  };

  function sparkline(vals) {
    const w = 220, h = 44, max = 5, min = 1;
    const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / (max - min)) * (h - 6) - 3}`).join(" ");
    return `<svg viewBox="0 0 ${w} ${h}" class="sparksvg"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  }

  // feed (common + company)
  function feed(scope, heading, sub) {
    const posts = S.posts.filter((p) => p.scope === scope).sort((a, b) => b.ts - a.ts);
    return `
      <form class="card composer" data-form="post" data-scope="${scope}">
        ${avatar(me())}<textarea name="body" rows="2" placeholder="${scope === "common" ? "Share a win, a question, or a diversion you beat..." : "Post to your team (only " + esc(company(scope)?.name) + " can see this)"}" required></textarea>
        <button class="btn">Post</button>
      </form>
      ${posts.map(postCard).join("") || `<p class="muted center">No posts yet. Be first.</p>`}`;
  }
  function postCard(p) {
    const a = user(p.authorId), liked = p.likes.includes(me().id);
    return `<article class="card post">
      <div class="post-head">${avatar(a)}<div><b>${esc(a.name)}</b>${a.role === "coach" ? '<span class="tag">Coach</span>' : ""}<small>${esc(a.title)}${a.companyId && p.scope === "common" ? " · " + esc(company(a.companyId).name) : ""} · ${ago(p.ts)}</small></div></div>
      <div class="post-body">${paras(p.body)}</div>
      <div class="post-actions">
        <button class="ghost sm ${liked ? "liked" : ""}" data-action="like" data-id="${p.id}">${liked ? "♥" : "♡"} ${p.likes.length || ""}</button>
        <span class="muted sm">${p.comments.length} comment${p.comments.length === 1 ? "" : "s"}</span>
      </div>
      <div class="comments">
        ${p.comments.map((c) => { const ca = user(c.authorId); return `<div class="comment">${avatar(ca, "sm")}<div><b>${esc(ca.name)}</b> <small class="muted">${ago(c.ts)}</small><div>${esc(c.body)}</div></div></div>`; }).join("")}
        <form data-form="comment" data-id="${p.id}" class="comment-form"><input name="body" placeholder="Write a comment..." required><button class="ghost sm">Reply</button></form>
      </div>
    </article>`;
  }

  V.community = () => `
    <header class="page-head"><div><h1>Community</h1><p class="muted">The common area. Everyone in Time Boss, every company.</p></div></header>
    <div class="feed-wrap"><div>${feed("common")}</div>
    <aside class="side">${sideTodayPrompt()}${cohortBannerSmall()}</aside></div>`;

  function companySpace(cid) {
    const c = company(cid), members = S.users.filter((u) => u.companyId === cid);
    const canSeeTeam = isCoach() || me().role === "admin";
    return `
      <header class="page-head"><div><span class="eyebrow" style="color:${c.color}">🔒 Private company space</span><h1>${esc(c.name)}</h1>
      <p class="muted">${members.length} members · ${c.seats} seats · Only ${esc(c.name)} members and Time Boss coaches can see this.</p></div></header>
      <div class="feed-wrap"><div>${feed(cid)}</div>
      <aside class="side">
        <div class="card"><span class="eyebrow">Team progress</span>
        ${canSeeTeam ? `<table class="team">${members.map((m) => { const p = overallProgress(m.id); return `<tr><td>${avatar(m, "sm")} ${esc(m.name)}</td><td class="w">${bar(p.pct, "thin")}</td><td>${p.pct}%</td></tr>`; }).join("")}</table>
          <small class="muted">Visible to company admins and coaches.</small>`
        : `<p class="muted">Your team is ${Math.round(members.reduce((a, m) => a + overallProgress(m.id).pct, 0) / members.length)}% through the program on average.</p>`}
        </div>
        ${canSeeTeam ? `<div class="card"><span class="eyebrow">Weekly rhythm adoption</span>
          ${members.map((m) => { const n = S.toolRuns.filter((r) => r.userId === m.id && r.ts > Date.now() - 7 * DAY).length; return `<div class="row between sm"><span>${esc(m.name)}</span><span class="${n ? "" : "muted"}">${n} tool run${n === 1 ? "" : "s"} this week</span></div>`; }).join("")}
        </div>` : ""}
      </aside></div>`;
  }
  V.company = () => (me().companyId ? companySpace(me().companyId) : V.companies());
  V.companies = (cid) => {
    if (!isCoach()) return `<div class="card">Coaches only.</div>`;
    if (cid && company(cid)) return companySpace(cid);
    return `<header class="page-head"><div><h1>Companies</h1><p class="muted">Coach view across tenants.</p></div></header>
      <div class="grid three">${S.companies.map((c) => {
        const ms = S.users.filter((u) => u.companyId === c.id);
        const avg = ms.length ? Math.round(ms.reduce((a, m) => a + overallProgress(m.id).pct, 0) / ms.length) : 0;
        return `<a class="card company-tile" href="#/companies/${c.id}" style="border-top:4px solid ${c.color}"><h3>${esc(c.name)}</h3><p class="muted">${ms.length} members · ${S.posts.filter((p) => p.scope === c.id).length} posts</p>${bar(avg)}<small>${avg}% avg progress</small></a>`;
      }).join("")}</div>`;
  };

  // daily prompt
  function todaysPrompt(d = new Date()) {
    const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / DAY);
    return SEED.dailyPrompts[day % SEED.dailyPrompts.length];
  }
  function sideTodayPrompt() {
    return `<div class="card prompt-card"><span class="eyebrow">Today's prompt</span><h4>${esc(todaysPrompt())}</h4><a class="btn sm" href="#/prompt">Reply</a></div>`;
  }
  function cohortBannerSmall() {
    const c = SEED.cohort;
    return `<div class="card cohort-side"><span class="eyebrow">Master Your Week</span><h4>Next cohort starts ${fmtDate(c.startsOn + "T12:00", { month: "long", day: "numeric" })}</h4><p class="muted">${c.seatsLeft} seats left</p><a class="btn accent sm" href="#/cohort">Join the cohort</a></div>`;
  }
  V.prompt = () => {
    const key = dateKey(), replies = (S.promptReplies[key] || []).slice().sort((a, b) => b.ts - a.ts);
    const past = [1, 2, 3].map((i) => { const d = new Date(Date.now() - i * DAY); return { d, k: dateKey(d), q: todaysPrompt(d) }; });
    return `
      <header class="page-head"><div><span class="eyebrow">Daily prompt · ${fmtDate(Date.now(), { weekday: "long", month: "long", day: "numeric" })}</span><h1>${esc(todaysPrompt())}</h1></div></header>
      <div class="feed-wrap"><div>
        <form class="card composer" data-form="reply">${avatar(me())}<textarea name="body" rows="3" placeholder="Your answer..." required></textarea><button class="btn">Reply</button></form>
        ${replies.map((r) => { const a = user(r.authorId); return `<article class="card post"><div class="post-head">${avatar(a)}<div><b>${esc(a.name)}</b><small>${a.companyId ? esc(company(a.companyId).name) + " · " : ""}${ago(r.ts)}</small></div></div><div class="post-body">${paras(r.body)}</div></article>`; }).join("") || `<p class="muted center">No replies yet today. Go first, it's easier than it looks.</p>`}
      </div>
      <aside class="side"><div class="card"><span class="eyebrow">Previous prompts</span>
        <ul class="list">${past.map((p) => `<li><b>${esc(p.q)}</b><small>${fmtDate(p.d)} · ${plural((S.promptReplies[p.k] || []).length, "reply", "replies")}</small></li>`).join("")}</ul></div></aside></div>`;
  };

  // learn
  V.learn = (courseId, lessonId) => {
    if (lessonId) return lessonView(courseId, lessonId);
    if (courseId) return courseView(courseId);
    const u = me(), op = overallProgress(u.id);
    const tile = (c) => { const p = courseProgress(u.id, c); return `<a class="card course" href="#/learn/${c.id}"><div class="row between"><span class="tag ${c.kind}">${c.kind === "core" ? "Core" : "Mini course"}</span><small class="muted">${c.lessons.length} lessons</small></div><h3>${esc(c.title)}</h3><div class="accent-line"></div><p class="muted">${esc(c.blurb)}</p>${bar(p.pct)}<small>${p.pct === 100 ? "Complete ✓" : p.n ? `${p.n}/${p.total} done` : "Not started"}</small></a>`; };
    return `
      <header class="page-head"><div><h1>Courses</h1><p class="muted">You're ${op.pct}% through the full library (${op.n}/${op.total} lessons).</p></div></header>
      <h2 class="section">Core program</h2><div class="grid two">${SEED.courses.filter((c) => c.kind === "core").map(tile).join("")}</div>
      <h2 class="section">Mini courses</h2><div class="grid three">${SEED.courses.filter((c) => c.kind === "mini").map(tile).join("")}</div>`;
  };
  function courseView(id) {
    const c = SEED.courses.find((x) => x.id === id); if (!c) return notFound();
    const d = done(me().id), p = courseProgress(me().id, c);
    return `<a class="back" href="#/learn">← Courses</a>
      <header class="page-head"><div><span class="tag ${c.kind}">${c.kind === "core" ? "Core" : "Mini course"}</span><h1>${esc(c.title)}</h1><p class="muted">${esc(c.blurb)}</p></div></header>
      <div class="card">${bar(p.pct)}<small>${p.n}/${p.total} lessons complete</small>
        <ol class="lessons">${c.lessons.map((l) => `<li class="${d[l.id] ? "done" : ""}"><a href="#/learn/${c.id}/${l.id}"><span class="check">${d[l.id] ? "✓" : ""}</span><span><b>${esc(l.title)}</b><small>${l.mins} min</small></span></a></li>`).join("")}</ol></div>`;
  }
  function lessonView(cid, lid) {
    const c = SEED.courses.find((x) => x.id === cid), i = c?.lessons.findIndex((l) => l.id === lid);
    if (!c || i < 0) return notFound();
    const l = c.lessons[i], next = c.lessons[i + 1], isDone = !!done(me().id)[l.id];
    return `<a class="back" href="#/learn/${c.id}">← ${esc(c.title)}</a>
      <article class="card lesson">
        <span class="eyebrow">Lesson ${i + 1} of ${c.lessons.length} · ${l.mins} min</span>
        <h1>${esc(l.title)}</h1>
        <div class="video">▶ Video placeholder</div>
        ${l.body.map((p) => `<p>${esc(p)}</p>`).join("")}
        <div class="action-box"><b>Your action</b><p>${esc(l.action)}</p></div>
        <div class="row between">
          <button class="btn ${isDone ? "ghost" : ""}" data-action="toggle-lesson" data-id="${l.id}">${isDone ? "✓ Completed (undo)" : "Mark complete"}</button>
          ${next ? `<a class="btn ghost" href="#/learn/${c.id}/${next.id}">Next: ${esc(next.title)} →</a>` : `<a class="btn ghost" href="#/learn">Back to courses</a>`}
        </div>
      </article>`;
  }

  // events
  V.events = () => {
    const ev = (e) => {
      const n = (S.rsvps[e.id] || []).length + (e.type === "masterclass" ? 41 : 12);
      const on = rsvpd(e.id);
      return `<div class="card event"><div class="date-chip"><b>${new Date(e.start).getDate()}</b><small>${fmtDate(e.start, { month: "short" })}</small></div>
        <div class="grow"><h3>${esc(e.title)}</h3><p class="muted">${fmtDate(e.start, { weekday: "long" })} · ${fmtTime(e.start)} · ${e.mins} min · with ${esc(user(e.host).name)}</p>${e.desc ? `<p>${esc(e.desc)}</p>` : ""}<small class="muted">${n} going</small></div>
        <button class="btn ${on ? "ghost" : ""}" data-action="rsvp" data-id="${e.id}">${on ? "✓ Going" : "RSVP"}</button></div>`;
    };
    return `<header class="page-head"><div><h1>Events</h1><p class="muted">Live sessions with the Time Boss team. RSVP to save your spot.</p></div></header>
      <h2 class="section">Monthly masterclass</h2>${masterclassEvents().map(ev).join("")}
      <h2 class="section">Weekly planning (live, group)</h2><p class="muted">Plan your week alongside other Time Bosses. Prefer solo? Use the <a href="#/tools/weekly">Weekly Planning tool</a>.</p>${weeklyPlanningEvents().map(ev).join("")}`;
  };

  // office hours
  V["office-hours"] = () => {
    const slots = officeHourSlots(), mine = myBookings();
    const byDay = {};
    slots.forEach((s) => (byDay[dateKey(new Date(s.start))] ||= []).push(s));
    return `<header class="page-head"><div><h1>Micro office hours</h1><p class="muted">15 minutes with a Time Boss coach. Bring one specific question.</p></div></header>
      ${mine.length ? `<div class="card"><span class="eyebrow">Your bookings</span><ul class="list">${mine.map((b) => `<li class="row between"><span><b>${fmtDate(b.start)} · ${fmtTime(b.start)}</b> with ${esc(user(b.coachId).name)}<small>${esc(b.topic)}</small></span><button class="ghost sm danger" data-action="cancel-booking" data-id="${esc(b.slotId)}">Cancel</button></li>`).join("")}</ul></div>` : ""}
      <div class="slots">${Object.entries(byDay).map(([k, ss]) => `
        <div class="card day"><h4>${fmtDate(k + "T12:00")}</h4>
        ${SEED.coaches.map((cid) => { const cs = ss.filter((s) => s.coachId === cid); return cs.length ? `<div class="coach-row"><small>${avatar(user(cid), "sm")} ${esc(user(cid).name)}</small><div class="slot-grid">${cs.map((s) => {
          const mineB = S.bookings.find((b) => b.slotId === s.id), taken = s.takenByOther || mineB;
          return `<button class="slot ${mineB?.userId === me().id ? "mine" : taken ? "taken" : ""}" ${taken ? "disabled" : ""} data-action="pick-slot" data-id="${esc(s.id)}">${fmtTime(s.start)}</button>`;
        }).join("")}</div></div>` : ""; }).join("")}
        </div>`).join("")}</div>`;
  };

  // tools
  function toolView(tool) {
    const t = TOOLS[tool], dk = me().id + "|" + tool, draft = S.drafts[dk];
    const history = S.toolRuns.filter((r) => r.userId === me().id && r.tool === tool).sort((a, b) => b.ts - a.ts);
    const aiPanel = `<div class="card ai"><span class="eyebrow">Prefer your own AI?</span><h4>Run this in Claude, ChatGPT, or any assistant</h4>
      <p class="muted">Copy the system prompt, paste it into a new chat, and say "start". It walks you through the same steps.</p>
      <details><summary>Preview prompt</summary><pre>${esc(t.prompt)}</pre></details>
      <div class="row"><button class="btn sm" data-action="copy-prompt" data-tool="${tool}">Copy system prompt</button>
      <a class="btn ghost sm" href="https://claude.ai/new" target="_blank" rel="noopener">Open Claude</a><a class="btn ghost sm" href="https://chatgpt.com" target="_blank" rel="noopener">Open ChatGPT</a></div></div>`;

    if (!draft) {
      return `<header class="page-head"><div><span class="eyebrow">Tool</span><h1>${t.title}</h1><p class="muted">${t.steps.length} steps · about ${t.mins} minutes</p></div></header>
        <div class="feed-wrap"><div>
          <div class="card"><ol class="steps-preview">${t.steps.map((s) => `<li><b>${esc(s.title)}</b><small>${s.mins} min · ${esc(s.guide)}</small></li>`).join("")}</ol>
          <button class="btn big" data-action="start-tool" data-tool="${tool}">Start ${t.title.toLowerCase()}</button></div>
          ${history.length ? `<h2 class="section">History</h2>${history.map((r) => `<details class="card run"><summary><b>${fmtDate(r.ts, { weekday: "long", month: "short", day: "numeric" })}</b> <small class="muted">${fmtTime(r.ts)}</small></summary><pre>${esc(runToMarkdown(tool, r.answers, r.ts))}</pre><button class="ghost sm" data-action="copy-run" data-id="${r.id}">Copy as markdown</button></details>`).join("")}` : ""}
        </div><aside class="side">${aiPanel}</aside></div>`;
    }
    const s = t.steps[draft.step], last = draft.step === t.steps.length - 1;
    const field = (f) => {
      const v = draft.answers[f.k] ?? "";
      if (f.type === "textarea") return `<label>${esc(f.label)}<textarea name="${f.k}" rows="${f.rows || 4}" placeholder="${esc(f.ph || "")}">${esc(v)}</textarea></label>`;
      if (f.type === "range") return `<label>${esc(f.label)} <output>${v || 3}</output><input type="range" name="${f.k}" min="1" max="5" value="${v || 3}" oninput="this.previousElementSibling.value=this.value"></label>`;
      return `<label>${esc(f.label)}<input type="${f.type}" name="${f.k}" value="${esc(v)}" placeholder="${esc(f.ph || "")}"></label>`;
    };
    const paceWarn = tool === "weekly" && s.fields.some((f) => f.k === "planned") && draft.answers.hsp && draft.answers.planned && +draft.answers.planned > +draft.answers.hsp
      ? `<div class="warn">You've planned ${draft.answers.planned}h against an HSP of ${draft.answers.hsp}h. Cut something.</div>` : "";
    return `<header class="page-head"><div><span class="eyebrow">${t.title} · step ${draft.step + 1} of ${t.steps.length}</span><h1>${esc(s.title)}</h1></div>
        <div class="timer" id="timer" data-start="${draft.startedAt}" data-budget="${t.mins}">--:--</div></header>
      <div class="stepper">${t.steps.map((x, i) => `<span class="${i < draft.step ? "done" : i === draft.step ? "cur" : ""}" title="${esc(x.title)}"></span>`).join("")}</div>
      <div class="feed-wrap"><div>
        <form class="card tool-step" data-form="tool-step" data-tool="${tool}">
          <p class="guide">${esc(s.guide)} <small class="muted">(~${s.mins} min)</small></p>
          ${s.fields.map(field).join("")}${paceWarn}
          <div class="row between">
            <span>${draft.step > 0 ? `<button type="button" class="ghost" data-action="tool-back" data-tool="${tool}">← Back</button>` : ""}<button type="button" class="ghost danger" data-action="tool-abandon" data-tool="${tool}">Discard</button></span>
            <button class="btn">${last ? "Finish & save" : "Next →"}</button>
          </div>
        </form>
      </div><aside class="side">${aiPanel}</aside></div>`;
  }
  V.tools = (tool) => (TOOLS[tool] ? toolView(tool) : notFound());

  V.cohort = () => {
    const c = SEED.cohort;
    return `<div class="cohort-hero">
      <span class="eyebrow">Next cohort · ${fmtDate(c.startsOn + "T12:00", { weekday: "long", month: "long", day: "numeric" })}</span>
      <h1>${esc(c.name)}</h1>
      <p class="lead">A ${c.weeks}-week live cohort that installs the Time Boss operating rhythm for good. Weekly planning, daily review, diversion defenses, and a pace you can actually hold.</p>
      <ul class="checks">${c.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}<li>Includes everything in this community</li></ul>
      <div class="row"><a class="btn accent big" href="${esc(c.url)}" target="_blank" rel="noopener">Save my seat</a><span class="muted">${c.seatsLeft} seats left</span></div>
    </div>`;
  };

  const notFound = () => `<div class="card"><h2>Not found</h2><a href="#/home">Go home</a></div>`;

  // ---------- router ----------
  function render() {
    const root = document.getElementById("app");
    if (!me()) { root.className = "logged-out"; root.innerHTML = V.login(); return; }
    let [, view, a, b] = location.hash.split("/");
    if (!view || !V[view]) { location.hash = "#/home"; return; }
    root.className = "";
    root.innerHTML = `<aside class="sidebar">${nav()}</aside><main id="main">${V[view](a, b)}</main>
      <button class="menu-btn" data-action="menu">☰</button>`;
    tickTimer();
  }
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

  let timerInt;
  function tickTimer() {
    clearInterval(timerInt);
    const el = document.getElementById("timer");
    if (!el) return;
    const upd = () => {
      const s = Math.floor((Date.now() - +el.dataset.start) / 1000);
      el.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
      el.classList.toggle("over", s / 60 > +el.dataset.budget);
    };
    upd(); timerInt = setInterval(upd, 1000);
  }

  // ---------- actions ----------
  function readForm(form) { return Object.fromEntries(new FormData(form).entries()); }
  function saveStep(tool, form) {
    const d = S.drafts[me().id + "|" + tool];
    Object.assign(d.answers, readForm(form));
  }

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const { action, id, tool } = el.dataset;
    const A = {
      login: () => { S.sessionUserId = id; save(); location.hash = "#/home"; render(); },
      logout: () => { S.sessionUserId = null; save(); render(); },
      reset: () => { if (confirm("Reset all demo data?")) { S = freshState(); save(); render(); } },
      menu: () => document.body.classList.toggle("menu-open"),
      like: () => { const p = S.posts.find((x) => x.id === id), i = p.likes.indexOf(me().id); i < 0 ? p.likes.push(me().id) : p.likes.splice(i, 1); save(); render(); },
      "toggle-lesson": () => {
        const d = (S.progress[me().id] ||= {});
        if (d[id]) delete d[id]; else { d[id] = Date.now(); toast("Lesson complete ✓"); }
        save(); render();
      },
      rsvp: () => {
        const l = (S.rsvps[id] ||= []), i = l.indexOf(me().id);
        if (i < 0) { l.push(me().id); toast("You're in. Calendar invite would go out here."); } else l.splice(i, 1);
        save(); render();
      },
      "pick-slot": () => {
        const [coachId, start] = id.split("|");
        const topic = prompt(`Book 15 min with ${user(coachId).name}\n${fmtDate(+start)} at ${fmtTime(+start)}\n\nWhat do you want help with?`);
        if (topic === null) return;
        S.bookings.push({ slotId: id, coachId, start: +start, userId: me().id, topic: topic || "General question" });
        save(); render(); toast("Booked. Zoom link would be emailed.");
      },
      "cancel-booking": () => { S.bookings = S.bookings.filter((b) => !(b.slotId === id && b.userId === me().id)); save(); render(); },
      "start-tool": () => { S.drafts[me().id + "|" + tool] = { step: 0, answers: {}, startedAt: Date.now() }; save(); render(); },
      "tool-back": () => { const f = document.querySelector("[data-form=tool-step]"); saveStep(tool, f); S.drafts[me().id + "|" + tool].step--; save(); render(); },
      "tool-abandon": () => { if (confirm("Discard this session?")) { delete S.drafts[me().id + "|" + tool]; save(); render(); } },
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
    if (kind === "post") S.posts.push({ id: uid(), scope: f.dataset.scope, authorId: me().id, ts: Date.now(), body: v.body.trim(), likes: [], comments: [] });
    if (kind === "comment") S.posts.find((p) => p.id === f.dataset.id).comments.push({ authorId: me().id, ts: Date.now(), body: v.body.trim() });
    if (kind === "reply") (S.promptReplies[dateKey()] ||= []).push({ authorId: me().id, ts: Date.now(), body: v.body.trim() });
    if (kind === "join") {
      let cid = v.companyId;
      if (cid === "__new") {
        if (!v.newCompany.trim()) return toast("Name the new company");
        cid = v.newCompany.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid();
        if (!company(cid)) S.companies.push({ id: cid, name: v.newCompany.trim(), color: `hsl(${Math.random() * 360 | 0} 55% 45%)`, seats: 10 });
      }
      const isFirst = !S.users.some((u) => u.companyId === cid);
      const u = { id: "u_" + uid(), name: v.name.trim(), title: v.title.trim() || "Member", companyId: cid, role: isFirst ? "admin" : "member" };
      S.users.push(u); S.sessionUserId = u.id; location.hash = "#/home";
    }
    if (kind === "tool-step") {
      const tool = f.dataset.tool, dk = me().id + "|" + tool, d = S.drafts[dk];
      saveStep(tool, f);
      if (d.step < TOOLS[tool].steps.length - 1) d.step++;
      else {
        S.toolRuns.push({ id: uid(), userId: me().id, tool, ts: Date.now(), answers: d.answers });
        delete S.drafts[dk];
        toast(`${TOOLS[tool].title} saved ✓`);
      }
    }
    save(); render();
  });

  document.addEventListener("click", (e) => { if (e.target.closest(".sidebar a")) document.body.classList.remove("menu-open"); });

  render();
})();
