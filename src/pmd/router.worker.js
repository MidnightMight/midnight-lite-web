// Ride route planner (bicycle / e-bike / PMD): decodes the SE Queensland graph built by
// tools/pmd-graph/build.py and runs A*. Runs in a Web Worker so the page stays responsive.
// Messages in: {type:"load", url} and {type:"route", id, a, b, prefs}. prefs.mode is "bike" | "ebike" | "pmd".

// Edge categories and flags: keep in sync with build.py.
const CAT = { CYCLEWAY: 0, SHARED: 1, FOOTPATH: 2, ROAD_QUIET: 3, ROAD_BIG: 4, ROAD_LANE: 5, CROSSING: 6, TRACK: 7,
  SIDEWALK: 8, ROAD_FAST: 9, ROAD_FAST_LANE: 10, FERRY: 11 };
const FERRY_MPS = 18 / 3.6; // CityCat average including stops
const F_ONEWAY = 1, F_UNPAVED = 2, F_ROUGH = 4, F_NOBIKE = 8, F_SPEED_GUESS = 16, F_LIT = 32, F_CONTRA = 64, F_DISMOUNT = 128;
const WALK_KMH = 5;
const ROADISH = (c) => c === 3 || c === 4 || c === 5 || c === 9 || c === 10;
const SLOWPATH = (c) => c === CAT.FOOTPATH || c === CAT.CROSSING || c === CAT.SIDEWALK;
const MIN_PIECE = 2000;

let G = null; // decoded graph

function decode(buf) {
  const b = new Uint8Array(buf);
  if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== "PMD5") throw new Error("Unknown map data format");
  let p = 4;
  const next = () => { // zigzag varint (values here stay well inside 2^53)
    let v = 0, s = 1, c;
    do { c = b[p++]; v += (c & 0x7f) * s; s *= 128; } while (c & 0x80);
    return v % 2 === 0 ? v / 2 : -(v + 1) / 2;
  };
  const n = next(), m = next(), ng = next();
  const lat = new Int32Array(n), lon = new Int32Array(n), z = new Int16Array(n);
  let acc = 0; for (let i = 0; i < n; i++) lat[i] = acc += next();
  acc = 0; for (let i = 0; i < n; i++) lon[i] = acc += next();
  acc = 0; for (let i = 0; i < n; i++) z[i] = acc += next();
  const from = new Uint32Array(m), to = new Uint32Array(m), len = new Float32Array(m), cf = new Uint16Array(m);
  const up = new Float32Array(m), down = new Float32Array(m), wait = new Uint8Array(m), goff = new Uint32Array(m + 1);
  acc = 0; for (let i = 0; i < m; i++) from[i] = acc += next();
  for (let i = 0; i < m; i++) to[i] = from[i] + next();
  for (let i = 0; i < m; i++) len[i] = Math.max(next(), 1);
  for (let i = 0; i < m; i++) cf[i] = next();
  for (let i = 0; i < m; i++) up[i] = next() / 10;
  for (let i = 0; i < m; i++) down[i] = next() / 10;
  for (let i = 0; i < m; i++) wait[i] = next(); // ferry boarding wait, minutes
  const name = new Uint32Array(m);
  for (let i = 0; i < m; i++) name[i] = next();
  for (let i = 0; i < m; i++) goff[i + 1] = goff[i] + next();
  const geom = new Int32Array(ng * 2);
  for (let i = 0; i < m; i++) { // geometry deltas restart at each edge's start vertex
    let la = lat[from[i]], lo = lon[from[i]];
    for (let k = goff[i]; k < goff[i + 1]; k++) { geom[2 * k] = la += next(); geom[2 * k + 1] = lo += next(); }
  }
  const names = new Array(next()), utf8 = new TextDecoder();
  for (let i = 0; i < names.length; i++) { const l = next(); names[i] = utf8.decode(b.subarray(p, p + l)); p += l; }
  // adjacency (CSR). adjR bit 0: traversed to->from; bit 1: that's against a one-way (bicycles only, F_CONTRA)
  const back = (i) => !(cf[i] >> 4 & F_ONEWAY) || (cf[i] >> 4 & F_CONTRA);
  const deg = new Uint32Array(n + 1);
  for (let i = 0; i < m; i++) { deg[from[i] + 1]++; if (back(i)) deg[to[i] + 1]++; }
  for (let i = 0; i < n; i++) deg[i + 1] += deg[i];
  const fill = deg.slice(0, n), adjE = new Uint32Array(deg[n]), adjR = new Uint8Array(deg[n]);
  for (let i = 0; i < m; i++) {
    adjE[fill[from[i]]++] = i;
    if (back(i)) { adjR[fill[to[i]]] = cf[i] >> 4 & F_ONEWAY ? 3 : 1; adjE[fill[to[i]]++] = i; }
  }
  // snapping grid: 0.005 deg cells
  const grid = new Map();
  for (let i = 0; i < n; i++) { const k = Math.floor(lat[i] / 5000) * 100000 + Math.floor(lon[i] / 5000); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(i); }
  // connected pieces (ignoring direction): OSM has many small path fragments that don't join the network,
  // and snapping a tap onto one gives "no route". Snap only into pieces with at least MIN_PIECE vertices.
  const parent = new Int32Array(n); for (let i = 0; i < n; i++) parent[i] = i;
  const root = (x) => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
  for (let i = 0; i < m; i++) { const a = root(from[i]), c = root(to[i]); if (a !== c) parent[a] = c; }
  const size = new Int32Array(n); for (let i = 0; i < n; i++) size[root(i)]++;
  const big = new Uint8Array(n); for (let i = 0; i < n; i++) big[i] = size[root(i)] >= MIN_PIECE ? 1 : 0;
  return { n, m, lat, lon, z, from, to, len, cf, up, down, wait, name, names, goff, geom, deg, adjE, adjR, grid, big };
}

