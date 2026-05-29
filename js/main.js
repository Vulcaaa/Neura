/* ============================================================
   NEURA — main.js
   Navigation, progression, révélations au scroll, fond animé du hero.
   Expose quelques utilitaires partagés sur window.NeuraUtils.
   ============================================================ */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Utilitaires partagés ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function fitCanvas(canvas) {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h, dpr };
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, arguments), ms);
    };
  }

  // Couleurs accent réutilisées par les démos
  const COLORS = {
    cyan: "#22d3ee", violet: "#8b5cf6", magenta: "#ec4899",
    green: "#34d399", amber: "#fbbf24", red: "#f87171",
    dim: "#9aa6c9", faint: "#6b769b", text: "#e8edfb",
  };

  window.NeuraUtils = { clamp, lerp, fitCanvas, debounce, prefersReduced, COLORS };

  /* ---------- Barre de progression de lecture ---------- */
  const progress = document.getElementById("reading-progress");
  function updateProgress() {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    progress.style.width = (max > 0 ? (scrolled / max) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  /* ---------- Nav : ombre au scroll + menu mobile ---------- */
  const nav = document.getElementById("nav");
  const burger = document.getElementById("nav-burger");
  const links = document.querySelector(".nav__links");

  window.addEventListener("scroll", () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 20);
  }, { passive: true });

  burger.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
  });
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    })
  );

  /* ---------- Points de navigation latéraux ---------- */
  const sectionMeta = [
    { id: "accueil", label: "Accueil" },
    { id: "introduction", label: "Fondations" },
    { id: "neurone", label: "Le neurone" },
    { id: "reseaux", label: "Réseaux" },
    { id: "supervise", label: "Supervisé" },
    { id: "renforcement", label: "Renforcement" },
    { id: "applications", label: "Applications" },
    { id: "ressources", label: "Ressources" },
  ];
  const dotsWrap = document.getElementById("section-dots");
  const dotMap = {};
  sectionMeta.forEach((s) => {
    const el = document.getElementById(s.id);
    if (!el) return;
    const b = document.createElement("button");
    b.setAttribute("data-label", s.label);
    b.setAttribute("aria-label", s.label);
    b.addEventListener("click", () => el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" }));
    dotsWrap.appendChild(b);
    dotMap[s.id] = b;
  });

  /* ---------- Liens nav actifs + dots actifs ---------- */
  const navLinkMap = {};
  document.querySelectorAll(".nav__links a").forEach((a) => {
    const id = a.getAttribute("href").slice(1);
    navLinkMap[id] = a;
  });

  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = e.target.id;
        Object.values(dotMap).forEach((d) => d.classList.remove("is-active"));
        Object.values(navLinkMap).forEach((l) => l.classList.remove("is-active"));
        if (dotMap[id]) dotMap[id].classList.add("is-active");
        if (navLinkMap[id]) navLinkMap[id].classList.add("is-active");
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sectionMeta.forEach((s) => {
    const el = document.getElementById(s.id);
    if (el) spy.observe(el);
  });

  /* ---------- Révélations au scroll ---------- */
  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  /* ---------- Compteurs animés du hero ---------- */
  const counters = document.querySelectorAll(".hero__stat-num");
  let counted = false;
  function runCounters() {
    if (counted) return;
    counted = true;
    counters.forEach((el) => {
      const target = parseInt(el.getAttribute("data-count"), 10) || 0;
      if (prefersReduced || target === 0) { el.textContent = String(target); return; }
      let start = null;
      const dur = 1100;
      function tick(ts) {
        if (start === null) start = ts;
        const p = Math.min(1, (ts - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }
  setTimeout(runCounters, 500);

  /* ============================================================
     FOND ANIMÉ DU HERO — réseau de particules connectées
     ============================================================ */
  (function heroNetwork() {
    const canvas = document.getElementById("hero-canvas");
    if (!canvas) return;
    let dim = fitCanvas(canvas);
    let ctx = dim.ctx;

    const COUNT = window.innerWidth < 720 ? 36 : 64;
    const LINK_DIST = 150;
    let nodes = [];
    const mouse = { x: -9999, y: -9999 };

    function seed() {
      nodes = [];
      for (let i = 0; i < COUNT; i++) {
        nodes.push({
          x: Math.random() * dim.w,
          y: Math.random() * dim.h,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.8 + 1.2,
          hue: Math.random(),
        });
      }
    }
    seed();

    // Quelques impulsions qui voyagent le long des liens
    const pulses = [];
    function spawnPulse() {
      if (nodes.length < 2) return;
      const a = nodes[(Math.random() * nodes.length) | 0];
      const b = nodes[(Math.random() * nodes.length) | 0];
      if (a === b) return;
      pulses.push({ a, b, t: 0, speed: 0.012 + Math.random() * 0.02 });
    }

    function accent(h) {
      // interpole cyan → violet → magenta
      if (h < 0.5) {
        const t = h / 0.5;
        return `rgba(${lerp(34, 139, t) | 0},${lerp(211, 92, t) | 0},${lerp(238, 246, t) | 0}`;
      }
      const t = (h - 0.5) / 0.5;
      return `rgba(${lerp(139, 236, t) | 0},${lerp(92, 72, t) | 0},${lerp(246, 153, t) | 0}`;
    }

    let raf;
    function frame() {
      ctx.clearRect(0, 0, dim.w, dim.h);

      // déplacement
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > dim.w) n.vx *= -1;
        if (n.y < 0 || n.y > dim.h) n.vy *= -1;
        // légère attraction vers la souris
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 200 * 200) {
          n.vx += dx * 0.00002;
          n.vy += dy * 0.00002;
        }
        n.vx = clamp(n.vx, -0.7, 0.7);
        n.vy = clamp(n.vy, -0.7, 0.7);
      }

      // liens
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.5;
            ctx.strokeStyle = accent((a.hue + b.hue) / 2) + `,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // impulsions
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.speed;
        if (p.t >= 1) { pulses.splice(i, 1); continue; }
        const x = lerp(p.a.x, p.b.x, p.t);
        const y = lerp(p.a.y, p.b.y, p.t);
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.shadowColor = COLORS.cyan;
        ctx.shadowBlur = 12;
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // noeuds
      for (const n of nodes) {
        ctx.beginPath();
        ctx.fillStyle = accent(n.hue) + ",0.9)";
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (Math.random() < 0.04) spawnPulse();
      raf = requestAnimationFrame(frame);
    }

    if (prefersReduced) {
      // rendu statique unique
      frame();
      cancelAnimationFrame(raf);
    } else {
      frame();
    }

    canvas.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

    window.addEventListener("resize", debounce(() => {
      dim = fitCanvas(canvas);
      ctx = dim.ctx;
      seed();
    }, 200));
  })();
})();
