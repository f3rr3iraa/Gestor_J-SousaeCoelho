/* =====================================================================
   EDITOR DE DESENHO — Notas de Encomenda
   ---------------------------------------------------------------------
   Folha física A4 (210 x 297 mm). As peças são desenhadas à ESCALA REAL
   (mm reais, sem limite) e o editor calcula sozinho a escala de desenho
   (1:20, 1:50, ...) para caber na folha, mantendo sempre a proporção
   correta. A escala pode ser escolhida manualmente.

   Tipos de forma: rect, circle, polygon, arrow, arrow90, text
===================================================================== */

const NE_PAGE_W = 210;
const NE_PAGE_H = 297;
const NE_MARGIN_L = 8;
const NE_MARGIN_T = 8;
const NE_MARGIN_R = 6;
const NE_MARGIN_B = 6;
const NE_MIN_REAL = 5;
const SVG_NS = "http://www.w3.org/2000/svg";
const NE_EDGE_CLICK_THRESHOLD = 2.5; // mm no desenho — abaixo disto conta como "clique", acima é "arrasto" (troço parcial)
const NE_MIN_POLISH_SEGMENT = 0.015; // fração mínima (0-1) de uma aresta para um troço de polimento contar
const NE_LINE_STRAIGHT_TOL = 0.5; // mm reais — abaixo disto a linha é considerada "reta" (horizontal/vertical) e fica verde

