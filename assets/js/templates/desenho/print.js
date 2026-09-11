const NE_TIPO_LABEL = {
  chapa: "Chapa",
  sobra: "Sobra",
  entrega_material: "Pedir Material",
};

const NE_ESTADO_LABEL = {
  por_acabar: "Por acabar",
  desenho_pronto: "Desenho pronto",
  pronto: "Pronto",
  entregue: "Entregue",
};
window.NE_ESTADO_LABEL = NE_ESTADO_LABEL;

const NE_ESTADO_BADGE_CLASS = {
  por_acabar: "text-bg-warning",
  desenho_pronto: "text-bg-info",
  pronto: "text-bg-success",
  entregue: "text-bg-secondary",
};
window.NE_ESTADO_BADGE_CLASS = NE_ESTADO_BADGE_CLASS;

// Cores vibrantes (hex) para o badge de estado clicável na lista
const NE_ESTADO_BADGE_COLOR = {
  por_acabar: "#ff3b30",
  desenho_pronto: "#0a84ff",
  pronto: "#30d158",
  entregue: "#af52de",
};
window.NE_ESTADO_BADGE_COLOR = NE_ESTADO_BADGE_COLOR;


const NE_P_MARGIN_L = 8;
const NE_P_MARGIN_T = 8;
const NE_P_MARGIN_R = 6;
const NE_P_MARGIN_B = 6;

function neEscapeXml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function neFormatDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("pt-PT");
  } catch {
    return d;
  }
}

function neNiceScaleAtLeastP(x) {
  const base = [1, 2, 2.5, 5];
  let mult = 1;
  for (let guard = 0; guard < 40; guard++) {
    for (const b of base) {
      const v = b * mult;
      if (v >= x) return v;
    }
    mult *= 10;
  }
  return x;
}

function neBBoxOf(shapes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const consider = (x, y) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  };
   shapes.forEach((s) => {
        if (s.type === "rect" || !s.type) {
      consider(s.x, s.y); consider(s.x + s.w, s.y + s.h);
      if (s.isRodamao) {
        const extra = (window.neRodamaoLabelWidthEstimate ? window.neRodamaoLabelWidthEstimate(s.quantidade, s.label) : 40) + 3;
        consider(s.x - extra, s.y);
      }
    }
    else if (s.type === "frisos") { consider(s.x, s.y); consider(s.x + s.w, s.y + s.h); }
    else if (s.type === "circle") { consider(s.cx - s.radius, s.cy - s.radius); consider(s.cx + s.radius, s.cy + s.radius); }
    else if (s.type === "polygon") (s.points || []).forEach((p) => consider(p.x, p.y));
        else if (s.type === "arrow") { consider(s.x1, s.y1); consider(s.x2, s.y2); }
        else if (s.type === "line") { consider(s.x1, s.y1); consider(s.x2, s.y2); }
    else if (s.type === "brace") { consider(s.x1, s.y1); consider(s.x2, s.y2); }
else if (s.type === "arrow90") { const p = neArrow90PointsPrint(s); consider(p.x1, p.y1); consider(p.cx, p.cy); consider(p.x2, p.y2); }
    else if (s.type === "text") consider(s.x, s.y);
  });
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 500, maxY: 350 };
  return { minX, minY, maxX, maxY };
}

function neVerticesOf(s) {
  if (s.type === "rect" || !s.type) {
    return [{ x: s.x, y: s.y }, { x: s.x + s.w, y: s.y }, { x: s.x + s.w, y: s.y + s.h }, { x: s.x, y: s.y + s.h }];
  }
  if (s.type === "polygon") return (s.points || []).map((p) => ({ x: p.x, y: p.y }));
  return [];
}