// ---- costs ----
// Multiplier on metres per category (Infinity = never). The cheapest is always 1.0, which keeps A* exact.
function costTable(prefs) {
  const I = Infinity;
  const rows = {
    //          cyc   shar  foot  quiet big  lane  cross track side  fast fastlane
    bikeways: [1.0, 1.15, 2.2, 2.5, 5, 1.4, 1.2, 3, 2.4, 10, 5],
    avoid: [1.0, 1.05, 1.35, 2.2, 5, 1.8, 1.2, 2, 1.55, 12, 6],
    quiet: [1.0, 1.05, 1.35, 1.3, I, 1.3, 1.2, 2, 1.55, I, I],
    none: [1.0, 1.05, 1.35, I, I, I, 1.2, 2, 1.55, I, I],
    any: [1.0, 1.05, 1.35, 1.15, 1.4, 1.1, 1.2, 2, 1.55, 2.5, 1.6],
  };
  const mult = Float32Array.from(rows[prefs.roads] || rows.avoid);
  const foot = { prefer: 0.85, normal: 1, avoid: 1.9 }[prefs.footpaths] ?? 1;
  mult[CAT.FOOTPATH] *= foot; mult[CAT.SIDEWALK] *= foot;
  if (prefs.surface === "paved") mult[CAT.TRACK] = I; else if (prefs.surface === "good") mult[CAT.TRACK] *= 2;
  if (prefs.mode === "pmd") mult[CAT.ROAD_FAST] = mult[CAT.ROAD_FAST_LANE] = I; // PMDs: never on roads over 60 km/h
  for (let i = 0; i < mult.length; i++) if (mult[i] < 1) mult[i] = 1;
  // hills: metres-of-flat equivalent per metre climbed, by mode and preference
  const hill = { bike: [0, 8, 25], ebike: [0, 3, 10], pmd: [0, 4, 14] }[prefs.mode] || [0, 6, 20];
  const hk = hill[{ ignore: 0, some: 1, avoid: 2 }[prefs.hills] ?? 1];
  return { mult, hk, steep: prefs.hills === "avoid" };
}

