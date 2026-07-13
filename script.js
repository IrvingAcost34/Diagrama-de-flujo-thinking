/* ==========================================================================
   THINKING — NAVIGATION FLOW · Collaborative Docs
   Single-file app logic: state, storage sync, rendering, interactions

   FIX APLICADO (2024):
   La variable local que guarda el cliente de Supabase se llamaba "supabase",
   el mismo nombre que la librería UMD (cargada desde unpkg) usa para crear
   la variable global "window.supabase". Declarar "let supabase = null;" en
   el scope global colisionaba con ese global ya existente y el motor de
   JavaScript lanzaba en la fase de PARSEO:
     Uncaught SyntaxError: Identifier 'supabase' has already been declared
   Al ser un error de sintaxis, TODO el script quedaba sin ejecutarse (ni
   siquiera se registraban los listeners), por eso el botón "Continue" no
   hacía nada.
   Solución: renombrar la variable local a "supabaseClient" en sus 5 usos.
   La referencia a "window.supabase.createClient(...)" se mantiene intacta
   porque esa sí es la librería del SDK, no nuestra variable.
   ========================================================================== */

/* ---------------------------------------------------------------------- *
 * 1. ICONS + STATUS META
 * ---------------------------------------------------------------------- */
const ICONS = {
  home:  `<path d="M3 10l7-6 7 6v7a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1v-7Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`,
  role:  `<circle cx="8" cy="6" r="2.6" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 14.5c.6-2.8 2.7-4.3 5.5-4.3s4.9 1.5 5.5 4.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  form:  `<rect x="3" y="2" width="10" height="12" rx="1.4" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
  login: `<path d="M7 3h4a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 11 13H7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M9.5 8H2m0 0 2.4-2.2M2 8l2.4 2.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  test:  `<path d="M4 2.5h8v11a.6.6 0 0 1-.9.5L8 12l-3.1 2a.6.6 0 0 1-.9-.5v-11Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M6 6.2l1.3 1.3L10 4.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  grid:  `<rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>`,
  book:  `<path d="M2.5 3.2C4 2.5 6 2.4 8 3.2c2-.8 4-.7 5.5 0v9.6c-1.5-.7-3.5-.8-5.5 0-2-.8-4-.7-5.5 0V3.2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 3.2v9.6" stroke="currentColor" stroke-width="1.4"/>`,
  board: `<rect x="2" y="3" width="12" height="9.5" rx="1.4" stroke="currentColor" stroke-width="1.6"/><path d="M5 6v4M8 6v6.5M11 6v2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  bot:   `<rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 5V2.5M6 8.5h.01M10 8.5h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M5.5 2.5h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  screen:`<rect x="2.2" y="3" width="11.6" height="8.4" rx="1.4" stroke="currentColor" stroke-width="1.5"/><path d="M6 13.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
};
const ICON_KEYS = Object.keys(ICONS);

const STATUS_META = {
  completed:  { label: "Completed",   color: "var(--done)" },
  inprogress: { label: "In Progress", color: "var(--dev)" },
  planned:    { label: "Planned",     color: "var(--pending)" },
};

const PROJECT_URL = "https://irvingacost34.github.io/Thinking/";
const HISTORY_LIMIT = 60;

/* ---- SUPABASE CONFIG ---------------------------------------------------
 * Paste your project's values here (Project Settings → API in Supabase).
 * The anon/public key is safe to expose in client-side code — it only has
 * the permissions you grant it via Row Level Security policies.
 * ------------------------------------------------------------------------ */
const SUPABASE_URL = "https://mjgrkkluweqsitpdvafx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ3Jra2x1d2Vxc2l0cGR2YWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4OTc4NzMsImV4cCI6MjA5OTQ3Mzg3M30.41-MJTb-6fl-lJTJE3jYPpNrINXZ2r8bihdo793Hk7E";
const GRAPH_ROW_ID = "main"; // single shared board — all users read/write this row

/* FIX: renombrado de "supabase" a "supabaseClient" para no colisionar con
   el global "window.supabase" que crea la librería UMD de Supabase. */
let supabaseClient = null;
function isConfigured(){
  return SUPABASE_URL && SUPABASE_ANON_KEY
    && !SUPABASE_URL.includes("YOUR_SUPABASE_URL")
    && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY");
}

/* ---------------------------------------------------------------------- *
 * 2. SEED DATA — the original static flow, used only the first time the
 *    shared board is empty. After that, everything lives in storage.
 * ---------------------------------------------------------------------- */
function seedGraph(){
  const screens = [
    { id:"home", name:"Home", desc:"Landing screen. Entry point of the platform.", icon:"home", status:"completed", x:60, y:820, html:"index.html", css:"style.css", js:"script.js" },
    { id:"role", name:"Choose Role", desc:"Lets the visitor pick Student or Teacher before onboarding.", icon:"role", status:"completed", x:480, y:820, html:"Choose-rol.html", css:"Choose-rol.css", js:"Choose-rol.js" },
    { id:"studentRegister", name:"Student Register", desc:"Creates a student account and stores it in Supabase.", icon:"form", status:"completed", x:920, y:440, html:"STUDENT-REGISTER.html", css:"STUDENT-REGISTER.css", js:"STUDENT-REGISTER.js" },
    { id:"teacherRegister", name:"Teacher Register", desc:"Creates a teacher account with the same validation logic.", icon:"form", status:"completed", x:920, y:1180, html:"TEACHER-REGISTER.html", css:"TEACHER-REGISTER.css", js:"TEACHER-REGISTER.js" },
    { id:"studentLogin", name:"Student Login", desc:"Verifies the account against Supabase and routes by test status.", icon:"login", status:"completed", x:1380, y:440, html:"STUDENT-LOGIN.html", css:"STUDENT-LOGIN.css", js:"STUDENT-LOGIN.js" },
    { id:"teacherLogin", name:"Teacher Login", desc:"Verifies the teacher account and opens the teacher workspace.", icon:"login", status:"completed", x:1380, y:1180, html:"TEACHER-LOGIN.html", css:"TEACHER-LOGIN.css", js:"TEACHER-LOGIN.js" },
    { id:"test", name:"Learning Style Test", desc:"30-question test run once, on the student's first login.", icon:"test", status:"completed", x:1840, y:140, html:"Test.html", css:"Test.css", js:"Test.js" },
    { id:"studentDashboard", name:"Student Dashboard", desc:"Hub screen. Sidebar routes to every student tool.", icon:"grid", status:"completed", x:1840, y:500, html:"Student-Dashboard.html", css:"Student-Dashboard.css", js:"Student-Dashboard.js" },
    { id:"teacherDashboard", name:"Teacher Dashboard", desc:"Hub screen for teacher tools and class management.", icon:"grid", status:"inprogress", x:1840, y:1180, html:"Teacher-Dashboard.html", css:"Teacher-Dashboard.css", js:"Teacher-Dashboard.js" },
    { id:"courses", name:"Courses", desc:"Course catalog and learning-path tracking for students.", icon:"book", status:"planned", x:2320, y:200, html:"Courses.html", css:"Courses.css", js:"Courses.js" },
    { id:"board", name:"Board", desc:"Visual workspace: sticky notes, drawing, text, images.", icon:"board", status:"inprogress", x:2320, y:520, html:"Student-Board.html", css:"Student-Board.css", js:"Student-Board.js" },
    { id:"bombi", name:"Bombi AI", desc:"Assistant that answers questions about Thinking and study methods.", icon:"bot", status:"completed", x:2320, y:840, html:"BOMBI-AI-Part.html", css:"BOMBI-AI-Part.css", js:"BOMBI-AI-Part.js" },
  ];
  const connections = [
    { id:uid(), from:"home", to:"role", label:"Get Started / Login" },
    { id:uid(), from:"role", to:"studentRegister", label:"Student" },
    { id:uid(), from:"role", to:"teacherRegister", label:"Teacher" },
    { id:uid(), from:"role", to:"home", label:"Home" },
    { id:uid(), from:"studentRegister", to:"studentLogin", label:"Register → Supabase" },
    { id:uid(), from:"studentRegister", to:"studentLogin", label:"Already have account" },
    { id:uid(), from:"studentRegister", to:"role", label:"Back" },
    { id:uid(), from:"teacherRegister", to:"teacherLogin", label:"Register → Supabase" },
    { id:uid(), from:"teacherRegister", to:"role", label:"Back" },
    { id:uid(), from:"studentLogin", to:"test", label:"Enter · first login" },
    { id:uid(), from:"studentLogin", to:"studentDashboard", label:"Enter · returning" },
    { id:uid(), from:"studentLogin", to:"studentRegister", label:"Create one" },
    { id:uid(), from:"studentLogin", to:"role", label:"Back" },
    { id:uid(), from:"teacherLogin", to:"teacherDashboard", label:"Enter" },
    { id:uid(), from:"test", to:"studentDashboard", label:"Finish test" },
    { id:uid(), from:"studentDashboard", to:"courses", label:"Courses" },
    { id:uid(), from:"studentDashboard", to:"board", label:"Board" },
    { id:uid(), from:"studentDashboard", to:"bombi", label:"Bombi AI" },
    { id:uid(), from:"board", to:"studentDashboard", label:"Dashboard" },
  ];
  return { screens, connections, history: [], meta: { lastEditedBy:"System", lastEditedAt: Date.now() }, updatedAt: Date.now() };
}

/* ---------------------------------------------------------------------- *
 * 3. STATE
 * ---------------------------------------------------------------------- */
let graph = { screens: [], connections: [], history: [], meta: {}, updatedAt: 0 };
let currentUser = "";
let editingScreenId = null;
let connectMode = false;
let connectSource = null;
let searchTerm = "";
let activeStatusFilter = "all";
let pollTimer = null;
let suppressNextPoll = false;

/* ---------------------------------------------------------------------- *
 * 4. DOM REFS
 * ---------------------------------------------------------------------- */
const $ = (sel) => document.querySelector(sel);
const nodeLayer = () => document.getElementById("node-layer");
const edgeSvg   = () => document.getElementById("edge-layer");
const stage     = () => document.getElementById("stage");
const stageInner= () => document.getElementById("stage-inner");
const tooltipEl = () => document.getElementById("tooltip");

/* ---------------------------------------------------------------------- *
 * 5. UTILITIES
 * ---------------------------------------------------------------------- */
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function escapeHtml(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
function formatDateTime(ts){
  const d = new Date(ts);
  const date = d.toLocaleDateString(undefined, { month:"long", day:"numeric", year:"numeric" });
  const time = d.toLocaleTimeString(undefined, { hour:"numeric", minute:"2-digit" });
  return { date, time };
}
function timeAgo(ts){
  const s = Math.floor((Date.now() - ts) / 1000);
  if(s < 60) return "just now";
  if(s < 3600) return Math.floor(s/60) + "m ago";
  if(s < 86400) return Math.floor(s/3600) + "h ago";
  return Math.floor(s/86400) + "d ago";
}

/* ---------------------------------------------------------------------- *
 * 6. STORAGE — single shared row in Supabase (table: thinking_graph),
 *    kept in sync across every open tab via Supabase Realtime.
 *    FIX: usa supabaseClient en vez de supabase.
 * ---------------------------------------------------------------------- */
async function loadGraph(){
  const { data, error } = await supabaseClient
    .from("thinking_graph")
    .select("data")
    .eq("id", GRAPH_ROW_ID)
    .maybeSingle();

  if(error){ console.error("Load failed:", error); return seedGraph(); }
  if(data && data.data) return data.data;

  // first run — seed the shared board
  const fresh = seedGraph();
  await saveGraph(fresh);
  return fresh;
}

async function saveGraph(g){
  g.updatedAt = Date.now();
  if(g.history && g.history.length > HISTORY_LIMIT) g.history = g.history.slice(0, HISTORY_LIMIT);
  try{
    suppressNextPoll = true;
    const { error } = await supabaseClient
      .from("thinking_graph")
      .upsert({ id: GRAPH_ROW_ID, data: g, updated_at: new Date().toISOString() });
    if(error) console.error("Save failed:", error);
  }catch(err){
    console.error("Save failed:", err);
  }
}

function logHistory(action, target){
  const entry = { id: uid(), user: currentUser, action, target, ts: Date.now() };
  graph.history = [entry, ...(graph.history || [])].slice(0, HISTORY_LIMIT);
  graph.meta = { lastEditedBy: currentUser, lastEditedAt: entry.ts };
}

async function persist(action, target){
  logHistory(action, target);
  await saveGraph(graph);
  renderLastEdit();
  renderHistory();
}

/* Realtime: whenever any team member's browser writes a new row version,
 * every other open tab receives this event and refreshes automatically —
 * no polling needed. FIX: usa supabaseClient en vez de supabase. */
function subscribeRealtime(){
  supabaseClient
    .channel("thinking-graph-changes")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "thinking_graph", filter: `id=eq.${GRAPH_ROW_ID}` },
      (payload) => applyRemoteUpdate(payload.new && payload.new.data)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "thinking_graph", filter: `id=eq.${GRAPH_ROW_ID}` },
      (payload) => applyRemoteUpdate(payload.new && payload.new.data)
    )
    .subscribe();
}

function applyRemoteUpdate(remote){
  if(!remote) return;
  if(suppressNextPoll){ suppressNextPoll = false; return; } // this is our own write echoing back
  if(document.querySelector(".modal-overlay.open") || document.querySelector(".node.dragging")) return;
  if(!remote.updatedAt || remote.updatedAt <= graph.updatedAt) return;
  graph = remote;
  fullRender();
  renderLastEdit();
  renderHistory();
}

/* ---------------------------------------------------------------------- *
 * 7. NAME GATE
 * ---------------------------------------------------------------------- */
function initGate(){
  const gate = document.getElementById("gate");
  const input = document.getElementById("gate-input");
  const goBtn = document.getElementById("gate-continue");
  input.focus();
  function enter(){
    const name = input.value.trim();
    if(!name){ input.style.borderColor = "var(--danger)"; input.focus(); return; }
    currentUser = name.slice(0, 24);
    gate.classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    startApp();
  }
  goBtn.addEventListener("click", enter);
  input.addEventListener("keydown", e => { if(e.key === "Enter") enter(); });
}

/* ---------------------------------------------------------------------- *
 * 8. RENDER — nodes
 * ---------------------------------------------------------------------- */
function statusLabel(s){ return (STATUS_META[s] || STATUS_META.planned).label; }

function nodeMatchesFilters(n){
  const term = searchTerm.trim().toLowerCase();
  const matchesSearch = !term || n.name.toLowerCase().includes(term) || (n.desc || "").toLowerCase().includes(term);
  const matchesStatus = activeStatusFilter === "all" || n.status === activeStatusFilter;
  return matchesSearch && matchesStatus;
}

function renderNodes(){
  const layer = nodeLayer();
  layer.innerHTML = "";
  graph.screens.forEach((n, i) => {
    const el = document.createElement("div");
    el.className = "node";
    el.style.left = n.x + "px";
    el.style.top = n.y + "px";
    el.style.animationDelay = (Math.min(i, 14) * 0.045) + "s";
    el.dataset.id = n.id;
    if(nodeMatchesFilters(n)) el.classList.add("match");

    const iconKey = ICON_KEYS.includes(n.icon) ? n.icon : "screen";
    const outCount = graph.connections.filter(c => c.from === n.id || c.to === n.id).length;

    el.innerHTML = `
      <div class="node-head">
        <div class="node-icon" title="Drag to move"><svg viewBox="0 0 16 16" fill="none">${ICONS[iconKey]}</svg></div>
        <div class="node-actions">
          <button class="node-action connect-icon" data-action="connect" data-tooltip="Start a connection from here">⤢</button>
          <button class="node-action edit-icon" data-action="edit" data-tooltip="Edit screen">✎</button>
          <button class="node-action del-icon" data-action="delete" data-tooltip="Delete screen">🗑</button>
        </div>
      </div>
      <div class="status-pill ${n.status}">${statusLabel(n.status)}</div>
      <div class="node-title">${escapeHtml(n.name)}</div>
      <div class="node-desc">${escapeHtml(n.desc || "")}</div>
      <div class="node-files">
        ${n.html ? `<span class="file-chip">${escapeHtml(n.html)}</span>` : ""}
        ${n.css ? `<span class="file-chip">${escapeHtml(n.css)}</span>` : ""}
        ${n.js ? `<span class="file-chip">${escapeHtml(n.js)}</span>` : ""}
      </div>
      <div class="node-footer"><span>${outCount} connection${outCount===1?"":"s"}</span></div>
    `;
    layer.appendChild(el);
  });
  bindNodeEvents();
}

/* ---------------------------------------------------------------------- *
 * 9. RENDER — edges (bundled curves + hover-only labels)
 * ---------------------------------------------------------------------- */
function nodeAnchor(id, side){
  const n = graph.screens.find(x => x.id === id);
  if(!n) return { x:0, y:0 };
  const w = 250;
  const el = nodeLayer().querySelector(`.node[data-id="${id}"]`);
  const h = el ? el.offsetHeight : 200;
  const y = n.y + h / 2;
  return side === "right" ? { x: n.x + w, y } : { x: n.x, y };
}

function drawEdges(){
  const svg = edgeSvg();
  svg.innerHTML = "";
  const ns = "http://www.w3.org/2000/svg";

  // group connections between the same pair so parallel edges fan out
  const pairCounts = {};

  graph.connections.forEach((e) => {
    const from = graph.screens.find(n => n.id === e.from);
    const to = graph.screens.find(n => n.id === e.to);
    if(!from || !to) return;

    const pairKey = [e.from, e.to].sort().join("::");
    pairCounts[pairKey] = (pairCounts[pairKey] || 0);
    const rank = pairCounts[pairKey]++;
    const fanOffset = (rank - 0.5) * 26; // spread parallel edges apart

    const forward = to.x >= from.x;
    const a = nodeAnchor(e.from, forward ? "right" : "left");
    const b = nodeAnchor(e.to, forward ? "left" : "right");
    const dx = Math.max(60, Math.abs(b.x - a.x) * 0.5);
    const c1x = forward ? a.x + dx : a.x - dx;
    const c2x = forward ? b.x - dx : b.x + dx;
    const c1y = a.y + fanOffset;
    const c2y = b.y + fanOffset;
    const d = `M ${a.x} ${a.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${b.x} ${b.y}`;

    const group = document.createElementNS(ns, "g");
    group.setAttribute("class", "edge-group");
    group.dataset.id = e.id;
    group.dataset.from = e.from;
    group.dataset.to = e.to;

    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "edge-path");
    group.appendChild(path);

    const flow = document.createElementNS(ns, "path");
    flow.setAttribute("d", d);
    flow.setAttribute("class", "edge-flow");
    group.appendChild(flow);

    // wide invisible hit area so hovering the label is easy even when thin
    const hit = document.createElementNS(ns, "path");
    hit.setAttribute("d", d);
    hit.setAttribute("class", "edge-hit");
    group.appendChild(hit);

    // small dot marking the midpoint — click it to delete, hover to read label
    const midT = 0.5;
    const midX = bezierPoint(a.x, c1x, c2x, b.x, midT);
    const midY = bezierPoint(a.y, c1y, c2y, b.y, midT);
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", midX); dot.setAttribute("cy", midY); dot.setAttribute("r", 3.4);
    dot.setAttribute("class", "edge-dot");
    group.appendChild(dot);

    group.dataset.midx = midX;
    group.dataset.midy = midY;
    group.dataset.label = e.label || "";

    svg.appendChild(group);
  });

  bindEdgeEvents();
}

function bezierPoint(p0, p1, p2, p3, t){
  const mt = 1 - t;
  return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
}

/* ---------------------------------------------------------------------- *
 * 10. INTERACTIONS — hover highlight, edge labels, node/edge click actions
 * ---------------------------------------------------------------------- */
function bindNodeEvents(){
  nodeLayer().querySelectorAll(".node").forEach(el => {
    el.addEventListener("mouseenter", () => { if(!connectMode) setActive(el.dataset.id); });
    el.addEventListener("mouseleave", () => { if(!connectMode) setActive(null); });
    el.addEventListener("mousedown", onNodeDragStart);
    el.addEventListener("touchstart", onNodeDragStart, { passive:false });

    el.querySelector('[data-action="edit"]').addEventListener("click", (e) => { e.stopPropagation(); openScreenModal(el.dataset.id); });
    el.querySelector('[data-action="delete"]').addEventListener("click", (e) => { e.stopPropagation(); deleteScreen(el.dataset.id); });
    el.querySelector('[data-action="connect"]').addEventListener("click", (e) => { e.stopPropagation(); startConnectFrom(el.dataset.id); });

    el.addEventListener("click", (e) => {
      if(connectMode){
        e.stopPropagation();
        handleConnectClick(el.dataset.id);
      }
    });
  });
}

function bindEdgeEvents(){
  edgeSvg().querySelectorAll(".edge-group").forEach(g => {
    g.addEventListener("mouseenter", (e) => {
      g.classList.add("active");
      const label = g.dataset.label;
      if(label){
        const rect = stage().getBoundingClientRect();
        showEdgeTooltip(label, e.clientX, e.clientY);
      }
    });
    g.addEventListener("mousemove", (e) => {
      if(g.dataset.label) showEdgeTooltip(g.dataset.label, e.clientX, e.clientY);
    });
    g.addEventListener("mouseleave", () => { g.classList.remove("active"); hideTooltip(); });
    g.addEventListener("click", (e) => {
      e.stopPropagation();
      if(confirm(`Delete this connection${g.dataset.label ? ` ("${g.dataset.label}")` : ""}?`)){
        deleteConnection(g.dataset.id);
      }
    });
  });
}

function showEdgeTooltip(text, x, y){
  const t = tooltipEl();
  t.textContent = text;
  t.classList.add("edge-tip");
  t.style.left = x + "px";
  t.style.top = y + "px";
  t.classList.add("show");
}
function hideTooltip(){
  tooltipEl().classList.remove("show");
  tooltipEl().classList.remove("edge-tip");
}

function setActive(id){
  const inner = stageInner();
  if(!id){
    inner.classList.remove("dim-edges");
    edgeSvg().querySelectorAll(".edge-group").forEach(g => g.classList.remove("active"));
    nodeLayer().querySelectorAll(".node").forEach(n => n.classList.remove("node-active"));
    return;
  }
  inner.classList.add("dim-edges");
  nodeLayer().querySelectorAll(".node").forEach(n => n.classList.toggle("node-active", n.dataset.id === id));
  edgeSvg().querySelectorAll(".edge-group").forEach(g => {
    const connected = g.dataset.from === id || g.dataset.to === id;
    g.classList.toggle("active", connected);
  });
}

/* ---- node dragging (screens can be repositioned; edges auto-reflow) ---- */
let dragNode = null, dragOffsetX = 0, dragOffsetY = 0;

function onNodeDragStart(e){
  if(connectMode) return;
  if(e.target.closest(".node-action")) return;
  const el = e.currentTarget;
  const point = e.touches ? e.touches[0] : e;
  e.stopPropagation();
  if(e.cancelable) e.preventDefault();
  const n = graph.screens.find(s => s.id === el.dataset.id);
  if(!n) return;
  const rect = stage().getBoundingClientRect();
  const scaleNow = getScale();
  dragNode = n;
  dragOffsetX = (point.clientX - rect.left - panX()) / scaleNow - n.x;
  dragOffsetY = (point.clientY - rect.top - panY()) / scaleNow - n.y;
  el.classList.add("dragging");
  window.addEventListener("mousemove", onNodeDragMove);
  window.addEventListener("mouseup", onNodeDragEnd);
  window.addEventListener("touchmove", onNodeDragMove, { passive:false });
  window.addEventListener("touchend", onNodeDragEnd);
}
function onNodeDragMove(e){
  if(!dragNode) return;
  if(e.cancelable) e.preventDefault();
  const point = e.touches ? e.touches[0] : e;
  const rect = stage().getBoundingClientRect();
  const scaleNow = getScale();
  dragNode.x = Math.round((point.clientX - rect.left - panX()) / scaleNow - dragOffsetX);
  dragNode.y = Math.round((point.clientY - rect.top - panY()) / scaleNow - dragOffsetY);
  const el = nodeLayer().querySelector(`.node[data-id="${dragNode.id}"]`);
  if(el){ el.style.left = dragNode.x + "px"; el.style.top = dragNode.y + "px"; }
  drawEdges();
  renderMinimap();
}
async function onNodeDragEnd(){
  if(!dragNode) return;
  const el = nodeLayer().querySelector(`.node[data-id="${dragNode.id}"]`);
  if(el) el.classList.remove("dragging");
  const moved = dragNode;
  dragNode = null;
  window.removeEventListener("mousemove", onNodeDragMove);
  window.removeEventListener("mouseup", onNodeDragEnd);
  window.removeEventListener("touchmove", onNodeDragMove);
  window.removeEventListener("touchend", onNodeDragEnd);
  await persist("moved", moved.name);
}

/* ---------------------------------------------------------------------- *
 * 11. ADD / EDIT / DELETE SCREEN
 * ---------------------------------------------------------------------- */
function openScreenModal(id){
  editingScreenId = id || null;
  const overlay = document.getElementById("screen-modal");
  const title = document.getElementById("screen-modal-title");
  const deleteBtn = document.getElementById("f-delete");

  if(id){
    const n = graph.screens.find(s => s.id === id);
    title.textContent = "Edit Screen";
    deleteBtn.classList.remove("hidden");
    $("#f-name").value = n.name;
    $("#f-desc").value = n.desc || "";
    $("#f-html").value = n.html || "";
    $("#f-css").value = n.css || "";
    $("#f-js").value = n.js || "";
    document.querySelector(`input[name="f-status"][value="${n.status}"]`).checked = true;
  }else{
    title.textContent = "Add Screen";
    deleteBtn.classList.add("hidden");
    $("#f-name").value = "";
    $("#f-desc").value = "";
    $("#f-html").value = "";
    $("#f-css").value = "";
    $("#f-js").value = "";
    document.querySelector(`input[name="f-status"][value="planned"]`).checked = true;
  }
  overlay.classList.add("open");
  setTimeout(() => $("#f-name").focus(), 50);
}
function closeScreenModal(){
  document.getElementById("screen-modal").classList.remove("open");
  editingScreenId = null;
}

async function saveScreenForm(){
  const name = $("#f-name").value.trim();
  if(!name){ $("#f-name").focus(); $("#f-name").style.borderColor = "var(--danger)"; return; }
  const desc = $("#f-desc").value.trim();
  const html = $("#f-html").value.trim();
  const css = $("#f-css").value.trim();
  const js = $("#f-js").value.trim();
  const statusInput = document.querySelector('input[name="f-status"]:checked');
  const status = statusInput ? statusInput.value : "planned";

  if(editingScreenId){
    const n = graph.screens.find(s => s.id === editingScreenId);
    Object.assign(n, { name, desc, html, css, js, status });
    closeScreenModal();
    renderNodes(); drawEdges(); renderMinimap();
    await persist("edited", name);
  }else{
    const rect = stage().getBoundingClientRect();
    const scaleNow = getScale();
    const cx = (rect.width/2 - panX()) / scaleNow;
    const cy = (rect.height/2 - panY()) / scaleNow;
    const n = {
      id: uid(), name, desc, html, css, js, status,
      icon: ICON_KEYS[Math.floor(Math.random()*ICON_KEYS.length)] === "home" ? "screen" : "screen",
      x: Math.round(cx - 125 + (Math.random()*60-30)),
      y: Math.round(cy - 90 + (Math.random()*60-30)),
    };
    graph.screens.push(n);
    closeScreenModal();
    renderNodes(); drawEdges(); renderMinimap();
    await persist("added", name);
  }
}

async function deleteScreen(id){
  const n = graph.screens.find(s => s.id === id);
  if(!n) return;
  if(!confirm(`Delete "${n.name}"? Its connections will also be removed.`)) return;
  graph.screens = graph.screens.filter(s => s.id !== id);
  graph.connections = graph.connections.filter(c => c.from !== id && c.to !== id);
  if(editingScreenId === id) closeScreenModal();
  renderNodes(); drawEdges(); renderMinimap();
  await persist("deleted", n.name);
}

/* ---------------------------------------------------------------------- *
 * 12. CONNECT MODE
 * ---------------------------------------------------------------------- */
function toggleConnectMode(){
  connectMode = !connectMode;
  connectSource = null;
  document.getElementById("btn-connect").classList.toggle("active", connectMode);
  stage().classList.toggle("connect-mode", connectMode);
  nodeLayer().querySelectorAll(".node").forEach(n => n.classList.remove("connect-source"));
  removeConnectToast();
  if(connectMode) showConnectToast("Click a screen to start the connection");
}
function startConnectFrom(id){
  if(!connectMode) toggleConnectMode();
  handleConnectClick(id);
}
function handleConnectClick(id){
  if(!connectSource){
    connectSource = id;
    nodeLayer().querySelectorAll(".node").forEach(n => n.classList.toggle("connect-source", n.dataset.id === id));
    showConnectToast("Now click the target screen");
  }else if(connectSource === id){
    connectSource = null;
    nodeLayer().querySelectorAll(".node").forEach(n => n.classList.remove("connect-source"));
    showConnectToast("Click a screen to start the connection");
  }else{
    promptConnectionLabel(connectSource, id);
  }
}
function showConnectToast(msg){
  removeConnectToast();
  const toast = document.createElement("div");
  toast.className = "connect-toast";
  toast.id = "connect-toast";
  toast.innerHTML = `<span><b>Connect mode</b> — ${msg}</span><button id="connect-cancel">Cancel</button>`;
  document.body.appendChild(toast);
  document.getElementById("connect-cancel").addEventListener("click", () => toggleConnectMode());
}
function removeConnectToast(){ const t = document.getElementById("connect-toast"); if(t) t.remove(); }

function promptConnectionLabel(fromId, toId){
  removeConnectToast();
  const form = document.createElement("div");
  form.className = "mini-form";
  form.style.left = "50%"; form.style.top = "110px"; form.style.transform = "translateX(-50%)";
  form.innerHTML = `
    <input type="text" id="conn-label-input" placeholder="Connection label (e.g. Register)" autocomplete="off">
    <div class="mf-actions">
      <button class="btn ghost" id="conn-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="conn-save-btn">Create</button>
    </div>`;
  document.body.appendChild(form);
  const input = form.querySelector("#conn-label-input");
  input.focus();
  const cleanup = () => { form.remove(); connectSource = null; nodeLayer().querySelectorAll(".node").forEach(n => n.classList.remove("connect-source")); };
  form.querySelector("#conn-cancel-btn").addEventListener("click", cleanup);
  form.querySelector("#conn-save-btn").addEventListener("click", async () => {
    const label = input.value.trim() || "Continue";
    await createConnection(fromId, toId, label);
    cleanup();
    toggleConnectMode();
  });
  input.addEventListener("keydown", async (e) => {
    if(e.key === "Enter"){
      const label = input.value.trim() || "Continue";
      await createConnection(fromId, toId, label);
      cleanup();
      toggleConnectMode();
    }
    if(e.key === "Escape") cleanup();
  });
}

async function createConnection(fromId, toId, label){
  const conn = { id: uid(), from: fromId, to: toId, label };
  graph.connections.push(conn);
  drawEdges(); renderNodes(); renderMinimap();
  const fromName = graph.screens.find(s => s.id === fromId)?.name || fromId;
  const toName = graph.screens.find(s => s.id === toId)?.name || toId;
  await persist("connected", `${fromName} → ${toName}`);
}
async function deleteConnection(id){
  const c = graph.connections.find(x => x.id === id);
  graph.connections = graph.connections.filter(x => x.id !== id);
  drawEdges(); renderNodes(); renderMinimap();
  if(c){
    const fromName = graph.screens.find(s => s.id === c.from)?.name || c.from;
    const toName = graph.screens.find(s => s.id === c.to)?.name || c.to;
    await persist("disconnected", `${fromName} → ${toName}`);
  }
}

/* ---------------------------------------------------------------------- *
 * 13. HISTORY PANEL + LAST EDIT WIDGET
 * ---------------------------------------------------------------------- */
function renderLastEdit(){
  const el = document.getElementById("last-edit-text");
  const meta = graph.meta || {};
  if(!meta.lastEditedBy){ el.innerHTML = "No edits yet"; return; }
  const { date, time } = formatDateTime(meta.lastEditedAt);
  el.innerHTML = `Last edited by <b>${escapeHtml(meta.lastEditedBy)}</b> · ${date}, ${time}`;
}

function actionVerb(a){
  return { added:"added", edited:"edited", deleted:"deleted", moved:"moved", connected:"connected", disconnected:"removed a connection from" }[a] || a;
}

function renderHistory(){
  const list = document.getElementById("history-list");
  const items = graph.history || [];
  if(!items.length){ list.innerHTML = `<div class="history-empty">No changes yet. Everything you do here is logged automatically.</div>`; return; }
  list.innerHTML = items.map(h => `
    <div class="history-item">
      <div class="h-line"><b>${escapeHtml(h.user || "Someone")}</b> ${actionVerb(h.action)} ${escapeHtml(h.target || "")}</div>
      <div class="h-time">${timeAgo(h.ts)}</div>
    </div>
  `).join("");
}

/* ---------------------------------------------------------------------- *
 * 14. PAN + ZOOM + MINIMAP
 * ---------------------------------------------------------------------- */
let scale = 0.55, tPanX = 60, tPanY = -60;
let isDragging = false, dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;
function panX(){ return tPanX; }
function panY(){ return tPanY; }
function getScale(){ return scale; }

function applyTransform(){
  stageInner().style.transform = `translate(${tPanX}px, ${tPanY}px) scale(${scale})`;
  document.getElementById("zoom-readout").textContent = Math.round(scale * 100) + "%";
  updateMinimapViewport();
}
function clampScale(s){ return Math.min(1.4, Math.max(0.22, s)); }

function bindStageEvents(){
  const st = stage();
  st.addEventListener("mousedown", (e) => {
    if(connectMode) return;
    if(e.target.closest(".node")) return;
    isDragging = true;
    st.classList.add("grabbing");
    dragStartX = e.clientX; dragStartY = e.clientY;
    panStartX = tPanX; panStartY = tPanY;
    hidePanHint();
  });
  window.addEventListener("mousemove", (e) => {
    if(!isDragging) return;
    tPanX = panStartX + (e.clientX - dragStartX);
    tPanY = panStartY + (e.clientY - dragStartY);
    applyTransform();
  });
  window.addEventListener("mouseup", () => { isDragging = false; st.classList.remove("grabbing"); });

  st.addEventListener("touchstart", (e) => {
    if(connectMode || e.target.closest(".node") || e.touches.length !== 1) return;
    isDragging = true;
    dragStartX = e.touches[0].clientX; dragStartY = e.touches[0].clientY;
    panStartX = tPanX; panStartY = tPanY;
    hidePanHint();
  }, { passive:true });
  st.addEventListener("touchmove", (e) => {
    if(!isDragging || e.touches.length !== 1) return;
    tPanX = panStartX + (e.touches[0].clientX - dragStartX);
    tPanY = panStartY + (e.touches[0].clientY - dragStartY);
    applyTransform();
  }, { passive:true });
  st.addEventListener("touchend", () => { isDragging = false; });

  st.addEventListener("wheel", (e) => {
    e.preventDefault();
    const prevScale = scale;
    scale = clampScale(scale - e.deltaY * 0.0012);
    const rect = st.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    tPanX = cx - ((cx - tPanX) / prevScale) * scale;
    tPanY = cy - ((cy - tPanY) / prevScale) * scale;
    applyTransform();
    hidePanHint();
  }, { passive:false });

  document.getElementById("btn-zoom-in").addEventListener("click", () => { scale = clampScale(scale + 0.12); applyTransform(); });
  document.getElementById("btn-zoom-out").addEventListener("click", () => { scale = clampScale(scale - 0.12); applyTransform(); });
  document.getElementById("btn-reset").addEventListener("click", () => { scale = 0.55; tPanX = 60; tPanY = -60; applyTransform(); });
}
function hidePanHint(){ document.getElementById("pan-hint").classList.add("hide"); }

function renderMinimap(){
  const minimapSvg = document.getElementById("minimap-svg");
  minimapSvg.innerHTML = "";
  const ns = "http://www.w3.org/2000/svg";
  graph.screens.forEach(n => {
    const el = nodeLayer().querySelector(`.node[data-id="${n.id}"]`);
    const h = el ? el.offsetHeight : 180;
    const r = document.createElementNS(ns, "rect");
    r.setAttribute("x", n.x); r.setAttribute("y", n.y);
    r.setAttribute("width", 250); r.setAttribute("height", h);
    r.setAttribute("rx", 6);
    r.setAttribute("class", "minimap-rect");
    r.style.fill = STATUS_META[n.status] ? STATUS_META[n.status].color.replace("var(", "").replace(")", "") : "";
    minimapSvg.appendChild(r);
  });
}
function updateMinimapViewport(){
  const minimapSvg = document.getElementById("minimap-svg");
  const minimapViewport = document.getElementById("minimap-viewport");
  const st = stage();
  const stageRect = st.getBoundingClientRect();
  const mmRect = minimapSvg.getBoundingClientRect();
  if(mmRect.width === 0) return;
  const viewBoxW = 3400, viewBoxH = 1900;
  const scaleX = mmRect.width / viewBoxW;
  const scaleY = mmRect.height / viewBoxH;
  const left = (-tPanX / scale) * scaleX;
  const top = (-tPanY / scale) * scaleY;
  const w = (stageRect.width / scale) * scaleX;
  const h = (stageRect.height / scale) * scaleY;
  minimapViewport.style.left = (mmRect.left - stageRect.left + left) + "px";
  minimapViewport.style.top = (mmRect.top - stageRect.top + top) + "px";
  minimapViewport.style.width = Math.max(10, w) + "px";
  minimapViewport.style.height = Math.max(10, h) + "px";
}
function bindMinimapClick(){
  document.getElementById("minimap-svg").addEventListener("click", (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width * 3400;
    const clickY = (e.clientY - rect.top) / rect.height * 1900;
    const stageRect = stage().getBoundingClientRect();
    tPanX = stageRect.width / 2 - clickX * scale;
    tPanY = stageRect.height / 2 - clickY * scale;
    applyTransform();
  });
}

/* ---------------------------------------------------------------------- *
 * 15. SEARCH + FILTER
 * ---------------------------------------------------------------------- */
function bindSearchAndFilters(){
  const input = document.getElementById("search-input");
  input.addEventListener("input", () => {
    searchTerm = input.value;
    stageInner().classList.toggle("search-active", searchTerm.trim().length > 0);
    nodeLayer().querySelectorAll(".node").forEach(el => {
      const n = graph.screens.find(s => s.id === el.dataset.id);
      el.classList.toggle("match", nodeMatchesFilters(n));
    });
  });
  document.getElementById("filter-chips").querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chips .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeStatusFilter = chip.dataset.status;
      stageInner().classList.toggle("search-active", activeStatusFilter !== "all" || searchTerm.trim().length > 0);
      nodeLayer().querySelectorAll(".node").forEach(el => {
        const n = graph.screens.find(s => s.id === el.dataset.id);
        el.classList.toggle("match", nodeMatchesFilters(n));
      });
    });
  });
}

/* ---------------------------------------------------------------------- *
 * 16. MISC UI BINDINGS
 * ---------------------------------------------------------------------- */
function bindMiscUI(){
  document.getElementById("btn-add-screen").addEventListener("click", () => openScreenModal(null));
  document.getElementById("btn-connect").addEventListener("click", toggleConnectMode);
  document.getElementById("screen-modal-close").addEventListener("click", closeScreenModal);
  document.getElementById("f-cancel").addEventListener("click", closeScreenModal);
  document.getElementById("f-save").addEventListener("click", saveScreenForm);
  document.getElementById("f-delete").addEventListener("click", () => { if(editingScreenId) deleteScreen(editingScreenId); });
  document.getElementById("screen-modal").addEventListener("click", (e) => { if(e.target.id === "screen-modal") closeScreenModal(); });

  document.getElementById("btn-history").addEventListener("click", () => document.getElementById("history-panel").classList.toggle("open"));
  document.getElementById("btn-close-history").addEventListener("click", () => document.getElementById("history-panel").classList.remove("open"));

  document.getElementById("btn-expand").addEventListener("click", () => nodeLayer().querySelectorAll(".node").forEach(n => n.classList.remove("collapsed")));
  document.getElementById("btn-collapse").addEventListener("click", () => nodeLayer().querySelectorAll(".node").forEach(n => n.classList.add("collapsed")));

  document.getElementById("btn-theme").addEventListener("click", () => document.body.classList.toggle("light"));

  document.getElementById("btn-open-project").addEventListener("click", () => window.open(PROJECT_URL, "_blank", "noopener"));

  document.addEventListener("mousemove", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if(!target){ if(!e.target.closest(".edge-group")) hideTooltip(); return; }
    tooltipEl().classList.remove("edge-tip");
    tooltipEl().textContent = target.dataset.tooltip;
    tooltipEl().style.left = e.clientX + "px";
    tooltipEl().style.top = e.clientY + "px";
    tooltipEl().classList.add("show");
  });

  document.addEventListener("keydown", (e) => { if(e.key === "Escape" && connectMode) toggleConnectMode(); });
}

/* ---------------------------------------------------------------------- *
 * 17. PARTICLE BACKGROUND
 * ---------------------------------------------------------------------- */
let canvas, ctx, particles = [];
function resizeCanvas(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
function initParticles(){
  const count = Math.round((window.innerWidth * window.innerHeight) / 24000);
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    r: Math.random() * 1.6 + 0.4, vx: (Math.random()-0.5)*0.15, vy: (Math.random()-0.5)*0.15,
    a: Math.random()*0.5+0.15,
  }));
}
function tickParticles(){
  ctx.clearRect(0,0,canvas.width, canvas.height);
  const isLight = document.body.classList.contains("light");
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if(p.x < 0) p.x = canvas.width; if(p.x > canvas.width) p.x = 0;
    if(p.y < 0) p.y = canvas.height; if(p.y > canvas.height) p.y = 0;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.fillStyle = isLight ? `rgba(37,99,235,${p.a*0.5})` : `rgba(148,197,255,${p.a})`;
    ctx.fill();
  });
  requestAnimationFrame(tickParticles);
}

/* ---------------------------------------------------------------------- *
 * 18. FULL RENDER + INIT
 * ---------------------------------------------------------------------- */
function fullRender(){
  renderNodes();
  requestAnimationFrame(() => { drawEdges(); renderMinimap(); applyTransform(); });
}

async function startApp(){
  canvas = document.getElementById("bg-particles");
  ctx = canvas.getContext("2d");

  graph = await loadGraph();

  fullRender();
  renderLastEdit();
  renderHistory();

  bindStageEvents();
  bindMinimapClick();
  bindSearchAndFilters();
  bindMiscUI();

  resizeCanvas(); initParticles(); tickParticles();
  window.addEventListener("resize", () => { resizeCanvas(); initParticles(); drawEdges(); renderMinimap(); updateMinimapViewport(); });

  setTimeout(hidePanHint, 4500);
  subscribeRealtime();
}

/* ---------------------------------------------------------------------- *
 * BOOT — verify Supabase is configured before letting anyone in

 * FIX: se crea el cliente en "supabaseClient", no en "supabase"
 * (window.supabase sigue siendo el SDK, sin tocarlo).
 * ---------------------------------------------------------------------- */
if(!isConfigured()){
  document.getElementById("setup-screen").classList.remove("hidden");
}else{
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  initGate();
}
