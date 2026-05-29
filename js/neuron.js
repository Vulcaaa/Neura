/* ============================================================
   NEURA — neuron.js
   Neurone interactif : somme pondérée + fonction d'activation,
   avec schéma animé et tracé de la fonction d'activation.
   ============================================================ */
(function () {
  "use strict";
  const U = window.NeuraUtils;
  if (!U) return;
  const { fitCanvas, clamp, lerp, COLORS, debounce } = U;

  const canvas = document.getElementById("neuron-canvas");
  const actCanvas = document.getElementById("activation-canvas");
  if (!canvas || !actCanvas) return;

  let dim = fitCanvas(canvas);
  let adim = fitCanvas(actCanvas);

  /* ---------- Fonctions d'activation ---------- */
  const ACT = {
    sigmoid: { fn: (z) => 1 / (1 + Math.exp(-z)), name: "σ" },
    tanh: { fn: (z) => Math.tanh(z), name: "tanh" },
    relu: { fn: (z) => Math.max(0, z), name: "ReLU" },
    leaky: { fn: (z) => (z > 0 ? z : 0.1 * z), name: "Leaky" },
  };
  let actKey = "sigmoid";

  /* ---------- Lecture des contrôles ---------- */
  const ids = ["x1", "x2", "x3", "w1", "w2", "w3", "bias"];
  const inputs = {};
  ids.forEach((id) => (inputs[id] = document.getElementById(id)));

  function val(id) { return parseFloat(inputs[id].value); }

  function setOut(id, v, digits) {
    const o = document.getElementById(id + "-val");
    if (o) o.textContent = v.toFixed(digits === undefined ? 2 : digits);
  }

  function compute() {
    const x = [val("x1"), val("x2"), val("x3")];
    const w = [val("w1"), val("w2"), val("w3")];
    const b = val("bias");
    const z = x[0] * w[0] + x[1] * w[1] + x[2] * w[2] + b;
    const a = ACT[actKey].fn(z);
    return { x, w, b, z, a };
  }

  function refreshNumbers() {
    ["x1", "x2", "x3", "w1", "w2", "w3", "bias"].forEach((id) => setOut(id, val(id)));
    const s = compute();
    document.getElementById("neuron-z").textContent = s.z.toFixed(2);
    document.getElementById("neuron-output").textContent = s.a.toFixed(2);
    document.getElementById("neuron-act-name").textContent = ACT[actKey].name;
  }

  ids.forEach((id) => inputs[id].addEventListener("input", refreshNumbers));

  /* ---------- Contrôle segmenté de l'activation ---------- */
  const seg = document.getElementById("neuron-activation");
  seg.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      seg.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      actKey = btn.getAttribute("data-act");
      refreshNumbers();
    });
  });

  /* ---------- Couleur d'activation ---------- */
  function actColor(a) {
    // -1 (magenta) → 0 (gris) → 1 (cyan), borné
    const t = clamp((a + 1) / 2, 0, 1);
    const r = lerp(236, 34, t), g = lerp(72, 211, t), bl = lerp(153, 238, t);
    return `rgb(${r | 0},${g | 0},${bl | 0})`;
  }

  /* ---------- Schéma du neurone ---------- */
  let flow = 0;
  function drawNeuron() {
    const { ctx, w, h } = dim;
    ctx.clearRect(0, 0, w, h);
    const s = compute();

    const inX = w * 0.16;
    const outX = w * 0.84;
    const cx = w * 0.52, cy = h * 0.5;
    const inYs = [h * 0.26, h * 0.5, h * 0.74];
    const labels = ["x₁", "x₂", "x₃"];

    // connexions entrée → neurone
    for (let i = 0; i < 3; i++) {
      const wgt = s.w[i];
      const positive = wgt >= 0;
      const lw = clamp(Math.abs(wgt) * 2.4, 0.6, 6);
      ctx.strokeStyle = positive
        ? `rgba(34,211,238,${clamp(Math.abs(wgt) / 2, 0.18, 0.95)})`
        : `rgba(236,72,153,${clamp(Math.abs(wgt) / 2, 0.18, 0.95)})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(inX + 16, inYs[i]);
      ctx.lineTo(cx - 34, cy);
      ctx.stroke();

      // étiquette du poids
      ctx.fillStyle = positive ? COLORS.cyan : COLORS.magenta;
      ctx.font = "600 11px ui-monospace, monospace";
      ctx.textAlign = "center";
      const mx = lerp(inX + 16, cx - 34, 0.5);
      const my = lerp(inYs[i], cy, 0.5) - 8;
      ctx.fillText("w=" + wgt.toFixed(1), mx, my);

      // point de flux animé (intensité ~ |x*w|)
      const intensity = clamp(Math.abs(s.x[i] * wgt), 0.05, 1);
      const t = (flow * (0.4 + intensity) + i * 0.33) % 1;
      const px = lerp(inX + 16, cx - 34, t);
      const py = lerp(inYs[i], cy, t);
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.shadowColor = positive ? COLORS.cyan : COLORS.magenta;
      ctx.shadowBlur = 10;
      ctx.arc(px, py, 2 + intensity * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // noeuds d'entrée
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.fillStyle = "#0e1430";
      ctx.strokeStyle = "rgba(255,255,255,.25)";
      ctx.lineWidth = 1.5;
      ctx.arc(inX, inYs[i], 16, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = COLORS.text;
      ctx.font = "600 12px ui-monospace, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(labels[i], inX, inYs[i] - 1);
      ctx.fillStyle = COLORS.dim;
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText(s.x[i].toFixed(1), inX, inYs[i] + 26);
    }

    // biais
    ctx.fillStyle = COLORS.magenta;
    ctx.font = "600 11px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("b=" + s.b.toFixed(1), cx - 4, cy - 52);

    // neurone central (halo proportionnel à l'activation)
    const glow = clamp(Math.abs(s.a), 0, 1.5);
    ctx.beginPath();
    ctx.fillStyle = actColor(s.a);
    ctx.shadowColor = actColor(s.a);
    ctx.shadowBlur = 12 + glow * 22;
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // symbole Σ
    ctx.fillStyle = "#06121a";
    ctx.font = "700 22px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Σ", cx, cy + 1);

    // sortie
    ctx.strokeStyle = "rgba(255,255,255,.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 32, cy);
    ctx.lineTo(outX - 6, cy);
    ctx.stroke();
    // flèche
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.beginPath();
    ctx.moveTo(outX - 6, cy); ctx.lineTo(outX - 16, cy - 5); ctx.lineTo(outX - 16, cy + 5);
    ctx.closePath(); ctx.fill();

    // pastille de sortie
    ctx.beginPath();
    ctx.fillStyle = actColor(s.a);
    ctx.arc(outX + 14, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#06121a";
    ctx.font = "700 12px ui-monospace, monospace";
    ctx.fillText(s.a.toFixed(2), outX + 14, cy + 1);
    ctx.fillStyle = COLORS.dim;
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillText("a", outX + 14, cy - 30);
  }

  /* ---------- Tracé de la fonction d'activation ---------- */
  function drawActivation() {
    const { ctx, w, h } = adim;
    ctx.clearRect(0, 0, w, h);
    const pad = 10;
    const s = compute();
    const fn = ACT[actKey].fn;

    const xMin = -6, xMax = 6;
    // échantillonnage + auto-échelle Y
    const N = 120;
    const pts = [];
    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i <= N; i++) {
      const xv = lerp(xMin, xMax, i / N);
      const yv = fn(xv);
      pts.push([xv, yv]);
      yMin = Math.min(yMin, yv); yMax = Math.max(yMax, yv);
    }
    const zc = clamp(s.z, xMin, xMax);
    yMin = Math.min(yMin, s.a); yMax = Math.max(yMax, s.a);
    const padY = (yMax - yMin) * 0.12 + 0.05;
    yMin -= padY; yMax += padY;

    const X = (xv) => pad + ((xv - xMin) / (xMax - xMin)) * (w - 2 * pad);
    const Y = (yv) => h - pad - ((yv - yMin) / (yMax - yMin)) * (h - 2 * pad);

    // axes
    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 1;
    if (yMin < 0 && yMax > 0) {
      ctx.beginPath(); ctx.moveTo(pad, Y(0)); ctx.lineTo(w - pad, Y(0)); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(X(0), pad); ctx.lineTo(X(0), h - pad); ctx.stroke();

    // courbe
    ctx.strokeStyle = COLORS.violet;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    pts.forEach((p, i) => { const cx = X(p[0]), cy = Y(p[1]); i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy); });
    ctx.stroke();

    // point courant (z, a)
    const px = X(zc), py = Y(s.a);
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = "rgba(34,211,238,.5)";
    ctx.beginPath(); ctx.moveTo(px, h - pad); ctx.lineTo(px, py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(0), py); ctx.lineTo(px, py); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.fillStyle = COLORS.cyan;
    ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 10;
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill(); ctx.shadowBlur = 0;

    ctx.fillStyle = COLORS.faint;
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("z", w - pad - 8, Y(0) + 4);
  }

  /* ---------- Boucle ---------- */
  function loop() {
    flow = (flow + 0.012) % 1;
    drawNeuron();
    drawActivation();
    requestAnimationFrame(loop);
  }

  refreshNumbers();
  if (U.prefersReduced) { drawNeuron(); drawActivation(); }
  else loop();

  window.addEventListener("resize", debounce(() => {
    dim = fitCanvas(canvas);
    adim = fitCanvas(actCanvas);
    if (U.prefersReduced) { drawNeuron(); drawActivation(); }
  }, 200));
})();