function edgeCost(G, e, rev, T, prefs) {
  const c = G.cf[e] & 15, f = G.cf[e] >> 4;
  if (c === CAT.FERRY) { // cost = the distance you'd ride in the time the boat takes (boarding wait is added in astar)
    if (prefs.ferries === "avoid") return Infinity;
    return Math.max(G.len[e], G.len[e] / FERRY_MPS * prefs.speed / 3.6 * 1.1);
  }
  let k = T.mult[c];
  if (k === Infinity) return Infinity;
  if (rev & 2 && prefs.mode === "pmd") return Infinity; // contraflow is for bicycles only
  if (f & F_UNPAVED) { if (prefs.surface === "paved") return Infinity; k *= prefs.surface === "good" ? 3 : 1.4; }
  if (f & F_ROUGH) { if (prefs.surface !== "any") return Infinity; k *= 2; }
  if (f & F_NOBIKE) {
    if (prefs.mode !== "pmd" || prefs.noBikeSigns === "never") return Infinity; // binding for bicycles
    k *= 4;
  }
  if (f & F_DISMOUNT) k *= Math.max(1, prefs.speed / WALK_KMH); // walking: costs the distance you'd have ridden meanwhile
  if (f & F_SPEED_GUESS && ROADISH(c)) k *= 1.3;
  if (prefs.lit && !(f & F_LIT)) k *= 1.5;
  const L = G.len[e], climb = rev & 1 ? G.down[e] : G.up[e];
  let hill = climb * T.hk;
  if (T.steep && climb / L > 0.08) hill *= 2;                       // steep pinches cost double when avoiding hills
  if (T.steep && prefs.mode === "pmd" && (rev & 1 ? G.up[e] : G.down[e]) / L > 0.1) hill += L; // steep descents on small wheels
  return L * k + hill + (c === CAT.CROSSING ? 15 : 0);              // a crossing costs ~15 m extra (stop, look)
}

// ---- A* ----
const R = 6371000, D2R = Math.PI / 180;
function dist(G, a, b) { // equirectangular approximation in metres, fine at city scale
  const la1 = G.lat[a] * 1e-6 * D2R, la2 = G.lat[b] * 1e-6 * D2R;
  const x = (G.lon[b] - G.lon[a]) * 1e-6 * D2R * Math.cos((la1 + la2) / 2), y = la2 - la1;
  return Math.sqrt(x * x + y * y) * R;
}

function snap(G, la, lo, T, prefs) {
  const L = Math.round(la * 1e6), O = Math.round(lo * 1e6);
  let best = -1, bd = Infinity;
  for (let r = 0; r <= 3 && best < 0; r++) { // grow the search ring until a usable vertex turns up (~1.5 km)
    const c0 = Math.floor(L / 5000), c1 = Math.floor(O / 5000);
    for (let i = c0 - r; i <= c0 + r; i++) for (let j = c1 - r; j <= c1 + r; j++) {
      const a = G.grid.get(i * 100000 + j); if (!a) continue;
      for (const v of a) {
        if (!G.big[v]) continue;
        let ok = false;
        for (let k = G.deg[v]; k < G.deg[v + 1] && !ok; k++)
          ok = (G.cf[G.adjE[k]] & 15) !== CAT.FERRY && edgeCost(G, G.adjE[k], G.adjR[k], T, prefs) < Infinity;
        if (!ok) continue;
        const x = (G.lon[v] - O) * Math.cos(la * D2R), y = G.lat[v] - L, d = x * x + y * y;
        if (d < bd) { bd = d; best = v; }
      }
    }
  }
  return best;
}

