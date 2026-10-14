// =====================================================
// GUIA-CHAPAS.JS — Encaixe de peças em chapas (à escala real, em mm)
// Todas as chapas ficam empilhadas na vertical; peças numeradas automaticamente.
// =====================================================
window.initGuiaChapas = function () {
  const KEY = "guiaChapas_v1", EPS = 0.01;
  const $ = (id) => document.getElementById(id);
  const PRESETS = [[3200, 1600], [3200, 1400], [3000, 1500], [3000, 1000]];

  let st = { slabs: [{ id: "c1", w: 3200, h: 1600 }], pieces: [], seq: 0 };
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.pieces)) {
      if (s.slabs && s.slabs.length) st = Object.assign(st, s);
      else if (s.slab) { // formato antigo (1 só chapa)
        st.slabs = [{ id: "c1", w: s.slab.w, h: s.slab.h }]; st.pieces = s.pieces; st.seq = s.seq || 0;
        st.pieces.forEach((p) => { if (p.placed) p.s = "c1"; });
      }
    }
  } catch (e) {}
  delete st.cur;

  let scale = 0.3, sel = null, drag = null, msgT, lastClk = {}, lastSid = st.slabs[0].id;

  const slabById = (id) => st.slabs.find((s) => s.id === id);
  const slabEl = (id) => $("gcSlabs") && $("gcSlabs").querySelector(`.gc-slab[data-sid="${id}"]`);
  const num = (p) => st.pieces.indexOf(p) + 1;      // número = posição na lista (renumera sozinho)
  const nome = (p) => "Nº" + num(p);

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  // Sem unidade = metros; aceita mm, cm, m e vírgula.
  const parse = (v) => {
    let s = String(v || "").trim().toLowerCase().replace(",", "."), m = 1000;
    if (!s) return NaN;
    if (/mm$/.test(s)) { m = 1; s = s.slice(0, -2); }
    else if (/cm$/.test(s)) { m = 10; s = s.slice(0, -2); }
    else if (/m$/.test(s)) { m = 1000; s = s.slice(0, -1); }
    const n = parseFloat(s);
    return isNaN(n) ? NaN : n * m;
  };
  const fmt = (mm) => {
    const r = Math.round(mm * 10) / 10;
    if (r >= 1000) return (r / 1000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",") + " m";
    return (r / 10).toFixed(1).replace(/\.0$/, "").replace(".", ",") + " cm";
  };
  const presetLabel = (q) => (q[0] / 1000).toFixed(2).replace(".", ",") + " × " + (q[1] / 1000).toFixed(2).replace(".", ",") + " m";
  const msg = (t) => {
    const el = $("gcMsg"); if (!el) return;
    el.textContent = t; el.className = "small text-danger";
    clearTimeout(msgT); msgT = setTimeout(() => { if (el) el.textContent = ""; }, 3500);
  };

  // ---------- Geometria ----------
  const placed = (sid, skip) => st.pieces.filter((o) => o.placed && o.s === sid && o.id !== skip);
  const valid = (p, s, x, y) => {
    if (!s) return false;
    if (x < -EPS || y < -EPS || x + p.w > s.w + EPS || y + p.h > s.h + EPS) return false;
    return !placed(s.id, p.id).some((o) => x < o.x + o.w - EPS && x + p.w > o.x + EPS && y < o.y + o.h - EPS && y + p.h > o.y + EPS);
  };
  const pick = (v, c, T) => {
    let b = v, d = T;
    c.forEach((t) => { const k = Math.abs(t - v); if (k <= d) { d = k; b = t; } });
    return b;
  };
  const snapPos = (p, s, x, y) => {
    const xs = [0, s.w - p.w], ys = [0, s.h - p.h], T = 12 / scale;
    placed(s.id, p.id).forEach((q) => {
      xs.push(q.x + q.w, q.x - p.w, q.x, q.x + q.w - p.w);
      ys.push(q.y + q.h, q.y - p.h, q.y, q.y + q.h - p.h);
    });
    return [Math.round(pick(x, xs, T) * 100) / 100, Math.round(pick(y, ys, T) * 100) / 100];
  };

  // ---------- Desenho ----------
  const color = (p) => `hsl(${p.hue},60%,80%)`;
  const label = (p) => `<b>${nome(p)}</b><span>${fmt(p.w)} × ${fmt(p.h)}</span>`;

  // Estrutura: um bloco por chapa, empilhados de cima para baixo
  function buildSlabs() {
    const box = $("gcSlabs"); if (!box) return;
    box.innerHTML = st.slabs.map((s, i) => {
      const isPre = PRESETS.some((q) => q[0] === s.w && q[1] === s.h);
      return `<div class="gc-block" data-sid="${s.id}">
        <div class="gc-bhead">
          <b>Chapa ${i + 1}</b>
          <select class="form-select form-select-sm gc-bsel" data-f="preset">
            ${PRESETS.map((q) => `<option value="${PRESETS.indexOf(q)}" ${q[0] === s.w && q[1] === s.h ? "selected" : ""}>${presetLabel(q)}</option>`).join("")}
            <option value="custom" ${isPre ? "" : "selected"}>Outro tamanho…</option>
          </select>
          <input class="form-control form-control-sm gc-bin" data-f="w" value="${(s.w / 1000).toFixed(3)}" title="Comprimento">
          <span>×</span>
          <input class="form-control form-control-sm gc-bin" data-f="h" value="${(s.h / 1000).toFixed(3)}" title="Largura">
          <span class="small text-muted ms-auto" data-stat></span>
          ${st.slabs.length > 1 ? '<button class="btn btn-sm btn-outline-danger" data-act="delslab" title="Apagar esta chapa"><i class="bi bi-trash"></i></button>' : ""}
        </div>
        <div class="gc-slabwrap">
          <div class="gc-lbl-w"></div><div class="gc-lbl-h"></div>
          <div class="gc-slab" data-sid="${s.id}"></div>
        </div>
      </div>`;
    }).join("");
  }

  function layout() {
    const stage = $("gcStage"); if (!stage) return;
    const availW = Math.max(300, stage.clientWidth - 70), availH = Math.max(300, window.innerHeight - 280);
    const maxW = Math.max(...st.slabs.map((s) => s.w)), maxH = Math.max(...st.slabs.map((s) => s.h));
    const GAP = 48, MIN = 0.15; // MIN = escala mínima aceitável (abaixo disto passa a 1 por linha)
    let cols = st.slabs.length > 1 ? 2 : 1;
    const calc = (c) => Math.min((availW - (c - 1) * GAP) / c / maxW, availH / maxH);
    scale = calc(cols);
    if (cols === 2 && scale < MIN) { cols = 1; scale = calc(1); } // ecrã estreito: 1 por linha
    const box = $("gcSlabs");
    box.style.display = "grid";
    box.style.gridTemplateColumns = `repeat(${cols}, max-content)`;
    box.style.gap = `44px ${GAP}px`;
    box.style.alignItems = "start";
    st.slabs.forEach((s) => {
      const el = slabEl(s.id); if (!el) return;
      const blk = el.closest(".gc-block"), g = 100 * scale;
      blk.style.width = s.w * scale + 4 + "px";
      el.style.width = s.w * scale + "px";
      el.style.height = s.h * scale + "px";
      el.style.backgroundImage = "linear-gradient(#0000000f 1px,transparent 1px),linear-gradient(90deg,#0000000f 1px,transparent 1px)";
      el.style.backgroundSize = g + "px " + g + "px";
      blk.querySelector(".gc-lbl-w").textContent = fmt(s.w);
      blk.querySelector(".gc-lbl-h").textContent = fmt(s.h);
    });
  }

  function renderPieces() {
    st.slabs.forEach((s) => {
      const el = slabEl(s.id); if (!el) return;
      el.innerHTML = "";
      placed(s.id, drag ? drag.p.id : null).forEach((p) => {
        const d = document.createElement("div");
        d.className = "gc-piece" + (p.id === sel ? " sel" : "");
        d.dataset.id = p.id;
        d.style.cssText = `left:${p.x * scale}px;top:${p.y * scale}px;width:${p.w * scale}px;height:${p.h * scale}px;background:${color(p)}`;
        if (p.w * scale < 70 || p.h * scale < 34) d.style.fontSize = "10px";
        d.title = `${nome(p)}: ${fmt(p.w)} × ${fmt(p.h)}`;
        d.innerHTML = label(p);
        el.appendChild(d);
      });
    });
  }

  function renderList() {
    const un = st.pieces.filter((p) => !p.placed);
    $("gcList").innerHTML = un.length
      ? un.map((p) => {
          const big = !st.slabs.some((s) => (p.w <= s.w && p.h <= s.h) || (p.h <= s.w && p.w <= s.h));
          return `<div class="gc-item" data-id="${p.id}"><span class="gc-sw" style="background:${color(p)}"></span>
            <div class="flex-grow-1 text-truncate"><b>${nome(p)}</b>
            <div class="small ${big ? "text-danger" : "text-muted"}">${fmt(p.w)} × ${fmt(p.h)}${big ? " — não cabe em nenhuma chapa" : ""}</div></div>
            <button class="btn btn-sm btn-light" data-act="rot" title="Rodar"><i class="bi bi-arrow-repeat"></i></button>
            <button class="btn btn-sm btn-light" data-act="del" title="Apagar"><i class="bi bi-x-lg"></i></button></div>`;
        }).join("")
      : '<div class="small text-muted">Sem peças por colocar.</div>';

    const m2 = (v) => (v / 1e6).toFixed(2).replace(".", ",");
    st.slabs.forEach((s) => {
      const blk = $("gcSlabs").querySelector(`.gc-block[data-sid="${s.id}"]`); if (!blk) return;
      const pl = placed(s.id), area = pl.reduce((a, p) => a + p.w * p.h, 0), tot = s.w * s.h;
      blk.querySelector("[data-stat]").textContent = `${pl.length} peça(s) · ${m2(area)} de ${m2(tot)} m² (${((area / tot) * 100).toFixed(1).replace(".", ",")}%)`;
    });
    const nPl = st.pieces.length - un.length;
    $("gcStats").innerHTML = `${st.pieces.length} peça(s) no total<br>${nPl} colocadas · ${un.length} por colocar`;
  }

  const syncNew = () => {
    const l = st.slabs[st.slabs.length - 1];
    $("gcNW").value = (l.w / 1000).toFixed(3);
    $("gcNH").value = (l.h / 1000).toFixed(3);
    const i = PRESETS.findIndex((q) => q[0] === l.w && q[1] === l.h);
    $("gcNPreset").value = i < 0 ? "custom" : i;
  };

  const renderAll = () => { buildSlabs(); layout(); renderPieces(); renderList(); save(); };

  function applySlab(id, w, h) {
    const s = slabById(id);
    if (!(w > 0 && h > 0)) { msg("Medida da chapa inválida."); renderAll(); return; }
    s.w = w; s.h = h;
    let out = 0;
    st.pieces.forEach((p) => { if (p.placed && p.s === id && (p.x + p.w > w + EPS || p.y + p.h > h + EPS)) { p.placed = false; p.s = null; out++; } });
    if (out) msg(`${out} peça(s) já não cabiam e voltaram para a lista.`);
    renderAll(); syncNew();
  }

  // ---------- Arrastar ----------
  function begin(e, p, fromSlab) {
    if (e.button !== 0) return;
    e.preventDefault();
    const sid = fromSlab ? p.s : (slabById(lastSid) ? lastSid : st.slabs[0].id);
    let offx = p.w / 2, offy = p.h / 2;
    if (fromSlab) {
      const el = slabEl(p.s), r = el.getBoundingClientRect();
      offx = (e.clientX - r.left - el.clientLeft) / scale - p.x;
      offy = (e.clientY - r.top - el.clientTop) / scale - p.y;
    }
    drag = {
      p, fromSlab, sid, sx: e.clientX, sy: e.clientY, moved: false, ev: e, ok: false, pos: null,
      from: { x: p.x, y: p.y, w: p.w, h: p.h, placed: p.placed, s: p.s },
      offx, offy, ghost: document.createElement("div"),
    };
    drag.ghost.className = "gc-piece gc-ghost";
    sel = p.id;
    renderPieces();
    slabEl(sid).appendChild(drag.ghost);
    move(e);
  }

  function move(e) {
    if (!drag || !$("gcSlabs")) return;
    drag.ev = e;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 3) drag.moved = true;
    const p = drag.p;

    // chapa que está debaixo do rato
    if (drag.moved || !drag.fromSlab) {
      let hit = null;
      st.slabs.forEach((s) => {
        const el = slabEl(s.id); if (!el || hit) return;
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) hit = s.id;
      });
      if (hit && hit !== drag.sid) { drag.sid = hit; slabEl(hit).appendChild(drag.ghost); }
    }

    const s = slabById(drag.sid), el = slabEl(drag.sid), r = el.getBoundingClientRect();
    let x = (e.clientX - r.left - el.clientLeft) / scale - drag.offx;
    let y = (e.clientY - r.top - el.clientTop) / scale - drag.offy;
    if (drag.fromSlab && !drag.moved) { x = drag.from.x; y = drag.from.y; }
    else [x, y] = snapPos(p, s, x, y);
    drag.pos = [x, y];
    drag.ok = valid(p, s, x, y);
    const g = drag.ghost;
    g.style.cssText = `left:${x * scale}px;top:${y * scale}px;width:${p.w * scale}px;height:${p.h * scale}px;background:${color(p)}`;
    g.classList.toggle("gc-bad", !drag.ok);
    g.innerHTML = label(p);
  }

  function end() {
    if (!drag) return;
    const d = drag; drag = null; d.ghost.remove();
    const click = d.fromSlab && !d.moved;
    if (!click && d.ok) {
      d.p.x = d.pos[0]; d.p.y = d.pos[1]; d.p.placed = true; d.p.s = d.sid; lastSid = d.sid;
    } else {
      Object.assign(d.p, d.from);
      if (!click && d.pos) msg("Não cabe aí: a peça sobrepõe outra ou sai da chapa.");
    }
    if (click) {
      const now = Date.now();
      if (lastClk.id === d.p.id && now - lastClk.t < 350) { d.p.placed = false; d.p.s = null; sel = null; }
      lastClk = { id: d.p.id, t: now };
    }
    renderAll();
  }

  function rotate(p) {
    if (!p) return;
    [p.w, p.h] = [p.h, p.w];
    if (drag && drag.p === p) {
      if (!drag.fromSlab) { drag.offx = p.w / 2; drag.offy = p.h / 2; }
      move(drag.ev); return;
    }
    if (p.placed && !valid(p, slabById(p.s), p.x, p.y)) { [p.w, p.h] = [p.h, p.w]; msg("Não cabe rodada nesse sítio."); return; }
    renderAll();
  }

  const selected = () => (drag ? drag.p : st.pieces.find((q) => q.id === sel));
  const unplace = (p) => { if (p && p.placed) { p.placed = false; p.s = null; sel = null; renderAll(); } };
  const delPiece = (p) => { if (!p) return; st.pieces = st.pieces.filter((q) => q !== p); sel = null; renderAll(); }; // as restantes renumeram sozinhas

  // ---------- Eventos ----------
  if (window.__gcOff) window.__gcOff();
  const onKey = (e) => {
    if (!$("gcSlabs") || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const p = selected();
    if (!p) return;
    if (e.key === "r" || e.key === "R") { e.preventDefault(); rotate(p); }
    else if ((e.key === "Delete" || e.key === "Backspace") && !drag) { e.preventDefault(); unplace(p); }
  };
  const onResize = () => { if ($("gcSlabs")) { layout(); renderPieces(); } };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", onResize);
  window.__gcOff = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
  };

  $("gcList").addEventListener("pointerdown", (e) => {
    const it = e.target.closest(".gc-item"); if (!it) return;
    const p = st.pieces.find((q) => q.id === it.dataset.id); if (!p) return;
    const b = e.target.closest("button");
    if (b) {
      if (b.dataset.act === "rot") rotate(p);
      else delPiece(p);
      return;
    }
    begin(e, p, false);
  });

  $("gcSlabs").addEventListener("pointerdown", (e) => {
    const el = e.target.closest(".gc-piece"); if (!el) return;
    const p = st.pieces.find((q) => q.id === el.dataset.id);
    if (p) begin(e, p, true);
  });

  // Tamanho de cada chapa (no cabeçalho de cada uma)
  $("gcSlabs").addEventListener("change", (e) => {
    const blk = e.target.closest(".gc-block"); if (!blk) return;
    const id = blk.dataset.sid, f = e.target.dataset.f;
    if (f === "preset") {
      if (e.target.value === "custom") { blk.querySelector('[data-f="w"]').focus(); return; }
      applySlab(id, PRESETS[e.target.value][0], PRESETS[e.target.value][1]);
    } else if (f === "w" || f === "h") {
      applySlab(id, parse(blk.querySelector('[data-f="w"]').value), parse(blk.querySelector('[data-f="h"]').value));
    }
  });

  $("gcSlabs").addEventListener("click", (e) => {
    const b = e.target.closest('[data-act="delslab"]'); if (!b) return;
    const id = b.closest(".gc-block").dataset.sid;
    const n = placed(id).length;
    if (n && !confirm(`Apagar esta chapa? As ${n} peças voltam para a lista.`)) return;
    st.pieces.forEach((p) => { if (p.s === id) { p.placed = false; p.s = null; } });
    st.slabs = st.slabs.filter((s) => s.id !== id);
    sel = null; renderAll(); syncNew();
  });

  // Nova chapa: escolhe o tamanho e fica por baixo das outras
  $("gcNPreset").onchange = (e) => {
    const v = e.target.value;
    if (v !== "custom") { $("gcNW").value = (PRESETS[v][0] / 1000).toFixed(3); $("gcNH").value = (PRESETS[v][1] / 1000).toFixed(3); }
    else $("gcNW").focus();
  };
  const addSlab = () => {
    const w = parse($("gcNW").value), h = parse($("gcNH").value);
    if (!(w > 0 && h > 0)) return msg("Medida da nova chapa inválida.");
    const id = "c" + Date.now().toString(36);
    st.slabs.push({ id, w, h });
    renderAll();
    const blk = $("gcSlabs").querySelector(`.gc-block[data-sid="${id}"]`);
    if (blk) blk.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  $("gcAddSlab").onclick = addSlab;
  $("gcNW").onkeydown = $("gcNH").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); addSlab(); } };

  // Adicionar peças (sem nome: Nº1, Nº2, ... automático)
  $("gcAddForm").onsubmit = (e) => {
    e.preventDefault();
    const w = parse($("gcPW").value), h = parse($("gcPH").value);
    const q = Math.min(200, Math.max(1, parseInt($("gcPQ").value) || 1));
    if (!(w > 0 && h > 0)) return msg("Medidas da peça inválidas.");
    const hue = (st.seq++ * 47) % 360;
    for (let i = 0; i < q; i++) {
      st.pieces.push({ id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), w, h, x: 0, y: 0, placed: false, s: null, hue });
    }
    e.target.reset();
    renderAll();
    $("gcPW").focus();
  };
  $("gcPW").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); $("gcPH").focus(); } };

  $("gcRot").onclick = () => rotate(selected());
  $("gcUnplace").onclick = () => unplace(selected());
  $("gcDelPiece").onclick = () => delPiece(selected());
  $("gcClearSlab").onclick = () => { st.pieces.forEach((p) => { p.placed = false; p.s = null; }); sel = null; renderAll(); };
  $("gcClearAll").onclick = () => {
    if (confirm("Apagar todas as peças?")) { st.pieces = []; st.seq = 0; sel = null; renderAll(); }
  };

  renderAll();
  syncNew();
};