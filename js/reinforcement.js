/* ============================================================
   NEURA — reinforcement.js
   Agent Q-learning tabulaire dans un "gridworld".
   L'agent apprend par essai-erreur à rejoindre la sortie en
   évitant la lave. Affichage : carte de valeur + politique.
   ============================================================ */
(function () {
  "use strict";
  const U = window.NeuraUtils;
  if (!U) return;
  const { fitCanvas, clamp, lerp, COLORS, debounce } = U;

  const canvas = document.getElementById("rl-canvas");
  if (!canvas) return;
  let dim = fitCanvas(canvas);

  /* ---------- Constantes ---------- */
  const GRID = 9;
  const EMPTY = 0, WALL = 1, LAVA = 2, GOAL = 3;
  const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // haut, droite, bas, gauche
  const STEP_REWARD = -0.04, GOAL_REWARD = 1, LAVA_REWARD = -1;
  const MAX_STEPS = 240;

  let start = { r: GRID - 1, c: 0 };
  let grid, Q, agent, episode, lastReturn, running;

  function idx(r, c) { return r * GRID + c; }
  function qi(r, c, a) { return (r * GRID + c) * 4 + a; }

  function defaultGrid() {
    const g = new Array(GRID * GRID).fill(EMPTY);
    const set = (r, c, t) => (g[idx(r, c)] = t);
    // murs en zig-zag
    for (let r = 0; r <= 4; r++) set(r, 3, WALL);
    for (let r = 4; r <= 8; r++) set(r, 6, WALL);
    // lave à éviter
    set(6, 1, LAVA); set(6, 2, LAVA); set(2, 7, LAVA);
    // sortie
    set(0, GRID - 1, GOAL);
    return g;
  }

  function resetQ() {
    Q = new Float64Array(GRID * GRID * 4);
    episode = 0; lastReturn = 0;
    agent = { r: start.r, c: start.c, steps: 0, ret: 0 };
    updateStats();
  }

  function fullInit() {
    grid = defaultGrid();
    resetQ();
  }

  /* ---------- Mécanique de l'environnement ---------- */
  function maxQ(r, c) {
    let m = -Infinity;
    for (let a = 0; a < 4; a++) m = Math.max(m, Q[qi(r, c, a)]);
    return m;
  }
  function argmaxQ(r, c) {
    let best = 0, bv = -Infinity;
    for (let a = 0; a < 4; a++) {
      const v = Q[qi(r, c, a)];
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }
  function chooseAction(r, c, eps) {
    if (Math.random() < eps) return (Math.random() * 4) | 0;
    // tie-break aléatoire entre les meilleures
    let bv = -Infinity;
    for (let a = 0; a < 4; a++) bv = Math.max(bv, Q[qi(r, c, a)]);
    const ties = [];
    for (let a = 0; a < 4; a++) if (Q[qi(r, c, a)] === bv) ties.push(a);
    return ties[(Math.random() * ties.length) | 0];
  }
  function stepEnv(r, c, a) {
    const [dr, dc] = DIRS[a];
    let nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID || grid[idx(nr, nc)] === WALL) {
      nr = r; nc = c; // on rebondit sur le mur / le bord
    }
    const cell = grid[idx(nr, nc)];
    let reward = STEP_REWARD, done = false;
    if (cell === GOAL) { reward = GOAL_REWARD; done = true; }
    else if (cell === LAVA) { reward = LAVA_REWARD; done = true; }
    return { nr, nc, reward, done };
  }

  function microStep(eps, alpha, gamma) {
    const { r, c } = agent;
    const a = chooseAction(r, c, eps);
    const { nr, nc, reward, done } = stepEnv(r, c, a);

    // mise à jour Q (équation de Bellman)
    const target = reward + (done ? 0 : gamma * maxQ(nr, nc));
    const i = qi(r, c, a);
    Q[i] += alpha * (target - Q[i]);

    agent.r = nr; agent.c = nc;
    agent.ret += reward; agent.steps++;

    if (done || agent.steps >= MAX_STEPS) {
      episode++;
      lastReturn = agent.ret;
      agent = { r: start.r, c: start.c, steps: 0, ret: 0 };
    }
  }

  /* ---------- Rendu ---------- */
  let layout = { cell: 0, ox: 0, oy: 0 };
  function computeLayout() {
    const S = Math.min(dim.w, dim.h);
    const cell = Math.floor(S / GRID);
    layout = { cell, ox: (dim.w - cell * GRID) / 2, oy: (dim.h - cell * GRID) / 2 };
  }

  function valColor(t) {
    // dégradé : bleu profond → violet → cyan
    const stops = [
      [16, 23, 58], [91, 58, 166], [34, 211, 238],
    ];
    const seg = clamp(t, 0, 1) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(seg));
    const f = seg - i;
    const a = stops[i], b = stops[i + 1];
    return `rgb(${lerp(a[0], b[0], f) | 0},${lerp(a[1], b[1], f) | 0},${lerp(a[2], b[2], f) | 0})`;
  }

  function drawArrow(cx, cy, a, size, alpha) {
    const [dr, dc] = DIRS[a];
    const len = size * 0.32;
    const ex = cx + dc * len, ey = cy + dr * len;
    const sx = cx - dc * len * 0.6, sy = cy - dr * len * 0.6;
    ctx_().strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx_().lineWidth = 2;
    ctx_().beginPath(); ctx_().moveTo(sx, sy); ctx_().lineTo(ex, ey); ctx_().stroke();
    // pointe
    const ang = Math.atan2(dr, dc);
    const ah = size * 0.16;
    ctx_().fillStyle = `rgba(255,255,255,${alpha})`;
    ctx_().beginPath();
    ctx_().moveTo(ex, ey);
    ctx_().lineTo(ex - ah * Math.cos(ang - 0.5), ey - ah * Math.sin(ang - 0.5));
    ctx_().lineTo(ex - ah * Math.cos(ang + 0.5), ey - ah * Math.sin(ang + 0.5));
    ctx_().closePath(); ctx_().fill();
  }

  function ctx_() { return dim.ctx; }

  function emoji(ch, cx, cy, size) {
    const ctx = dim.ctx;
    ctx.font = Math.floor(size * 0.6) + "px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(ch, cx, cy + size * 0.02);
  }

  function draw() {
    const ctx = dim.ctx;
    computeLayout();
    const { cell, ox, oy } = layout;
    ctx.clearRect(0, 0, dim.w, dim.h);

    const showValues = document.getElementById("rl-show-values").checked;
    const showPolicy = document.getElementById("rl-show-policy").checked;

    // bornes de valeur pour la normalisation
    let vmin = Infinity, vmax = -Infinity;
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      const t = grid[idx(r, c)];
      if (t === WALL || t === GOAL || t === LAVA) continue;
      const v = maxQ(r, c);
      vmin = Math.min(vmin, v); vmax = Math.max(vmax, v);
    }
    if (!isFinite(vmin)) { vmin = 0; vmax = 1; }
    if (vmax - vmin < 1e-6) vmax = vmin + 1e-6;

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const x = ox + c * cell, y = oy + r * cell;
        const t = grid[idx(r, c)];

        // fond de cellule
        if (t === WALL) {
          ctx.fillStyle = "#070a16";
        } else if (t === GOAL) {
          ctx.fillStyle = "rgba(52,211,153,.22)";
        } else if (t === LAVA) {
          ctx.fillStyle = "rgba(248,113,113,.20)";
        } else if (showValues) {
          const norm = (maxQ(r, c) - vmin) / (vmax - vmin);
          ctx.fillStyle = valColor(norm);
        } else {
          ctx.fillStyle = "rgba(255,255,255,.03)";
        }
        ctx.fillRect(x, y, cell, cell);

        // grille
        ctx.strokeStyle = "rgba(255,255,255,.07)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cell, cell);

        const cx = x + cell / 2, cy = y + cell / 2;

        if (t === WALL) {
          // motif brique léger
          ctx.fillStyle = "rgba(255,255,255,.05)";
          ctx.fillRect(x + cell * 0.18, y + cell * 0.3, cell * 0.64, cell * 0.12);
          ctx.fillRect(x + cell * 0.18, y + cell * 0.58, cell * 0.64, cell * 0.12);
        } else if (t === GOAL) {
          emoji("🎯", cx, cy, cell);
        } else if (t === LAVA) {
          emoji("🔥", cx, cy, cell);
        } else if (showPolicy && (vmax - vmin) > 1e-4) {
          const norm = (maxQ(r, c) - vmin) / (vmax - vmin);
          if (maxQ(r, c) !== 0) drawArrow(cx, cy, argmaxQ(r, c), cell, 0.25 + norm * 0.6);
        }
      }
    }

    // marqueur de départ
    {
      const x = ox + start.c * cell, y = oy + start.r * cell;
      ctx.strokeStyle = COLORS.amber;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
      ctx.fillStyle = COLORS.amber;
      ctx.font = "700 " + Math.floor(cell * 0.22) + "px ui-monospace, monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("S", x + 5, y + 4);
    }

    // agent
    {
      const cx = ox + agent.c * cell + cell / 2;
      const cy = oy + agent.r * cell + cell / 2;
      ctx.beginPath();
      ctx.fillStyle = "rgba(34,211,238,.25)";
      ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 18;
      ctx.arc(cx, cy, cell * 0.36, 0, Math.PI * 2);
      ctx.fill(); ctx.shadowBlur = 0;
      emoji("🤖", cx, cy, cell);
    }
  }

  function updateStats() {
    document.getElementById("rl-episode").textContent = String(episode);
    document.getElementById("rl-steps").textContent = String(agent.steps);
    document.getElementById("rl-reward").textContent = (agent.ret).toFixed(2);
  }

  /* ---------- Boucle ---------- */
  function loop() {
    if (running) {
      const eps = parseFloat(document.getElementById("rl-epsilon").value);
      const alpha = parseFloat(document.getElementById("rl-alpha").value);
      const gamma = parseFloat(document.getElementById("rl-gamma").value);
      const speed = parseInt(document.getElementById("rl-speed").value, 10);
      for (let k = 0; k < speed; k++) microStep(eps, alpha, gamma);
      updateStats();
    }
    draw();
    requestAnimationFrame(loop);
  }

  /* ---------- Interactions ---------- */
  let tool = "wall";
  const toolSeg = document.getElementById("rl-tool");
  toolSeg.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      toolSeg.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      tool = btn.getAttribute("data-tool");
    });
  });

  function cellFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left - layout.ox;
    const y = e.clientY - r.top - layout.oy;
    const c = Math.floor(x / layout.cell);
    const rr = Math.floor(y / layout.cell);
    if (rr < 0 || rr >= GRID || c < 0 || c >= GRID) return null;
    return { r: rr, c };
  }

  function editCell(rr, c) {
    if (rr === start.r && c === start.c) return; // on protège le départ
    const i = idx(rr, c);
    if (tool === "wall") grid[i] = grid[i] === WALL ? EMPTY : WALL;
    else if (tool === "lava") grid[i] = grid[i] === LAVA ? EMPTY : LAVA;
    else if (tool === "erase") grid[i] = EMPTY;
    else if (tool === "goal") {
      // un seul objectif : on efface l'ancien
      for (let k = 0; k < grid.length; k++) if (grid[k] === GOAL) grid[k] = EMPTY;
      grid[i] = GOAL;
    }
  }

  let painting = false;
  canvas.addEventListener("pointerdown", (e) => {
    const cell = cellFromEvent(e);
    if (!cell) return;
    painting = true;
    editCell(cell.r, cell.c);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!painting || (tool === "goal")) return;
    const cell = cellFromEvent(e);
    if (cell) editCell(cell.r, cell.c);
  });
  window.addEventListener("pointerup", () => (painting = false));

  // sliders → affichage
  [["rl-epsilon", 2], ["rl-alpha", 2], ["rl-gamma", 3], ["rl-speed", 0]].forEach(([id, d]) => {
    const s = document.getElementById(id);
    const o = document.getElementById(id + "-val");
    const upd = () => (o.textContent = d === 0 ? s.value : parseFloat(s.value).toFixed(d));
    s.addEventListener("input", upd); upd();
  });

  const trainBtn = document.getElementById("rl-train");
  trainBtn.addEventListener("click", () => {
    running = !running;
    trainBtn.textContent = running ? "⏸ Pause" : "▶ Entraîner";
    trainBtn.classList.toggle("is-running", running);
  });
  document.getElementById("rl-reset").addEventListener("click", () => { resetQ(); });

  fullInit();
  loop();

  window.addEventListener("resize", debounce(() => { dim = fitCanvas(canvas); draw(); }, 200));
})();