function astar(G, s, t, T, prefs) {
  const n = G.n, g = new Float64Array(n).fill(Infinity), via = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
  let hf = new Float64Array(1 << 16), hv = new Int32Array(1 << 16), hn = 0; // binary heap of (f, vertex)
  const push = (f, v) => {
    if (hn === hf.length) { const f2 = new Float64Array(hn * 2); f2.set(hf); hf = f2; const v2 = new Int32Array(hn * 2); v2.set(hv); hv = v2; }
    let i = hn++;
    while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hf[i] = hf[p]; hv[i] = hv[p]; i = p; }
    hf[i] = f; hv[i] = v;
  };
  const pop = () => {
    const v = hv[0], f = hf[--hn], w = hv[hn];
    let i = 0;
    for (;;) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && hf[c + 1] < hf[c]) c++; if (hf[c] >= f) break; hf[i] = hf[c]; hv[i] = hv[c]; i = c; }
    hf[i] = f; hv[i] = w;
    return v;
  };
  g[s] = 0; push(dist(G, s, t), s);
  let visited = 0;
  while (hn) {
    const u = pop();
    if (closed[u]) continue;
    closed[u] = 1; visited++;
    if (u === t) break;
    const onBoat = via[u] >= 0 && (G.cf[G.adjE[via[u]]] & 15) === CAT.FERRY;
    for (let k = G.deg[u]; k < G.deg[u + 1]; k++) {
      const e = G.adjE[k], rev = G.adjR[k], v = rev & 1 ? G.from[e] : G.to[e];
      if (closed[v]) continue;
      let c = edgeCost(G, e, rev, T, prefs);
      if (c === Infinity) continue;
      if (!onBoat && (G.cf[e] & 15) === CAT.FERRY) c += G.wait[e] * 60 * prefs.speed / 3.6; // boarding: the expected wait
      const ng = g[u] + c;
      if (ng < g[v]) { g[v] = ng; via[v] = k; push(ng + dist(G, v, t), v); }
    }
  }
  if (!closed[t]) return { visited };
  const steps = []; // [edge, rev bits]
  for (let v = t; v !== s;) { const k = via[v], e = G.adjE[k]; steps.push([e, G.adjR[k]]); v = G.adjR[k] & 1 ? G.to[e] : G.from[e]; }
  steps.reverse();
  return { steps, visited };
}

// ---- turn-by-turn ----
const UNNAMED = ["the bikeway", "the shared path", "the footpath", "the street", "the road", "the bike lane", "the crossing",
  "the track", "the footpath", "the road", "the bike lane", "the ferry"];
function bearing(a, b) { // degrees clockwise from north, a/b = [lat, lon]
  const y = a[0] * D2R, x = (b[1] - a[1]) * Math.cos(y);
  return (Math.atan2(x, b[0] - a[0]) / D2R + 360) % 360;
}
const turnWord = (a) => {
  const d = a > 0 ? "right" : "left", m = Math.abs(a);
  return m < 25 ? "Continue" : m < 60 ? `Bear ${d}` : m < 150 ? `Turn ${d}` : `Turn sharply ${d}`;
};
// segs: one per run of edges with the same name (or the same kind of unnamed path). Each knows where it starts in pts.
const turnAngle = (from, to) => ((to - from + 540) % 360) - 180;
// per-step details for the "more detail" view: metres by category, climb, time and notable conditions
function mergeD(a, b) {
  const d = { ...a, cats: { ...a.cats } };
  for (const [c, m] of Object.entries(b.cats)) d.cats[c] = (d.cats[c] || 0) + m;
  for (const k of ["up", "dn", "sec", "unpaved", "lit", "walk", "guess", "contra", "nobike", "wait"]) d[k] += b[k];
  d.steep = Math.max(a.steep, b.steep);
  return d;
}
function directions(segs, total) {
  // 1. fold tiny unnamed connectors (< 25 m) into the previous segment, and join runs with the same name/kind
  const S = [];
  for (const g of segs) {
    const prev = S[S.length - 1];
    if (prev && ((!g.named && g.cat !== CAT.CROSSING && g.cat !== CAT.FERRY && g.metres < 25) || prev.key === g.key)) {
      prev.metres += g.metres; prev.b1 = g.b1; prev.d = mergeD(prev.d, g.d); continue;
    }
    S.push({ ...g, crossings: 0 });
  }
  // 2. a crossing you ride straight over, back onto the same path, is part of that step ("crosses 3 roads")
  const T = [];
  for (let i = 0; i < S.length; i++) {
    const g = S[i], prev = T[T.length - 1], next = S[i + 1];
    if (prev && next && g.cat === CAT.CROSSING && next.key === prev.key
        && Math.abs(turnAngle(prev.b1, g.b0)) < 35 && Math.abs(turnAngle(g.b1, next.b0)) < 35) {
      prev.metres += g.metres + next.metres; prev.b1 = next.b1; prev.crossings += 1 + next.crossings; i++;
      prev.d = mergeD(mergeD(prev.d, g.d), next.d);
      continue;
    }
    T.push(g);
  }
  const out = [];
  let at = 0;
  T.forEach((g, i) => {
    const angle = i ? turnAngle(T[i - 1].b1, g.b0) : 0;
    let text;
    if (i === 0) text = `Start on ${g.label}`;
    else if (g.cat === CAT.FERRY) text = "Board the CityCat / ferry";
    else if (T[i - 1].cat === CAT.FERRY) text = g.named && /ferry|wharf|terminal/i.test(g.label) ? `Get off at ${g.label}` : `Get off the ferry onto ${g.label}`;
    else if (g.cat === CAT.CROSSING) text = Math.abs(angle) < 25 ? "Cross the road" : `${turnWord(angle)} and cross the road`;
    else text = `${turnWord(angle)} onto ${g.label}`;
    if (g.crossings) text += ` (crosses ${g.crossings} road${g.crossings > 1 ? "s" : ""})`;
    out.push({ text, metres: g.metres, at: g.at, idx: g.idx, heading: g.b0, angle, dist: at, cat: g.cat, crossings: g.crossings, d: g.d });
    at += g.metres;
  });
  out.push({ text: "Arrive", metres: 0, at: null, idx: -1, heading: 0, angle: 0, dist: total, cat: -1 });
  return out;
}