// Deriva as pontas da seta 90º a partir do modelo atual (cx,cy + len1,len2
// + dir1Angle + turn) — mesma lógica do neArrow90Points do editor.js.
// Usa a versão global se editor.js já a expôs; caso contrário calcula aqui.
function neArrow90PointsPrint(s) {
  if (typeof window.neArrow90Points === "function") return window.neArrow90Points(s);
  const a1 = (s.dir1Angle * Math.PI) / 180;
  const a2 = ((s.dir1Angle + s.turn * 90) * Math.PI) / 180;
  return {
    cx: s.cx, cy: s.cy,
    x1: s.cx + Math.cos(a1) * s.len1, y1: s.cy + Math.sin(a1) * s.len1,
    x2: s.cx + Math.cos(a2) * s.len2, y2: s.cy + Math.sin(a2) * s.len2,
  };
}
// bbox real de UMA peça (equivalente ao neShapeBBox do editor) — usado só
// para detetar se há outras peças encostadas a cada lado.
function neShapeBBoxPrint(s) {
  if (s.type === "rect" || !s.type) return { minX: s.x, minY: s.y, maxX: s.x + s.w, maxY: s.y + s.h };
  if (s.type === "frisos") return { minX: s.x, minY: s.y, maxX: s.x + s.w, maxY: s.y + s.h };
  if (s.type === "circle") return { minX: s.cx - s.radius, minY: s.cy - s.radius, maxX: s.cx + s.radius, maxY: s.cy + s.radius };
  if (s.type === "polygon" && s.points && s.points.length) {
    const xs = s.points.map((p) => p.x), ys = s.points.map((p) => p.y);
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  }
  if (s.type === "arrow" || s.type === "line") {
    return { minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2), maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2) };
  }
  if (s.type === "arrow90") {
  const p = neArrow90PointsPrint(s);
  const xs = [p.x1, p.cx, p.x2], ys = [p.y1, p.cy, p.y2];
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
  if (s.type === "brace") {
    const p = window.neBracePoints(s.x1, s.y1, s.x2, s.y2, s.width || 20);
    const xs = [p.x1, p.qx1, p.qx2, p.tx1, p.x2, p.qx3, p.qx4];
    const ys = [p.y1, p.qy1, p.qy2, p.ty1, p.y2, p.qy3, p.qy4];
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  }
  if (s.type === "text") {
    const fontSize = s.fontSize || 4;
    const lines = (s.content || "").split("\n");
    const maxLen = Math.max(4, ...lines.map((l) => l.length));
    return { minX: s.x, minY: s.y - fontSize, maxX: s.x + fontSize * maxLen * 0.6, maxY: s.y + fontSize * 1.2 * Math.max(0, lines.length - 1) };
  }
  return null;
}
// Réplica exata do neSidesBlocked do editor, mas usando neShapeBBoxPrint.
function neSidesBlockedPrint(s, allShapes) {
  const blocked = { left: false, right: false, top: false, bottom: false };
  const bb = neShapeBBoxPrint(s);
  if (!bb) return blocked;
  const tol = 6;
  allShapes.forEach((o) => {
    if (o.id === s.id) return;
    const ob = neShapeBBoxPrint(o);
    if (!ob) return;
    const overlapsY = ob.maxY > bb.minY + tol && ob.minY < bb.maxY - tol;
    const overlapsX = ob.maxX > bb.minX + tol && ob.minX < bb.maxX - tol;
    if (overlapsY) {
      if (ob.maxX >= bb.minX - tol && ob.minX < bb.minX - tol / 2) blocked.left = true;
      if (ob.minX <= bb.maxX + tol && ob.maxX > bb.maxX + tol / 2) blocked.right = true;
    }
    if (overlapsX) {
      if (ob.maxY >= bb.minY - tol && ob.minY < bb.minY - tol / 2) blocked.top = true;
      if (ob.minY <= bb.maxY + tol && ob.maxY > bb.maxY + tol / 2) blocked.bottom = true;
    }
  });
  return blocked;
}

// Réplica exata do neSidesBlocked do editor.
function neEdgeSideBlockedPrint(s, edgeIdx, verts, allShapes) {
  const a = verts[edgeIdx], b = verts[(edgeIdx + 1) % verts.length];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  let nx = -uy, ny = ux;
  const bb = neShapeBBoxPrint(s);
  const centroid = bb ? { x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 } : { x: a.x, y: a.y };
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const toCentroid = { x: centroid.x - mid.x, y: centroid.y - mid.y };
  if (nx * toCentroid.x + ny * toCentroid.y > 0) { nx = -nx; ny = -ny; }
  const tol = 6;
  let blocked = false;
  allShapes.forEach((o) => {
    if (o.id === s.id || blocked) return;
    const ob = neShapeBBoxPrint(o);
    if (!ob) return;
    const corners = [
      { x: ob.minX, y: ob.minY }, { x: ob.maxX, y: ob.minY },
      { x: ob.maxX, y: ob.maxY }, { x: ob.minX, y: ob.maxY },
    ];
    const nDists = corners.map((c) => (c.x - mid.x) * nx + (c.y - mid.y) * ny);
    const tPos = corners.map((c) => (c.x - mid.x) * ux + (c.y - mid.y) * uy);
    const nearOutward = nDists.some((d) => d > -tol / 2 && d < tol * 2.5);
    const halfLen = len / 2;
    const overlapsTangent = Math.min(...tPos) < halfLen - tol && Math.max(...tPos) > -halfLen + tol;
    if (nearOutward && overlapsTangent) blocked = true;
  });
  return blocked;
}


function neCCount(drawnLen) {
  return Math.min(Math.max(Math.round(drawnLen / 15), 1), 24);
}

