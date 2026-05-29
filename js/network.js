/* ============================================================
   NEURA — network.js
   1) Propagation avant animée dans un réseau multicouche.
   2) "Bille" de descente de gradient sur une courbe de perte.
   ============================================================ */
(function () {
  "use strict";
  const U = window.NeuraUtils;
  if (!U) return;
  const { fitCanvas, clamp, lerp, COLORS, debounce } = U;

  /* ============================================================
     1) PROPAGATION AVANT
     ============================================================ */
  (function forwardProp() {
    const canvas = document.getElementById("network-canvas");
    if (!canvas) return;
    let dim = fitCanvas(canvas);

    const SIZES = [4, 6, 6, 2];
    const sigmoid = (z) => 1 / (1 + Math.exp(-z));

    // Poids aléatoires fixes entre couches
    let weights = [];
    function initWeights() {
      weights = [];
      for (let l = 0; l < SIZES.length - 1; l++) {
        const m = [];
        for (let j = 0; j < SIZES[l + 1]; j++) {
          const row = [];
          for (let i = 0; i < SIZES[l]; i++) row.push(Math.random() * 2 - 1);
          m.push(row);
        }
        weights.push(m);
      }
    }
    initWeights();

    // Activations par couche
    let acts = SIZES.map((n) => new Array(n).fill(0));

    function forward(input) {
      acts[0] = input.slice();
      for (let l = 0; l < weights.length; l++) {
        const next = [];
        for (let j = 0; j < SIZES[l + 1]; j++) {
          let sum = 0;
          for (let i = 0; i < SIZES[l]; i++) sum += weights[l][j][i] * acts[l][i];
          next.push(sigmoid(sum));
        }
        acts[l + 1] = next;
      }
    }

    // Positions des noeuds
    function layout() {
      const { w, h } = dim;
      const padX = w * 0.1, padY = 30;
      const pos = [];
      for (let l = 0; l < SIZES.length; l++) {
        const x = lerp(padX, w - padX, l / (SIZES.length - 1));
        const col = [];
        const n = SIZES[l];
        for (let i = 0; i < n; i++) {
          const y = n === 1 ? h / 2 : lerp(padY, h - padY, i / (n - 1));
          col.push({ x, y });
        }
        pos.push(col);
      }
      return pos;
    }

    let wave = -1; // -1 = inactif
    const WAVE_SPEED = 0.018;
    const auto = document.getElementById("network-auto");
    let idleTimer = 0;

    function fire() {
      const input = [];
      for (let i = 0; i < SIZES[0]; i++) input.push(Math.random());
      forward(input);
      wave = 0;
    }

    function draw() {
      const { ctx, w, h } = dim;
      ctx.clearRect(0, 0, w, h);
      const pos = layout();
      const reveal = wave < 0 ? SIZES.length : wave; // fraction de couches révélées

      // arêtes
      for (let l = 0; l < weights.length; l++) {
        const seg = clamp(reveal - l, 0, 1); // progression de l'onde sur ce segment
        for (let j = 0; j < SIZES[l + 1]; j++) {
          for (let i = 0; i < SIZES[l]; i++) {
            const a = pos[l][i], b = pos[l + 1][j];
            const wgt = weights[l][j][i];
            const positive = wgt >= 0;
            const baseAlpha = clamp(Math.abs(wgt) * 0.5, 0.05, 0.55);
            ctx.strokeStyle = positive
              ? `rgba(34,211,238,${baseAlpha})`
              : `rgba(236,72,153,${baseAlpha})`;
            ctx.lineWidth = clamp(Math.abs(wgt) * 1.6, 0.4, 3);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            // impulsion qui traverse l'arête pendant le passage de l'onde
            if (wave >= 0 && seg > 0 && seg < 1) {
              const strength = acts[l][i];
              if (strength > 0.15) {
                const px = lerp(a.x, b.x, seg);
                const py = lerp(a.y, b.y, seg);
                ctx.beginPath();
                ctx.fillStyle = "rgba(255,255,255,.95)";
                ctx.shadowColor = positive ? COLORS.cyan : COLORS.magenta;
                ctx.shadowBlur = 8;
                ctx.arc(px, py, 1.6 + strength * 2.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
              }
            }
          }
        }
      }

      // noeuds
      for (let l = 0; l < SIZES.length; l++) {
        const lit = clamp(reveal - l, 0, 1);
        for (let i = 0; i < SIZES[l]; i++) {
          const p = pos[l][i];
          const a = acts[l][i] * lit;
          ctx.beginPath();
          ctx.fillStyle = "#0a0e1d";
          ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
          ctx.fill();
          // remplissage proportionnel à l'activation
          if (a > 0.02) {
            const t = clamp(a, 0, 1);
            ctx.beginPath();
            ctx.fillStyle = `rgba(${lerp(34,139,t)|0},${lerp(211,92,t)|0},${lerp(238,246,t)|0},${0.35 + t * 0.65})`;
            ctx.shadowColor = COLORS.cyan;
            ctx.shadowBlur = t * 16;
            ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "rgba(255,255,255,.22)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // étiquettes de couches
      const labels = ["Entrée", "Cachée", "Cachée", "Sortie"];
      ctx.fillStyle = COLORS.faint;
      ctx.font = "600 11px ui-monospace, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let l = 0; l < SIZES.length; l++) {
        ctx.fillText(labels[l] || ("L" + l), pos[l][0].x, h - 18);
      }
    }

    function loop() {
      if (wave >= 0) {
        wave += WAVE_SPEED;
        if (wave > SIZES.length + 0.4) wave = -1;
      } else {
        idleTimer++;
        if (auto && auto.checked && idleTimer > 90) { fire(); idleTimer = 0; }
      }
      draw();
      requestAnimationFrame(loop);
    }

    document.getElementById("network-fire").addEventListener("click", () => { fire(); idleTimer = 0; });

    fire();
    if (U.prefersReduced) { wave = -1; draw(); }
    else loop();

    window.addEventListener("resize", debounce(() => { dim = fitCanvas(canvas); draw(); }, 200));
  })();

  /* ============================================================
     2) BILLE DE DESCENTE DE GRADIENT
     ============================================================ */
  (function gradientBall() {
    const canvas = document.getElementById("gradient-canvas");
    if (!canvas) return;
    let dim = fitCanvas(canvas);

    const X_MIN = -4.6, X_MAX = 4.6;
    // perte : convexe globale + ondulations (minima locaux)
    const f = (x) => 0.16 * x * x + 0.75 * Math.sin(1.7 * x) + 1.2;
    const df = (x) => 0.32 * x + 0.75 * 1.7 * Math.cos(1.7 * x);

    let yMin = Infinity, yMax = -Infinity;
    for (let x = X_MIN; x <= X_MAX; x += 0.05) { const y = f(x); yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); }
    yMin -= 0.3; yMax += 0.3;

    let ball = { x: 0, trail: [], steps: 0, vy: 0 };
    const LR = 0.18;

    function reset() {
      ball = { x: lerp(X_MIN + 0.6, X_MAX - 0.6, Math.random()), trail: [], steps: 0 };
    }
    reset();

    function X(x) { const { w } = dim; const pad = 26; return pad + ((x - X_MIN) / (X_MAX - X_MIN)) * (w - 2 * pad); }
    function Y(y) { const { h } = dim; const pad = 22; return h - pad - ((y - yMin) / (yMax - yMin)) * (h - 2 * pad); }

    function draw() {
      const { ctx, w, h } = dim;
      ctx.clearRect(0, 0, w, h);

      // remplissage sous la courbe
      ctx.beginPath();
      ctx.moveTo(X(X_MIN), Y(f(X_MIN)));
      for (let x = X_MIN; x <= X_MAX; x += 0.04) ctx.lineTo(X(x), Y(f(x)));
      ctx.lineTo(X(X_MAX), h);
      ctx.lineTo(X(X_MIN), h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(139,92,246,.18)");
      grad.addColorStop(1, "rgba(139,92,246,0)");
      ctx.fillStyle = grad;
      ctx.fill();

      // courbe
      ctx.strokeStyle = COLORS.violet;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      let first = true;
      for (let x = X_MIN; x <= X_MAX; x += 0.03) { const px = X(x), py = Y(f(x)); first ? (ctx.moveTo(px, py), first = false) : ctx.lineTo(px, py); }
      ctx.stroke();

      // trace
      if (ball.trail.length > 1) {
        ctx.strokeStyle = "rgba(34,211,238,.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ball.trail.forEach((t, i) => { const px = X(t), py = Y(f(t)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
        ctx.stroke();
      }

      // vecteur gradient (tangente)
      const slope = df(ball.x);
      ctx.strokeStyle = "rgba(251,191,36,.8)";
      ctx.lineWidth = 2;
      const tx = 0.7;
      ctx.beginPath();
      ctx.moveTo(X(ball.x - tx), Y(f(ball.x) - slope * tx));
      ctx.lineTo(X(ball.x + tx), Y(f(ball.x) + slope * tx));
      ctx.stroke();

      // bille
      const bx = X(ball.x), by = Y(f(ball.x));
      ctx.beginPath();
      ctx.fillStyle = COLORS.cyan;
      ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 16;
      ctx.arc(bx, by - 7, 7, 0, Math.PI * 2);
      ctx.fill(); ctx.shadowBlur = 0;

      ctx.fillStyle = COLORS.faint;
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("perte L(θ)", 30, 10);
      ctx.textAlign = "right";
      ctx.fillText("θ", w - 28, by);
    }

    function loop() {
      const slope = df(ball.x);
      if (Math.abs(slope) > 0.002 && ball.steps < 400) {
        ball.x -= LR * slope;
        ball.x = clamp(ball.x, X_MIN, X_MAX);
        if (ball.steps % 2 === 0) ball.trail.push(ball.x);
        ball.steps++;
      }
      draw();
      requestAnimationFrame(loop);
    }

    document.getElementById("gradient-roll").addEventListener("click", reset);

    if (U.prefersReduced) { ball.x = 1.9; draw(); } // minimum proche
    else loop();

    window.addEventListener("resize", debounce(() => { dim = fitCanvas(canvas); draw(); }, 200));
  })();
})();