// Expand a path into coordinates, per-category runs, an elevation profile and stats.
function describe(G, steps, prefs) {
  const pts = [], runs = [], profile = [], segs = [];
  const stats = { metres: 0, seconds: 0, climb: 0, descent: 0, steepest: 0, byCat: {}, unknownSpeed: 0, noBike: 0,
    unpaved: 0, crossings: 0, contra: 0, ferries: 0, ferryWait: 0, walk: 0 };
  const v = prefs.speed, mode = prefs.mode;
  const climbSec = { bike: 3.5, ebike: 1.5, pmd: 1 }[mode] ?? 3; // rough extra seconds per metre climbed
  let prevCat = -1;
  const s0 = steps[0][1] & 1 ? G.to[steps[0][0]] : G.from[steps[0][0]];
  profile.push([0, G.z[s0]]);
  for (const [e, rev] of steps) {
    const c = G.cf[e] & 15, f = G.cf[e] >> 4, L = G.len[e];
    const ep = [[G.lat[G.from[e]], G.lon[G.from[e]]]];
    for (let k = G.goff[e]; k < G.goff[e + 1]; k++) ep.push([G.geom[2 * k], G.geom[2 * k + 1]]);
    ep.push([G.lat[G.to[e]], G.lon[G.to[e]]]);
    if (rev & 1) ep.reverse();
    const ll = ep.map(([a, b]) => [a * 1e-6, b * 1e-6]);
    const nm = G.names[G.name[e]];
    segs.push({ key: nm ? `n:${nm}:${c === CAT.FERRY}` : `c:${UNNAMED[c]}`, named: !!nm, cat: c,
      label: nm || UNNAMED[c], metres: L, at: ll[0], idx: Math.max(pts.length - 1, 0),
      b0: bearing(ll[0], ll[1]), b1: bearing(ll[ll.length - 2], ll[ll.length - 1]) });
    const seg = segs[segs.length - 1];
    const last = runs[runs.length - 1];
    if (last && last.cat === c) last.pts.push(...ll.slice(1)); else runs.push({ cat: c, pts: ll });
    pts.push(...(pts.length ? ll.slice(1) : ll));
    // speed: 12 km/h on footpaths/crossings for PMDs and e-bikes (law); bicycles get 15 there (pedestrians)
    let sp = SLOWPATH(c) ? Math.min(v, mode === "bike" ? 15 : 12) : v;
    if (mode === "pmd") sp = Math.min(sp, 25);
    if (f & F_DISMOUNT) { sp = WALK_KMH; stats.walk += L; }
    if (c === CAT.FERRY) {
      sp = FERRY_MPS * 3.6;
      if (prevCat !== CAT.FERRY) { stats.ferries++; stats.ferryWait += G.wait[e] * 60; stats.seconds += G.wait[e] * 60; }
    }
    const up = rev & 1 ? G.down[e] : G.up[e], dn = rev & 1 ? G.up[e] : G.down[e];
    stats.metres += L; stats.climb += up; stats.descent += dn;
    stats.seconds += L / (sp / 3.6) + up * climbSec + (c === CAT.CROSSING && prevCat !== CAT.CROSSING ? 10 : 0);
    if (L >= 40) stats.steepest = Math.max(stats.steepest, up / L);
    stats.byCat[c] = (stats.byCat[c] || 0) + L;
    if (f & F_SPEED_GUESS && ROADISH(c)) stats.unknownSpeed += L;
    if (f & F_NOBIKE) stats.noBike += L;
    if (f & F_UNPAVED) stats.unpaved += L;
    if (rev & 2) stats.contra += L;
    const boarding = c === CAT.FERRY && prevCat !== CAT.FERRY ? G.wait[e] * 60 : 0;
    seg.d = { cats: { [c]: L }, up, dn, sec: L / (sp / 3.6) + up * climbSec + boarding + (c === CAT.CROSSING && prevCat !== CAT.CROSSING ? 10 : 0), steep: L >= 40 ? up / L : 0,
      unpaved: f & F_UNPAVED ? L : 0, lit: f & F_LIT ? L : 0, walk: f & F_DISMOUNT ? L : 0,
      guess: f & F_SPEED_GUESS && ROADISH(c) ? L : 0, contra: rev & 2 ? L : 0, nobike: f & F_NOBIKE ? L : 0, wait: boarding };
    if (c === CAT.CROSSING && prevCat !== CAT.CROSSING) stats.crossings++; // one crossing is often several edges
    prevCat = c;
    profile.push([stats.metres, G.z[rev & 1 ? G.from[e] : G.to[e]]]);
  }
  // thin the profile to ~300 points for drawing
  const step = Math.max(1, Math.floor(profile.length / 300));
  const prof = profile.filter((_, i) => i % step === 0 || i === profile.length - 1);
  return { pts, runs, stats, profile: prof, steps: directions(segs, stats.metres) };
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === "load") {
      const res = await fetch(data.url);
      if (!res.ok) throw new Error(`Map data didn't load (HTTP ${res.status})`);
      const total = +res.headers.get("content-length") || 0;
      let got = 0;
      const counted = res.body.pipeThrough(new TransformStream({
        transform(chunk, ctl) { got += chunk.length; self.postMessage({ type: "progress", got, total }); ctl.enqueue(chunk); },
      }));
      const buf = await new Response(counted.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
      G = decode(buf);
      self.postMessage({ type: "ready", vertices: G.n, edges: G.m });
    } else if (data.type === "route") {
      if (!G) throw new Error("Map data isn't loaded yet");
      const t0 = performance.now();
      const T = costTable(data.prefs);
      const s = snap(G, data.a[0], data.a[1], T, data.prefs), t = snap(G, data.b[0], data.b[1], T, data.prefs);
      if (s < 0 || t < 0) { self.postMessage({ type: "route", id: data.id, error: `No rideable path near the ${s < 0 ? "start" : "finish"}.` }); return; }
      if (s === t) { self.postMessage({ type: "route", id: data.id, error: "Start and finish are at the same spot." }); return; }
      const r = astar(G, s, t, T, data.prefs);
      if (!r.steps) { self.postMessage({ type: "route", id: data.id, error: "No legal route found with these options. Try allowing more road types or rougher surfaces." }); return; }
      const out = describe(G, r.steps, data.prefs);
      self.postMessage({ type: "route", id: data.id, ...out, ms: Math.round(performance.now() - t0), visited: r.visited });
    }
  } catch (err) {
    self.postMessage({ type: "error", id: data.id, message: String(err.message || err) });
  }
};