function neRodamaoLabelMarkup(anchorX, cy, quantidade, label) {
  const fontSize = 3.2;
  const qtdRaw = String(quantidade ?? 1);
  const restRaw = label ? ` - ${label}` : "";
  const circleR = Math.max(2.2, fontSize * 0.5 + 0.5 * qtdRaw.length + 0.6);
  const gap = 1.2;
  const restWidth = fontSize * restRaw.length * 0.55;
  const totalWidth = circleR * 2 + (restRaw ? gap + restWidth : 0);
  // anchorX = borda direita do bloco (encostado à esquerda da peça)
  const startX = anchorX - totalWidth;
  const circleCx = startX + circleR;

  let out = `<circle cx="${circleCx}" cy="${cy}" r="${circleR}" fill="#ffffff" stroke="#22333B" stroke-width="0.35"/>`;
  out += `<text x="${circleCx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-weight="700" fill="#22333B">${neEscapeXml(qtdRaw)}</text>`;
  if (restRaw) {
    out += `<text x="${circleCx + circleR + gap}" y="${cy}" text-anchor="start" dominant-baseline="middle" font-size="${fontSize}" fill="#22333B">${neEscapeXml(restRaw)}</text>`;
  }
  return out;
}

/**
 * Constrói o markup SVG completo (cabeçalho + folha A4 com o desenho à
 * escala real). O fundo é sempre branco liso — sem grelha (a grelha só
 * é uma ajuda visual no ecrã de edição, nunca é impressa).
 */
