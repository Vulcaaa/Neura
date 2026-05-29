/* ============================================================
   NEURA — supervised.js
   1) Régression linéaire entraînée par descente de gradient.
   2) Mini "playground" : un MLP (forward + rétropropagation faits
      main) qui apprend une frontière de décision non linéaire.
   ============================================================ */
(function () {
  "use strict";
  const U = window.NeuraUtils;
  if (!U) return;
  const { fitCanvas, clamp, lerp, COLORS, debounce } = U;

  /* utilitaire : mini graphe de perte */
  function drawLoss(ctx, w, h, hist, color) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.faint;
    ctx.font = "9px ui-monospace, monospace";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("perte", 6, 5);
    if (hist.length < 2) return;
    const pad = 6;
    let max = -Infinity, min = Infinity;
    for (const v of hist) { max = Math.max(max, v); min = Math.min(min, v); }
    if (max - min < 1e-9) max = min + 1;
    const X = (i) => pad + (i / (hist.length - 1)) * (w - 2 * pad);
    const Y = (v) => pad + (1 - (v - min) / (max - min)) * (h - 2 * pad);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    hist.forEach((v, i) => { const px = X(i), py = Y(v); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.stroke();
    // dernière valeur
    ctx.fillStyle = color;
    ctx.textAlign = "right";
    ctx.fillText(hist[hist.length - 1].toFixed(3), w - 6, 5);
  }

  /* ============================================================
     1) RÉGRESSION LINÉAIRE
     ============================================================ */
  (function regression() {
    const canvas = document.getElementById("regression-canvas");
    const lossCanvas = document.getElementById("reg-loss-canvas");
    if (!canvas) return;
    let dim = fitCanvas(canvas);
    let ldim = fitCanvas(lossCanvas);

    const X_MIN = -5, X_MAX = 5, Y_MIN = -5, Y_MAX = 5;
    const PAD = 34;

    let points = [];
    let stats = { mx: 0, my: 0, sx: 1, sy: 1 };
    let na = 0, nb = 0;           // paramètres dans l'espace normalisé
    let epoch = 0, running = false, lossHist = [];

    function seedDemo() {
      points = [];
      const a = 0.8, b = 0.4;
      for (let i = 0; i < 22; i++) {
        const x = lerp(X_MIN + 0.5, X_MAX - 0.5, Math.random());
        const y = a * x + b + (Math.random() - 0.5) * 2.4;
        points.push({ x, y: clamp(y, Y_MIN + 0.3, Y_MAX - 0.3) });
      }
      computeStats(true);
      na = 0; nb = 0; epoch = 0; lossHist = [];
    }

    function computeStats(reset) {
      const old = toOriginal(na, nb);
      if (points.length === 0) { stats = { mx: 0, my: 0, sx: 1, sy: 1 }; return; }
      let mx = 0, my = 0;
      for (const p of points) { mx += p.x; my += p.y; }
      mx /= points.length; my /= points.length;
      let vx = 0, vy = 0;
      for (const p of points) { vx += (p.x - mx) ** 2; vy += (p.y - my) ** 2; }
      const sx = Math.sqrt(vx / points.length) || 1;
      const sy = Math.sqrt(vy / points.length) || 1;
      stats = { mx, my, sx: sx < 1e-6 ? 1 : sx, sy: sy < 1e-6 ? 1 : sy };
      if (!reset) { const n = toNormalized(old.a, old.b); na = n.na; nb = n.nb; }
    }

    function toOriginal(na_, nb_) {
      const { mx, my, sx, sy } = stats;
      const a = (sy * na_) / sx;
      const b = my - (sy * na_ * mx) / sx + sy * nb_;
      return { a, b };
    }
    function toNormalized(a, b) {
      const { mx, my, sx, sy } = stats;
      const na_ = (a * sx) / sy;
      const nb_ = (b - my) / sy + (na_ * mx) / sx;
      return { na: na_, nb: nb_ };
    }

    function step(lr) {
      if (points.length < 2) return;
      const { mx, my, sx, sy } = stats;
      let ga = 0, gb = 0;
      for (const p of points) {
        const nx = (p.x - mx) / sx;
        const ny = (p.y - my) / sy;
        const err = na * nx + nb - ny;
        ga += err * nx;
        gb += err;
      }
      ga = (2 * ga) / points.length;
      gb = (2 * gb) / points.length;
      na -= lr * ga;
      nb -= lr * gb;
      epoch++;
    }

    function mseOriginal() {
      if (points.length === 0) return 0;
      const { a, b } = toOriginal(na, nb);
      let s = 0;
      for (const p of points) s += (p.y - (a * p.x + b)) ** 2;
      return s / points.length;
    }

    /* coords */
    function dataToCanvas(x, y) {
      const { w, h } = dim;
      const px = PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (w - 2 * PAD);
      const py = PAD + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * (h - 2 * PAD);
      return [px, py];
    }
    function canvasToData(px, py) {
      const { w, h } = dim;
      const x = X_MIN + ((px - PAD) / (w - 2 * PAD)) * (X_MAX - X_MIN);
      const y = Y_MAX - ((py - PAD) / (h - 2 * PAD)) * (Y_MAX - Y_MIN);
      return [clamp(x, X_MIN, X_MAX), clamp(y, Y_MIN, Y_MAX)];
    }

    function draw() {
      const { ctx, w, h } = dim;
      ctx.clearRect(0, 0, w, h);

      // grille
      ctx.strokeStyle = "rgba(255,255,255,.06)";
      ctx.lineWidth = 1;
      for (let gx = X_MIN; gx <= X_MAX; gx++) {
        const [px] = dataToCanvas(gx, 0);
        ctx.beginPath(); ctx.moveTo(px, PAD); ctx.lineTo(px, h - PAD); ctx.stroke();
      }
      for (let gy = Y_MIN; gy <= Y_MAX; gy++) {
        const [, py] = dataToCanvas(0, gy);
        ctx.beginPath(); ctx.moveTo(PAD, py); ctx.lineTo(w - PAD, py); ctx.stroke();
      }
      // axes
      ctx.strokeStyle = "rgba(255,255,255,.22)";
      ctx.lineWidth = 1.4;
      const [, y0] = dataToCanvas(0, 0);
      const [x0] = dataToCanvas(0, 0);
      ctx.beginPath(); ctx.moveTo(PAD, y0); ctx.lineTo(w - PAD, y0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, PAD); ctx.lineTo(x0, h - PAD); ctx.stroke();

      const { a, b } = toOriginal(na, nb);

      // résidus
      if (points.length >= 2) {
        ctx.strokeStyle = "rgba(251,191,36,.28)";
        ctx.lineWidth = 1;
        for (const p of points) {
          const pred = a * p.x + b;
          const [px, py] = dataToCanvas(p.x, p.y);
          const [, ppy] = dataToCanvas(p.x, clamp(pred, Y_MIN, Y_MAX));
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, ppy); ctx.stroke();
        }
      }

      // droite de régression
      const yL = a * X_MIN + b, yR = a * X_MAX + b;
      const [lx, ly] = dataToCanvas(X_MIN, yL);
      const [rx, ry] = dataToCanvas(X_MAX, yR);
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 3;
      ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke();
      ctx.shadowBlur = 0;

      // points
      for (const p of points) {
        const [px, py] = dataToCanvas(p.x, p.y);
        ctx.beginPath();
        ctx.fillStyle = COLORS.violet;
        ctx.strokeStyle = "rgba(255,255,255,.85)";
        ctx.lineWidth = 1.5;
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }

      // mise à jour des stats DOM
      document.getElementById("reg-slope").textContent = a.toFixed(2);
      document.getElementById("reg-intercept").textContent = b.toFixed(2);
      document.getElementById("reg-loss").textContent = points.length >= 2 ? mseOriginal().toFixed(3) : "—";
      document.getElementById("reg-epoch").textContent = String(epoch);

      drawLoss(ldim.ctx, ldim.w, ldim.h, lossHist, COLORS.magenta);
    }

    /* boucle */
    function loop() {
      if (running && points.length >= 2) {
        const lr = parseFloat(document.getElementById("reg-lr").value);
        step(lr); step(lr); // 2 pas par frame pour une animation fluide
        lossHist.push(mseOriginal());
        if (lossHist.length > 240) lossHist.shift();
      }
      draw();
      requestAnimationFrame(loop);
    }

    /* interactions */
    canvas.addEventListener("pointerdown", (e) => {
      const r = canvas.getBoundingClientRect();
      const [x, y] = canvasToData(e.clientX - r.left, e.clientY - r.top);
      points.push({ x, y });
      computeStats(false);
    });

    const trainBtn = document.getElementById("reg-train");
    trainBtn.addEventListener("click", () => {
      running = !running;
      trainBtn.textContent = running ? "⏸ Pause" : "▶ Entraîner";
      trainBtn.classList.toggle("is-running", running);
    });
    document.getElementById("reg-reset").addEventListener("click", () => {
      na = 0; nb = 0; epoch = 0; lossHist = [];
    });
    document.getElementById("reg-clear").addEventListener("click", () => {
      points = []; na = 0; nb = 0; epoch = 0; lossHist = [];
      computeStats(true);
    });
    const lrSlider = document.getElementById("reg-lr");
    const lrOut = document.getElementById("reg-lr-val");
    lrSlider.addEventListener("input", () => (lrOut.textContent = parseFloat(lrSlider.value).toFixed(3)));
    lrOut.textContent = parseFloat(lrSlider.value).toFixed(3);

    seedDemo();
    loop();

    window.addEventListener("resize", debounce(() => {
      dim = fitCanvas(canvas); ldim = fitCanvas(lossCanvas);
    }, 200));
  })();

  /* ============================================================
     2) MLP PLAYGROUND (classification non linéaire)
     ============================================================ */

  // Réseau multicouche minimal : forward + backprop "maison".
  function makeMLP(sizes, hiddenAct) {
    const L = sizes.length - 1;
    const W = [], B = [], vW = [], vB = []; // v* = vitesses pour le momentum
    const MOMENTUM = 0.9;
    function gauss() { // Box-Muller
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    function init() {
      W.length = 0; B.length = 0; vW.length = 0; vB.length = 0;
      for (let l = 0; l < L; l++) {
        const fin = sizes[l], fout = sizes[l + 1];
        const scale = Math.sqrt((hiddenAct === "relu" ? 2 : 1) / fin);
        const w = [], vw = [];
        for (let j = 0; j < fout; j++) {
          const row = [];
          for (let i = 0; i < fin; i++) row.push(gauss() * scale);
          w.push(row);
          vw.push(new Array(fin).fill(0));
        }
        W.push(w); vW.push(vw);
        B.push(new Array(fout).fill(0));
        vB.push(new Array(fout).fill(0));
      }
    }
    init();

    const sigmoid = (z) => 1 / (1 + Math.exp(-z));
    function act(z) {
      if (hiddenAct === "relu") return z > 0 ? z : 0;
      if (hiddenAct === "sigmoid") return sigmoid(z);
      return Math.tanh(z);
    }
    function dact(a, z) {
      if (hiddenAct === "relu") return z > 0 ? 1 : 0;
      if (hiddenAct === "sigmoid") return a * (1 - a);
      return 1 - a * a; // tanh
    }

    // forward renvoyant les caches
    function forward(x) {
      const zs = [], as = [x];
      let cur = x;
      for (let l = 0; l < L; l++) {
        const z = new Array(sizes[l + 1]).fill(0);
        const a = new Array(sizes[l + 1]).fill(0);
        for (let j = 0; j < sizes[l + 1]; j++) {
          let s = B[l][j];
          const row = W[l][j];
          for (let i = 0; i < sizes[l]; i++) s += row[i] * cur[i];
          z[j] = s;
          a[j] = l === L - 1 ? sigmoid(s) : act(s);
        }
        zs.push(z); as.push(a); cur = a;
      }
      return { zs, as };
    }

    function predict(x) { return forward(x).as[L][0]; }

    function zeroGrads() {
      return { gW: W.map((m) => m.map((r) => r.map(() => 0))), gB: B.map((b) => b.map(() => 0)) };
    }

    // rétropropagation d'un exemple : accumule les gradients, renvoie la perte BCE
    function accumulate(x, y, gW, gB) {
      const { zs, as } = forward(x);
      const out = as[L][0];
      const a = clamp(out, 1e-7, 1 - 1e-7);
      const loss = -(y * Math.log(a) + (1 - y) * Math.log(1 - a));

      const deltas = new Array(L);
      deltas[L - 1] = [out - y]; // sigmoïde + entropie croisée → (a - y)
      for (let l = L - 2; l >= 0; l--) {
        const d = new Array(sizes[l + 1]).fill(0);
        for (let i = 0; i < sizes[l + 1]; i++) {
          let sum = 0;
          for (let j = 0; j < sizes[l + 2]; j++) sum += W[l + 1][j][i] * deltas[l + 1][j];
          d[i] = sum * dact(as[l + 1][i], zs[l][i]);
        }
        deltas[l] = d;
      }
      for (let l = 0; l < L; l++) {
        for (let j = 0; j < sizes[l + 1]; j++) {
          gB[l][j] += deltas[l][j];
          const prev = as[l];
          for (let i = 0; i < sizes[l]; i++) gW[l][j][i] += deltas[l][j] * prev[i];
        }
      }
      return loss;
    }

    // une époque = un passage complet en mini-batchs SGD (convergence rapide)
    function trainEpoch(X, Y, lr) {
      const n = X.length;
      const order = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = order[i]; order[i] = order[j]; order[j] = t; }
      const BATCH = 16;
      let lossSum = 0;

      for (let b = 0; b < n; b += BATCH) {
        const end = Math.min(n, b + BATCH);
        const bs = end - b;
        const { gW, gB } = zeroGrads();
        for (let s = b; s < end; s++) lossSum += accumulate(X[order[s]], Y[order[s]], gW, gB);
        // descente de gradient avec momentum : v ← μ·v − η·∇ ; θ ← θ + v
        for (let l = 0; l < L; l++) {
          for (let j = 0; j < sizes[l + 1]; j++) {
            vB[l][j] = MOMENTUM * vB[l][j] - (lr * gB[l][j]) / bs;
            B[l][j] += vB[l][j];
            for (let i = 0; i < sizes[l]; i++) {
              vW[l][j][i] = MOMENTUM * vW[l][j][i] - (lr * gW[l][j][i]) / bs;
              W[l][j][i] += vW[l][j][i];
            }
          }
        }
      }
      return lossSum / n;
    }

    return { predict, trainEpoch, reinit: init };
  }

  /* --- Jeux de données (points dans ~[-0.9, 0.9]) --- */
  function genData(kind, n) {
    const X = [], Y = [];
    const rnd = (a, b) => a + Math.random() * (b - a);
    if (kind === "circle") {
      for (let i = 0; i < n; i++) {
        const cls = i % 2;
        const ang = rnd(0, Math.PI * 2);
        const r = cls === 1 ? rnd(0, 0.42) : rnd(0.58, 0.92);
        X.push([Math.cos(ang) * r, Math.sin(ang) * r]); Y.push(cls);
      }
    } else if (kind === "xor") {
      for (let i = 0; i < n; i++) {
        const x = rnd(0.12, 0.9) * (Math.random() < 0.5 ? -1 : 1);
        const y = rnd(0.12, 0.9) * (Math.random() < 0.5 ? -1 : 1);
        X.push([x, y]); Y.push(x * y > 0 ? 1 : 0);
      }
    } else if (kind === "moons") {
      for (let i = 0; i < n; i++) {
        const cls = i % 2;
        const t = rnd(0, Math.PI);
        let px, py;
        if (cls === 0) { px = Math.cos(t); py = Math.sin(t); }
        else { px = 1 - Math.cos(t); py = -Math.sin(t) + 0.35; }
        px = (px - 0.5) * 0.85; py = (py - 0.15) * 0.85;
        px += rnd(-0.06, 0.06); py += rnd(-0.06, 0.06);
        X.push([px, py]); Y.push(cls);
      }
    } else { // spiral
      const turns = 1.1;
      for (let i = 0; i < n; i++) {
        const cls = i % 2;
        const t = (i / n) * turns * Math.PI * 2 + rnd(-0.1, 0.1);
        const r = (i / n) * 0.9 + 0.05;
        const sign = cls === 0 ? 1 : -1;
        X.push([sign * r * Math.cos(t), sign * r * Math.sin(t)]); Y.push(cls);
      }
    }
    return { X, Y };
  }

  (function classifier() {
    const canvas = document.getElementById("clf-canvas");
    const lossCanvas = document.getElementById("clf-loss-canvas");
    if (!canvas) return;
    let dim = fitCanvas(canvas);
    let ldim = fitCanvas(lossCanvas);

    const SIZES = [2, 16, 16, 1];
    let dataset = "circle";
    let hiddenAct = "tanh";
    let net = makeMLP(SIZES, hiddenAct);
    let data = genData(dataset, 180);
    let epoch = 0, running = false, lossHist = [];

    const PAD = 8;
    function dataToCanvas(x, y) {
      const { w, h } = dim;
      const px = PAD + ((x + 1) / 2) * (w - 2 * PAD);
      const py = PAD + ((1 - y) / 2) * (h - 2 * PAD);
      return [px, py];
    }

    // grille pour la frontière de décision
    const COLS = 46, ROWS = 36;

    function draw() {
      const { ctx, w, h } = dim;
      const cw = (w - 2 * PAD) / COLS, ch = (h - 2 * PAD) / ROWS;
      ctx.clearRect(0, 0, w, h);

      // frontière de décision (heatmap)
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const dx = -1 + ((c + 0.5) / COLS) * 2;
          const dy = 1 - ((r + 0.5) / ROWS) * 2;
          const p = net.predict([dx, dy]); // 0..1
          // classe 0 → cyan, classe 1 → magenta
          const t = clamp(p, 0, 1);
          const rr = lerp(34, 236, t), gg = lerp(211, 72, t), bb = lerp(238, 153, t);
          const conf = Math.abs(p - 0.5) * 2; // 0 (incertain) → 1 (sûr)
          ctx.fillStyle = `rgba(${rr|0},${gg|0},${bb|0},${0.14 + conf * 0.52})`;
          ctx.fillRect(PAD + c * cw, PAD + r * ch, cw + 1, ch + 1);
        }
      }

      // ligne de décision approximative (p≈0.5) via léger contour
      ctx.strokeStyle = "rgba(255,255,255,.12)";
      ctx.lineWidth = 1;
      ctx.strokeRect(PAD, PAD, w - 2 * PAD, h - 2 * PAD);

      // points
      for (let i = 0; i < data.X.length; i++) {
        const [px, py] = dataToCanvas(data.X[i][0], data.X[i][1]);
        ctx.beginPath();
        ctx.fillStyle = data.Y[i] === 1 ? COLORS.magenta : COLORS.cyan;
        ctx.strokeStyle = "rgba(0,0,0,.6)";
        ctx.lineWidth = 1.5;
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }

      document.getElementById("clf-epoch").textContent = String(epoch);
      document.getElementById("clf-loss").textContent = lossHist.length ? lossHist[lossHist.length - 1].toFixed(3) : "—";
      drawLoss(ldim.ctx, ldim.w, ldim.h, lossHist, COLORS.amber);
    }

    function loop() {
      if (running) {
        const lr = parseFloat(document.getElementById("clf-lr").value);
        let last = 0;
        for (let k = 0; k < 5; k++) { last = net.trainEpoch(data.X, data.Y, lr); epoch++; }
        lossHist.push(last);
        if (lossHist.length > 240) lossHist.shift();
      }
      draw();
      requestAnimationFrame(loop);
    }

    function fullReset() {
      net = makeMLP(SIZES, hiddenAct);
      data = genData(dataset, 180);
      epoch = 0; lossHist = [];
    }

    /* contrôles */
    function bindSegment(id, attr, onPick) {
      const seg = document.getElementById(id);
      seg.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          seg.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
          onPick(btn.getAttribute(attr));
        });
      });
    }
    bindSegment("clf-dataset", "data-ds", (v) => { dataset = v; fullReset(); });
    bindSegment("clf-activation", "data-act", (v) => { hiddenAct = v; fullReset(); });

    const trainBtn = document.getElementById("clf-train");
    trainBtn.addEventListener("click", () => {
      running = !running;
      trainBtn.textContent = running ? "⏸ Pause" : "▶ Entraîner";
      trainBtn.classList.toggle("is-running", running);
    });
    document.getElementById("clf-reset").addEventListener("click", () => { fullReset(); });

    const lrSlider = document.getElementById("clf-lr");
    const lrOut = document.getElementById("clf-lr-val");
    lrSlider.addEventListener("input", () => (lrOut.textContent = parseFloat(lrSlider.value).toFixed(3)));
    lrOut.textContent = parseFloat(lrSlider.value).toFixed(3);

    loop();

    window.addEventListener("resize", debounce(() => {
      dim = fitCanvas(canvas); ldim = fitCanvas(lossCanvas);
    }, 200));
  })();
})();