function neNiceScaleAtLeast(x) {
  // Passos mais finos do que antes (1, 2, 2.5, 5) para evitar saltos bruscos
  // de escala (o "efeito de encolher") quando se acabou de adicionar uma peça.
  const base = [1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6, 8];
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

function neCreateSvgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function neClamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function neUid() {
  return "s" + Math.random().toString(36).slice(2, 10);
}

function neFormatMeasure(realMm) {
  const m = realMm / 1000;
  if (Math.abs(m) >= 1) {
    let s = m.toFixed(3);
    if (s.endsWith("0")) s = s.slice(0, -1);
    return s.replace(".", ",");
  }
  const cm = realMm / 10;
  let s = cm.toFixed(1).replace(/\.0$/, "");
  return s.replace(".", ",");
}
window.neFormatMeasure = neFormatMeasure;

// Converte texto escrito pelo utilizador ("64.3 cm", "1.432 m", "54",
// "1,42m", "540mm", "0.60", "1.000"...) para milímetros reais (número).
// Sem unidade escrita, o número é sempre interpretado como METROS
// (ex: "0.60" = 0,60 m = 60 cm; "1.000" = 1 m; "0.98" = 98 cm).
// A apresentação (neFormatMeasure / neFormatMeasureInput) trata depois de
// mostrar o valor em cm ou m consoante for mais natural.
// Devolve NaN se não conseguir interpretar.
function neParseMeasure(input) {
  if (input === null || input === undefined) return NaN;
  let s = String(input).trim().toLowerCase().replace(",", ".");
  if (!s) return NaN;
  let mult = null;
  if (/mm\s*$/.test(s)) { mult = 1; s = s.replace(/mm\s*$/, ""); }
  else if (/cm\s*$/.test(s)) { mult = 10; s = s.replace(/cm\s*$/, ""); }
  else if (/m\s*$/.test(s)) { mult = 1000; s = s.replace(/m\s*$/, ""); }
  const num = parseFloat(s.trim());
  if (isNaN(num)) return NaN;
  if (mult === null) mult = 1000; // sem unidade escrita: assume-se sempre METROS
  return num * mult;
}
window.neParseMeasure = neParseMeasure;

// Mostra um valor em mm como texto editável, SEMPRE em metros e com
// precisão completa (sem simplificar nem arredondar) — usado no painel
// de propriedades. Ex: 1000mm -> "1.0000", 320mm -> "0.3200".
function neFormatMeasureInput(realMm) {
  return (realMm / 1000).toFixed(3);
}
window.neFormatMeasureInput = neFormatMeasureInput;

function neRectEdgesDefault() {
  return [{ polish: false }, { polish: false }, { polish: false }, { polish: false }];
}
function nePolygonEdgesFor(points) {
  return points.map(() => ({ polish: false }));
}

function neRectPath(x, y, w, h, r) {
  const maxR = Math.min(w, h) / 2;
  const rtl = neClamp(r[0] || 0, 0, maxR);
  const rtr = neClamp(r[1] || 0, 0, maxR);
  const rbr = neClamp(r[2] || 0, 0, maxR);
  const rbl = neClamp(r[3] || 0, 0, maxR);
  return [
    `M ${x + rtl} ${y}`,
    `L ${x + w - rtr} ${y}`,
    rtr > 0 ? `A ${rtr} ${rtr} 0 0 1 ${x + w} ${y + rtr}` : `L ${x + w} ${y}`,
    `L ${x + w} ${y + h - rbr}`,
    rbr > 0 ? `A ${rbr} ${rbr} 0 0 1 ${x + w - rbr} ${y + h}` : `L ${x + w} ${y + h}`,
    `L ${x + rbl} ${y + h}`,
    rbl > 0 ? `A ${rbl} ${rbl} 0 0 1 ${x} ${y + h - rbl}` : `L ${x} ${y + h}`,
    `L ${x} ${y + rtl}`,
    rtl > 0 ? `A ${rtl} ${rtl} 0 0 1 ${x + rtl} ${y}` : `L ${x} ${y}`,
    "Z",
  ].join(" ");
}
window.neRectPath = neRectPath;

function neCCountForLength(drawnLen) {
  return neClamp(Math.round(drawnLen / 15), 1, 24);
}
function neSegPoints(a, b, count) {
  const pts = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return pts;
}

function neDistToSeg(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = neClamp(t, 0, 1);
  const cx = a.x + dx * t, cy = a.y + dy * t;
  return Math.hypot(p.x - cx, p.y - cy);
}

function neRotatePointAround(p, pivot, deg) {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const dx = p.x - pivot.x, dy = p.y - pivot.y;
  return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
}
function neFlipPointH(p, pivot) { return { x: 2 * pivot.x - p.x, y: p.y }; }
function neFlipPointV(p, pivot) { return { x: p.x, y: 2 * pivot.y - p.y }; }
function neNormDeg(d) { return ((d % 360) + 360) % 360; }

function neShapeVertices(s) {
  if (s.type === "rect") {
    return [
      { x: s.x, y: s.y }, { x: s.x + s.w, y: s.y },
      { x: s.x + s.w, y: s.y + s.h }, { x: s.x, y: s.y + s.h },
    ];
  }
  if (s.type === "polygon") return s.points.map((p) => ({ x: p.x, y: p.y }));
  return [];
}

function neRotatePointAround(p, pivot, deg) {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const dx = p.x - pivot.x, dy = p.y - pivot.y;
  return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
}
function neFlipPointH(p, pivot) { return { x: 2 * pivot.x - p.x, y: p.y }; }
function neFlipPointV(p, pivot) { return { x: p.x, y: 2 * pivot.y - p.y }; }
function neNormDeg(d) { return ((d % 360) + 360) % 360; }

// ---------------------------------------------------------------
// SETA 90º — modelo geométrico
// Guardamos o CANTO (cx,cy — o vértice da dobra), o comprimento de cada
// perna (len1 = perna da ponta com seta, len2 = perna da cauda) e o
// ângulo absoluto da perna 1 (dir1Angle, em graus, convenção SVG:
// 0=direita, 90=baixo, 180=esquerda, 270=cima). A perna 2 está sempre a
// "turn" * 90º da perna 1 (turn é fixo, +1 ou -1, definido quando a seta
// é criada) — por isso as duas pernas ficam SEMPRE perpendiculares entre
// si, e não há forma de as tornar não-retas.
// dir1Angle e turn são fixados na criação (ver NE_ARROW90_PRESETS) e
// NUNCA mudam depois — não existe rotação. Arrastar uma ponta só altera
// o comprimento (len1/len2) dessa perna, sempre na direção original.
// As posições x1,y1 (ponta) e x2,y2 (cauda) são sempre DERIVADAS destes
// valores, nunca guardadas diretamente.
// ---------------------------------------------------------------
function neArrow90Points(s) {
  const a1 = (s.dir1Angle * Math.PI) / 180;
  const a2 = ((s.dir1Angle + s.turn * 90) * Math.PI) / 180;
  return {
    cx: s.cx, cy: s.cy,
    x1: s.cx + Math.cos(a1) * s.len1, y1: s.cy + Math.sin(a1) * s.len1,
    x2: s.cx + Math.cos(a2) * s.len2, y2: s.cy + Math.sin(a2) * s.len2,
  };
}

// Gera os pontos de controlo de uma chaveta "{" ou "}" entre dois pontos.
// width = curvatura/profundidade em mm reais (negativo inverte o lado).
function neBracePoints(x1, y1, x2, y2, width, q) {
  q = q === undefined ? 0.6 : q;
  const dx0 = x1 - x2, dy0 = y1 - y2;
  const len = Math.hypot(dx0, dy0) || 1;
  const dx = dx0 / len, dy = dy0 / len;
  const qx1 = x1 + q * width * dy, qy1 = y1 - q * width * dx;
  const qx2 = (x1 - 0.25 * len * dx) + (1 - q) * width * dy;
  const qy2 = (y1 - 0.25 * len * dy) - (1 - q) * width * dx;
  const tx1 = (x1 - 0.5 * len * dx) + width * dy;
  const ty1 = (y1 - 0.5 * len * dy) - width * dx;
  const qx3 = x2 + q * width * dy, qy3 = y2 - q * width * dx;
  const qx4 = (x1 - 0.75 * len * dx) + (1 - q) * width * dy;
  const qy4 = (y1 - 0.75 * len * dy) - (1 - q) * width * dx;
  return { x1, y1, qx1, qy1, qx2, qy2, tx1, ty1, x2, y2, qx3, qy3, qx4, qy4 };
}
window.neBracePoints = neBracePoints;

function neShapeBBox(s) {
  if (s.type === "rect") return { minX: s.x, minY: s.y, maxX: s.x + s.w, maxY: s.y + s.h };
  if (s.type === "frisos") return { minX: s.x, minY: s.y, maxX: s.x + s.w, maxY: s.y + s.h };
  if (s.type === "circle") return { minX: s.cx - s.radius, minY: s.cy - s.radius, maxX: s.cx + s.radius, maxY: s.cy + s.radius };
  if (s.type === "polygon" && s.points && s.points.length) {
    const xs = s.points.map((p) => p.x), ys = s.points.map((p) => p.y);
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  }
  if (s.type === "arrow") return { minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2), maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2) };
  if (s.type === "line") return { minX: Math.min(s.x1, s.x2), minY: Math.min(s.y1, s.y2), maxX: Math.max(s.x1, s.x2), maxY: Math.max(s.y1, s.y2) };
    if (s.type === "arrow90") {
    const p = neArrow90Points(s);
    const xs = [p.x1, p.cx, p.x2], ys = [p.y1, p.cy, p.y2];
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  }
  if (s.type === "brace") {
    const p = neBracePoints(s.x1, s.y1, s.x2, s.y2, s.width || 20);
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

// Projeta o ponto p no segmento a-b e devolve t (0-1, encostado às pontas)
function neProjectT(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  return neClamp(t, 0, 1);
}

// ---------------------------------------------------------------
// Troços de polimento por aresta (permite marcar só parte da linha)
// edge.polish pode ser: false (nada) | true (aresta toda, modo antigo)
// | [{from,to}, ...] (troços parciais, 0-1 ao longo da aresta)
// ---------------------------------------------------------------
function nePolishToSegments(polish) {
  if (polish === true) return [{ from: 0, to: 1 }];
  if (Array.isArray(polish)) return polish.map((s) => ({ from: s.from, to: s.to }));
  return [];
}

function neMergeSegments(segs) {
  const eps = 0.004;
  const sorted = [...segs].sort((a, b) => a.from - b.from);
  const out = [];
  sorted.forEach((s) => {
    if (out.length && s.from <= out[out.length - 1].to + eps) {
      out[out.length - 1].to = Math.max(out[out.length - 1].to, s.to);
    } else {
      out.push({ from: s.from, to: s.to });
    }
  });
  return out;
}

function neSubtractSegment(segs, t0, t1) {
  const out = [];
  segs.forEach((s) => {
    if (t1 <= s.from || t0 >= s.to) { out.push(s); return; }
    if (t0 > s.from) out.push({ from: s.from, to: t0 });
    if (t1 < s.to) out.push({ from: t1, to: s.to });
  });
  return out.filter((s) => s.to - s.from > NE_MIN_POLISH_SEGMENT);
}

function neSegmentsOverlapLength(segs, t0, t1) {
  let total = 0;
  segs.forEach((s) => {
    const lo = Math.max(s.from, t0), hi = Math.min(s.to, t1);
    if (hi > lo) total += hi - lo;
  });
  return total;
}

// Aplica um arrasto [t0,t1] a uma aresta: se o troço arrastado já estava
// (na maior parte) marcado, apaga esse troço; caso contrário, adiciona-o.
function neApplyEdgeRange(edge, t0, t1) {
  if (t1 - t0 < NE_MIN_POLISH_SEGMENT) return;
  let segs = nePolishToSegments(edge.polish);
  const rangeLen = t1 - t0;
  const overlap = neSegmentsOverlapLength(segs, t0, t1);
  if (overlap / rangeLen > 0.5) {
    segs = neSubtractSegment(segs, t0, t1);
  } else {
    segs = neMergeSegments([...segs, { from: t0, to: t1 }]);
  }
  if (!segs.length) {
    edge.polish = false;
  } else if (segs.length === 1 && segs[0].from <= 0.01 && segs[0].to >= 0.99) {
    edge.polish = true;
  } else {
    edge.polish = segs;
  }
}

// ---------------------------------------------------------------
// Deteção de troços "encobertos" — quando outra peça está encostada a
// parte de uma aresta (ex: um retângulo de 1x1m com outro de 60x60cm
// encostado a um troço da mesma linha), devolve os intervalos [0,1]
// dessa aresta que estão tapados por outras peças, para se poder isolar
// automaticamente o troço "livre" (ex: os 40cm que sobram).
// ---------------------------------------------------------------
const NE_COLLINEAR_TOL = 3; // mm reais — tolerância para considerar duas arestas na mesma linha

function neEdgeCoveredRanges(shapes, ownerId, edgeIdx) {
  const owner = shapes.find((s) => s.id === ownerId);
  if (!owner) return [];
  const verts = neShapeVertices(owner);
  const a = verts[edgeIdx], b = verts[(edgeIdx + 1) % verts.length];
  if (!a || !b) return [];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len; // direção unitária
  const nx = -uy, ny = ux; // normal

  let covered = [];
  shapes.forEach((other) => {
    if (other.id === ownerId) return;
    if (other.type !== "rect" && other.type !== "polygon") return;
    const overts = neShapeVertices(other);
    overts.forEach((oa, i) => {
      const ob = overts[(i + 1) % overts.length];
      // distância perpendicular das duas pontas da aresta "other" à reta de "a-b"
      const da = Math.abs((oa.x - a.x) * nx + (oa.y - a.y) * ny);
      const db = Math.abs((ob.x - a.x) * nx + (ob.y - a.y) * ny);
      if (da > NE_COLLINEAR_TOL || db > NE_COLLINEAR_TOL) return; // não é colinear/paralela encostada
      // projeta as duas pontas na direção da aresta "a-b" para obter o t
      const ta = ((oa.x - a.x) * ux + (oa.y - a.y) * uy) / len;
      const tb = ((ob.x - a.x) * ux + (ob.y - a.y) * uy) / len;
      const t0 = neClamp(Math.min(ta, tb), 0, 1);
      const t1 = neClamp(Math.max(ta, tb), 0, 1);
      if (t1 - t0 > NE_MIN_POLISH_SEGMENT) covered.push({ from: t0, to: t1 });
    });
  });
  return neMergeSegments(covered);
}

// Complemento de uma lista de intervalos [0,1] — os troços "livres"/expostos.
function neInvertSegments(segs) {
  const sorted = neMergeSegments(segs);
  const out = [];
  let cursor = 0;
  sorted.forEach((s) => {
    if (s.from - cursor > NE_MIN_POLISH_SEGMENT) out.push({ from: cursor, to: s.from });
    cursor = Math.max(cursor, s.to);
  });
  if (1 - cursor > NE_MIN_POLISH_SEGMENT) out.push({ from: cursor, to: 1 });
  return out;
}

function createNotaEditor(container) {
  let shapes = [];
  let selectedIds = new Set();
  let onChangeCb = null;
  let tool = "select"; // select | edge
    let scaleDen = null;
  let showGrid = true;
  let currentView = null;
  let fixedOrigin = null;   // { x, y } — origem real fixada, só muda quando necessário
  let fixedDen = null;      // escala automática fixada, idem
  let clipboard = [];

  let undoStack = [];
const NE_UNDO_MAX = 50;
let undoDebouncePending = false;
let undoDebounceTimer = null;

  let drag = null;
  let polyDraft = null; // { points:[{x,y}], preview:{x,y}|null, aligned:boolean }
  let lineDraft = null; // { points:[{x,y}], preview:{x,y}|null, aligned:boolean, dashed:boolean }
    let arrowDraft = null; // { points:[{x,y}], preview:{x,y}|null, aligned:boolean }
    let guideLines = { v: null, h: null };
  let hoverEdgeInfo = null; // { id, idx } — aresta em destaque (vermelho) no modo "edge"
  let dimSelection = null; // { shapeId, edgeIdx } — aresta escolhida no modo "Cota manual"
  let onDimChangeCb = null;

    function emitDimChange() {
    if (typeof onDimChangeCb !== "function") return;
    if (!dimSelection) { onDimChangeCb(null); return; }
    const s = getShape(dimSelection.shapeId);
    if (!s || !s.edges || !s.edges[dimSelection.edgeIdx]) { onDimChangeCb(null); return; }
    onDimChangeCb({
      shapeId: s.id, edgeIdx: dimSelection.edgeIdx,
      dimValue: s.edges[dimSelection.edgeIdx].dimValue ?? null,
      dimInside: s.edges[dimSelection.edgeIdx].dimInside,
    });
  }

  container.innerHTML = "";

  const svg = neCreateSvgEl("svg", { viewBox: `0 0 ${NE_PAGE_W} ${NE_PAGE_H}`, class: "ne-sheet-svg" });

  const bg = neCreateSvgEl("rect", {
    x: 0, y: 0, width: NE_PAGE_W, height: NE_PAGE_H, fill: "#ffffff", stroke: "#22333B", "stroke-width": "0.6",
  });
  svg.appendChild(bg);

  const defs = neCreateSvgEl("defs");
const gridPattern = neCreateSvgEl("pattern", { id: "neGridPattern", width: "5", height: "5", patternUnits: "userSpaceOnUse" });
gridPattern.appendChild(neCreateSvgEl("path", { d: "M 5 0 L 0 0 0 5", fill: "none", stroke: "#b8c2c9", "stroke-width": "0.25" }));
  defs.appendChild(gridPattern);
  svg.appendChild(defs);

  const gridRect = neCreateSvgEl("rect", { x: 0, y: 0, width: NE_PAGE_W, height: NE_PAGE_H, fill: "url(#neGridPattern)" });
  svg.appendChild(gridRect);

  // NOTA: shapesLayer vem ANTES de dimsLayer/polishLayer para que as cotas
  // (medidas) e o polimento fiquem sempre por CIMA das peças e nunca fiquem
  // escondidos por baixo do preenchimento de outra peça.
  const shapesLayer = neCreateSvgEl("g", { id: "neShapesLayer" });
  svg.appendChild(shapesLayer);
  const dimsLayer = neCreateSvgEl("g", { id: "neDimsLayer" });
  svg.appendChild(dimsLayer);
  const polishLayer = neCreateSvgEl("g", { id: "nePolishLayer" });
  svg.appendChild(polishLayer);
  const guidesLayer = neCreateSvgEl("g", { id: "neGuidesLayer" });
  svg.appendChild(guidesLayer);
  const hoverLayer = neCreateSvgEl("g", { id: "neHoverLayer" });
  svg.appendChild(hoverLayer);
  const draftLayer = neCreateSvgEl("g", { id: "neDraftLayer" });
  svg.appendChild(draftLayer);
  const handlesLayer = neCreateSvgEl("g", { id: "neHandlesLayer" });
  svg.appendChild(handlesLayer);
  const marqueeLayer = neCreateSvgEl("g", { id: "neMarqueeLayer" });
  svg.appendChild(marqueeLayer);

  container.appendChild(svg);

  // ---------------------------------------------------------------
  // COORDENADAS
  // ---------------------------------------------------------------
  function toSvgPoint(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function getShape(id) { return shapes.find((s) => s.id === id) || null; }
  function emitChange() { if (typeof onChangeCb === "function") onChangeCb(getSelectedShapes()); }

  // Deteta, para uma peça, se há outra peça encostada/sobreposta a cada lado
  // (esquerda/direita/cima/baixo), para saber para onde afastar as cotas.
  function neSidesBlocked(s) {
    const blocked = { left: false, right: false, top: false, bottom: false };
    const bb = neShapeBBox(s);
    if (!bb) return blocked;
    const tol = 6; // mm reais — margem para considerar peças "encostadas"
    shapes.forEach((o) => {
      if (o.id === s.id) return;
      const ob = neShapeBBox(o);
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

  function computeBBox() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const consider = (x, y) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
    shapes.forEach((s) => {
            if (s.type === "rect") { consider(s.x, s.y); consider(s.x + s.w, s.y + s.h); }
      else if (s.type === "frisos") { consider(s.x, s.y); consider(s.x + s.w, s.y + s.h); }
      else if (s.type === "circle") { consider(s.cx - s.radius, s.cy - s.radius); consider(s.cx + s.radius, s.cy + s.radius); }
      else if (s.type === "polygon") s.points.forEach((p) => consider(p.x, p.y));
      else if (s.type === "arrow") { consider(s.x1, s.y1); consider(s.x2, s.y2); }
            else if (s.type === "line") { consider(s.x1, s.y1); consider(s.x2, s.y2); }
      else if (s.type === "brace") { consider(s.x1, s.y1); consider(s.x2, s.y2); }
      else if (s.type === "arrow90") { const p = neArrow90Points(s); consider(p.x1, p.y1); consider(p.cx, p.cy); consider(p.x2, p.y2); }
      else if (s.type === "text") consider(s.x, s.y);
    });
    if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 400 , maxY: 300 };
    return { minX, minY, maxX, maxY };
  }

    function computeView() {
    const drawAreaW = NE_PAGE_W - NE_MARGIN_L - NE_MARGIN_R;
    const drawAreaH = NE_PAGE_H - NE_MARGIN_T - NE_MARGIN_B;
    const bbox = computeBBox();

    const fits = (den, origin) => {
      if (!den || !origin) return false;
      const w = (bbox.maxX - origin.x) / den;
      const h = (bbox.maxY - origin.y) / den;
      return bbox.minX >= origin.x - 1e-6 && bbox.minY >= origin.y - 1e-6
        && w <= drawAreaW + 1e-6 && h <= drawAreaH + 1e-6;
    };

    let den = scaleDen;
    let origin;

    if (scaleDen) {
      // escala escolhida manualmente pelo utilizador — respeita sempre
      origin = fixedOrigin && fits(scaleDen, fixedOrigin) ? fixedOrigin : { x: bbox.minX, y: bbox.minY };
    } else if (fixedDen && fits(fixedDen, fixedOrigin)) {
      // ainda cabe tudo na escala/origem atual -> NÃO mexer em nada
      den = fixedDen;
      origin = fixedOrigin;
    } else {
      // só recalcula quando deixou mesmo de caber (ou é a 1ª peça)
      const realW = Math.max(bbox.maxX - bbox.minX, NE_MIN_REAL);
      const realH = Math.max(bbox.maxY - bbox.minY, NE_MIN_REAL);
      den = neNiceScaleAtLeast(Math.max(realW / drawAreaW, realH / drawAreaH, 1) * 1.05);
      origin = { x: bbox.minX, y: bbox.minY };
    }

    fixedDen = den;
    fixedOrigin = origin;

    return { den, minX: origin.x, minY: origin.y, drawAreaW, drawAreaH };
  }

  function r2dX(realX, view = currentView) { return (realX - view.minX) / view.den + NE_MARGIN_L; }
  function r2dY(realY, view = currentView) { return (realY - view.minY) / view.den + NE_MARGIN_T; }
  function r2dLen(realLen, view = currentView) { return realLen / view.den; }
  function d2rLen(drawLen, view = currentView) { return drawLen * view.den; }
  function d2rX(drawX, view = currentView) { return (drawX - NE_MARGIN_L) * view.den + view.minX; }
  function d2rY(drawY, view = currentView) { return (drawY - NE_MARGIN_T) * view.den + view.minY; }

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------
  function render() {
    currentView = drag ? drag.viewSnapshot : computeView();
    const view = currentView;

    gridRect.style.display = showGrid ? "" : "none";

    dimsLayer.innerHTML = "";
    shapesLayer.innerHTML = "";
    polishLayer.innerHTML = "";
    draftLayer.innerHTML = "";
    handlesLayer.innerHTML = "";
    marqueeLayer.innerHTML = "";

    // formas selecionadas desenham-se por último (ficam sempre por cima
    // dentro da camada de formas)
    const renderOrder = [...shapes.filter((s) => !selectedIds.has(s.id)), ...shapes.filter((s) => selectedIds.has(s.id))];
    renderOrder.forEach((s) => renderShape(s, view));

                if (dimSelection && !getShape(dimSelection.shapeId)) dimSelection = null;
    drawManualEdgeDims(view);
    if (dimSelection && tool === "dim") drawDimSelectionHighlight(view);

            if (polyDraft) drawPolyDraft(view);
    if (lineDraft) drawLineDraft(view);
    if (arrowDraft) drawArrowDraft(view);
    if (drag && drag.type === "edgeRange") drawEdgeRangePreview(view);
    if (drag && drag.type === "marquee") drawMarquee();

    if (selectedIds.size === 1) drawHandles(getShape([...selectedIds][0]), view);

    drawEdgeHover(view);

    emitChange();
  }

  // Retângulo tracejado de seleção múltipla ("arrastar para selecionar
  // várias peças de uma vez", como no Windows/qualquer editor de desenho).
  function drawMarquee() {
    const a = drag.startDraw, b = drag.lastDraw;
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    marqueeLayer.appendChild(neCreateSvgEl("rect", {
      x, y, width: w, height: h, fill: "#2e7dd7", "fill-opacity": "0.08",
      stroke: "#2e7dd7", "stroke-width": "0.4", "stroke-dasharray": "1.4,1", "pointer-events": "none",
    }));
  }

  // Devolve os ids das peças cujo bbox real interseta o retângulo de
  // marquee (em coordenadas de desenho, convertido para real).
  function shapesInMarqueeRect(view) {
    const a = drag.startDraw, b = drag.lastDraw;
    const dx0 = Math.min(a.x, b.x), dx1 = Math.max(a.x, b.x);
    const dy0 = Math.min(a.y, b.y), dy1 = Math.max(a.y, b.y);
    const rx0 = d2rX(dx0, view), rx1 = d2rX(dx1, view);
    const ry0 = d2rY(dy0, view), ry1 = d2rY(dy1, view);
    const out = [];
    shapes.forEach((s) => {
      const bb = neShapeBBox(s);
      if (!bb) return;
      const intersects = bb.minX <= rx1 && bb.maxX >= rx0 && bb.minY <= ry1 && bb.maxY >= ry0;
      if (intersects) out.push(s.id);
    });
    return out;
  }

  function shapeStroke(s) { return selectedIds.has(s.id) ? "#22333B" : "#5a6a7a"; }
  function shapeStrokeW(s) { return selectedIds.has(s.id) ? "0.8" : "0.5"; }
function shapeFill(s) { return selectedIds.has(s.id) ? "#eaf1f580" : "#f8f9fa"; }
    function attachSelect(el, s) {
    el.style.setProperty("cursor", tool === "edge" ? "crosshair" : "move", "important");
    el.addEventListener("pointerdown", (e) => onShapePointerDown(e, s.id));
  }

  // Insere o texto da medida diretamente na camada de cotas (já fica sempre
  // por cima das peças, porque dimsLayer é desenhada depois de shapesLayer).
  function appendLabelBg(x, y, textEl) {
    dimsLayer.appendChild(textEl);
    return textEl;
  }

    // Desenha uma linha de cota "genérica": linha reta entre p1 e p2, com um
  // tracinho perpendicular em cada ponta — usado tanto pelas cotas
  // automáticas do retângulo como pela cota manual, para ficarem SEMPRE
  // com o mesmo aspeto (espessura, comprimento do traço).
  function neDrawDimLine(layer, p1, p2, color) {
    layer.appendChild(neCreateSvgEl("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: color, "stroke-width": "0.3" }));
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    [p1, p2].forEach((p) => {
      layer.appendChild(neCreateSvgEl("line", {
        x1: p.x - nx * 1.2, y1: p.y - ny * 1.2, x2: p.x + nx * 1.2, y2: p.y + ny * 1.2,
        stroke: color, "stroke-width": "0.3",
      }));
    });
  }

  // Cota de um retângulo individual (largura em cima, altura ao lado)
  function drawRectDimensions(s, view, x, y, w, h) {
    const forceInside = !!s.dimsInside;
    const blocked = neSidesBlocked(s);

    // --- largura (cota horizontal): em cima por omissão; se houver peça em
    // cima troca para baixo; se houver dos dois lados, passa para dentro ---
    let wMode = "top";
    if (forceInside || (blocked.top && blocked.bottom)) wMode = "inside";
    else if (blocked.top) wMode = "bottom";

    const topY = wMode === "inside" ? y + 5 : wMode === "bottom" ? y + h + 3 : Math.max(2, y - 3);
        if (wMode !== "inside") {
      neDrawDimLine(dimsLayer, { x, y: topY }, { x: x + w, y: topY }, "#22333B");
    }
    // "inside" (peças dos dois lados): sem a linha de ponta a ponta —
    // fica só o texto da medida, bem visível por cima da peça.
    const wLabelY = wMode === "top" ? topY - 1.2 : wMode === "inside" ? topY : topY + 3.6;
        const wLabel = neCreateSvgEl("text", { x: x + w / 2, y: wLabelY, "text-anchor": "middle", "font-family": "Arial, sans-serif", "font-size": "4.4", "letter-spacing": "0.5", fill: "#22333B" });
    wLabel.textContent = neFormatMeasure(s.w);
    appendLabelBg(x + w / 2, wLabelY, wLabel);

    // --- altura (cota vertical): à esquerda por omissão; se houver peça à
    // esquerda troca para a direita; se houver dos dois lados, passa para dentro ---
    let hMode = "left";
    if (forceInside || (blocked.left && blocked.right)) hMode = "inside";
    else if (blocked.left) hMode = "right";

    // Afasta a linha de cota um pouco mais do contorno da peça (3.2 em vez de
    // 3) e afasta o texto da linha (2.6 em vez de 1.2) para o texto rodado
    // -90º nunca ficar em cima/a tocar a própria linha de cota.
    const leftX = hMode === "inside" ? x + 5 : hMode === "right" ? x + w + 3.2 : Math.max(2, x - 3.2);
        if (hMode !== "inside") {
      neDrawDimLine(dimsLayer, { x: leftX, y }, { x: leftX, y: y + h }, "#22333B");
    }
    const hLabelX = hMode === "left" ? leftX - 2.6 : hMode === "right" ? leftX + 2.6 : leftX;
        const hLabel = neCreateSvgEl("text", {
      x: hLabelX, y: y + h / 2, "text-anchor": "middle", "dominant-baseline": "central", "font-family": "Arial, sans-serif", "font-size": "4.4", "letter-spacing": "0.5", fill: "#22333B",
      transform: `rotate(-90 ${hLabelX} ${y + h / 2})`,
    });
    hLabel.textContent = neFormatMeasure(s.h);
    appendLabelBg(hLabelX, y + h / 2, hLabel);
  }

  function renderShape(s, view) {
    if (s.type === "rect") {
      const x = r2dX(s.x, view), y = r2dY(s.y, view);
      const w = r2dLen(s.w, view), h = r2dLen(s.h, view);
      const path = neCreateSvgEl("path", {
        d: neRectPath(x, y, w, h, (s.r || [0, 0, 0, 0]).map((v) => r2dLen(v, view))),
        fill: shapeFill(s), stroke: shapeStroke(s), "stroke-width": shapeStrokeW(s),
        class: "ne-shape", "data-id": s.id,
      });
      attachSelect(path, s);
      shapesLayer.appendChild(path);
            if (s.label) appendCenteredLabel(x + w / 2, y + h / 2, s.label);
      drawPolishForEdges(s, neShapeVertices(s), view);
      if (s.showDims !== false) drawRectDimensions(s, view, x, y, w, h);
    } else if (s.type === "circle") {
      const cx = r2dX(s.cx, view), cy = r2dY(s.cy, view), r = r2dLen(s.radius, view);
      const circ = neCreateSvgEl("circle", { cx, cy, r, fill: shapeFill(s), stroke: shapeStroke(s), "stroke-width": shapeStrokeW(s), class: "ne-shape", "data-id": s.id });
      attachSelect(circ, s);
      shapesLayer.appendChild(circ);
      if (s.curved && s.curvedText) {
        const pathId = "nePath_" + s.id;
        const arcPath = neCreateSvgEl("path", { id: pathId, d: `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`, fill: "none" });
        defs.appendChild(arcPath);
        const text = neCreateSvgEl("text", { "font-size": "3.4", fill: "#22333B" });
        const textPath = neCreateSvgEl("textPath");
        textPath.setAttributeNS(null, "href", "#" + pathId);
        textPath.setAttribute("startOffset", "50%");
        textPath.setAttribute("text-anchor", "middle");
        textPath.textContent = s.curvedText;
        text.appendChild(textPath);
        text.style.pointerEvents = "none";
        shapesLayer.appendChild(text);
      } else if (s.label) {
        appendCenteredLabel(cx, cy, s.label);
      }
      if (s.edges && s.edges[0] && s.edges[0].polish) drawPolishOnCircle(cx, cy, r);
    } else if (s.type === "polygon") {
      const drawPts = s.points.map((p) => ({ x: r2dX(p.x, view), y: r2dY(p.y, view) }));
      const d = "M " + drawPts.map((p) => `${p.x} ${p.y}`).join(" L ") + " Z";
      const path = neCreateSvgEl("path", { d, fill: shapeFill(s), stroke: shapeStroke(s), "stroke-width": shapeStrokeW(s), class: "ne-shape", "data-id": s.id });
      attachSelect(path, s);
      shapesLayer.appendChild(path);
      if (s.label) {
        const cx = drawPts.reduce((a, p) => a + p.x, 0) / drawPts.length;
        const cy = drawPts.reduce((a, p) => a + p.y, 0) / drawPts.length;
        appendCenteredLabel(cx, cy, s.label);
      }
      drawPolishForEdges(s, neShapeVertices(s), view);
    } else if (s.type === "arrow") {
      const x1 = r2dX(s.x1, view), y1 = r2dY(s.y1, view), x2 = r2dX(s.x2, view), y2 = r2dY(s.y2, view);
      ensureArrowMarker();
      const line = neCreateSvgEl("line", { x1, y1, x2, y2, stroke: selectedIds.has(s.id) ? "#22333B" : "#333", "stroke-width": "0.6", "marker-end": "url(#neArrowHead)", class: "ne-shape", "data-id": s.id });
      line.style.cursor = "move";
      line.addEventListener("pointerdown", (e) => onShapePointerDown(e, s.id));
      shapesLayer.appendChild(line);
            if (s.label) appendPlainLabel((x1 + x2) / 2, (y1 + y2) / 2 - 1.5, s.label);
            } else if (s.type === "line") {
      const x1 = r2dX(s.x1, view), y1 = r2dY(s.y1, view), x2 = r2dX(s.x2, view), y2 = r2dY(s.y2, view);
      const isSelected = selectedIds.has(s.id);
      const isStraight = Math.abs(s.x1 - s.x2) < NE_LINE_STRAIGHT_TOL || Math.abs(s.y1 - s.y2) < NE_LINE_STRAIGHT_TOL;
      // o verde só aparece enquanto a linha está selecionada (feedback ao
      // ajustar); assim que deixa de estar selecionada, volta à cor normal
      const lineColor = (isSelected && isStraight) ? "#2ecc71" : (isSelected ? "#22333B" : "#333");
      const line = neCreateSvgEl("line", {
        x1, y1, x2, y2, stroke: lineColor, "stroke-width": isSelected ? "0.8" : "0.6",
        class: "ne-shape", "data-id": s.id,
        ...(s.dashed ? { "stroke-dasharray": "2,1.4" } : {}),
      });
      line.style.cursor = "move";
      line.addEventListener("pointerdown", (e) => onShapePointerDown(e, s.id));
      shapesLayer.appendChild(line);
            if (s.label) appendPlainLabel((x1 + x2) / 2, (y1 + y2) / 2 - 1.5, s.label);
    } else if (s.type === "brace") {
      const width = s.width || 20;
      const rp = neBracePoints(s.x1, s.y1, s.x2, s.y2, width);
      const dp = {
        x1: r2dX(rp.x1, view), y1: r2dY(rp.y1, view),
        qx1: r2dX(rp.qx1, view), qy1: r2dY(rp.qy1, view),
        qx2: r2dX(rp.qx2, view), qy2: r2dY(rp.qy2, view),
        tx1: r2dX(rp.tx1, view), ty1: r2dY(rp.ty1, view),
        x2: r2dX(rp.x2, view), y2: r2dY(rp.y2, view),
        qx3: r2dX(rp.qx3, view), qy3: r2dY(rp.qy3, view),
        qx4: r2dX(rp.qx4, view), qy4: r2dY(rp.qy4, view),
      };
      const d = `M ${dp.x1} ${dp.y1} Q ${dp.qx1} ${dp.qy1} ${dp.qx2} ${dp.qy2} T ${dp.tx1} ${dp.ty1} M ${dp.x2} ${dp.y2} Q ${dp.qx3} ${dp.qy3} ${dp.qx4} ${dp.qy4} T ${dp.tx1} ${dp.ty1}`;
      const path = neCreateSvgEl("path", {
        d, fill: "none", stroke: selectedIds.has(s.id) ? "#22333B" : "#333", "stroke-width": "0.6",
        class: "ne-shape", "data-id": s.id,
      });
      path.style.cursor = "move";
      path.addEventListener("pointerdown", (e) => onShapePointerDown(e, s.id));
      shapesLayer.appendChild(path);
      if (s.label) appendPlainLabel(dp.tx1 + (width >= 0 ? 3 : -3), dp.ty1, s.label);
    } else if (s.type === "arrow90") {
      const p = neArrow90Points(s);
      const x1 = r2dX(p.x1, view), y1 = r2dY(p.y1, view);
      const cx = r2dX(p.cx, view), cy = r2dY(p.cy, view);
      const x2 = r2dX(p.x2, view), y2 = r2dY(p.y2, view);
      ensureArrowMarker();
      const path = neCreateSvgEl("path", {
        d: `M ${x2} ${y2} L ${cx} ${cy} L ${x1} ${y1}`, fill: "none",
        stroke: selectedIds.has(s.id) ? "#22333B" : "#333", "stroke-width": "0.6",
        "marker-end": "url(#neArrowHead)", class: "ne-shape", "data-id": s.id,
      });
      path.style.cursor = "move";
      path.addEventListener("pointerdown", (e) => onShapePointerDown(e, s.id));
      shapesLayer.appendChild(path);
      if (s.label) appendPlainLabel((cx + x1) / 2, (cy + y1) / 2 - 1.5, s.label);
         } else if (s.type === "frisos") {
      const x = r2dX(s.x, view), y = r2dY(s.y, view);
      const w = r2dLen(s.w, view), h = r2dLen(s.h, view);
      const hit = neCreateSvgEl("rect", { x, y, width: w, height: h, fill: "transparent", stroke: "none", class: "ne-shape", "data-id": s.id });
      attachSelect(hit, s);
      shapesLayer.appendChild(hit);
      const N = 5;
      for (let i = 0; i < N; i++) {
        let lx1, ly1, lx2, ly2;
        if (s.vertical) {
          const lx = x + (w * i) / (N - 1);
          lx1 = lx; ly1 = y; lx2 = lx; ly2 = y + h;
        } else {
          const ly = y + (h * i) / (N - 1);
          lx1 = x; ly1 = ly; lx2 = x + w; ly2 = ly;
        }
        const line = neCreateSvgEl("line", { x1: lx1, y1: ly1, x2: lx2, y2: ly2, stroke: shapeStroke(s), "stroke-width": shapeStrokeW(s) });
        line.style.pointerEvents = "none";
        shapesLayer.appendChild(line);
      }
      if (s.label) appendCenteredLabel(x + w / 2, y + h / 2, s.label);
             } else if (s.type === "text") {
      const x = r2dX(s.x, view), y = r2dY(s.y, view);
      const fontSize = s.fontSize || 4;
      const rot = s.rotation || 0;
      const t = neCreateSvgEl("text", { x, y, "font-size": fontSize, fill: "#22333B", class: "ne-shape", "data-id": s.id });
      const lines = (s.content || "Texto").split("\n");
      const lineHeight = fontSize * 1.2;
      lines.forEach((line, i) => {
        const tspan = neCreateSvgEl("tspan", { x, dy: i === 0 ? 0 : lineHeight });
        tspan.textContent = line.length ? line : " ";
        t.appendChild(tspan);
      });
      t.style.cursor = "move";
      t.addEventListener("pointerdown", (e) => onShapePointerDown(e, s.id));
      shapesLayer.appendChild(t);

      // Roda sempre à volta do CENTRO da caixa de texto (medido já no
      // SVG), nunca à volta do ponto de origem — assim a pega de rotação
      // (que também usa o centro da caixa) fica sempre presa ao texto,
      // tal como no Word.
      const bb = t.getBBox();
      const pivotX = bb.x + bb.width / 2, pivotY = bb.y + bb.height / 2;
      if (rot) t.setAttribute("transform", `rotate(${rot} ${pivotX} ${pivotY})`);

      if (selectedIds.has(s.id)) {
        const outline = neCreateSvgEl("rect", { x: bb.x - 1, y: bb.y - 1, width: bb.width + 2, height: bb.height + 2, fill: "none", stroke: "#22333B", "stroke-width": "0.3", "stroke-dasharray": "1,1" });
        if (rot) outline.setAttribute("transform", `rotate(${rot} ${pivotX} ${pivotY})`);
        shapesLayer.appendChild(outline);
      }
    }
  }

  function appendCenteredLabel(x, y, text) {
    const el = neCreateSvgEl("text", { x, y, "text-anchor": "middle", "dominant-baseline": "middle", "font-size": "3.4", fill: "#22333B", class: "ne-shape-label" });
    el.textContent = text; el.style.pointerEvents = "none";
    shapesLayer.appendChild(el);
  }
  function appendPlainLabel(x, y, text) {
    const el = neCreateSvgEl("text", { x, y, "text-anchor": "middle", "font-size": "3.2", fill: "#22333B" });
    el.textContent = text; el.style.pointerEvents = "none";
    shapesLayer.appendChild(el);
  }

  function ensureArrowMarker() {
    if (defs.querySelector("#neArrowHead")) return;
    const marker = neCreateSvgEl("marker", { id: "neArrowHead", markerWidth: "6", markerHeight: "6", refX: "5", refY: "3", orient: "auto", markerUnits: "strokeWidth" });
    marker.appendChild(neCreateSvgEl("path", { d: "M0,0 L6,3 L0,6 Z", fill: "#22333B" }));
    defs.appendChild(marker);
  }

  function drawPolishForEdges(s, realVerts, view) {
    if (!s.edges || !realVerts.length) return;
    s.edges.forEach((edge, i) => {
      if (!edge.polish) return;
      const a = realVerts[i], b = realVerts[(i + 1) % realVerts.length];
      const segments = nePolishToSegments(edge.polish);
      segments.forEach((seg) => {
        const pa = { x: a.x + (b.x - a.x) * seg.from, y: a.y + (b.y - a.y) * seg.from };
        const pb = { x: a.x + (b.x - a.x) * seg.to, y: a.y + (b.y - a.y) * seg.to };
        const da = { x: r2dX(pa.x, view), y: r2dY(pa.y, view) };
        const db = { x: r2dX(pb.x, view), y: r2dY(pb.y, view) };
        const drawnLen = Math.hypot(db.x - da.x, db.y - da.y);
        const count = neCCountForLength(drawnLen);
        neSegPoints(da, db, count).forEach((p) => {
          // "C" mesmo em cima da linha (sem deslocamento para fora)
        const c = neCreateSvgEl("text", { x: p.x, y: p.y, "text-anchor": "middle", "dominant-baseline": "middle", "font-family": "Arial, sans-serif", "font-size": "4.6", "font-weight": "700", fill: "#c0392b" });
          c.textContent = "C"; c.style.pointerEvents = "none";
          polishLayer.appendChild(c);
        });
      });
    });
  }

  function drawPolishOnCircle(cx, cy, r) {
    const count = neCCountForLength(2 * Math.PI * r);
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r;
    const c = neCreateSvgEl("text", { x: px, y: py, "text-anchor": "middle", "dominant-baseline": "middle", "font-family": "Arial, sans-serif", "font-size": "4.6", "font-weight": "700", fill: "#c0392b" });
      c.textContent = "C"; c.style.pointerEvents = "none";
      polishLayer.appendChild(c);
    }
  }

   // Deteta se há outra peça a "tapar" o lado de fora de uma aresta (o
  // sítio onde a cota normalmente ficaria) — igual em espírito ao
  // neSidesBlocked do retângulo, mas genérico para qualquer aresta.
  function neEdgeSideBlocked(s, edgeIdx, verts, allShapes) {
    const a = verts[edgeIdx], b = verts[(edgeIdx + 1) % verts.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    let nx = -uy, ny = ux;
    const bb = neShapeBBox(s);
    const centroid = bb ? { x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 } : { x: a.x, y: a.y };
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const toCentroid = { x: centroid.x - mid.x, y: centroid.y - mid.y };
    if (nx * toCentroid.x + ny * toCentroid.y > 0) { nx = -nx; ny = -ny; }
    const tol = 6;
    let blocked = false;
    allShapes.forEach((o) => {
      if (o.id === s.id || blocked) return;
      const ob = neShapeBBox(o);
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

  // Desenha a cota manual de qualquer aresta com valor escrito (edge.dimValue).
  // Usa o MESMO estilo visual das cotas do retângulo: linha com tracinhos
  // nas pontas por fora; se houver outra peça encostada a bloquear esse
  // lado, passa automaticamente para "por dentro" (só o texto, sem linha).
      function drawManualEdgeDims(view) {
    shapes.forEach((s) => {
      if (!s.edges || (s.type !== "rect" && s.type !== "polygon")) return;
      const verts = neShapeVertices(s);
      if (!verts.length) return;
      const bb = neShapeBBox(s);
      const centroid = bb
        ? { x: r2dX((bb.minX + bb.maxX) / 2, view), y: r2dY((bb.minY + bb.maxY) / 2, view) }
        : { x: 0, y: 0 };
      s.edges.forEach((edge, i) => {
        if (edge.dimValue === undefined || edge.dimValue === null) return;
                const DIM_COLOR = "#22333B";

        const a = verts[i], b = verts[(i + 1) % verts.length];
        const da = { x: r2dX(a.x, view), y: r2dY(a.y, view) };
        const db = { x: r2dX(b.x, view), y: r2dY(b.y, view) };
        const dx = db.x - da.x, dy = db.y - da.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        let nx = -uy, ny = ux;
        const midD = { x: (da.x + db.x) / 2, y: (da.y + db.y) / 2 };
        const toCentroid = { x: centroid.x - midD.x, y: centroid.y - midD.y };
        if (nx * toCentroid.x + ny * toCentroid.y > 0) { nx = -nx; ny = -ny; }

        const blocked = edge.dimInside === undefined ? neEdgeSideBlocked(s, i, verts, shapes) : edge.dimInside;
                const labelText = neFormatMeasure(edge.dimValue);
        let angDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (angDeg >= 90) angDeg -= 180;
        else if (angDeg < -90) angDeg += 180;

                if (blocked) {
          const inOffset = 5;
          const tx = midD.x - nx * inOffset, ty = midD.y - ny * inOffset;
          const label = neCreateSvgEl("text", {
            x: tx, y: ty, "text-anchor": "middle", "dominant-baseline": "middle", "font-family": "Arial, sans-serif",
            "font-size": "4.4", "letter-spacing": "0.5", fill: DIM_COLOR,
            transform: `rotate(${angDeg} ${tx} ${ty})`,
          });
          label.textContent = labelText;
          dimsLayer.appendChild(label);
                } else {
          const offset = 3.2;
          const doa = { x: da.x + nx * offset, y: da.y + ny * offset };
          const dob = { x: db.x + nx * offset, y: db.y + ny * offset };
          neDrawDimLine(dimsLayer, doa, dob, DIM_COLOR);
          const midX = (doa.x + dob.x) / 2, midY = (doa.y + dob.y) / 2;
          const labelX = midX + nx * 2.6, labelY = midY + ny * 2.6;
          const label = neCreateSvgEl("text", {
            x: labelX, y: labelY, "text-anchor": "middle", "dominant-baseline": "central", "font-family": "Arial, sans-serif",
            "font-size": "4.4", "letter-spacing": "0.5", fill: DIM_COLOR,
            transform: `rotate(${angDeg} ${labelX} ${labelY})`,
          });
          label.textContent = labelText;
          dimsLayer.appendChild(label);
        }
      });
    });
  }

  // Destaca (azul) a aresta atualmente escolhida no modo "Cota manual"
  function drawDimSelectionHighlight(view) {
    const s = getShape(dimSelection.shapeId);
    if (!s || !s.edges) { dimSelection = null; return; }
    const verts = neShapeVertices(s);
    const a = verts[dimSelection.edgeIdx], b = verts[(dimSelection.edgeIdx + 1) % verts.length];
    if (!a || !b) return;
    const da = { x: r2dX(a.x, view), y: r2dY(a.y, view) };
    const db = { x: r2dX(b.x, view), y: r2dY(b.y, view) };
    hoverLayer.appendChild(neCreateSvgEl("line", {
      x1: da.x, y1: da.y, x2: db.x, y2: db.y, stroke: "#2e7dd7", "stroke-width": "1.1",
      "stroke-linecap": "round", "pointer-events": "none",
    }));
  }

  // Pré-visualização, enquanto se arrasta, do troço "daqui a daqui" que vai ficar marcado
   function drawEdgeRangePreview(view) {
    const s = getShape(drag.shapeId);
    if (!s) return;
    const verts = neShapeVertices(s);
    const a = verts[drag.edgeIdx], b = verts[(drag.edgeIdx + 1) % verts.length];
    if (!a || !b) return;
    const t0 = Math.min(drag.t0, drag.t1), t1 = Math.max(drag.t0, drag.t1);
    const pa = { x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0 };
    const pb = { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 };
    const da = { x: r2dX(pa.x, view), y: r2dY(pa.y, view) };
    const db = { x: r2dX(pb.x, view), y: r2dY(pb.y, view) };

    draftLayer.appendChild(neCreateSvgEl("line", {
      x1: da.x, y1: da.y, x2: db.x, y2: db.y,
      stroke: "#e53935", "stroke-width": "0.9", "stroke-linecap": "round", "pointer-events": "none",
    }));
    [da, db].forEach((p) => {
      draftLayer.appendChild(neCreateSvgEl("circle", { cx: p.x, cy: p.y, r: 1.1, fill: "#e53935", stroke: "#fff", "stroke-width": "0.3", "pointer-events": "none" }));
    });

    const realLen = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    const midX = (da.x + db.x) / 2, midY = (da.y + db.y) / 2;
    const angle = Math.atan2(db.y - da.y, db.x - da.x);
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    const lx = midX + nx * 4.5, ly = midY + ny * 4.5;

    draftLayer.appendChild(neCreateSvgEl("text", {
      x: lx, y: ly, "text-anchor": "middle", "dominant-baseline": "middle",
      "font-family": "Arial, sans-serif", "font-size": "3.6", "font-weight": "700",
      fill: "#22333B", stroke: "#ffffff", "stroke-width": "2.6", "paint-order": "stroke",
      "pointer-events": "none",
    })).textContent = neFormatMeasure(realLen);
  }

  function drawPolyDraft(view) {
    if (!polyDraft || polyDraft.points.length === 0) {
      if (polyDraft && polyDraft.preview) {
        // ainda sem pontos: nada a desenhar
      }
      return;
    }
    const drawPts = polyDraft.points.map((p) => ({ x: r2dX(p.x, view), y: r2dY(p.y, view) }));
    const d = "M " + drawPts.map((p) => `${p.x} ${p.y}`).join(" L ");
    draftLayer.appendChild(neCreateSvgEl("path", { d, fill: "none", stroke: "#2e4752", "stroke-width": "0.6", "stroke-dasharray": "1.5,1" }));
    drawPts.forEach((p, i) => {
      draftLayer.appendChild(neCreateSvgEl("circle", { cx: p.x, cy: p.y, r: i === 0 ? 2 : 1.4, fill: i === 0 ? "#c0392b" : "#2e4752", stroke: "#fff", "stroke-width": "0.3" }));
    });
    if (polyDraft.preview) {
      const last = drawPts[drawPts.length - 1];
      const pv = { x: r2dX(polyDraft.preview.x, view), y: r2dY(polyDraft.preview.y, view) };
      draftLayer.appendChild(neCreateSvgEl("line", {
        x1: last.x, y1: last.y, x2: pv.x, y2: pv.y,
        stroke: polyDraft.aligned ? "#2ecc71" : "#9aa7ad", "stroke-width": polyDraft.aligned ? "0.7" : "0.4",
        "stroke-dasharray": polyDraft.aligned ? "none" : "1,1",
      }));
    }
  }

    function getTextRotationInfo(s, view) {
    const textEl = shapesLayer.querySelector(`text.ne-shape[data-id="${s.id}"]`);
    if (textEl) {
      const bb = textEl.getBBox();
      return { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2, halfH: bb.height / 2 };
    }
    const fontSize = s.fontSize || 4;
    return { cx: r2dX(s.x, view), cy: r2dY(s.y, view), halfH: fontSize * 0.6 };
  }

  function drawHandles(s, view) {
    if (!s) return;
    if (s.type === "rect") {
      const x = r2dX(s.x, view), y = r2dY(s.y, view), w = r2dLen(s.w, view), h = r2dLen(s.h, view);
      [{ key: "tl", x, y }, { key: "tr", x: x + w, y }, { key: "bl", x, y: y + h }, { key: "br", x: x + w, y: y + h }]
        .forEach((c) => appendHandle(c.x, c.y, c.key, (e) => onHandlePointerDown(e, s.id, c.key)));
    } else if (s.type === "circle") {
      const cx = r2dX(s.cx, view), cy = r2dY(s.cy, view), r = r2dLen(s.radius, view);
      appendHandle(cx + r, cy, "radius", (e) => onCircleHandlePointerDown(e, s.id));
       } else if (s.type === "polygon") {
      const bb = neShapeBBox(s);
      if (bb) {
        appendHandle(r2dX(bb.maxX, view), r2dY(bb.maxY, view), "br", (e) => onPolygonScalePointerDown(e, s.id));
      }
    } else if (s.type === "frisos") {
      const x = r2dX(s.x, view), y = r2dY(s.y, view), w = r2dLen(s.w, view), h = r2dLen(s.h, view);
      appendHandle(x + w, y + h, "br", (e) => onFrisosScalePointerDown(e, s.id));
        } else if (s.type === "arrow") {
      appendHandle(r2dX(s.x1, view), r2dY(s.y1, view), "a1", (e) => onArrowEndPointerDown(e, s.id, "x1", "y1"));
      appendHandle(r2dX(s.x2, view), r2dY(s.y2, view), "a2", (e) => onArrowEndPointerDown(e, s.id, "x2", "y2"));
        } else if (s.type === "line") {
      appendHandle(r2dX(s.x1, view), r2dY(s.y1, view), "a1", (e) => onArrowEndPointerDown(e, s.id, "x1", "y1"));
      appendHandle(r2dX(s.x2, view), r2dY(s.y2, view), "a2", (e) => onArrowEndPointerDown(e, s.id, "x2", "y2"));
    } else if (s.type === "brace") {
      appendHandle(r2dX(s.x1, view), r2dY(s.y1, view), "a1", (e) => onArrowEndPointerDown(e, s.id, "x1", "y1"));
      appendHandle(r2dX(s.x2, view), r2dY(s.y2, view), "a2", (e) => onArrowEndPointerDown(e, s.id, "x2", "y2"));
       } else if (s.type === "arrow90") {
      // Só as DUAS pontas são arrastáveis (sem pega no canto/dobra e sem
      // rotação) — arrastar qualquer ponta só estica/encolhe essa perna,
      // sempre na mesma direção fixa; a outra perna mantém-se sempre a
      // 90º, sem nunca rodar.
      const p = neArrow90Points(s);
      appendHandle(r2dX(p.x1, view), r2dY(p.y1, view), "a1", (e) => onArrow90EndPointerDown(e, s.id, "tip"));
      appendHandle(r2dX(p.x2, view), r2dY(p.y2, view), "a2", (e) => onArrow90EndPointerDown(e, s.id, "tail"));
          } else if (s.type === "text") {
      const info = getTextRotationInfo(s, view);
      const rot = ((s.rotation || 0) * Math.PI) / 180;
      const gap = 4; // mm no papel — folga entre o topo da caixa e a pega
      const R = info.halfH + gap;
      const hx = info.cx + Math.sin(rot) * R;
      const hy = info.cy - Math.cos(rot) * R;
      handlesLayer.appendChild(neCreateSvgEl("line", { x1: info.cx, y1: info.cy, x2: hx, y2: hy, stroke: "#9aa7ad", "stroke-width": "0.4", "stroke-dasharray": "1,1" }));
      const handle = neCreateSvgEl("circle", { cx: hx, cy: hy, r: 2.3, fill: "#22333B", stroke: "#fff", "stroke-width": "0.4", class: "ne-handle" });
      handle.style.cursor = "grab";
      handle.addEventListener("pointerdown", (e) => onTextRotateHandlePointerDown(e, s.id));
      handlesLayer.appendChild(handle);
    }
  }

  function appendHandle(x, y, key, handler) {
    const handle = neCreateSvgEl("rect", { x: x - 2, y: y - 2, width: 4, height: 4, fill: "#22333B", stroke: "#ffffff", "stroke-width": "0.4", class: "ne-handle", "data-corner": key });
    handle.style.cursor = key === "tl" || key === "br" ? "nwse-resize" : key === "tr" || key === "bl" ? "nesw-resize" : "pointer";
    handle.addEventListener("pointerdown", handler);
    handlesLayer.appendChild(handle);
  }

  // ---------------------------------------------------------------
  // GUIAS DE ALINHAMENTO (snap) — genérico, funciona para qualquer tipo
  // ---------------------------------------------------------------
  function collectSnapTargets(excludeIds) {
    const xs = [], ys = [];
    shapes.forEach((s) => {
      if (excludeIds.has(s.id)) return;
        if (s.type === "rect" || s.type === "frisos") { xs.push(s.x, s.x + s.w / 2, s.x + s.w); ys.push(s.y, s.y + s.h / 2, s.y + s.h); }
      else if (s.type === "circle") { xs.push(s.cx - s.radius, s.cx, s.cx + s.radius); ys.push(s.cy - s.radius, s.cy, s.cy + s.radius); }
      else if (s.type === "polygon") {
        const bx = s.points.map((p) => p.x), by = s.points.map((p) => p.y);
        xs.push(Math.min(...bx), Math.max(...bx)); ys.push(Math.min(...by), Math.max(...by));
      }
    });
    return { xs, ys };
  }

  // Devolve {dx,dy} ajustado para a forma "s" (nas coordenadas ORIGINAIS antes do delta) alinhar
  function snapDeltaForShape(s, dx, dy, view, excludeIds) {
    const tol = d2rLen(2, view);
    const { xs, ys } = collectSnapTargets(excludeIds);
    let candX = [], candY = [];
        if (s.type === "rect" || s.type === "frisos") {
      candX = [s.x + dx, s.x + dx + s.w / 2, s.x + dx + s.w];
      candY = [s.y + dy, s.y + dy + s.h / 2, s.y + dy + s.h];
    } else if (s.type === "circle") {
      candX = [s.cx + dx - s.radius, s.cx + dx, s.cx + dx + s.radius];
      candY = [s.cy + dy - s.radius, s.cy + dy, s.cy + dy + s.radius];
    } else if (s.type === "polygon") {
      const bx = s.points.map((p) => p.x + dx), by = s.points.map((p) => p.y + dy);
      candX = [Math.min(...bx), Math.max(...bx)];
      candY = [Math.min(...by), Math.max(...by)];
    } else {
      return { dx, dy };
    }
    let bestDx = dx, bestDxDist = tol, snapVX = null;
    candX.forEach((cx) => xs.forEach((tx) => { const d = Math.abs(cx - tx); if (d < bestDxDist) { bestDxDist = d; bestDx = dx + (tx - cx); snapVX = tx; } }));
    let bestDy = dy, bestDyDist = tol, snapVY = null;
    candY.forEach((cy) => ys.forEach((ty) => { const d = Math.abs(cy - ty); if (d < bestDyDist) { bestDyDist = d; bestDy = dy + (ty - cy); snapVY = ty; } }));
    if (snapVX !== null) guideLines.v = snapVX;
    if (snapVY !== null) guideLines.h = snapVY;
    return { dx: bestDx, dy: bestDy };
  }

  function renderGuides(view) {
    guidesLayer.innerHTML = "";
    if (guideLines.v !== null) {
      const x = r2dX(guideLines.v, view);
      guidesLayer.appendChild(neCreateSvgEl("line", { x1: x, y1: 0, x2: x, y2: NE_PAGE_H, stroke: "#e91e63", "stroke-width": "0.3", "stroke-dasharray": "1.5,1" }));
    }
    if (guideLines.h !== null) {
      const y = r2dY(guideLines.h, view);
      guidesLayer.appendChild(neCreateSvgEl("line", { x1: 0, y1: y, x2: NE_PAGE_W, y2: y, stroke: "#e91e63", "stroke-width": "0.3", "stroke-dasharray": "1.5,1" }));
    }
  }
  function clearGuides() { guideLines = { v: null, h: null }; guidesLayer.innerHTML = ""; }

  // ---------------------------------------------------------------
  // INTERAÇÃO — seleção, mover (grupo), redimensionar
  // ---------------------------------------------------------------
  function nearestEdgeIndex(s, realPoint) {
    const verts = neShapeVertices(s);
    if (!verts.length) return s.type === "circle" ? 0 : null;
    let best = 0, bestDist = Infinity;
    verts.forEach((a, i) => { const b = verts[(i + 1) % verts.length]; const d = neDistToSeg(realPoint, a, b); if (d < bestDist) { bestDist = d; best = i; } });
    return best;
  }

  // Todas as arestas (de qualquer peça) suficientemente perto do ponto — para
  // detetar "linha em cima da outra" quando peças estão encostadas/sobrepostas.
  const NE_EDGE_HOVER_MAX_DRAW_DIST = 3; // mm no desenho (papel)
  function findEdgeCandidatesAt(realPoint, view) {
    const maxRealDist = NE_EDGE_HOVER_MAX_DRAW_DIST * view.den;
    const out = [];
    shapes.forEach((s) => {
      if (s.type !== "rect" && s.type !== "polygon") return;
      const verts = neShapeVertices(s);
      verts.forEach((a, i) => {
        const b = verts[(i + 1) % verts.length];
        const d = neDistToSeg(realPoint, a, b);
        if (d <= maxRealDist) out.push({ id: s.id, idx: i, dist: d });
      });
    });
    out.sort((a, b) => a.dist - b.dist);
    return out;
  }

  // ---------------------------------------------------------------
  // DESTAQUE (hover) DA LINHA — modo "Marcar polimento"
  // Mostra a vermelho a linha exata que vai ser marcada ao clicar,
  // essencial quando há peças sobrepostas. Se a aresta tiver um troço
  // tapado por outra peça encostada (ex.: 1m com um bloco de 60cm
  // encostado), o troço LIVRE é realçado mais forte (é esse que vai ser
  // marcado com um clique simples) e o troço tapado aparece esbatido.
  // ---------------------------------------------------------------
  function clearEdgeHover() {
    if (!hoverEdgeInfo) return;
    hoverEdgeInfo = null;
    hoverLayer.innerHTML = "";
  }

    function drawEdgeHover(view) {
    hoverLayer.innerHTML = "";
    if (!hoverEdgeInfo) return;
    const s = getShape(hoverEdgeInfo.id);
    if (!s) { hoverEdgeInfo = null; return; }

    const hoverColor = tool === "dim" ? "#2d7cd6" : "#e53935";

    if (s.type === "circle") {
      const cx = r2dX(s.cx, view), cy = r2dY(s.cy, view), r = r2dLen(s.radius, view);
      // contorno branco por baixo para dar contraste em qualquer fundo
            hoverLayer.appendChild(neCreateSvgEl("circle", {
        cx, cy, r, fill: "none", stroke: "#ffffff", "stroke-width": "1.8", "pointer-events": "none",
      }));
      hoverLayer.appendChild(neCreateSvgEl("circle", {
        cx, cy, r, fill: "none", stroke: hoverColor, "stroke-width": "0.9", "pointer-events": "none",
      }));
      return;
    }

    const verts = neShapeVertices(s);
    const i = hoverEdgeInfo.idx;
    if (!verts.length || i == null || !verts[i]) return;
    const a = verts[i], b = verts[(i + 1) % verts.length];
    const da = { x: r2dX(a.x, view), y: r2dY(a.y, view) };
    const db = { x: r2dX(b.x, view), y: r2dY(b.y, view) };

    // troço(s) tapados por outras peças encostadas a esta mesma linha
    const covered = neEdgeCoveredRanges(shapes, s.id, i);
    const exposed = neInvertSegments(covered);
    hoverEdgeInfo.exposedRanges = exposed;
    hoverEdgeInfo.coveredRanges = covered;

    const drawSeg = (t0, t1, color, width, dash) => {
      const pa = { x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0 };
      const pb = { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 };
      const dpa = { x: r2dX(pa.x, view), y: r2dY(pa.y, view) };
      const dpb = { x: r2dX(pb.x, view), y: r2dY(pb.y, view) };
      // contorno branco por baixo, para a linha se destacar sempre do fundo
            hoverLayer.appendChild(neCreateSvgEl("line", {
        x1: dpa.x, y1: dpa.y, x2: dpb.x, y2: dpb.y,
        stroke: "#ffffff", "stroke-width": String(width + 0.8), "stroke-linecap": "round", "pointer-events": "none",
      }));
      hoverLayer.appendChild(neCreateSvgEl("line", {
        x1: dpa.x, y1: dpa.y, x2: dpb.x, y2: dpb.y,
        stroke: color, "stroke-width": String(width), "stroke-linecap": "round", "pointer-events": "none",
        ...(dash ? { "stroke-dasharray": dash } : {}),
      }));
    };

        if (covered.length && exposed.length) {
      covered.forEach((seg) => drawSeg(seg.from, seg.to, "#b0b8bd", 0.7, "1,1"));
      exposed.forEach((seg) => drawSeg(seg.from, seg.to, hoverColor, 1.1, null));
    } else {
      drawSeg(0, 1, hoverColor, 0.9, null);
    }

    // Várias peças encostadas/sobrepostas têm uma linha no mesmo sítio:
    // mostra um botão para trocar qual delas fica em destaque (e vai ser marcada).
    const candidates = hoverEdgeInfo.candidates || [];
    if (candidates.length > 1) {
      const mx = (da.x + db.x) / 2, my = (da.y + db.y) / 2;
      const angle = Math.atan2(db.y - da.y, db.x - da.x);
      const nx = -Math.sin(angle), ny = Math.cos(angle);
      const bx = mx + nx * 5.5, by = my + ny * 5.5;
      const cycle = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        const total = hoverEdgeInfo.candidates.length;
        hoverEdgeInfo.candidateIndex = (hoverEdgeInfo.candidateIndex + 1) % total;
        const next = hoverEdgeInfo.candidates[hoverEdgeInfo.candidateIndex];
        hoverEdgeInfo.id = next.id;
        hoverEdgeInfo.idx = next.idx;
        drawEdgeHover(view);
      };
      const badge = neCreateSvgEl("circle", { cx: bx, cy: by, r: 3.2, fill: "#22333B", stroke: "#fff", "stroke-width": "0.5" });
      badge.style.cursor = "pointer";
      const badgeTitle = neCreateSvgEl("title");
      badgeTitle.textContent = "Há mais do que uma linha aqui — toca para trocar";
      badge.appendChild(badgeTitle);
      const label = neCreateSvgEl("text", { x: bx, y: by, "text-anchor": "middle", "dominant-baseline": "middle", "font-size": "3.4", "font-weight": "700", fill: "#fff" });
      label.style.cursor = "pointer";
      label.style.userSelect = "none";
      label.textContent = String(candidates.length);
      badge.addEventListener("pointerdown", cycle);
      label.addEventListener("pointerdown", cycle);
      hoverLayer.appendChild(badge);
      hoverLayer.appendChild(label);
    }
  }

  // Atualiza qual a aresta mais próxima do rato — olhando para TODAS as peças
  // (não só a que está por cima), para detetar linhas encostadas/sobrepostas.
  function updateEdgeHoverFromEvent(e) {
    const view = currentView || computeView();
    const shapeEl = e.target && e.target.closest ? e.target.closest(".ne-shape") : null;
    const topShape = shapeEl && shapeEl.dataset && shapeEl.dataset.id ? getShape(shapeEl.dataset.id) : null;

    // círculos não têm arestas comparáveis a outras peças — usa sempre a peça de cima
    if (topShape && topShape.type === "circle") {
      hoverEdgeInfo = { id: topShape.id, idx: 0, candidates: [{ id: topShape.id, idx: 0, dist: 0 }], candidateIndex: 0 };
      drawEdgeHover(view);
      return;
    }

    const pDraw = toSvgPoint(e.clientX, e.clientY);
    const realPoint = { x: d2rX(pDraw.x, view), y: d2rY(pDraw.y, view) };
    const candidates = findEdgeCandidatesAt(realPoint, view);

    if (!candidates.length) { hoverEdgeInfo = null; hoverLayer.innerHTML = ""; return; }

    // por omissão começa na peça que está visualmente por cima do rato;
    // se não estiver entre as candidatas, usa a linha mais próxima
    let startIndex = topShape ? candidates.findIndex((c) => c.id === topShape.id) : -1;
    if (startIndex < 0) startIndex = 0;
    const chosen = candidates[startIndex];
    hoverEdgeInfo = { id: chosen.id, idx: chosen.idx, candidates, candidateIndex: startIndex };
    drawEdgeHover(view);
  }

   function onShapePointerDown(e, id) {
    // Enquanto se desenha um polígono ou uma linha, um clique em cima de
    // outra peça não pode selecionar nem arrastar essa peça — tem de
    // "passar por baixo" para colocar o ponto, como se fosse folha vazia.
    if (polyDraft || lineDraft) return;

    e.stopPropagation();
    const s = getShape(id);
    if (!s) return;

        if (tool === "edge" || tool === "dim") {
      const view = computeView();
      const pDraw = toSvgPoint(e.clientX, e.clientY);
      const realPoint = { x: d2rX(pDraw.x, view), y: d2rY(pDraw.y, view) };

      // Usa a linha atualmente em destaque (pode ter sido trocada com o botão
      // de ciclo, quando há peças encostadas/sobrepostas nesse ponto);
      // caso contrário cai para a aresta mais próxima da peça clicada.
      let targetShape = s;
      let idx = nearestEdgeIndex(s, realPoint);
      let exposedRanges = null;
      if (hoverEdgeInfo) {
        const hs = getShape(hoverEdgeInfo.id);
        if (hs) { targetShape = hs; idx = hoverEdgeInfo.idx; exposedRanges = hoverEdgeInfo.exposedRanges || null; }
      }
      if (idx === null) return;
      if (!targetShape.edges) targetShape.edges = targetShape.type === "circle" ? [{ polish: false }] : neRectEdgesDefault();

      if (tool === "dim") {
        if (targetShape.type === "circle") return; // cota manual não se aplica a círculos
        dimSelection = { shapeId: targetShape.id, edgeIdx: idx };
        emitDimChange();
        render();
        return;
      }

      if (targetShape.type === "circle") {
        // círculo: só existe uma aresta (o contorno todo) — mantém o toggle simples
        targetShape.edges[0].polish = !targetShape.edges[0].polish;
        render();
        return;
      }

      // rect/polígono: clique simples = alterna só o troço LIVRE (se a linha
      // tiver parte tapada por outra peça encostada, é detetado automaticamente
      // e só esse troço "sobra" é que fica marcado, sem ser preciso arrastar);
      // arrastar ao longo da linha continua a marcar/apagar um troço à medida.
      const verts = neShapeVertices(targetShape);
      const a = verts[idx], b = verts[(idx + 1) % verts.length];
      const t0 = neProjectT(realPoint, a, b);
      drag = {
        type: "edgeRange", shapeId: targetShape.id, edgeIdx: idx, viewSnapshot: view,
        t0, t1: t0, startDraw: pDraw, lastDraw: pDraw, exposedRanges,
      };
      render();
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      return;
    }

    if (e.shiftKey) {
      if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
      render();
      return; // shift-click só alterna seleção, não inicia arrasto
    }

    if (!selectedIds.has(id)) selectedIds = new Set([id]);

    const view = computeView();
    const p = toSvgPoint(e.clientX, e.clientY);
    const startReal = { x: d2rX(p.x, view), y: d2rY(p.y, view) };
    const items = [...selectedIds].map((sid) => ({ id: sid, orig: cloneShape(getShape(sid)) }));
    drag = { type: "groupMove", viewSnapshot: view, startReal, items };
    render();
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function selectOnly(id) { selectedIds = id ? new Set([id]) : new Set(); render(); }
  function cloneShape(s) { return JSON.parse(JSON.stringify(s)); }

  function onHandlePointerDown(e, id, corner) {
    e.stopPropagation();
    selectOnly(id);
    drag = { type: "resize", shapeId: id, corner, viewSnapshot: computeView(), orig: cloneShape(getShape(id)) };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }
  function onCircleHandlePointerDown(e, id) {
    e.stopPropagation();
    selectOnly(id);
    drag = { type: "radius", shapeId: id, viewSnapshot: computeView() };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }
  function onFrisosScalePointerDown(e, id) {
    e.stopPropagation();
    selectOnly(id);
    drag = { type: "frisosScale", shapeId: id, viewSnapshot: computeView(), orig: cloneShape(getShape(id)) };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }
    function onPolygonScalePointerDown(e, id) {
    e.stopPropagation();
    selectOnly(id);
    drag = { type: "polygonScale", shapeId: id, viewSnapshot: computeView(), orig: cloneShape(getShape(id)) };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  
  }
  function onArrowEndPointerDown(e, id, propX, propY) {
    e.stopPropagation();
    selectOnly(id);
    drag = { type: "arrowEnd", shapeId: id, propX, propY, viewSnapshot: computeView() };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  // Pega de uma ponta da seta 90º — "which" é 'tip' (ponta com seta,
  // perna 1) ou 'tail' (cauda, perna 2). Ver onPointerMove/"arrow90End":
  // só permite esticar/encolher, nunca rodar.
   function onArrow90EndPointerDown(e, id, which) {
    e.stopPropagation();
    selectOnly(id);
    drag = { type: "arrow90End", shapeId: id, which, viewSnapshot: computeView() };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function onTextRotateHandlePointerDown(e, id) {
    e.stopPropagation();
    selectOnly(id);
    drag = { type: "textRotate", shapeId: id, viewSnapshot: computeView() };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(e) {
    if (!drag) return;
    const view = drag.viewSnapshot;
    const p = toSvgPoint(e.clientX, e.clientY);
    const realP = { x: d2rX(p.x, view), y: d2rY(p.y, view) };

    if (drag.type === "groupMove") {
      let dx = realP.x - drag.startReal.x, dy = realP.y - drag.startReal.y;
      if (drag.items.length === 1) {
        const item = drag.items[0];
        const excludeIds = new Set([item.id]);
        const snapped = snapDeltaForShape(item.orig, dx, dy, view, excludeIds);
        dx = snapped.dx; dy = snapped.dy;
        renderGuides(view);
      }
      drag.items.forEach((item) => {
        const s = getShape(item.id);
        if (!s) return;
        const o = item.orig;
        if (s.type === "rect") { s.x = o.x + dx; s.y = o.y + dy; }
        else if (s.type === "circle") { s.cx = o.cx + dx; s.cy = o.cy + dy; }
        else if (s.type === "polygon") { s.points = o.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })); }
        else if (s.type === "arrow") { s.x1 = o.x1 + dx; s.y1 = o.y1 + dy; s.x2 = o.x2 + dx; s.y2 = o.y2 + dy; }
        else if (s.type === "line") { s.x1 = o.x1 + dx; s.y1 = o.y1 + dy; s.x2 = o.x2 + dx; s.y2 = o.y2 + dy; }
        else if (s.type === "brace") { s.x1 = o.x1 + dx; s.y1 = o.y1 + dy; s.x2 = o.x2 + dx; s.y2 = o.y2 + dy; }
                else if (s.type === "arrow90") { s.cx = o.cx + dx; s.cy = o.cy + dy; }
        else if (s.type === "text") { s.x = o.x + dx; s.y = o.y + dy; }
        else if (s.type === "frisos") { s.x = o.x + dx; s.y = o.y + dy; }
      });
    } else if (drag.type === "resize") {
      const s = getShape(drag.shapeId);
      const o = drag.orig;
      let { x, y, w, h } = o;
      if (drag.corner === "br") { w = Math.max(NE_MIN_REAL, realP.x - o.x); h = Math.max(NE_MIN_REAL, realP.y - o.y); }
      else if (drag.corner === "tl") { const nx = Math.min(realP.x, o.x + o.w - NE_MIN_REAL); const ny = Math.min(realP.y, o.y + o.h - NE_MIN_REAL); w = o.x + o.w - nx; h = o.y + o.h - ny; x = nx; y = ny; }
      else if (drag.corner === "tr") { const ny = Math.min(realP.y, o.y + o.h - NE_MIN_REAL); w = Math.max(NE_MIN_REAL, realP.x - o.x); h = o.y + o.h - ny; y = ny; }
      else if (drag.corner === "bl") { const nx = Math.min(realP.x, o.x + o.w - NE_MIN_REAL); w = o.x + o.w - nx; h = Math.max(NE_MIN_REAL, realP.y - o.y); x = nx; }
      s.x = x; s.y = y; s.w = w; s.h = h;
    } else if (drag.type === "radius") {
      const s = getShape(drag.shapeId);
      s.radius = Math.max(NE_MIN_REAL / 2, Math.hypot(realP.x - s.cx, realP.y - s.cy));
        } else if (drag.type === "vertex") {
      const s = getShape(drag.shapeId);
      s.points[drag.idx] = { x: realP.x, y: realP.y };
    } else if (drag.type === "polygonScale") {
      const s = getShape(drag.shapeId);
      const o = drag.orig;
      if (s && o.points && o.points.length) {
        const xs = o.points.map((p) => p.x), ys = o.points.map((p) => p.y);
        const originX = Math.min(...xs), originY = Math.min(...ys);
        const ow = Math.max(Math.max(...xs) - originX, 1e-6);
        const oh = Math.max(Math.max(...ys) - originY, 1e-6);
        const diag2 = ow * ow + oh * oh || 1;
        const dx = realP.x - originX, dy = realP.y - originY;
        const minFactor = NE_MIN_REAL / Math.max(ow, oh);
        const factor = Math.max((dx * ow + dy * oh) / diag2, minFactor);
        s.points = o.points.map((p) => ({
          x: originX + (p.x - originX) * factor,
          y: originY + (p.y - originY) * factor,
        }));
      }
    } else if (drag.type === "frisosScale") {
      const s = getShape(drag.shapeId);
      const o = drag.orig;
      if (s) {
        const diag2 = o.w * o.w + o.h * o.h || 1;
        const dx = realP.x - o.x, dy = realP.y - o.y;
        const factor = Math.max((dx * o.w + dy * o.h) / diag2, NE_MIN_REAL / Math.max(o.w, o.h));
        s.w = Math.max(NE_MIN_REAL, o.w * factor);
        s.h = Math.max(NE_MIN_REAL, o.h * factor);
      }
    } else if (drag.type === "arrowEnd") {
      const s = getShape(drag.shapeId);
      s[drag.propX] = realP.x; s[drag.propY] = realP.y;
    } else if (drag.type === "arrow90End") {
      // Arrastar uma ponta só estica/encolhe essa perna — a direção de
      // cada perna é FIXA (definida na criação, ver NE_ARROW90_PRESETS)
      // e nunca muda. O rato é projetado nessa direção fixa; mover o
      // rato para os lados não roda nada, só o "avanço" ao longo da
      // direção da perna conta. Assim mantém-se sempre reto e a 90º,
      // sem qualquer rotação.
      const s = getShape(drag.shapeId);
      if (s) {
        const angDeg = drag.which === "tip" ? s.dir1Angle : s.dir1Angle + s.turn * 90;
        const ang = (angDeg * Math.PI) / 180;
        const dirX = Math.cos(ang), dirY = Math.sin(ang);
        const dx = realP.x - s.cx, dy = realP.y - s.cy;
        const proj = dx * dirX + dy * dirY; // comprimento ao longo da direção fixa da perna
        const len = Math.max(NE_MIN_REAL, proj);
        if (drag.which === "tip") s.len1 = len; else s.len2 = len;
      }
          } else if (drag.type === "textRotate") {
      const s = getShape(drag.shapeId);
      if (s) {
        const info = getTextRotationInfo(s, view);
        const dx = p.x - info.cx, dy = p.y - info.cy;
        let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
        deg = ((deg % 360) + 360) % 360;
        const nearest15 = Math.round(deg / 15) * 15;
        if (Math.abs(deg - nearest15) < 4) deg = nearest15 % 360;
        s.rotation = deg;
      }
        } else if (drag.type === "edgeRange") {
      const s = getShape(drag.shapeId);
      if (s) {
        const verts = neShapeVertices(s);
        const a = verts[drag.edgeIdx], b = verts[(drag.edgeIdx + 1) % verts.length];
        drag.t1 = neProjectT(realP, a, b);
      }
      drag.lastDraw = p;
    } else if (drag.type === "marquee") {
      drag.lastDraw = p;
      const matched = shapesInMarqueeRect(view);
      selectedIds = new Set([...drag.baseIds, ...matched]);
    }

    render();
  }

  function onPointerUp() {
    if (drag && drag.type === "edgeRange") {
      const s = getShape(drag.shapeId);
      if (s && s.edges && s.edges[drag.edgeIdx]) {
        const dist = Math.hypot(drag.lastDraw.x - drag.startDraw.x, drag.lastDraw.y - drag.startDraw.y);
        if (dist < NE_EDGE_CLICK_THRESHOLD) {
          // Clique simples (sem arrastar):
          // - se a linha tiver troço(s) tapados por outra peça encostada,
          //   marca/apaga automaticamente só o(s) troço(s) LIVRE(S) (ex: os
          //   40cm que sobram de 1m com um bloco de 60cm encostado);
          // - caso contrário, comporta-se como sempre: alterna a aresta toda.
          const exposed = drag.exposedRanges;
          if (exposed && exposed.length && !(exposed.length === 1 && exposed[0].from <= 0.01 && exposed[0].to >= 0.99)) {
            const cur = s.edges[drag.edgeIdx].polish;
            const curSegs = nePolishToSegments(cur);
            const exposedCovered = exposed.reduce((acc, seg) => acc + neSegmentsOverlapLength(curSegs, seg.from, seg.to), 0);
            const exposedTotal = exposed.reduce((acc, seg) => acc + (seg.to - seg.from), 0);
            const alreadyMostlyMarked = exposedTotal > 0 && exposedCovered / exposedTotal > 0.5;
            if (alreadyMostlyMarked) {
              let segs = curSegs;
              exposed.forEach((seg) => { segs = neSubtractSegment(segs, seg.from, seg.to); });
              s.edges[drag.edgeIdx].polish = segs.length ? segs : false;
            } else {
              let segs = neMergeSegments([...curSegs, ...exposed]);
              if (segs.length === 1 && segs[0].from <= 0.01 && segs[0].to >= 0.99) segs = true;
              s.edges[drag.edgeIdx].polish = segs;
            }
          } else {
            const cur = s.edges[drag.edgeIdx].polish;
            const isMarked = cur === true || (Array.isArray(cur) && cur.length > 0);
            s.edges[drag.edgeIdx].polish = !isMarked;
          }
        } else {
          // arrastou ao longo da linha = marca/apaga só esse troço (manual)
          const t0 = Math.min(drag.t0, drag.t1), t1 = Math.max(drag.t0, drag.t1);
          neApplyEdgeRange(s.edges[drag.edgeIdx], t0, t1);
        }
      }
    }
    drag = null;
    clearGuides();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    render();
  }

    // ---------------------------------------------------------------
  // TECLADO — Delete apaga a seleção; setas movem a(s) peça(s) selecionada(s)
  // (1mm por defeito, 10mm com Shift). Ignorado se o foco estiver num
  // campo de texto/input do formulário, para não interferir ao escrever.
  // ---------------------------------------------------------------
  function moveSelectedBy(dx, dy) {
    if (!selectedIds.size) return;
    pushUndoDebounced();
    selectedIds.forEach((id) => {
      const s = getShape(id);
      if (!s) return;
      if (s.type === "rect") { s.x += dx; s.y += dy; }
      else if (s.type === "circle") { s.cx += dx; s.cy += dy; }
      else if (s.type === "polygon") { s.points = s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })); }
      else if (s.type === "arrow") { s.x1 += dx; s.y1 += dy; s.x2 += dx; s.y2 += dy; }
      else if (s.type === "line") { s.x1 += dx; s.y1 += dy; s.x2 += dx; s.y2 += dy; }
      else if (s.type === "brace") { s.x1 += dx; s.y1 += dy; s.x2 += dx; s.y2 += dy; }
            else if (s.type === "arrow90") { s.cx += dx; s.cy += dy; }
      else if (s.type === "text") { s.x += dx; s.y += dy; }
      else if (s.type === "frisos") { s.x += dx; s.y += dy; }
    });
    render();
  }

      function selectAll() {
    selectedIds = new Set(shapes.map((s) => s.id));
    render();
  }

  // Copia as formas selecionadas para o clipboard interno do editor.
  function copySelected() {
    if (!selectedIds.size) return;
    clipboard = shapes.filter((s) => selectedIds.has(s.id)).map((s) => cloneShape(s));
  }

  function pushUndo() {
  try {
    undoStack.push(JSON.stringify(shapes));
    if (undoStack.length > NE_UNDO_MAX) undoStack.shift();
  } catch (err) { /* ignora */ }
}
// evita empilhar um snapshot por cada tecla premida ao escrever num campo —
// só regista o estado "antes" da primeira alteração de cada rajada
function pushUndoDebounced() {
  if (!undoDebouncePending) { pushUndo(); undoDebouncePending = true; }
  clearTimeout(undoDebounceTimer);
  undoDebounceTimer = setTimeout(() => { undoDebouncePending = false; }, 800);
}
function undo() {
  if (!undoStack.length) return;
  const prev = undoStack.pop();
  try { shapes = JSON.parse(prev); } catch (err) { return; }
  polyDraft = null; lineDraft = null; arrowDraft = null;
  drag = null;
  selectOnly(null);
}

  // Cola as formas do clipboard com um pequeno deslocamento (10mm), gerando
  // ids novos, e seleciona só o que acabou de ser colado.
  function pasteClipboard() {
    if (!clipboard.length) return;
     pushUndo();    
    const offset = 10;
    const pasted = clipboard.map((orig) => {
      const s = cloneShape(orig);
      s.id = neUid();
      if (s.type === "rect" || s.type === "text" || s.type === "frisos") { s.x += offset; s.y += offset; }
            else if (s.type === "circle" || s.type === "arrow90") { s.cx += offset; s.cy += offset; }
      else if (s.type === "polygon") { s.points = s.points.map((p) => ({ x: p.x + offset, y: p.y + offset })); }
      else if (s.type === "arrow") { s.x1 += offset; s.y1 += offset; s.x2 += offset; s.y2 += offset; }
      else if (s.type === "line") { s.x1 += offset; s.y1 += offset; s.x2 += offset; s.y2 += offset; }
      else if (s.type === "brace") { s.x1 += offset; s.y1 += offset; s.x2 += offset; s.y2 += offset; }
      return s;
    });
    shapes.push(...pasted);
    selectedIds = new Set(pasted.map((s) => s.id));
    render();
  }

    function handleKeyDown(e) {
    const activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") return;

        if (e.key === "Escape") {
      if (polyDraft) cancelPolygon();
      if (lineDraft) cancelLine();
      if (arrowDraft) cancelArrow();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
  e.preventDefault();
  undo();
  return;
}

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      selectAll();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      e.preventDefault();
      copySelected();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
      e.preventDefault();
      pasteClipboard();
      return;
    }

    if (!selectedIds.size) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteSelected();
      return;
    }

    const step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowLeft") { e.preventDefault(); moveSelectedBy(-step, 0); }
    else if (e.key === "ArrowRight") { e.preventDefault(); moveSelectedBy(step, 0); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveSelectedBy(0, -step); }
    else if (e.key === "ArrowDown") { e.preventDefault(); moveSelectedBy(0, step); }
  }
  window.addEventListener("keydown", handleKeyDown);

  // Alinhamento ao desenhar polígono/linha (ver se está reto/alinhado)
  function computeDraftSnap(pointsArr, rawReal, view) {
    if (!pointsArr.length) return { point: rawReal, aligned: false };
    const last = pointsArr[pointsArr.length - 1];
    const dx = rawReal.x - last.x, dy = rawReal.y - last.y;
    const angleTolPx = d2rLen(4, view); // ~4mm de folha de tolerância
    let point = { ...rawReal }, aligned = false;
    if (Math.abs(dy) < angleTolPx && Math.abs(dx) > 0.001) { point = { x: rawReal.x, y: last.y }; aligned = true; }
    else if (Math.abs(dx) < angleTolPx && Math.abs(dy) > 0.001) { point = { x: last.x, y: rawReal.y }; aligned = true; }

    // também tenta alinhar com bordos/centros de outras formas já existentes
    const tol = d2rLen(2, view);
    const { xs, ys } = collectSnapTargets(new Set());
    let bestDx = tol, bestDy = tol;
    xs.forEach((tx) => { const d = Math.abs(point.x - tx); if (d < bestDx) { bestDx = d; point.x = tx; aligned = true; } });
    ys.forEach((ty) => { const d = Math.abs(point.y - ty); if (d < bestDy) { bestDy = d; point.y = ty; aligned = true; } });
    return { point, aligned };
  }

  function drawLineDraft(view) {
    if (!lineDraft) return;
    const drawPts = lineDraft.points.map((p) => ({ x: r2dX(p.x, view), y: r2dY(p.y, view) }));
    drawPts.forEach((p, i) => {
      draftLayer.appendChild(neCreateSvgEl("circle", { cx: p.x, cy: p.y, r: i === 0 ? 2 : 1.4, fill: i === 0 ? "#c0392b" : "#2e4752", stroke: "#fff", "stroke-width": "0.3" }));
    });
    if (drawPts.length === 1 && lineDraft.preview) {
      const pv = { x: r2dX(lineDraft.preview.x, view), y: r2dY(lineDraft.preview.y, view) };
      draftLayer.appendChild(neCreateSvgEl("line", {
        x1: drawPts[0].x, y1: drawPts[0].y, x2: pv.x, y2: pv.y,
        stroke: lineDraft.aligned ? "#2ecc71" : "#9aa7ad", "stroke-width": lineDraft.aligned ? "0.7" : "0.4",
        "stroke-dasharray": lineDraft.dashed ? "2,1.4" : (lineDraft.aligned ? "none" : "1,1"),
      }));
    }
  }

    function drawArrowDraft(view) {
    if (!arrowDraft) return;
    ensureArrowMarker();
    const drawPts = arrowDraft.points.map((p) => ({ x: r2dX(p.x, view), y: r2dY(p.y, view) }));
    drawPts.forEach((p, i) => {
      draftLayer.appendChild(neCreateSvgEl("circle", { cx: p.x, cy: p.y, r: i === 0 ? 2 : 1.4, fill: i === 0 ? "#c0392b" : "#2e4752", stroke: "#fff", "stroke-width": "0.3" }));
    });
    if (drawPts.length === 1 && arrowDraft.preview) {
      const pv = { x: r2dX(arrowDraft.preview.x, view), y: r2dY(arrowDraft.preview.y, view) };
      draftLayer.appendChild(neCreateSvgEl("line", {
        x1: drawPts[0].x, y1: drawPts[0].y, x2: pv.x, y2: pv.y,
        stroke: arrowDraft.aligned ? "#2ecc71" : "#9aa7ad", "stroke-width": arrowDraft.aligned ? "0.7" : "0.4",
        "stroke-dasharray": arrowDraft.aligned ? "none" : "1,1",
        "marker-end": "url(#neArrowHead)",
      }));
    }
  }

    svg.addEventListener("pointermove", (e) => {
    if (polyDraft) {
      const p = toSvgPoint(e.clientX, e.clientY);
      const view = currentView || computeView();
      const rawReal = { x: d2rX(p.x, view), y: d2rY(p.y, view) };
      const { point, aligned } = computeDraftSnap(polyDraft.points, rawReal, view);
      polyDraft.preview = point;
      polyDraft.aligned = aligned;
      render();
      return;
    }
    if (lineDraft) {
      const p = toSvgPoint(e.clientX, e.clientY);
      const view = currentView || computeView();
      const rawReal = { x: d2rX(p.x, view), y: d2rY(p.y, view) };
      const { point, aligned } = computeDraftSnap(lineDraft.points, rawReal, view);
      lineDraft.preview = point;
      lineDraft.aligned = aligned;
      render();
      return;
    }
        if (arrowDraft) {
      const p = toSvgPoint(e.clientX, e.clientY);
      const view = currentView || computeView();
      const rawReal = { x: d2rX(p.x, view), y: d2rY(p.y, view) };
      const { point, aligned } = computeDraftSnap(arrowDraft.points, rawReal, view);
      arrowDraft.preview = point;
      arrowDraft.aligned = aligned;
      render();
      return;
    }
        if ((tool === "edge" || tool === "dim") && !drag) {
      updateEdgeHoverFromEvent(e);
    }
  });

  svg.addEventListener("pointerleave", () => clearEdgeHover());

    svg.addEventListener("pointerdown", (e) => {
    if (polyDraft) {
      const p = toSvgPoint(e.clientX, e.clientY);
      const view = currentView || computeView();
      const rawReal = { x: d2rX(p.x, view), y: d2rY(p.y, view) };
      const { point } = computeDraftSnap(polyDraft.points, rawReal, view);

      if (polyDraft.points.length >= 3) {
        const first = polyDraft.points[0];
        const firstDraw = { x: r2dX(first.x, view), y: r2dY(first.y, view) };
        if (Math.hypot(p.x - firstDraw.x, p.y - firstDraw.y) < 3) { finishPolygon(); return; }
      }
      polyDraft.points.push(point);
      render();
      return;
    }
    if (lineDraft) {
      const p = toSvgPoint(e.clientX, e.clientY);
      const view = currentView || computeView();
      const rawReal = { x: d2rX(p.x, view), y: d2rY(p.y, view) };
      const { point } = computeDraftSnap(lineDraft.points, rawReal, view);
      lineDraft.points.push(point);
      if (lineDraft.points.length >= 2) { finishLine(); return; }
      render();
      return;
    }
        if (arrowDraft) {
      const p = toSvgPoint(e.clientX, e.clientY);
      const view = currentView || computeView();
      const rawReal = { x: d2rX(p.x, view), y: d2rY(p.y, view) };
      const { point } = computeDraftSnap(arrowDraft.points, rawReal, view);
      arrowDraft.points.push(point);
      if (arrowDraft.points.length >= 2) { finishArrow(); return; }
      render();
      return;
    }
    if (e.target === svg || e.target === bg || e.target === gridRect) {
      if (tool === "edge") { if (!e.shiftKey) selectOnly(null); return; }
      const view = computeView();
      const startDraw = toSvgPoint(e.clientX, e.clientY);
      const baseIds = e.shiftKey ? new Set(selectedIds) : new Set();
      drag = { type: "marquee", viewSnapshot: view, startDraw, lastDraw: startDraw, baseIds };
      if (!e.shiftKey) selectedIds = new Set();
      render();
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    }
  });

  svg.addEventListener("dblclick", () => { if (polyDraft) finishPolygon(); });

  // ---------------------------------------------------------------
  // API PÚBLICA
  // ---------------------------------------------------------------
  function getSelectedShapes() { return [...selectedIds].map((id) => getShape(id)).filter(Boolean); }
  function getSelected() { return selectedIds.size === 1 ? getShape([...selectedIds][0]) : null; }
  function select(id) { selectOnly(id); }

  function nextOffset() { return (shapes.length % 8) * 20; }

    function addRect(wMm, hMm) {
    const offset = nextOffset();
    const w = (typeof wMm === "number" && wMm > 0) ? wMm : 400;
    const h = (typeof hMm === "number" && hMm > 0) ? hMm : 300;
    const shape = { id: neUid(), type: "rect", x: 100 + offset, y: 100 + offset, w, h, r: [0, 0, 0, 0], label: "", dimsInside: false, showDims: true, edges: neRectEdgesDefault() };
    shapes.push(shape); selectOnly(shape.id); return shape;
  }
  function addCircle() {
    const offset = nextOffset();
    const shape = { id: neUid(), type: "circle", cx: 300 + offset, cy: 300 + offset, radius: 150, label: "", curved: false, curvedText: "", edges: [{ polish: false }] };
    shapes.push(shape); selectOnly(shape.id); return shape;
  }
    function addArrow() {
    const offset = nextOffset();
    const shape = { id: neUid(), type: "arrow", x1: 100 + offset, y1: 100 + offset, x2: 400 + offset, y2: 100 + offset, label: "" };
    shapes.push(shape); selectOnly(shape.id); return shape;
  }
    function startArrow() { arrowDraft = { points: [], preview: null, aligned: false }; selectOnly(null); render(); }
  function cancelArrow() { arrowDraft = null; render(); }
  function isDrawingArrow() { return !!arrowDraft; }
  function finishArrow() {
    if (!arrowDraft || arrowDraft.points.length < 2) { arrowDraft = null; render(); return null; }
    const [p1, p2] = arrowDraft.points;
    const shape = { id: neUid(), type: "arrow", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, label: "" };
    shapes.push(shape);
    arrowDraft = null;
    selectOnly(shape.id);
    return shape;
  }
    function addBrace() {
    const offset = nextOffset();
    // vertical (x1===x2) com width negativo aponta para a direita por defeito
    const shape = { id: neUid(), type: "brace", x1: 100 + offset, y1: 100 + offset, x2: 100 + offset, y2: 300 + offset, width: -20, label: "" };
    shapes.push(shape); selectOnly(shape.id); return shape;
  }

  // Presets de orientação inicial da seta 90º: para cada direção,
  // dir1Angle é o ângulo (graus, 0=direita,90=baixo,180=esquerda,270=cima)
  // da perna 1 (a que tem a ponta da seta). "turn" fixa para que lado
  // (sentido horário/anti-horário) fica a perna 2 (a cauda). Estes
  // valores ficam DEFINITIVOS assim que a seta é criada — não há
  // rotação depois, por isso a direção tem de ser escolhida à partida.
    const NE_ARROW90_PRESETS = {
    up: { dir1Angle: 270, turn: -1 },    // ponta para cima, cauda para a esquerda
    down: { dir1Angle: 90, turn: -1 },   // ponta para baixo, cauda para a direita
    left: { dir1Angle: 180, turn: -1 },  // ponta para a esquerda, cauda para baixo
    right: { dir1Angle: 0, turn: 1 },    // ponta para a direita, cauda para baixo
  };
  window.NE_ARROW90_DIRECTIONS = Object.keys(NE_ARROW90_PRESETS); // ['up','down','left','right']
  // direction é OBRIGATÓRIO: 'up' | 'down' | 'left' | 'right'.
  // A interface (toolbar) tem de perguntar/mostrar as 4 opções ANTES de
  // chamar isto — sem uma direção válida, não se cria nada (devolve null),
  // para nunca haver uma seta 90º "sem direção escolhida".
  function addArrow90(direction) {
    const preset = NE_ARROW90_PRESETS[direction];
    if (!preset) return null;
    const offset = nextOffset();
    const shape = {
      id: neUid(), type: "arrow90",
      cx: 250 + offset, cy: 200 + offset,
      len1: 150, len2: 150,
      dir1Angle: preset.dir1Angle, turn: preset.turn,
      label: "",
    };
    shapes.push(shape); selectOnly(shape.id); return shape;
  }
        function addText() {
    const offset = nextOffset();
    const shape = { id: neUid(), type: "text", x: 100 + offset, y: 100 + offset, content: "Texto", fontSize: 4, rotation: 0 };
    shapes.push(shape); selectOnly(shape.id); return shape;
  }
    function addFrisos() {
    const offset = nextOffset();
    const shape = { id: neUid(), type: "frisos", x: 100 + offset, y: 100 + offset, w: 500, h: 360, label: "", vertical: false };
    shapes.push(shape); selectOnly(shape.id); return shape;
  }

  function startPolygon() { polyDraft = { points: [], preview: null, aligned: false }; selectOnly(null); render(); }
  function startLine(dashed) { lineDraft = { points: [], preview: null, aligned: false, dashed: !!dashed }; selectOnly(null); render(); }
  function cancelLine() { lineDraft = null; render(); }
  function isDrawingLine() { return !!lineDraft; }
  function finishLine() {
    if (!lineDraft || lineDraft.points.length < 2) { lineDraft = null; render(); return null; }
    const [p1, p2] = lineDraft.points;
    const shape = { id: neUid(), type: "line", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, dashed: lineDraft.dashed, label: "" };
    shapes.push(shape);
    lineDraft = null;
    selectOnly(shape.id);
    return shape;
  }
  function cancelPolygon() { polyDraft = null; render(); }
  function isDrawingPolygon() { return !!polyDraft; }
  function finishPolygon() {
    if (!polyDraft || polyDraft.points.length < 3) { polyDraft = null; render(); return null; }
    const shape = { id: neUid(), type: "polygon", points: polyDraft.points, label: "", edges: nePolygonEdgesFor(polyDraft.points) };
    shapes.push(shape);
    polyDraft = null;
    selectOnly(shape.id);
    return shape;
  }

  // ---------------------------------------------------------------
  // ORDEM (mover para trás / para a frente)
  // ---------------------------------------------------------------
  function bringForward() {
    if (selectedIds.size !== 1) return;
    const id = [...selectedIds][0];
    const idx = shapes.findIndex((s) => s.id === id);
    if (idx < 0 || idx === shapes.length - 1) return;
    const [s] = shapes.splice(idx, 1);
    shapes.splice(idx + 1, 0, s);
    render();
  }
  function sendBackward() {
    if (selectedIds.size !== 1) return;
    const id = [...selectedIds][0];
    const idx = shapes.findIndex((s) => s.id === id);
    if (idx <= 0) return;
    const [s] = shapes.splice(idx, 1);
    shapes.splice(idx - 1, 0, s);
    render();
  }
  function bringToFront() {
    if (selectedIds.size !== 1) return;
    const id = [...selectedIds][0];
    const idx = shapes.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const [s] = shapes.splice(idx, 1);
    shapes.push(s);
    render();
  }
  function sendToBack() {
    if (selectedIds.size !== 1) return;
    const id = [...selectedIds][0];
    const idx = shapes.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const [s] = shapes.splice(idx, 1);
    shapes.unshift(s);
    render();
  }

  function deleteSelected() {
    if (!selectedIds.size) return;
    pushUndo();   
    shapes = shapes.filter((s) => !selectedIds.has(s.id));
    selectOnly(null);
  }
    function clearAll() {   pushUndo();   shapes = []; polyDraft = null; fixedOrigin = null; fixedDen = null; selectOnly(null); }

    function applyFlipRotateToShape(s, kind, pivot) {
  const deg = kind === "rotateRight" ? 90 : kind === "rotateLeft" ? -90 : 0;
  if (s.type === "rect") {
    const r = s.r || [0, 0, 0, 0];
    if (kind === "flipH") {
      s.x = 2 * pivot.x - (s.x + s.w);
      s.r = [r[1], r[0], r[3], r[2]];
    } else if (kind === "flipV") {
      s.y = 2 * pivot.y - (s.y + s.h);
      s.r = [r[3], r[2], r[1], r[0]];
    } else {
      const corners = [
        { x: s.x, y: s.y }, { x: s.x + s.w, y: s.y },
        { x: s.x + s.w, y: s.y + s.h }, { x: s.x, y: s.y + s.h },
      ].map((c) => neRotatePointAround(c, pivot, deg));
      const xs = corners.map((c) => c.x), ys = corners.map((c) => c.y);
      s.x = Math.min(...xs); s.y = Math.min(...ys);
      s.w = Math.max(...xs) - s.x; s.h = Math.max(...ys) - s.y;
      s.r = kind === "rotateRight" ? [r[3], r[0], r[1], r[2]] : [r[1], r[2], r[3], r[0]];
    }
  } else if (s.type === "circle") {
    const np = kind === "flipH" ? neFlipPointH({ x: s.cx, y: s.cy }, pivot)
      : kind === "flipV" ? neFlipPointV({ x: s.cx, y: s.cy }, pivot)
      : neRotatePointAround({ x: s.cx, y: s.cy }, pivot, deg);
    s.cx = np.x; s.cy = np.y;
  } else if (s.type === "polygon") {
    s.points = (s.points || []).map((pt) =>
      kind === "flipH" ? neFlipPointH(pt, pivot) : kind === "flipV" ? neFlipPointV(pt, pivot) : neRotatePointAround(pt, pivot, deg)
    );
  } else if (s.type === "arrow" || s.type === "line" || s.type === "brace") {
    const tr = (p) => (kind === "flipH" ? neFlipPointH(p, pivot) : kind === "flipV" ? neFlipPointV(p, pivot) : neRotatePointAround(p, pivot, deg));
    const n1 = tr({ x: s.x1, y: s.y1 }), n2 = tr({ x: s.x2, y: s.y2 });
    s.x1 = n1.x; s.y1 = n1.y; s.x2 = n2.x; s.y2 = n2.y;
    if (s.type === "brace" && (kind === "flipH" || kind === "flipV")) s.width = -(s.width || 20);
      } else if (s.type === "arrow90") {
    const np = kind === "flipH" ? neFlipPointH({ x: s.cx, y: s.cy }, pivot)
      : kind === "flipV" ? neFlipPointV({ x: s.cx, y: s.cy }, pivot)
      : neRotatePointAround({ x: s.cx, y: s.cy }, pivot, deg);
    s.cx = np.x; s.cy = np.y;
    if (kind === "rotateRight" || kind === "rotateLeft") {
      s.dir1Angle = neNormDeg(s.dir1Angle + deg);
    } else if (kind === "flipH") {
      s.dir1Angle = neNormDeg(180 - s.dir1Angle); s.turn = -s.turn;
    } else if (kind === "flipV") {
      s.dir1Angle = neNormDeg(-s.dir1Angle); s.turn = -s.turn;
    }
    } else if (s.type === "frisos") {
    if (kind === "flipH") {
      s.x = 2 * pivot.x - (s.x + s.w);
    } else if (kind === "flipV") {
      s.y = 2 * pivot.y - (s.y + s.h);
    } else {
      const corners = [
        { x: s.x, y: s.y }, { x: s.x + s.w, y: s.y },
        { x: s.x + s.w, y: s.y + s.h }, { x: s.x, y: s.y + s.h },
      ].map((c) => neRotatePointAround(c, pivot, deg));
      const xs = corners.map((c) => c.x), ys = corners.map((c) => c.y);
      s.x = Math.min(...xs); s.y = Math.min(...ys);
      s.w = Math.max(...xs) - s.x; s.h = Math.max(...ys) - s.y;
      s.vertical = !s.vertical;
    }
  } else if (s.type === "text") {
    const np = kind === "flipH" ? neFlipPointH({ x: s.x, y: s.y }, pivot)
      : kind === "flipV" ? neFlipPointV({ x: s.x, y: s.y }, pivot)
      : neRotatePointAround({ x: s.x, y: s.y }, pivot, deg);
    s.x = np.x; s.y = np.y;
    const rot = s.rotation || 0;
    if (kind === "rotateRight") s.rotation = neNormDeg(rot + 90);
    else if (kind === "rotateLeft") s.rotation = neNormDeg(rot - 90);
    else if (kind === "flipH") s.rotation = neNormDeg(-rot);
    else if (kind === "flipV") s.rotation = neNormDeg(180 - rot);
  }
}

function rotateOrFlipSelected(kind) {
  if (!selectedIds.size) return;
  const targets = [...selectedIds].map((id) => getShape(id)).filter(Boolean);
  if (!targets.length) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  targets.forEach((s) => {
    const bb = neShapeBBox(s);
    if (!bb) return;
    minX = Math.min(minX, bb.minX); minY = Math.min(minY, bb.minY);
    maxX = Math.max(maxX, bb.maxX); maxY = Math.max(maxY, bb.maxY);
  });
  if (!isFinite(minX)) return;
  const pivot = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  pushUndo();
  targets.forEach((s) => applyFlipRotateToShape(s, kind, pivot));
  render();
}
  function updateSelected(props) {
    const s = getSelected();
    if (!s) return;
    pushUndoDebounced();  
    if (s.type === "rect") {
      if (props.w !== undefined) s.w = Math.max(NE_MIN_REAL, Math.round(props.w * 10) / 10);
      if (props.h !== undefined) s.h = Math.max(NE_MIN_REAL, Math.round(props.h * 10) / 10);
      if (props.x !== undefined) s.x = Math.round(props.x);
      if (props.y !== undefined) s.y = Math.round(props.y);
      if (props.r !== undefined) s.r = props.r;
            if (props.label !== undefined) s.label = props.label;
      if (props.dimsInside !== undefined) s.dimsInside = props.dimsInside;
      if (props.showDims !== undefined) s.showDims = props.showDims;
    } else if (s.type === "circle") {
      if (props.radius !== undefined) s.radius = Math.max(NE_MIN_REAL / 2, Math.round(props.radius * 10) / 10);
      if (props.label !== undefined) s.label = props.label;
      if (props.curved !== undefined) s.curved = props.curved;
      if (props.curvedText !== undefined) s.curvedText = props.curvedText;
            } else if (s.type === "line") {
      if (props.label !== undefined) s.label = props.label;
      if (props.dashed !== undefined) s.dashed = props.dashed;
    } else if (s.type === "brace") {
      if (props.label !== undefined) s.label = props.label;
      if (props.width !== undefined) s.width = props.width;
        } else if (s.type === "polygon" || s.type === "arrow" || s.type === "arrow90" || s.type === "frisos") {
      if (props.label !== undefined) s.label = props.label;
        } else if (s.type === "text") {
      if (props.content !== undefined) s.content = props.content;
      if (props.fontSize !== undefined) s.fontSize = Math.max(2, Math.round(props.fontSize));
      if (props.rotation !== undefined) s.rotation = ((props.rotation % 360) + 360) % 360;
    }
    render();
  }

    function getDimSelection() {
    if (!dimSelection) return null;
    const s = getShape(dimSelection.shapeId);
    if (!s || !s.edges || !s.edges[dimSelection.edgeIdx]) return null;
    return {
      shapeId: s.id, edgeIdx: dimSelection.edgeIdx,
      dimValue: s.edges[dimSelection.edgeIdx].dimValue ?? null,
      dimInside: s.edges[dimSelection.edgeIdx].dimInside,
    };
  }
  function setDimValue(mm) {
    if (!dimSelection) return;
    const s = getShape(dimSelection.shapeId);
    if (!s || !s.edges || !s.edges[dimSelection.edgeIdx]) return;
    pushUndoDebounced();
    s.edges[dimSelection.edgeIdx].dimValue = (mm === null || isNaN(mm)) ? null : mm;
    render();
  }
function setDimInside(mode) {
  if (!dimSelection) return;
  const s = getShape(dimSelection.shapeId);
  if (!s || !s.edges || !s.edges[dimSelection.edgeIdx]) return;
  pushUndoDebounced();
  const edge = s.edges[dimSelection.edgeIdx];
  if (mode === "auto") delete edge.dimInside;
  else edge.dimInside = mode === "inside";
  render();
}
  function clearDimSelection() { dimSelection = null; emitDimChange(); render(); }
  function onDimSelectionChange(cb) { onDimChangeCb = cb; }

  function getShapes() { return JSON.parse(JSON.stringify(shapes)); }
    function setShapes(newShapes) {
    fixedOrigin = null;
    fixedDen = null;
    shapes = Array.isArray(newShapes) ? JSON.parse(JSON.stringify(newShapes)) : [];
    shapes.forEach((s) => {
      if (!s.type) s.type = "rect";
            if (s.type === "rect") {
        if (!Array.isArray(s.r)) s.r = [s.r || 0, s.r || 0, s.r || 0, s.r || 0];
        if (!s.edges) s.edges = neRectEdgesDefault();
        if (s.dimsInside === undefined) s.dimsInside = false;
        if (s.showDims === undefined) s.showDims = true;
      }
            if (s.type === "circle" && !s.edges) s.edges = [{ polish: false }];
      if (s.type === "polygon" && !s.edges) s.edges = nePolygonEdgesFor(s.points || []);
            if (s.type === "text" && s.rotation === undefined) s.rotation = 0;
      if (s.type === "frisos") {
        if (typeof s.w !== "number" || s.w <= 0) s.w = 395;
        if (typeof s.h !== "number" || s.h <= 0) s.h = 290;
        if (s.label === undefined) s.label = "";
                if (s.vertical === undefined) s.vertical = false;

      }
      if (s.type === "arrow90" && s.dir1Angle === undefined) {
        // Migração do formato antigo (x1,y1 / cx,cy / x2,y2 soltos, com
        // pega no meio) para o novo modelo (cx,cy fixo + comprimentos +
        // ângulo da perna1 + sentido da dobra) — para desenhos gravados
        // antes desta alteração continuarem a abrir bem.
        const cx = s.cx || 0, cy = s.cy || 0;
        const x1 = s.x1 !== undefined ? s.x1 : cx;
        const y1 = s.y1 !== undefined ? s.y1 : cy - 150;
        const x2 = s.x2 !== undefined ? s.x2 : cx - 150;
        const y2 = s.y2 !== undefined ? s.y2 : cy;
        const a1 = (Math.atan2(y1 - cy, x1 - cx) * 180) / Math.PI;
        const a2 = (Math.atan2(y2 - cy, x2 - cx) * 180) / Math.PI;
        let diff = a2 - a1;
        while (diff <= -180) diff += 360;
        while (diff > 180) diff -= 360;
        s.cx = cx; s.cy = cy;
        s.len1 = Math.hypot(x1 - cx, y1 - cy) || 150;
        s.len2 = Math.hypot(x2 - cx, y2 - cy) || 150;
        s.dir1Angle = a1;
        s.turn = diff < 0 ? -1 : 1;
        delete s.x1; delete s.y1; delete s.x2; delete s.y2;
      }
    });
    selectOnly(null);
  }

    function fitToPage() { fixedOrigin = null; fixedDen = null; render(); }
  function onSelectionChange(cb) { onChangeCb = cb; }
  function getSvgElement() { return svg; }
        function setTool(t) {
    tool = t;
    if (t === "edge" || t === "dim") {
      selectOnly(null);   // limpa seleção + já chama render() internamente
    } else {
      clearEdgeHover();
      dimSelection = null;
      emitDimChange();
      render();
    }
  }
  function getTool() { return tool; }
  function setScale(den) { scaleDen = den || null; render(); }
  function getScaleInfo() { return { den: currentView ? currentView.den : computeView().den, auto: !scaleDen }; }
  function setShowGrid(v) { showGrid = !!v; render(); }
  function getShowGrid() { return showGrid; }

  render();

    return {
        addRect, addCircle, addArrow, addBrace, addArrow90, addText, addFrisos,
    startPolygon, cancelPolygon, finishPolygon, isDrawingPolygon,
        startLine, cancelLine, finishLine, isDrawingLine,
    startArrow, cancelArrow, finishArrow, isDrawingArrow,
    deleteSelected, clearAll, updateSelected,
    bringForward, sendBackward, bringToFront, sendToBack,
    getShapes, setShapes, getSelected, getSelectedShapes, select,
    onSelectionChange, getSvgElement,
        setTool, getTool, setScale, getScaleInfo, setShowGrid, getShowGrid, fitToPage, selectAll,
    copySelected, pasteClipboard,
    rotateOrFlipSelected, undo,
        getDimSelection, setDimValue, setDimInside, clearDimSelection, onDimSelectionChange,
  };
}

window.createNotaEditor = createNotaEditor;
window.NE_PAGE_W = NE_PAGE_W;
window.NE_PAGE_H = NE_PAGE_H;