function neBuildPrintSvgMarkup(nota, shapes, copyLabel) {
  const headerH = 28;
  const pageW = window.NE_PAGE_W;
  const pageH = window.NE_PAGE_H;
  const drawAreaH = pageH - headerH;
  const outerScale = drawAreaH / pageH;
  const outerOffsetX = (pageW - pageW * outerScale) / 2;

    const numeroBase = nota.id ? `Nº ${nota.id}` : "Nº (novo)";
    const numero = copyLabel ? `${copyLabel}  ${numeroBase}` : numeroBase;
  const tipoLabel = NE_TIPO_LABEL[nota.tipo] || nota.tipo || "-";
  const NE_AUTOR = currentSession?.user?.user_metadata?.display_name || currentSession?.user?.email || "-";

  const drawAreaW = pageW - NE_P_MARGIN_L - NE_P_MARGIN_R;
  const drawAreaHInner = pageH - NE_P_MARGIN_T - NE_P_MARGIN_B;
  const bbox = neBBoxOf(shapes);
  const realW = Math.max(bbox.maxX - bbox.minX, 5);
  const realH = Math.max(bbox.maxY - bbox.minY, 5);

  // Escala: se a nota tiver uma escala guardada (escolhida no editor, ex.
  // 1:50), usa sempre essa — nunca recalcula. Só quando não há escala
  // guardada (notas antigas, ou nunca foi definida) é que se calcula a
  // escala ideal para caber na folha, como antes.
  let den;
  if (nota.escala && nota.escala > 0) {
    den = nota.escala;
  } else {
    const idealDen = Math.max(realW / drawAreaW, realH / drawAreaHInner, 1);
    den = neNiceScaleAtLeastP(idealDen);
  }

  // Sem centrar: o desenho fica encostado ao canto definido pelas margens,
  // exatamente como aparece no editor do formulário (nunca centra os
  // objetos, mesmo que só haja uma peça).
  const r2dX = (rx) => (rx - bbox.minX) / den + NE_P_MARGIN_L;
  const r2dY = (ry) => (ry - bbox.minY) / den + NE_P_MARGIN_T;
  const r2dLen = (rl) => rl / den;
  const fmt = window.neFormatMeasure || ((mm) => `${mm} mm`);

  let defsMarkup = `
    <marker id="neArrowHeadPrint" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L6,3 L0,6 Z" fill="#22333B"/>
    </marker>
  `;

    let shapesMarkup = "";
  let dimsMarkup = "";
  let polishMarkup = "";
  let rodamaoMarkup = "";

   function nePolishSegmentsPrint(polish) {
    if (polish === true) return [{ from: 0, to: 1 }];
    if (Array.isArray(polish)) return polish.map((s) => ({ from: s.from, to: s.to }));
    return [];
  }

  const NE_POLISH_TICK_LEN_PRINT = 2;

  function polishTickMarkup(da, db, t) {
    const dx = db.x - da.x, dy = db.y - da.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;
    const px = da.x + dx * t, py = da.y + dy * t;
    return `<line x1="${px - nx * NE_POLISH_TICK_LEN_PRINT}" y1="${py - ny * NE_POLISH_TICK_LEN_PRINT}" x2="${px + nx * NE_POLISH_TICK_LEN_PRINT}" y2="${py + ny * NE_POLISH_TICK_LEN_PRINT}" stroke="#22333B" stroke-width="0.6" stroke-linecap="round"/>`;
  }

   function polishMarksFor(s, verts) {
    if (!s.edges || !verts.length) return "";
    let out = "";
    s.edges.forEach((edge, i) => {
      if (!edge || !edge.polish) return;
      const a = verts[i], b = verts[(i + 1) % verts.length];
      const da = { x: r2dX(a.x), y: r2dY(a.y) };
      const db = { x: r2dX(b.x), y: r2dY(b.y) };
      const segments = nePolishSegmentsPrint(edge.polish);
      const lastT = edge.polishLastT;
      const tol = 0.03;
      segments.forEach((seg) => {
        let tickT = null;
        if (lastT !== undefined && lastT !== null) {
          if (Math.abs(lastT - seg.to) < tol) tickT = seg.to;
          else if (Math.abs(lastT - seg.from) < tol) tickT = seg.from;
        }
        if (tickT === null) {
          if (seg.to < 0.99) tickT = seg.to;
          else if (seg.from > 0.01) tickT = seg.from;
        }
        if (tickT !== null) out += polishTickMarkup(da, db, tickT);

        const pa = { x: a.x + (b.x - a.x) * seg.from, y: a.y + (b.y - a.y) * seg.from };
        const pb = { x: a.x + (b.x - a.x) * seg.to, y: a.y + (b.y - a.y) * seg.to };
        const sda = { x: r2dX(pa.x), y: r2dY(pa.y) };
        const sdb = { x: r2dX(pb.x), y: r2dY(pb.y) };
        const segLen = Math.hypot(sdb.x - sda.x, sdb.y - sda.y);
        const count = neCCount(segLen);
        for (let k = 1; k <= count; k++) {
          const t = k / (count + 1);
          const px = sda.x + (sdb.x - sda.x) * t;
          const py = sda.y + (sdb.y - sda.y) * t;
          out += `<text x="${px}" y="${py}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="4.6" font-weight="700" fill="#c0392b">C</text>`;
        }
      });
    });
    return out;
  }

    function neDimLineMarkup(p1, p2, color) {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    let out = `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${color}" stroke-width="0.3"/>`;
    [p1, p2].forEach((p) => {
      out += `<line x1="${p.x - nx * 1.2}" y1="${p.y - ny * 1.2}" x2="${p.x + nx * 1.2}" y2="${p.y + ny * 1.2}" stroke="${color}" stroke-width="0.3"/>`;
    });
    return out;
  }
      function neDimTextMarkup(x1, y1, x2, y2, dimValue) {
      // Mesma medida do modo "Medida", mas só o texto (sem linha de cota)
      // — usado nas setas e linhas soltas, que já são a própria linha.
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
      const tx = midX + nx * 2.6, ty = midY + ny * 2.6;
      let angDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angDeg >= 90) angDeg -= 180; else if (angDeg < -90) angDeg += 180;
      return `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="4.4" letter-spacing="0.5" fill="#22333B" transform="rotate(${angDeg} ${tx} ${ty})">${neEscapeXml(fmt(dimValue))}</text>`;
    }

        function manualDimsMarkup(s, verts) {
    if (!s.edges || !verts.length) return "";
    const bb = neShapeBBoxPrint(s);
    const centroid = bb ? { x: r2dX((bb.minX + bb.maxX) / 2), y: r2dY((bb.minY + bb.maxY) / 2) } : { x: 0, y: 0 };
    const DIM_COLOR = "#22333B";
    let out = "";
    s.edges.forEach((edge, i) => {
      if (!edge || edge.dimValue === undefined || edge.dimValue === null) return;
      const a = verts[i], b = verts[(i + 1) % verts.length];
      const da = { x: r2dX(a.x), y: r2dY(a.y) };
      const db = { x: r2dX(b.x), y: r2dY(b.y) };
      const dx = db.x - da.x, dy = db.y - da.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      let nx = -uy, ny = ux;
      const midD = { x: (da.x + db.x) / 2, y: (da.y + db.y) / 2 };
      const toCentroid = { x: centroid.x - midD.x, y: centroid.y - midD.y };
      if (nx * toCentroid.x + ny * toCentroid.y > 0) { nx = -nx; ny = -ny; }

            const blocked = edge.dimInside === undefined ? neEdgeSideBlockedPrint(s, i, verts, shapes) : edge.dimInside;
      const labelText = neEscapeXml(fmt(edge.dimValue));
      let angDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angDeg >= 90) angDeg -= 180;
      else if (angDeg < -90) angDeg += 180;

           if (blocked) {
        const inOffset = 5;
        const tx = midD.x - nx * inOffset, ty = midD.y - ny * inOffset;
        out += `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="4.4" letter-spacing="0.5" fill="${DIM_COLOR}" transform="rotate(${angDeg} ${tx} ${ty})">${labelText}</text>`;
            } else {
        const offset = 3.2;
        const doa = { x: da.x + nx * offset, y: da.y + ny * offset };
        const dob = { x: db.x + nx * offset, y: db.y + ny * offset };
        out += neDimLineMarkup(doa, dob, DIM_COLOR);
        const midX = (doa.x + dob.x) / 2, midY = (doa.y + dob.y) / 2;
        const labelX = midX + nx * 2.6, labelY = midY + ny * 2.6;
        out += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="4.4" letter-spacing="0.5" fill="${DIM_COLOR}" transform="rotate(${angDeg} ${labelX} ${labelY})">${labelText}</text>`;
      }
    });
    return out;
  }

    function rectDimsMarkup(s, x, y, w, h, allShapes) {
    const forceInside = !!s.dimsInside;
    const blocked = neSidesBlockedPrint(s, allShapes);

    let wMode = "top";
    if (forceInside || (blocked.top && blocked.bottom)) wMode = "inside";
    else if (blocked.top) wMode = "bottom";

    const topY = wMode === "inside" ? y + 5 : wMode === "bottom" ? y + h + 3 : Math.max(2, y - 3);
    let out = "";
       if (wMode !== "inside") {
      out += neDimLineMarkup({ x, y: topY }, { x: x + w, y: topY }, "#22333B");
    }
    const wLabelY = wMode === "top" ? topY - 1.2 : wMode === "inside" ? topY : topY + 4.6;
    out += `<text x="${x + w / 2}" y="${wLabelY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="4.4" letter-spacing="0.5" fill="#22333B">${neEscapeXml(fmt(s.w))}</text>`;

    let hMode = "left";
    if (forceInside || (blocked.left && blocked.right)) hMode = "inside";
    else if (blocked.left) hMode = "right";

    const leftX = hMode === "inside" ? x + 5 : hMode === "right" ? x + w + 3.2 : Math.max(2, x - 3.2);
        if (hMode !== "inside") {
      out += neDimLineMarkup({ x: leftX, y }, { x: leftX, y: y + h }, "#22333B");
    }
    const hLabelX = hMode === "left" ? leftX - 2.6 : hMode === "right" ? leftX + 2.6 : leftX;
    out += `<text x="${hLabelX}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="4.4" letter-spacing="0.5" fill="#22333B" transform="rotate(-90 ${hLabelX} ${y + h / 2})">${neEscapeXml(fmt(s.h))}</text>`;

    return out;
  }

    shapes.forEach((s) => {
    if (s.type === "rect" || !s.type) {
      const x = r2dX(s.x), y = r2dY(s.y), w = r2dLen(s.w), h = r2dLen(s.h);
      const r = Array.isArray(s.r) ? s.r.map((v) => r2dLen(v || 0)) : [0, 0, 0, 0];
      const showRect = s.showRect !== false;
      if (showRect) {
        const d = window.neRectPath ? window.neRectPath(x, y, w, h, r) : `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;
        shapesMarkup += `<path d="${d}" fill="#f8f9fa" stroke="#22333B" stroke-width="0.6"/>`;
      }
      if (s.isRodamao) rodamaoMarkup += neRodamaoLabelMarkup(x - 3, y + h / 2, s.quantidade, s.label);
else if (s.label) shapesMarkup += `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="3.2" fill="#22333B">${neEscapeXml(s.label)}</text>`;
polishMarkup += polishMarksFor(s, neVerticesOf(s));
if (s.showDims !== false) dimsMarkup += rectDimsMarkup(s, x, y, w, h, shapes);
dimsMarkup += manualDimsMarkup(s, neVerticesOf(s));
    } else if (s.type === "circle") {
      const cx = r2dX(s.cx), cy = r2dY(s.cy), r = r2dLen(s.radius);
      shapesMarkup += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f8f9fa" stroke="#22333B" stroke-width="0.6"/>`;
      if (s.curved && s.curvedText) {
        const pathId = "nePathPrint_" + s.id;
        defsMarkup += `<path id="${pathId}" d="M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}" fill="none"/>`;
        shapesMarkup += `<text font-size="3.4" fill="#22333B"><textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${neEscapeXml(s.curvedText)}</textPath></text>`;
      } else if (s.label) {
        shapesMarkup += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="3.2" fill="#22333B">${neEscapeXml(s.label)}</text>`;
      }
      if (s.edges && s.edges[0] && s.edges[0].polish) {
        const count = neCCount(2 * Math.PI * r);
        for (let i = 0; i < count; i++) {
          const ang = (i / count) * Math.PI * 2 - Math.PI / 2;
          const px = cx + Math.cos(ang) * (r + 2.4), py = cy + Math.sin(ang) * (r + 2.4);
                      polishMarkup += `<text x="${px}" y="${py}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="4.6" font-weight="700" fill="#c0392b">C</text>`;
        }
      }
    } else if (s.type === "polygon") {
      const pts = (s.points || []).map((p) => `${r2dX(p.x)} ${r2dY(p.y)}`).join(" L ");
      shapesMarkup += `<path d="M ${pts} Z" fill="#f8f9fa" stroke="#22333B" stroke-width="0.6"/>`;
      if (s.label) {
        const cx = (s.points || []).reduce((a, p) => a + r2dX(p.x), 0) / (s.points.length || 1);
        const cy = (s.points || []).reduce((a, p) => a + r2dY(p.y), 0) / (s.points.length || 1);
        shapesMarkup += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="3.2" fill="#22333B">${neEscapeXml(s.label)}</text>`;
      }
            polishMarkup += polishMarksFor(s, neVerticesOf(s));
      dimsMarkup += manualDimsMarkup(s, neVerticesOf(s));
    } else if (s.type === "arrow") {
      const x1 = r2dX(s.x1), y1 = r2dY(s.y1), x2 = r2dX(s.x2), y2 = r2dY(s.y2);
      shapesMarkup += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#22333B" stroke-width="0.6" marker-end="url(#neArrowHeadPrint)"/>`;
      if (s.label) shapesMarkup += `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 1.5}" text-anchor="middle" font-size="3.2" fill="#22333B">${neEscapeXml(s.label)}</text>`;
    } else if (s.type === "line") {
      const x1 = r2dX(s.x1), y1 = r2dY(s.y1), x2 = r2dX(s.x2), y2 = r2dY(s.y2);
      const dashAttr = s.dashed ? ` stroke-dasharray="2,1.4"` : "";
      shapesMarkup += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#22333B" stroke-width="0.6"${dashAttr}/>`;
      if (s.label) shapesMarkup += `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 1.5}" text-anchor="middle" font-size="3.2" fill="#22333B">${neEscapeXml(s.label)}</text>`;
    } else if (s.type === "brace") {
      const width = s.width || 20;
      const rp = window.neBracePoints(s.x1, s.y1, s.x2, s.y2, width);
      const dp = {
        x1: r2dX(rp.x1), y1: r2dY(rp.y1),
        qx1: r2dX(rp.qx1), qy1: r2dY(rp.qy1),
        qx2: r2dX(rp.qx2), qy2: r2dY(rp.qy2),
        tx1: r2dX(rp.tx1), ty1: r2dY(rp.ty1),
        x2: r2dX(rp.x2), y2: r2dY(rp.y2),
        qx3: r2dX(rp.qx3), qy3: r2dY(rp.qy3),
        qx4: r2dX(rp.qx4), qy4: r2dY(rp.qy4),
      };
      const d = `M ${dp.x1} ${dp.y1} Q ${dp.qx1} ${dp.qy1} ${dp.qx2} ${dp.qy2} T ${dp.tx1} ${dp.ty1} M ${dp.x2} ${dp.y2} Q ${dp.qx3} ${dp.qy3} ${dp.qx4} ${dp.qy4} T ${dp.tx1} ${dp.ty1}`;
      shapesMarkup += `<path d="${d}" fill="none" stroke="#22333B" stroke-width="0.6"/>`;
      if (s.label) shapesMarkup += `<text x="${dp.tx1 + (width >= 0 ? 3 : -3)}" y="${dp.ty1}" text-anchor="middle" font-size="3.2" fill="#22333B">${neEscapeXml(s.label)}</text>`;
   } else if (s.type === "arrow90") {
  const p90 = neArrow90PointsPrint(s);
  const x1 = r2dX(p90.x1), y1 = r2dY(p90.y1), cx = r2dX(p90.cx), cy = r2dY(p90.cy), x2 = r2dX(p90.x2), y2 = r2dY(p90.y2);
  shapesMarkup += `<path d="M ${x2} ${y2} L ${cx} ${cy} L ${x1} ${y1}" fill="none" stroke="#22333B" stroke-width="0.6" marker-end="url(#neArrowHeadPrint)"/>`;
  if (s.label) shapesMarkup += `<text x="${(cx + x1) / 2}" y="${(cy + y1) / 2 - 1.5}" text-anchor="middle" font-size="3.2" fill="#22333B">${neEscapeXml(s.label)}</text>`;
              } else if (s.type === "text") {
      const x = r2dX(s.x), y = r2dY(s.y);
      const rot = s.rotation || 0;
      const transformAttr = rot ? ` transform="rotate(${rot} ${x} ${y})"` : "";
      shapesMarkup += `<text x="${x}" y="${y}" font-size="${s.fontSize || 4}" fill="#22333B"${transformAttr}>${neEscapeXml(s.content || "")}</text>`;
    } else if (s.type === "frisos") {
        } else if (s.type === "frisos") {
      const x = r2dX(s.x), y = r2dY(s.y), w = r2dLen(s.w), h = r2dLen(s.h);
      const N = 5;
      for (let i = 0; i < N; i++) {
        if (s.vertical) {
          const lx = x + (w * i) / (N - 1);
          shapesMarkup += `<line x1="${lx}" y1="${y}" x2="${lx}" y2="${y + h}" stroke="#22333B" stroke-width="0.6"/>`;
        } else {
          const ly = y + (h * i) / (N - 1);
          shapesMarkup += `<line x1="${x}" y1="${ly}" x2="${x + w}" y2="${ly}" stroke="#22333B" stroke-width="0.6"/>`;
        }
      }
      if (s.label) shapesMarkup += `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="3.2" fill="#22333B">${neEscapeXml(s.label)}</text>`;
    }
  });

  // Linha 2 do cabeçalho (esquerda): gestão | observação (só se tiver)
  const linha2EsqParts = [];
  linha2EsqParts.push(`Gestão: ${neEscapeXml(tipoLabel)}`);
  if (nota.observacoes) linha2EsqParts.push(`Obs: ${neEscapeXml(nota.observacoes).slice(0, 70)}`);
  const linha2Esq = linha2EsqParts.join("  |  ");

    // Linha 2 do cabeçalho (direita): criação | autor
  const linha2Dir = [
    `Criação: ${neEscapeXml(nota.data_criacao ? neFormatDate(nota.data_criacao) : "-")}`,
    `Autor: ${neEscapeXml(NE_AUTOR)}`,
  ].join("  |  ");

  // Linha do material/entrega: o material encolhe se for muito comprido,
  // para nunca invadir o espaço da data de entrega (à direita).
  const materialTexto = `Material: ${nota.material || "-"}`;
  const entregaTexto = `Entrega: ${nota.data_entrega ? neFormatDate(nota.data_entrega) : "-"}`;
  const linha2FontBase = 4.7;
  const entregaLargura = entregaTexto.length * linha2FontBase * 0.55;
  const linha2LarguraDisponivel = (pageW - 4) - 6 - entregaLargura - 6;
  const materialLarguraBase = materialTexto.length * linha2FontBase * 0.55;
    const materialFontSize = materialLarguraBase > linha2LarguraDisponivel && linha2LarguraDisponivel > 0
    ? Math.max(2.6, linha2FontBase * (linha2LarguraDisponivel / materialLarguraBase))
    : linha2FontBase;

  // Linha de gestão/obs: encolhe se for muito comprida, para nunca
  // invadir o espaço da criação/autor (à direita).
  const linha3FontBase = 3.6;
  const linha3DirLargura = linha2Dir.length * linha3FontBase * 0.55;
  const linha3LarguraDisponivel = (pageW - 6) - 6 - linha3DirLargura - 6;
  const linha3EsqLarguraBase = linha2Esq.length * linha3FontBase * 0.55;
  const linha3EsqFontSize = linha3EsqLarguraBase > linha3LarguraDisponivel && linha3LarguraDisponivel > 0
    ? Math.max(2.2, linha3FontBase * (linha3LarguraDisponivel / linha3EsqLarguraBase))
    : linha3FontBase;

  return `
    <svg xmlns="${'http://www.w3.org/2000/svg'}" viewBox="0 0 ${pageW} ${pageH}" width="${pageW}mm" height="${pageH}mm">
      <rect x="0" y="0" width="${pageW}" height="${pageH}" fill="#ffffff"/>

      <!-- Cabeçalho: linha 1 = cliente (esq.) / nº (dir.) -->
      <text x="6" y="9" font-family="Arial, sans-serif" font-size="5.2" font-weight="bold" fill="#22333B">${neEscapeXml(nota.cliente_nome || "")}</text>
      <text x="${pageW - 6}" y="9" font-family="Arial, sans-serif" font-size="5.2" font-weight="bold" fill="#22333B" text-anchor="end">${neEscapeXml(numero)}</text>

           <!-- Cabeçalho: linha 2 = material (esq., mesmo tamanho do cliente) / data de entrega (dir., o mais à direita possível) -->
      <text x="6" y="16" font-family="Arial, sans-serif" font-size="${materialFontSize.toFixed(2)}" font-weight="bold" fill="#22333B">${neEscapeXml(materialTexto)}</text>
      <text x="${pageW - 4}" y="16" font-family="Arial, sans-serif" font-size="${linha2FontBase}" font-weight="bold" fill="#22333B" text-anchor="end">${neEscapeXml(entregaTexto)}</text>

      <!-- Cabeçalho: linha 3 = gestão | obs (esq.) / criação | autor (dir.) -->
      <text x="6" y="23" font-family="Arial, sans-serif" font-size="${linha3EsqFontSize.toFixed(2)}" fill="#2e4752">${linha2Esq}</text>
      <text x="${pageW - 6}" y="23" font-family="Arial, sans-serif" font-size="${linha3FontBase}" fill="#2e4752" text-anchor="end">${linha2Dir}</text>
      <line x1="4" y1="${headerH - 1}" x2="${pageW - 4}" y2="${headerH - 1}" stroke="#22333B" stroke-width="0.4"/>

      <!-- Folha de desenho: fundo sempre branco, sem grelha -->
      <g transform="translate(${outerOffsetX}, ${headerH}) scale(${outerScale})">
                <rect x="0" y="0" width="${pageW}" height="${pageH}" fill="#ffffff"/>
        <defs>${defsMarkup}</defs>
                ${shapesMarkup}
        ${dimsMarkup}
        ${polishMarkup}
        ${rodamaoMarkup}
      </g>
    </svg>
  `;
}

function neSvgToPngDataUrl(svgString, pxWidth, pxHeight) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pxWidth;
      canvas.height = pxHeight;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pxWidth, pxHeight);
      ctx.drawImage(img, 0, 0, pxWidth, pxHeight);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

async function neGetPreviewDataUrl(nota, shapes, { scalePxPerMm = 4, copyLabel = null } = {}) {
  const svgString = neBuildPrintSvgMarkup(nota, shapes, copyLabel);
  const w = Math.round(window.NE_PAGE_W * scalePxPerMm);
  const h = Math.round(window.NE_PAGE_H * scalePxPerMm);
  return neSvgToPngDataUrl(svgString, w, h);
}

function neLoadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function neNomeFicheiroPdf(nota) {
  const numero = nota.id ? `Nota_${nota.id}` : "Nota";
  const cliente = (nota.cliente_nome || "").trim().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
  return cliente ? `${numero}_${cliente}` : numero;
}

async function neImprimirNota(nota, shapes) {
  try {
    if (!window.jspdf) {
      await neLoadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    }
    const { jsPDF } = window.jspdf;

        const dataUrlOriginal = await neGetPreviewDataUrl(nota, shapes, { scalePxPerMm: 6, copyLabel: "ORIGINAL" });
    const dataUrlDuplicado = await neGetPreviewDataUrl(nota, shapes, { scalePxPerMm: 6, copyLabel: "DUPLICADO" });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.addImage(dataUrlOriginal, "PNG", 0, 0, window.NE_PAGE_W, window.NE_PAGE_H);
    pdf.addPage();
    pdf.addImage(dataUrlDuplicado, "PNG", 0, 0, window.NE_PAGE_W, window.NE_PAGE_H);

    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);

    // O nome sugerido pelo browser ao "Guardar como PDF" usa o título da
    // página no momento da impressão — muda-se temporariamente para o
    // nome automático da nota, e repõe-se depois.
    const tituloOriginal = document.title;
    document.title = neNomeFicheiroPdf(nota);

    let jaLimpou = false;
    function limparIframe() {
      if (jaLimpou) return;
      jaLimpou = true;
      if (iframe.parentNode) document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
      document.title = tituloOriginal;
    }

    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      // Só remove o iframe depois de a caixa de impressão ser fechada
      // (evento "afterprint") — removê-lo cedo demais faz o browser
      // fechar a caixa de impressão sozinha.
      iframe.contentWindow.addEventListener("afterprint", limparIframe);
      // Rede de segurança, caso "afterprint" não dispare em algum browser.
      setTimeout(limparIframe, 60000);
    };
  } catch (err) {
    console.error("Erro ao imprimir nota:", err);
    if (typeof showMessage === "function") {
      showMessage("Erro ao preparar a impressão: " + err.message, "danger");
    }
  }
}
window.neBuildPrintSvgMarkup = neBuildPrintSvgMarkup;
window.neGetPreviewDataUrl = neGetPreviewDataUrl;
window.neImprimirNota = neImprimirNota;
window.NE_TIPO_LABEL = NE_TIPO_LABEL;
window.neFormatDate = neFormatDate;
window.neNomeFicheiroPdf = neNomeFicheiroPdf;