/* Japan Driving Test Prep — app logic. Plain JS, no dependencies. */
(function () {
'use strict';
const D = window.DATA;
const KEY = 'jdt1';
const PASS = 45, EXAM_N = 50, EXAM_MIN = 30;
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const QMAP = {}; D.QUESTIONS.forEach(q => QMAP[q.id] = q);
const TEXTQ = D.QUESTIONS.filter(q => q.s == null);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* ================= storage ================= */
const blank = () => ({ app: 'jdt', v: 1, theme: 'auto', q: {}, missed: {}, marks: {}, hist: [], chk: {}, read: {}, known: {}, days: {}, exam: null });
let S = blank();
let storageOK = true;
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch (e) { storageOK = false; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { storageOK = false; } }

/* q record: [timesSeen, timesCorrect, lastCorrect(0/1), lastDay] */
function record(id, ok) {
  const r = S.q[id] || [0, 0, 0, ''];
  r[0]++; if (ok) r[1]++; r[2] = ok ? 1 : 0; r[3] = today(); S.q[id] = r;
  if (!ok) S.missed[id] = 2;
  else if (S.missed[id]) { S.missed[id]--; if (S.missed[id] <= 0) delete S.missed[id]; }
  S.days[today()] = (S.days[today()] || 0) + 1;
  save();
}
const missedIds = () => Object.keys(S.missed).filter(id => QMAP[id]);
const markIds = () => Object.keys(S.marks).filter(id => QMAP[id]);
function topicStat(t) {
  let n = 0, seen = 0, ok = 0, tries = 0, right = 0;
  D.QUESTIONS.forEach(q => { if (q.t !== t) return; n++; const r = S.q[q.id]; if (r) { seen++; if (r[2]) ok++; tries += r[0]; right += r[1]; } });
  return { n, seen, ok, acc: tries ? right / tries : null };
}
function overall() {
  let seen = 0, ok = 0, tries = 0, right = 0;
  D.QUESTIONS.forEach(q => { const r = S.q[q.id]; if (r) { seen++; if (r[2]) ok++; tries += r[0]; right += r[1]; } });
  return { n: D.QUESTIONS.length, seen, ok, acc: tries ? right / tries : null };
}
function streak() {
  let n = 0; const d = new Date();
  const k = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  if (!S.days[k(d)]) d.setDate(d.getDate() - 1);
  while (S.days[k(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ================= theme ================= */
function applyTheme() {
  const r = document.documentElement;
  if (S.theme === 'light' || S.theme === 'dark') r.dataset.theme = S.theme; else delete r.dataset.theme;
  const dark = S.theme === 'dark' || (S.theme !== 'light' && matchMedia('(prefers-color-scheme:dark)').matches);
  $('meta[name=theme-color]').content = dark ? '#0c0f15' : '#f3f4f7';
}
matchMedia('(prefers-color-scheme:dark)').addEventListener('change', applyTheme);

/* ================= toast + dialog ================= */
let toastT;
function toast(msg, actLabel, act) {
  const t = $('#toast'); t.innerHTML = '<span>' + esc(msg) + '</span>' + (actLabel ? '<button>' + esc(actLabel) + '</button>' : '');
  t.hidden = false; if (actLabel) $('button', t).onclick = () => { t.hidden = true; act(); };
  clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, actLabel ? 12000 : 2600);
}
function ask(title, text, yes, onYes, danger) {
  const d = $('#dialog');
  d.innerHTML = '<div class="box" role="alertdialog" aria-modal="true"><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p><div class="row"><button class="btn ghost" data-n>Cancel</button><button class="btn ' + (danger ? 'danger' : '') + '" data-y>' + esc(yes) + '</button></div></div>';
  d.hidden = false;
  $('[data-n]', d).onclick = closeDialog;
  $('[data-y]', d).onclick = () => { closeDialog(); onYes(); };
  d.onclick = e => { if (e.target === d) closeDialog(); };
  $('[data-y]', d).focus();
}
function closeDialog() { $('#dialog').hidden = true; }

/* ================= overlays (close with the phone's back button) ================= */
const stack = [];
const ICON_BACK = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>';
function openOv(title, build, opts) {
  opts = opts || {};
  const el = document.createElement('section');
  el.className = 'ov'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', title);
  el.innerHTML = '<header class="ov-head"><button class="x" aria-label="Back">' + ICON_BACK + '</button><h2></h2><div class="side"></div></header><div class="ov-body"><div class="in"></div></div><footer class="ov-foot" hidden><div class="in"></div></footer>';
  const o = { el, guard: opts.guard || null, onclose: opts.onclose || null,
    body: $('.ov-body .in', el), foot: $('.ov-foot .in', el), side: $('.side', el),
    setTitle: t => $('h2', el).textContent = t,
    setFoot: h => { $('.ov-foot', el).hidden = !h; o.foot.innerHTML = h || ''; },
    top: () => $('.ov-body', el).scrollTop = 0 };
  o.setTitle(title);
  $('.x', el).onclick = () => history.back();
  $('#overlays').appendChild(el);
  stack.push(o);
  history.pushState({ ov: stack.length }, '');
  build(o);
  $('.x', el).focus({ preventScroll: true });
  return o;
}
function closeTop() { history.back(); }
window.addEventListener('popstate', () => {
  if (!$('#dialog').hidden) { closeDialog(); if (stack.length) history.pushState({ ov: stack.length }, ''); return; }
  const o = stack[stack.length - 1];
  if (!o) return;
  if (o.guard) {
    const g = o.guard();
    if (g) { history.pushState({ ov: stack.length }, ''); ask(g.title, g.text, g.yes, () => { o.guard = null; history.back(); }, true); return; }
  }
  stack.pop(); o.el.remove(); if (o.onclose) o.onclose();
  if (!stack.length) renderTab();
});
if (history.state && history.state.ov) history.replaceState(null, '');

/* ================= tabs ================= */
let tab = 'home';
const main = $('#main');
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { tab = b.dataset.tab; renderTab(); scrollTo(0, 0); });
function renderTab() {
  document.querySelectorAll('#tabs button').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  ({ home: tabHome, learn: tabLearn, practice: tabPractice, exam: tabExam, more: tabMore })[tab]();
}
/* click delegation: data-a="action" data-v="value" */
const A = {};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const f = A[b.dataset.a]; if (f) f(b.dataset.v, b);
});
const I = {
  sign: '<svg viewBox="0 0 24 24"><path d="M12 21 3 5h18z"/></svg>',
  card: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/></svg>',
  car: '<svg viewBox="0 0 24 24"><path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3zM7 11h10"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></svg>',
  redo: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 3-6.200L4 8M4 3v5h5"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.700 5.700 6.300.800-4.600 4.300 1.200 6.200L12 17l-5.600 3 1.200-6.200L3 9.500l6.300-.800z"/></svg>',
  news: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.500v.500"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M12 16V5M7 9l5-5 5 5M5 20h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/></svg>'
};
const item = (a, v, ic, title, sub, end) => '<button class="item" data-a="' + a + '" data-v="' + (v == null ? '' : v) + '"><span class="ic">' + ic + '</span><span class="grow"><b>' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="end">' + (end || '') + '<i class="chev"></i></span></button>';
const pct = x => Math.round(x * 100);

/* ---------- HOME ---------- */
function tabHome() {
  const o = overall(), m = missedIds().length, st = streak();
  const p = o.n ? o.ok / o.n : 0, C = 2 * Math.PI * 44;
  const last = S.hist[S.hist.length - 1];
  const msg = !o.seen ? 'Start with a quick set of 10 questions.' : p >= .9 ? 'You are in passing range. Keep it sharp with exam simulations.' : p >= .6 ? 'Good progress. Work through the questions you have not seen yet.' : 'Keep going — every set moves this number.';
  main.innerHTML =
    '<div class="eyebrow">Japan driving licence · English</div><h1 class="title">Knowledge test prep</h1>' +
    (storageOK ? '' : '<div class="note warn">Storage is blocked in this browser, so progress will not be saved.</div>') +
    '<div class="card hero"><div class="ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44"/><circle class="v" cx="50" cy="50" r="44" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - p)) + '"/></svg><div><span>' + pct(p) + '<small>%</small></span></div></div>' +
    '<div class="grow"><h2>' + o.ok + ' of ' + o.n + ' mastered</h2><p class="muted">' + msg + '</p></div></div>' +
    '<div class="stats"><div class="stat"><b>' + (o.acc == null ? '–' : pct(o.acc) + '%') + '</b><span>Accuracy</span></div><div class="stat"><b>' + (last ? last.score + '/' + EXAM_N : '–') + '</b><span>Last exam</span></div><div class="stat"><b>' + st + '</b><span>Day streak</span></div></div>' +
    '<div class="cta"><button class="btn" data-a="smart">Practice 10</button><button class="btn ghost" data-a="tab" data-v="exam">Exam simulation</button></div>' +
    (S.exam ? '<div class="card" style="margin-top:12px"><div class="row"><div class="grow"><b>Exam in progress</b><div class="muted">' + Object.keys(S.exam.ans).length + ' of ' + EXAM_N + ' answered</div></div><button class="btn sm" data-a="examResume">Resume</button></div></div>' : '') +
    '<h2 class="sec">Next up</h2><div class="list">' +
    (m ? item('drill', '', I.redo, 'Fix your mistakes', m + ' question' + (m > 1 ? 's' : '') + ' to re-drill') : '') +
    item('changes', '', I.news, 'Rule changes 2025–2026', '30 km/h streets, passing bicycles, the stricter test', '<span class="chip new">New</span>') +
    item('signs', '', I.sign, 'Road signs and markings', D.SIGNS.length + ' signs — the real test describes them in words') +
    item('drive', '', I.car, 'Practical test guide', 'Scoring, the routine, course elements') +
    '</div>' +
    '<h2 class="sec">The real test</h2><div class="card"><p class="muted" style="color:var(--text)">50 true/false questions in text only. You need <b>45 correct (90%)</b>. After that comes the practical course test: 70 of 100 points.</p><p class="muted" style="margin-top:6px">Since October 2025 only about 4 in 10 candidates pass the knowledge test.</p></div>';
}
A.tab = v => { tab = v; renderTab(); scrollTo(0, 0); };

/* ---------- LEARN ---------- */
function tabLearn() {
  main.innerHTML = '<div class="eyebrow">Study</div><h1 class="title">Learn</h1>' +
    '<div class="list">' +
    item('signs', '', I.sign, 'Road signs and markings', D.SIGNS.length + ' signs with meanings') +
    item('flash', '', I.card, 'Flashcards', D.FLASH.length + ' key facts and numbers', Object.keys(S.known).length ? Object.keys(S.known).length + '/' + D.FLASH.length : '') +
    item('changes', '', I.news, 'Rule changes 2025–2026', 'What older study material gets wrong') +
    item('drive', '', I.car, 'Practical test guide', 'How the course test is scored') +
    item('day', '', I.list, 'Documents and test day', 'Checklist and the steps at the centre') +
    '</div><h2 class="sec">Topics</h2><div class="list">' +
    D.TOPICS.map((t, i) => { const s = topicStat(i); const w = s.n ? s.ok / s.n * 100 : 0;
      return '<button class="item" data-a="lesson" data-v="' + i + '"><span class="ic">' + t.ic + '</span><span class="grow"><b>' + esc(t.n) + '</b><small>' + esc(t.d) + '</small><div class="bar"><i class="' + (w >= 90 ? 'ok' : '') + '" style="width:' + w + '%"></i></div></span><span class="end">' + s.ok + '/' + s.n + '<i class="chev"></i></span></button>'; }).join('') + '</div>';
}
A.lesson = v => { const i = +v, t = D.TOPICS[i];
  openOv(t.n, o => {
    o.body.innerHTML = '<div class="prose">' + D.LESSONS[i] + '</div>';
    o.setFoot('<button class="btn block" data-a="quizTopic" data-v="' + i + '">Practice this topic</button>');
    if (!S.read[i]) { S.read[i] = 1; save(); }
  });
};
A.signs = () => openOv('Road signs and markings', o => {
  const G = [['all', 'All'], ['reg', 'Regulatory'], ['warn', 'Warning'], ['ins', 'Instruction'], ['mark', 'Markings']];
  let g = 'all';
  const draw = () => {
    o.body.innerHTML = '<div class="chips">' + G.map(x => '<button class="' + (x[0] === g ? 'on' : '') + '" data-g="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      '<div class="note">Red ring or red shape = prohibition. Yellow diamond = warning. Blue = instruction or permission. Drawings are simplified for study.</div>' +
      '<div class="signs">' + D.SIGNS.filter(s => g === 'all' || s.g === g).map(s => '<div class="sign"><div class="pic">' + s.s + '</div><h4>' + esc(s.n) + '</h4><p>' + esc(s.m) + '</p></div>').join('') + '</div>';
    o.body.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { g = b.dataset.g; draw(); });
  };
  draw();
});
A.flash = () => openOv('Flashcards', o => {
  let order = shuffle(D.FLASH.map((_, i) => i)).sort((a, b) => (S.known[a] ? 1 : 0) - (S.known[b] ? 1 : 0));
  let i = 0, back = false;
  const draw = () => {
    const c = D.FLASH[order[i]], k = Object.keys(S.known).length;
    o.side.textContent = (i + 1) + '/' + order.length;
    o.body.innerHTML = '<div class="bar"><i class="ok" style="width:' + (k / D.FLASH.length * 100) + '%"></i></div><p class="muted" style="margin-top:6px">' + k + ' of ' + D.FLASH.length + ' marked as known</p>' +
      '<button class="fc ' + (back ? 'back' : '') + '" id="fc"><span class="lbl">' + (back ? 'Answer' : 'Question · tap to flip') + '</span><span class="t">' + esc(back ? c[1] : c[0]) + '</span></button>';
    $('#fc', o.body).onclick = () => { back = !back; draw(); };
    o.setFoot(back ? '<button class="btn ghost grow" id="fa">Again</button><button class="btn grow" id="fk">I knew it</button>' : '<button class="btn ghost grow" id="fp">Previous</button><button class="btn grow" id="fs">Show answer</button>');
    const nx = () => { i = (i + 1) % order.length; back = false; draw(); };
    if (back) { $('#fa', o.foot).onclick = () => { delete S.known[order[i]]; save(); nx(); }; $('#fk', o.foot).onclick = () => { S.known[order[i]] = 1; save(); nx(); }; }
    else { $('#fp', o.foot).onclick = () => { i = (i - 1 + order.length) % order.length; draw(); }; $('#fs', o.foot).onclick = () => { back = true; draw(); }; }
  };
  draw();
});
A.changes = () => openOv('Rule changes 2025–2026', o => {
  o.body.innerHTML = '<div class="note">Many apps and books still teach the old rules. These are in force now and can appear in the test.</div><div class="list">' +
    D.CHANGES.map(c => '<div class="chg"><span class="chip new">' + esc(c.d) + '</span><h4>' + esc(c.h) + '</h4><p>' + esc(c.b) + '</p></div>').join('') + '</div>';
  o.setFoot('<button class="btn block" data-a="quizNew">Quiz me on the new rules</button>');
});
A.drive = () => openOv('Practical test guide', o => { o.body.innerHTML = '<div class="prose">' + D.DRIVE + '</div>'; });
A.day = () => openOv('Documents and test day', o => {
  const draw = () => {
    const done = D.CHECKS.filter((_, i) => S.chk[i]).length;
    o.body.innerHTML = '<h2 class="sec" style="margin-top:0">Document checklist <span class="chip">' + done + '/' + D.CHECKS.length + '</span></h2><div class="list">' +
      D.CHECKS.map((c, i) => '<label class="chk ' + (S.chk[i] ? 'done' : '') + '"><input type="checkbox" data-i="' + i + '" ' + (S.chk[i] ? 'checked' : '') + '><span>' + esc(c) + '</span></label>').join('') + '</div>' +
      '<p class="muted" style="margin-top:8px">Requirements differ slightly between prefectures. Confirm the list on your licence centre\'s website.</p>' +
      '<h2 class="sec">How the process runs</h2><div class="card prose">' + D.DAY + '</div>';
    o.body.querySelectorAll('input').forEach(c => c.onchange = () => { S.chk[c.dataset.i] = c.checked; save(); const y = $('.ov-body', o.el).scrollTop; draw(); $('.ov-body', o.el).scrollTop = y; });
  };
  draw();
});

/* ---------- PRACTICE ---------- */
let pTopic = -1, pCount = 10;
function tabPractice() {
  const m = missedIds().length, k = markIds().length, nw = D.QUESTIONS.filter(q => q.n).length;
  main.innerHTML = '<div class="eyebrow">Untimed · instant explanations</div><h1 class="title">Practice</h1>' +
    '<div class="list">' +
    item('smart', '', I.bolt, 'Smart set of 10', 'Mistakes first, then unseen questions') +
    item('drill', '', I.redo, 'Mistakes', m ? 'Each leaves the list after two correct answers' : 'Nothing to fix right now', m ? '<span class="chip bad">' + m + '</span>' : '') +
    item('marked', '', I.star, 'Saved questions', k ? 'Questions you starred' : 'Tap the star on any question to save it', k ? '<span class="chip">' + k + '</span>' : '') +
    item('quizNew', '', I.news, 'New rules only', '2025–2026 changes', '<span class="chip new">' + nw + '</span>') +
    item('quizSigns', '', I.sign, 'Sign recognition', 'Picture questions — practice only') +
    '</div><h2 class="sec">Custom set</h2><div class="card">' +
    '<select id="pT" aria-label="Topic"><option value="-1">All topics, mixed</option>' + D.TOPICS.map((t, i) => '<option value="' + i + '"' + (i === pTopic ? ' selected' : '') + '>' + esc(t.n) + '</option>').join('') + '</select>' +
    '<div class="seg" style="margin:10px 0 12px" role="group" aria-label="Number of questions">' + [10, 20, 50, 0].map(n => '<button data-a="pCount" data-v="' + n + '" class="' + (n === pCount ? 'on' : '') + '">' + (n || 'All') + '</button>').join('') + '</div>' +
    '<button class="btn block" data-a="custom">Start</button></div>';
  $('#pT').onchange = e => pTopic = +e.target.value;
}
A.pCount = v => { pCount = +v; tabPractice(); };
A.custom = () => { const pool = D.QUESTIONS.filter(q => pTopic < 0 || q.t === pTopic).map(q => q.id); startQuiz(shuffle(pool).slice(0, pCount || pool.length), pTopic < 0 ? 'Mixed practice' : D.TOPICS[pTopic].n); };
A.quizTopic = v => { const t = +v; const pool = D.QUESTIONS.filter(q => q.t === t); startQuiz(smartPick(pool, 12), D.TOPICS[t].n); };
A.quizNew = () => startQuiz(shuffle(D.QUESTIONS.filter(q => q.n).map(q => q.id)), 'New rules');
A.quizSigns = () => startQuiz(shuffle(D.QUESTIONS.filter(q => q.s != null).map(q => q.id)), 'Sign recognition');
A.smart = () => startQuiz(smartPick(D.QUESTIONS, 10), 'Smart set');
A.drill = () => { const ids = missedIds(); if (!ids.length) return toast('No mistakes to drill yet'); startQuiz(shuffle(ids).slice(0, 30), 'Mistakes'); };
A.marked = () => { const ids = markIds(); if (!ids.length) return toast('No saved questions yet'); startQuiz(shuffle(ids), 'Saved questions'); };
function smartPick(pool, n) {
  const score = q => { const r = S.q[q.id]; return (S.missed[q.id] ? 0 : !r ? 1 : !r[2] ? 2 : 3) + Math.random(); };
  return pool.map(q => [score(q), q.id]).sort((a, b) => a[0] - b[0]).slice(0, n).map(x => x[1]);
}
const figHtml = q => q.s != null && D.SIGNS[q.s] ? '<div class="qfig">' + D.SIGNS[q.s].s + '</div>' : '';
const STAR = '<svg viewBox="0 0 24 24"><path d="m12 3 2.700 5.700 6.300.800-4.600 4.300 1.200 6.200L12 17l-5.600 3 1.200-6.200L3 9.500l6.300-.800z"/></svg>';

function startQuiz(ids, title) {
  if (!ids.length) return toast('No questions in this set');
  const z = { ids, i: 0, res: [] };
  openOv(title, o => {
    const draw = () => {
      if (z.i >= ids.length) return finish();
      const q = QMAP[ids[z.i]];
      o.side.textContent = (z.i + 1) + '/' + ids.length;
      o.setFoot('');
      o.body.innerHTML = '<div class="bar"><i style="width:' + (z.i / ids.length * 100) + '%"></i></div>' +
        '<div class="qmeta"><span class="row" style="gap:6px"><span class="chip">' + esc(D.TOPICS[q.t].n) + '</span>' + (q.n ? '<span class="chip new">New rule</span>' : '') + '</span><button class="iconbtn ' + (S.marks[q.id] ? 'on' : '') + '" id="mk" aria-label="Save question" aria-pressed="' + !!S.marks[q.id] + '">' + STAR + '</button></div>' +
        figHtml(q) + '<p class="qtext">' + esc(q.q) + '</p>' +
        '<div class="tf" id="tf"><button data-ans="1"><span class="m">○</span>True</button><button data-ans="0"><span class="m">✕</span>False</button></div><div id="ex"></div>';
      o.top();
      $('#mk', o.body).onclick = e => { const b = e.currentTarget; if (S.marks[q.id]) delete S.marks[q.id]; else S.marks[q.id] = 1; save(); b.classList.toggle('on', !!S.marks[q.id]); b.setAttribute('aria-pressed', !!S.marks[q.id]); };
      o.body.querySelectorAll('[data-ans]').forEach(b => b.onclick = () => {
        const v = +b.dataset.ans, ok = v === q.a;
        record(q.id, ok); z.res.push(ok);
        $('#tf', o.body).classList.add('done');
        o.body.querySelectorAll('[data-ans]').forEach(x => { if (+x.dataset.ans === q.a) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
        $('#ex', o.body).innerHTML = '<div class="expl ' + (ok ? 'ok' : 'bad') + '"><b>' + (ok ? 'Correct' : 'Not quite') + ' — the statement is ' + (q.a ? 'true' : 'false') + '.</b>' + esc(q.e) + '</div>';
        o.setFoot('<button class="btn block" id="nx">' + (z.i + 1 >= ids.length ? 'See result' : 'Next') + '</button>');
        $('#nx', o.foot).onclick = () => { z.i++; draw(); };
        $('#nx', o.foot).focus({ preventScroll: true });
        $('#ex', o.body).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    };
    const finish = () => {
      const sc = z.res.filter(Boolean).length, p = sc / ids.length;
      const wrong = ids.filter((_, i) => !z.res[i]);
      o.side.textContent = '';
      o.body.innerHTML = '<div class="result"><div class="big ' + (p >= .9 ? 'pass' : 'fail') + '">' + sc + '/' + ids.length + '</div><p class="muted">' + pct(p) + '% — the real test needs 90%</p></div>' +
        (wrong.length ? '<h2 class="sec">Review your mistakes</h2>' + wrong.map(id => revHtml(QMAP[id], false, null)).join('') : '<p class="empty">Every answer correct.</p>');
      o.setFoot((wrong.length ? '<button class="btn ghost grow" id="rt">Retry mistakes</button>' : '') + '<button class="btn grow" id="dn">Done</button>');
      $('#dn', o.foot).onclick = closeTop;
      if (wrong.length) $('#rt', o.foot).onclick = () => { z.ids = ids = shuffle(wrong); z.i = 0; z.res = []; draw(); };
      o.top();
    };
    draw();
  });
}
function revHtml(q, ok, given) {
  return '<div class="rev ' + (ok ? 'ok' : 'bad') + '"><div class="tag">' + esc(D.TOPICS[q.t].n) + (given !== null ? ' · you: ' + (given == null ? 'no answer' : given ? 'True' : 'False') : '') + ' · correct: <b>' + (q.a ? 'True' : 'False') + '</b></div>' + figHtml(q) + '<div>' + esc(q.q) + '</div><div class="why">' + esc(q.e) + '</div></div>';
}

/* ---------- EXAM ---------- */
function tabExam() {
  const h = S.hist.slice().reverse();
  const best = h.length ? Math.max.apply(null, h.map(x => x.score)) : null;
  main.innerHTML = '<div class="eyebrow">Real conditions</div><h1 class="title">Exam simulation</h1>' +
    '<div class="card"><div class="prose"><ul><li><b>50 true/false questions</b>, text only, drawn across all 22 topics</li><li>Pass mark <b>45 of 50</b> — the same as the real test</li><li>' + EXAM_MIN + '-minute countdown. No feedback until you submit; you can go back and change answers</li></ul></div>' +
    '<p class="muted" style="margin:2px 0 14px">The time allowed at your licence centre may differ; ' + EXAM_MIN + ' minutes is a strict practice setting.</p>' +
    (S.exam ? '<div class="row"><button class="btn grow" data-a="examResume">Resume exam</button><button class="btn ghost" data-a="examNew">Start over</button></div>' : '<button class="btn block" data-a="examNew">Start exam</button>') + '</div>' +
    '<h2 class="sec">History' + (best != null ? ' <span class="chip">Best ' + best + '/' + EXAM_N + '</span>' : '') + '</h2>' +
    (h.length ? '<div class="list">' + h.map(x => '<div class="item"><span class="grow"><b>' + x.score + ' / ' + EXAM_N + '</b><small>' + esc(x.d) + (x.sec ? ' · ' + Math.floor(x.sec / 60) + ' min ' + (x.sec % 60) + ' s' : '') + '</small></span><span class="chip ' + (x.score >= PASS ? 'ok' : 'bad') + '">' + (x.score >= PASS ? 'Pass' : 'Fail') + '</span></div>').join('') + '</div>' : '<div class="card empty">No exams taken yet.</div>');
}
function drawExam() {
  const by = {}; TEXTQ.forEach(q => (by[q.t] = by[q.t] || []).push(q.id));
  let pick = [];
  Object.keys(by).forEach(t => { const s = topicStat(+t); const weak = s.acc != null && s.seen >= 5 && s.acc < .85; pick = pick.concat(shuffle(by[t]).slice(0, weak ? 3 : 2)); });
  pick = shuffle(pick).slice(0, 46);
  const rest = shuffle(TEXTQ.map(q => q.id).filter(id => pick.indexOf(id) < 0)).slice(0, EXAM_N - pick.length);
  return shuffle(pick.concat(rest));
}
A.examNew = () => {
  const go = () => { S.exam = { ids: drawExam(), ans: {}, flags: {}, i: 0, start: Date.now(), end: Date.now() + EXAM_MIN * 60000 }; save(); runExam(); };
  if (S.exam) ask('Start a new exam?', 'The exam in progress will be discarded.', 'Start over', go, true); else go();
};
A.examResume = () => { if (S.exam) runExam(); };
function runExam() {
  const X = S.exam; let timer, done = false;
  const n = () => Object.keys(X.ans).length;
  openOv('Exam', o => {
    const tick = () => {
      const left = X.end - Date.now();
      if (left <= 0) return submit();
      o.side.innerHTML = '<span class="timer ' + (left < 5 * 60000 ? 'low' : '') + '">' + Math.floor(left / 60000) + ':' + String(Math.floor(left % 60000 / 1000)).padStart(2, '0') + '</span>';
    };
    const draw = () => {
      const q = QMAP[X.ids[X.i]], a = X.ans[X.i];
      o.setTitle('Question ' + (X.i + 1) + ' of ' + EXAM_N);
      o.body.innerHTML = '<div class="bar"><i style="width:' + (n() / EXAM_N * 100) + '%"></i></div>' +
        '<div class="qmeta"><span class="chip">' + n() + ' answered</span><button class="btn sm ' + (X.flags[X.i] ? '' : 'line') + '" id="fl">' + (X.flags[X.i] ? 'Flagged' : 'Flag for review') + '</button></div>' +
        '<p class="qtext">' + esc(q.q) + '</p>' +
        '<div class="tf"><button data-ans="1" class="' + (a === 1 ? 'sel' : '') + '"><span class="m">○</span>True</button><button data-ans="0" class="' + (a === 0 ? 'sel' : '') + '"><span class="m">✕</span>False</button></div>' +
        '<h2 class="sec">Overview</h2><div class="grid50">' + X.ids.map((_, i) => '<button data-go="' + i + '" class="' + (X.ans[i] != null ? 'a ' : '') + (i === X.i ? 'cur ' : '') + (X.flags[i] ? 'f' : '') + '" aria-label="Question ' + (i + 1) + '">' + (i + 1) + '</button>').join('') + '</div>';
      o.setFoot('<button class="btn ghost" id="pv" ' + (X.i === 0 ? 'disabled' : '') + '>Back</button>' + (X.i === EXAM_N - 1 || n() === EXAM_N ? '<button class="btn grow" id="sb">Submit</button>' : '<button class="btn grow" id="nx">Next</button>'));
      $('#fl', o.body).onclick = () => { if (X.flags[X.i]) delete X.flags[X.i]; else X.flags[X.i] = 1; save(); draw(); };
      o.body.querySelectorAll('[data-ans]').forEach(b => b.onclick = () => { X.ans[X.i] = +b.dataset.ans; if (X.i < EXAM_N - 1 && n() < EXAM_N) X.i++; save(); draw(); o.top(); });
      o.body.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { X.i = +b.dataset.go; save(); draw(); o.top(); });
      $('#pv', o.foot).onclick = () => { if (X.i > 0) { X.i--; draw(); o.top(); } };
      const nx = $('#nx', o.foot); if (nx) nx.onclick = () => { X.i++; draw(); o.top(); };
      const sb = $('#sb', o.foot); if (sb) sb.onclick = () => { const u = EXAM_N - n(); ask('Submit the exam?', u ? u + ' question' + (u > 1 ? 's are' : ' is') + ' unanswered and will count as wrong.' : 'You answered every question.', 'Submit', submit); };
      tick();
    };
    const submit = () => {
      if (done) return; done = true; clearInterval(timer); closeDialog();
      let score = 0; const per = {};
      X.ids.forEach((id, i) => { const q = QMAP[id], ok = X.ans[i] === q.a; if (ok) score++; record(id, ok); per[q.t] = per[q.t] || [0, 0]; per[q.t][1]++; if (ok) per[q.t][0]++; });
      const sec = Math.min(EXAM_MIN * 60, Math.round((Date.now() - X.start) / 1000));
      const d = new Date();
      S.hist.push({ d: today() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), score, sec }); S.hist = S.hist.slice(-50);
      S.exam = null; save();
      const pass = score >= PASS; let only = true;
      o.guard = null; o.setTitle('Result'); o.side.textContent = '';
      const weak = Object.keys(per).filter(t => per[t][0] < per[t][1]).sort((a, b) => per[a][0] / per[a][1] - per[b][0] / per[b][1]);
      const show = () => {
        o.body.innerHTML = '<div class="result"><span class="chip verdict ' + (pass ? 'ok' : 'bad') + '">' + (pass ? 'Pass' : 'Fail') + '</span><div class="big ' + (pass ? 'pass' : 'fail') + '">' + score + '/' + EXAM_N + '</div><p class="muted">' + (pass ? 'That would pass the real test.' : 'You need ' + (PASS - score) + ' more correct to pass.') + '</p></div>' +
          (weak.length ? '<h2 class="sec">Topics to review</h2><div class="list">' + weak.slice(0, 6).map(t => item('lesson', t, D.TOPICS[t].ic, esc(D.TOPICS[t].n), '', per[t][0] + '/' + per[t][1])).join('') + '</div>' : '') +
          '<h2 class="sec">Answers</h2><div class="seg" style="margin-bottom:14px"><button id="fw" class="' + (only ? 'on' : '') + '">Wrong only</button><button id="fa2" class="' + (only ? '' : 'on') + '">All 50</button></div>' +
          (X.ids.map((id, i) => { const q = QMAP[id], ok = X.ans[i] === q.a; return only && ok ? '' : revHtml(q, ok, X.ans[i]); }).join('') || '<p class="empty">Nothing wrong. Perfect score.</p>');
        $('#fw', o.body).onclick = () => { only = true; show(); }; $('#fa2', o.body).onclick = () => { only = false; show(); };
      };
      show(); o.top();
      o.setFoot('<button class="btn block" id="dn">Done</button>'); $('#dn', o.foot).onclick = closeTop;
    };
    timer = setInterval(tick, 500);
    draw();
  }, { guard: () => done ? null : { title: 'Leave the exam?', text: 'Your answers are kept and the clock keeps running. You can resume from the Exam tab.', yes: 'Leave' }, onclose: () => clearInterval(timer) });
}

/* ---------- SETTINGS ---------- */
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (tab === 'more' && !stack.length) tabMore(); });
addEventListener('appinstalled', () => { installEvt = null; toast('App installed'); if (tab === 'more' && !stack.length) tabMore(); });
function tabMore() {
  const standalone = matchMedia('(display-mode:standalone)').matches || navigator.standalone;
  main.innerHTML = '<div class="eyebrow">Preferences</div><h1 class="title">Settings</h1>' +
    '<h2 class="sec" style="margin-top:0">Appearance</h2><div class="seg" role="group" aria-label="Theme">' + [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(t => '<button data-a="theme" data-v="' + t[0] + '" class="' + (S.theme === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>' +
    '<h2 class="sec">App</h2><div class="list">' +
    (standalone ? '<div class="item"><span class="ic">' + I.phone + '</span><span class="grow"><b>Installed</b><small>Works without a connection</small></span></div>'
      : installEvt ? item('install', '', I.phone, 'Install app', 'Add to your home screen and use offline')
      : '<div class="item"><span class="ic">' + I.phone + '</span><span class="grow"><b>Install app</b><small>In Chrome on Android: open the ⋮ menu and choose "Install app" or "Add to Home screen".</small></span></div>') +
    '</div><h2 class="sec">Your data</h2><div class="list">' +
    item('backup', '', I.down, 'Save backup file', 'Download your progress as a file') +
    item('restore', '', I.up, 'Restore from backup', 'Replace progress on this device with a saved file') +
    item('reset', '', I.trash, 'Reset progress', 'Erase answers, exam history and checklist') +
    '</div><p class="muted" style="margin-top:8px">Everything stays on this device. Nothing is sent anywhere and there is no account.</p>' +
    '<h2 class="sec">About</h2><div class="card"><p class="muted" style="color:var(--text)">Version ' + D.VERSION + ' · content checked ' + D.CONTENT_DATE + ' · ' + D.QUESTIONS.length + ' questions</p>' +
    '<p class="muted" style="margin-top:8px">Unofficial study aid. Questions are written for practice and are not the official test questions. Rules change — confirm anything important with your prefectural police or the JAF <i>Rules of the Road</i>.</p>' +
    '<h3 style="font-size:.9rem;margin:14px 0 6px">Sources checked</h3><ul class="muted" style="list-style:none">' + D.SOURCES.map(s => '<li style="margin-bottom:5px"><a href="' + s[1] + '" target="_blank" rel="noopener">' + esc(s[0]) + '</a></li>').join('') + '</ul></div>';
}
A.theme = v => { S.theme = v; save(); applyTheme(); tabMore(); };
A.install = () => { if (!installEvt) return; installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; tabMore(); }); };
A.backup = () => {
  const blob = new Blob([JSON.stringify(Object.assign({}, S, { saved: new Date().toISOString() }), null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'drive-jp-backup-' + today() + '.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Backup file saved to Downloads');
};
A.restore = () => { const f = $('#restoreFile'); f.value = ''; f.click(); };
$('#restoreFile').onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    let d; try { d = JSON.parse(rd.result); } catch (x) { d = null; }
    if (!d || d.app !== 'jdt' || typeof d.q !== 'object') return toast('That is not a backup file from this app');
    ask('Restore this backup?', 'Progress on this device will be replaced' + (d.saved ? ' with the backup from ' + String(d.saved).slice(0, 10) : '') + '.', 'Restore', () => { delete d.saved; S = Object.assign(blank(), d); save(); applyTheme(); renderTab(); toast('Backup restored'); });
  };
  rd.readAsText(file);
};
A.reset = () => ask('Reset all progress?', 'Answers, exam history, saved questions and the checklist will be erased. This cannot be undone.', 'Reset', () => { const th = S.theme; S = blank(); S.theme = th; save(); renderTab(); toast('Progress reset'); }, true);

/* ================= service worker ================= */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing; if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('A new version is ready', 'Reload', () => { w.postMessage('skip'); }); });
      });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded || !window.__swHadController) return; reloaded = true; location.reload(); });
    window.__swHadController = !!navigator.serviceWorker.controller;
  });
}

applyTheme();
renderTab();
})();
