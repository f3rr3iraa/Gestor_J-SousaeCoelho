// =====================================================
// FORM-ORCAMENTO.JS — ORÇAMENTO EM TABELA (TIPO EXCEL)
//
// Fluxo por linha (tudo só com teclado, se quiseres):
//   Tipo  (Enter → lista)           → Enter escolhe
//   Produto (Enter / duplo clique → lista "Marca - Descrição Acabamento Espessura")
//         → Enter escolhe → abre janela pequena Qtd / Comp. / Larg.
//         → Enter, Enter, Enter → m² calculados na linha
//   Preço/m² (Enter → escreve) → Enter → Desc. (%) → Enter → linha seguinte
//
// "Total Orçamento" (última coluna) = soma acumulada dos totais, linha a linha.
// Todos os valores da tabela são SEM IVA. No rodapé aparecem:
//   Total Orçamento (sem IVA)  e  Total Orçamento (com IVA).
// Guarda nas mesmas tabelas de sempre: orcamentos + orcamento_itens.
//
// DIVERSOS: o tipo "Diversos" tem uma lista de artigos guardada na BD
// (tabela diversos_opcoes). Escolhe-se um existente ou escreve-se um novo,
// que fica guardado para os próximos orçamentos.
//
// MODO EDIÇÃO: /form-orcamento?edit=<id> abre o orçamento já preenchido
// (cliente, opções, linhas, preços, descontos). Ao guardar, atualiza o
// orçamento existente (não cria um novo) e volta à lista.
// =====================================================

window.initOrcamentoForm = async function () {
  const supabase = window.supabaseClient;
  const toast = (msg, type = "info") =>
    typeof showMessage === "function" ? showMessage(msg, type) : console.log(msg);

  if (!supabase) {
    toast("❌ Supabase não inicializado", "danger");
    return;
  }

  // -------------------------------------------------
  // CONSTANTES / ELEMENTOS
  // -------------------------------------------------
  const CODIGO_NOVO_CLIENTE = "749"; // escrever isto + Enter na pesquisa de clientes abre "novo cliente"
  const DEFAULT_ROWS = 12;
  const ADD_ROWS = 5;
  const STORAGE_KEY = "orcamentoGridDraft_v2";
  const TAXA_IVA = 0.23;

  // modo edição: /form-orcamento?edit=123
  const editParam = new URLSearchParams(window.location.search).get("edit");
  const editId = editParam && /^\d+$/.test(editParam) ? parseInt(editParam, 10) : null;
  const modoEdicao = editId !== null;
  let itensGuardadosIds = []; // ids dos itens que existem na BD para este orçamento (modo edição)
  let brandNomePorKey = {};

  // índices das colunas navegáveis (0 = "#", não navegável)
  const C = { TIPO: 1, PROD: 2, QTD: 3, COMP: 4, LARG: 5, M2: 6, PRECO: 7, DESC: 8, SUB: 9, TOTAL: 10, ACC: 11 };
  const FIRST_COL = C.TIPO;
  const LAST_COL = C.ACC;

  const root = document.getElementById("orcamentoRoot");
  const wrap = document.getElementById("orcGridWrap");
  const tbody = document.getElementById("orcGridBody");
  const totalGeralEl = document.getElementById("orcTotalGeral");
  const totalComIvaEl = document.getElementById("orcTotalComIva");
  const footLabelEl = document.getElementById("orcFootLabel");
  const footLabelIvaEl = document.getElementById("orcFootLabelIva");
  const tabsEl = document.getElementById("orcTabs");
  const clienteNome = document.getElementById("clienteNome");
  const clienteId = document.getElementById("clienteId");
  const clienteDetalhes = document.getElementById("clienteDetalhes");
  const clearCliente = document.getElementById("clearCliente");
  const btnMaisLinhas = document.getElementById("btnMaisLinhas");
  const btnLimpar = document.getElementById("btnLimparOrcamento");
  const btnGuardar = document.getElementById("btnGuardarOrcamento");
  const btnGuardarTxt = document.getElementById("btnGuardarTxt");
  const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
  const tituloEl = document.getElementById("orcTitulo");

  // -------------------------------------------------
  // ESTADO
  // -------------------------------------------------
  let tipos = [];          // [{id, nome}]
  let produtos = [];       // lista plana já "composta" (marca - desc acabamento espessura)
  let clientes = [];
  let diversosOpcoes = []; // [{id, label, _s}] artigos "Diversos" guardados na BD
  let rows = [];           // linhas da OPÇÃO ATIVA (mesma referência que opcoes[opcaoAtiva].rows)
  let opcoes = [{ rows: [], cur: { r: 0, c: C.TIPO } }]; // Opção 1, Opção 2, ...
  let opcaoAtiva = 0;
  let cur = { r: 0, c: C.TIPO };
  let editing = null;      // { r, c, input }
  let overlay = null;      // modal aberto
  let selectedCliente = null;
  let undoStack = [];
  let redoStack = [];
  let clipInterno = null;

  const novaLinha = () => ({
    tipoId: null, tipoNome: "", diversos: false,
    linear: false, m2: null, // Linear = como Diversos, mas pede Qtd + m² (m² total, editável)
    brandKey: "", brandNome: "", webId: null, descricao: "", acabamento: "", espessura: null, label: "",
    refPreco: null,
    qtd: null, comp: null, larg: null, preco: null, desc: 0,
  });

  // -------------------------------------------------
  // UTILITÁRIOS
  // -------------------------------------------------
  const norm = (s) => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const esc = (s) => (s ?? "").toString().replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const parseNum = (v) => {
    if (v === null || v === undefined) return NaN;
    const t = v.toString().trim().replace(",", ".");
    if (t === "") return NaN;
    return parseFloat(t);
  };
  const fmt2 = (n) => (Number.isFinite(n) ? n.toFixed(2) : "");
  const fmt4 = (n) => (Number.isFinite(n) ? n.toFixed(4) : "");

  async function fetchAll(table, select, orderCol) {
    // O Supabase devolve no máximo 1000 linhas por pedido → paginar
    const out = [];
    const size = 1000;
    for (let from = 0; ; from += size) {
      let q = supabase.from(table).select(select).range(from, from + size - 1);
      if (orderCol) q = q.order(orderCol, { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      out.push(...(data || []));
      if (!data || data.length < size) break;
    }
    return out;
  }

  // cálculos de uma linha (valores SEM IVA)
  function calc(row) {
    const qtd = row.qtd || 0;
    const comp = row.diversos ? 1 : row.comp || 0;
    const larg = row.diversos ? 1 : row.larg || 0;
    const preco = row.preco || 0;
    const desc = Math.min(100, Math.max(0, row.desc || 0));
    if (row.linear) {
      // Linear: o m² é escrito à mão (total da linha) → total = m² × preço
      const mt2 = row.m2 || 0;
      const total = mt2 * preco * (1 - desc / 100);
      return { mt2, subtotal: qtd > 0 ? total / qtd : 0, total };
    }
    const mt2 = row.diversos ? 0 : qtd * comp * larg;
    const subtotal = comp * larg * preco * (1 - desc / 100); // 1 peça
    const total = subtotal * qtd;
    return { mt2, subtotal, total };
  }

  function linhaVazia(row) {
    return !row.tipoId && !row.descricao && !row.qtd && !row.comp && !row.larg && !row.m2 && !row.preco;
  }

  function linhaCompleta(row) {
    if (!row.tipoId || !row.descricao.trim()) return false;
    if (!(row.qtd > 0) || !(row.preco > 0)) return false;
    if (row.linear) return row.m2 > 0;
    if (!row.diversos && (!(row.comp > 0) || !(row.larg > 0))) return false;
    return true;
  }

  // -------------------------------------------------
  // DESFAZER / REFAZER (Ctrl+Z / Ctrl+Y)
  // -------------------------------------------------
  const snap = () => {
    sincronizarOpcaoAtiva();
    return JSON.stringify({ opcoes: opcoes.map((o) => ({ rows: o.rows })), ativa: opcaoAtiva });
  };
  function pushUndo() {
    undoStack.push(snap());
    if (undoStack.length > 100) undoStack.shift();
    redoStack = [];
  }
  function restaurarSnap(str) {
    const d = JSON.parse(str);
    opcoes = d.opcoes.map((o) => ({ rows: o.rows.map((r) => ({ ...novaLinha(), ...r })), cur: { r: 0, c: C.TIPO } }));
    opcaoAtiva = Math.min(d.ativa || 0, opcoes.length - 1);
    rows = opcoes[opcaoAtiva].rows;
    cur.r = Math.min(cur.r, rows.length - 1);
    guardarRascunho();
    render();
  }
  function desfazer() {
    if (!undoStack.length) return;
    redoStack.push(snap());
    restaurarSnap(undoStack.pop());
  }
  function refazer() {
    if (!redoStack.length) return;
    undoStack.push(snap());
    restaurarSnap(redoStack.pop());
  }

  // -------------------------------------------------
  // RASCUNHO (sessionStorage)
  // -------------------------------------------------
  let saveTimer = null;
  function guardarRascunho() {
    if (modoEdicao) return; // a edição não mexe no rascunho do "novo orçamento"
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        sincronizarOpcaoAtiva();
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          opcoes: opcoes.map((o) => ({ rows: o.rows })),
          ativa: opcaoAtiva,
          cliente: { nome: clienteNome.value, id: clienteId.value, detalhes: clienteDetalhes.innerHTML, original: selectedCliente },
        }));
      } catch (e) { /* ignora */ }
    }, 150);
  }
  function limparRascunho() {
    if (modoEdicao) return;
    clearTimeout(saveTimer);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignora */ }
  }
  function restaurarRascunho() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (Array.isArray(d.opcoes) && d.opcoes.length) {
        opcoes = d.opcoes.map((o) => ({ rows: (o.rows || []).map((r) => ({ ...novaLinha(), ...r })), cur: { r: 0, c: C.TIPO } }));
        opcoes.forEach((o) => { if (!o.rows.length) o.rows = Array.from({ length: DEFAULT_ROWS }, novaLinha); });
        opcaoAtiva = Math.min(d.ativa || 0, opcoes.length - 1);
        rows = opcoes[opcaoAtiva].rows;
      } else if (Array.isArray(d.rows) && d.rows.length) {
        // rascunho antigo (sem opções)
        rows = d.rows.map((r) => ({ ...novaLinha(), ...r }));
        opcoes = [{ rows, cur: { r: 0, c: C.TIPO } }];
        opcaoAtiva = 0;
      }
      if (d.cliente) {
        clienteNome.value = d.cliente.nome || "";
        clienteId.value = d.cliente.id || "";
        clienteDetalhes.innerHTML = d.cliente.detalhes || "";
        selectedCliente = d.cliente.original || null;
        clearCliente.classList.toggle("d-none", !clienteNome.value);
      }
      return true;
    } catch (e) { return false; }
  }

  // -------------------------------------------------
  // RENDER DA GRELHA
  // -------------------------------------------------
  function render() {
    sincronizarOpcaoAtiva();
    let acumulado = 0;
    const html = rows.map((row, r) => {
      const k = calc(row);
      acumulado += k.total;
      const mostraAcc = k.total > 0;
      const cell = (c, cls, content, title = "") =>
        `<td data-r="${r}" data-c="${c}" class="${cls}${cur.r === r && cur.c === c ? " sel" : ""}"${title ? ` title="${esc(title)}"` : ""}>${content}</td>`;

      const precoTxt = row.preco ? fmt2(row.preco) : "";

      return `<tr data-row="${r}" class="${linhaCompleta(row) ? "row-done" : ""}">
        <td class="c-n"><span class="row-num">${r + 1}</span><button type="button" class="row-x" data-clear="${r}" title="Limpar linha">✕</button></td>
        ${cell(C.TIPO, "", esc(row.tipoNome))}
        ${cell(C.PROD, opcaoAtiva > 0 && row.tipoId && !row.descricao ? "pend" : "", esc(row.label || row.descricao), row.label || row.descricao)}
        ${cell(C.QTD, "num", row.qtd ? row.qtd : "")}
        ${cell(C.COMP, "num", row.diversos ? "" : fmt4(row.comp))}
        ${cell(C.LARG, "num", row.diversos ? "" : fmt4(row.larg))}
        ${cell(C.M2, row.linear ? "num" : "num ro", k.mt2 > 0 ? fmt4(k.mt2) : "", row.linear ? "Linear: Enter / duplo clique para editar o m²" : "")}
        ${cell(C.PRECO, "num", precoTxt)}
        ${cell(C.DESC, "num", row.preco || row.qtd ? fmt2(row.desc || 0) : "")}
        ${cell(C.SUB, "num ro", k.subtotal > 0 ? fmt2(k.subtotal) + " €" : "")}
        ${cell(C.TOTAL, "num ro total", k.total > 0 ? fmt2(k.total) + " €" : "")}
        ${cell(C.ACC, "num acc", mostraAcc ? fmt2(acumulado) + " €" : "")}
      </tr>`;
    }).join("");

    tbody.innerHTML = html;

    // Rodapé: total sem IVA e total com IVA
    const sufixoOpc = opcoes.length > 1 ? ` — Opção ${opcaoAtiva + 1}` : "";
    totalGeralEl.textContent = fmt2(acumulado) + " €";
    if (totalComIvaEl) totalComIvaEl.textContent = fmt2(acumulado * (1 + TAXA_IVA)) + " €";
    if (footLabelEl) footLabelEl.textContent = `Total Orçamento (sem IVA)${sufixoOpc}`;
    if (footLabelIvaEl) footLabelIvaEl.textContent = `Total Orçamento (com IVA)${sufixoOpc}`;
    renderTabs();

    const td = tbody.querySelector("td.sel");
    if (td && !editing) td.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  // -------------------------------------------------
  // OPÇÕES (Opção 1, Opção 2, ...)
  // Cada opção é uma tabela própria. Ao criar uma nova, a estrutura
  // (tipo, qtd, comp., larg., m²) é copiada da opção atual, mas SEM
  // produto, SEM preço e SEM desconto. No PDF cada opção ocupa uma
  // página própria, com os seus totais.
  // -------------------------------------------------
  function sincronizarOpcaoAtiva() {
    if (!opcoes[opcaoAtiva]) opcaoAtiva = 0;
    opcoes[opcaoAtiva].rows = rows;
    opcoes[opcaoAtiva].cur = { r: cur.r, c: cur.c };
  }

  const totalDaOpcao = (lista) => lista.reduce((s, row) => s + calc(row).total, 0);

  function renderTabs() {
    if (!tabsEl) return;
    const html = opcoes.map((o, i) => {
      const tot = totalDaOpcao(o.rows);
      return `<div class="orc-tab${i === opcaoAtiva ? " active" : ""}">
        <button type="button" class="orc-tab-btn" data-opcao="${i}">Opção ${i + 1}${tot > 0 ? ` <small>(${fmt2(tot)} €)</small>` : ""}</button>
        ${i > 0 ? `<button type="button" class="orc-tab-x" data-del-opcao="${i}" title="Eliminar Opção ${i + 1}">✕</button>` : ""}
      </div>`;
    }).join("");
    tabsEl.innerHTML = html +
      `<button type="button" class="orc-tab-add" data-add-opcao title="Cria uma nova opção com os mesmos tipos, quantidades e medidas, mas sem produto nem preço">＋ Nova Opção</button>`;
  }

  function mudarOpcao(i) {
    if (!opcoes[i] || i === opcaoAtiva) { wrap.focus({ preventScroll: true }); return; }
    sincronizarOpcaoAtiva();
    opcaoAtiva = i;
    rows = opcoes[i].rows;
    cur = { r: Math.min(opcoes[i].cur?.r ?? 0, rows.length - 1), c: opcoes[i].cur?.c ?? C.TIPO };
    guardarRascunho();
    render();
    wrap.focus({ preventScroll: true });
  }

  function novaOpcao() {
    if (editing || overlay) return;
    sincronizarOpcaoAtiva();
    const base = rows;
    if (!base.some((r) => !linhaVazia(r))) {
      toast(`⚠️ Preenche primeiro a Opção ${opcaoAtiva + 1} (pelo menos tipo, quantidade e medidas)`, "warning");
      return;
    }
    pushUndo();
    // copia só a estrutura: tipo, qtd, comp., larg. — sem produto, preço e desconto
        const novas = base.map((r) => {
      if (linhaVazia(r)) return novaLinha();
      // Diversos (não Linear): copia a linha exatamente igual (artigo, qtd, preço e desconto)
      if (r.diversos && !r.linear) return { ...novaLinha(), ...r };
      return { ...novaLinha(), tipoId: r.tipoId, tipoNome: r.tipoNome, diversos: r.diversos, linear: r.linear, m2: r.m2, qtd: r.qtd, comp: r.comp, larg: r.larg };
    });
    // vai para a primeira linha que ainda precisa de produto (salta as de Diversos já completas)
    const primeira = Math.max(0, novas.findIndex((r) => !linhaVazia(r) && !linhaCompleta(r)));
    opcoes.push({ rows: novas, cur: { r: primeira, c: C.PROD } });
    opcaoAtiva = opcoes.length - 1;
    rows = novas;
    cur = { r: primeira, c: C.PROD };
    guardarRascunho();
    render();
    wrap.focus({ preventScroll: true });
    toast(`➕ Opção ${opcaoAtiva + 1} criada — escolhe o produto e o preço de cada linha`, "info");
  }

  function eliminarOpcao(i) {
    if (i === 0 || !opcoes[i] || editing || overlay) return;
    sincronizarOpcaoAtiva();
    const executar = () => {
      pushUndo();
      opcoes.splice(i, 1);
      if (opcaoAtiva === i) opcaoAtiva = i - 1;
      else if (opcaoAtiva > i) opcaoAtiva -= 1;
      rows = opcoes[opcaoAtiva].rows;
      cur = { r: Math.min(opcoes[opcaoAtiva].cur?.r ?? 0, rows.length - 1), c: opcoes[opcaoAtiva].cur?.c ?? C.TIPO };
      guardarRascunho();
      render();
      wrap.focus({ preventScroll: true });
      toast(`🗑️ Opção ${i + 1} eliminada`, "info");
    };
    if (!opcoes[i].rows.some((r) => !linhaVazia(r))) { executar(); return; }
    const el = criarOverlay(`
      <header><span>Eliminar Opção ${i + 1}</span><button type="button" data-x>✕</button></header>
      <div class="orc-body">Tem a certeza que deseja eliminar a <strong>Opção ${i + 1}</strong>?<br><br>As restantes opções não são afetadas.</div>
      <div class="orc-foot d-flex gap-2 justify-content-end">
        <button type="button" class="btn btn-secondary btn-sm" data-x>Cancelar</button>
        <button type="button" class="btn btn-danger btn-sm" data-ok>Eliminar</button>
      </div>`);
    el.querySelectorAll("[data-x]").forEach((b) => b.addEventListener("click", fecharOverlay));
    el.querySelector("[data-ok]").addEventListener("click", () => { fecharOverlay(); executar(); });
    el.querySelector("[data-ok]").focus();
  }

  if (tabsEl) {
    tabsEl.addEventListener("click", (e) => {
      if (overlay) return;
      if (e.target.closest("[data-add-opcao]")) { novaOpcao(); return; }
      const del = e.target.closest("[data-del-opcao]");
      if (del) { eliminarOpcao(parseInt(del.dataset.delOpcao)); return; }
      const tab = e.target.closest("[data-opcao]");
      if (tab) mudarOpcao(parseInt(tab.dataset.opcao));
    });
  }

  function setCur(r, c, focus = true) {
    cur.r = Math.max(0, Math.min(rows.length - 1, r));
    cur.c = Math.max(FIRST_COL, Math.min(LAST_COL, c));
    render();
    if (focus) wrap.focus({ preventScroll: true });
  }

  function garantirLinhas(ate) {
    while (rows.length <= ate) for (let i = 0; i < ADD_ROWS; i++) rows.push(novaLinha());
  }

  // -------------------------------------------------
  // OVERLAYS (janelas)
  // -------------------------------------------------
  function fecharOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
    wrap.focus({ preventScroll: true });
  }

  function criarOverlay(innerHtml, extraClass = "") {
    if (overlay) { overlay.remove(); overlay = null; }
    overlay = document.createElement("div");
    overlay.className = "orc-overlay";
    overlay.innerHTML = `<div class="orc-modal ${extraClass}">${innerHtml}</div>`;
    root.appendChild(overlay);
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) fecharOverlay(); });
    return overlay;
  }

  // Lista com pesquisa (usada para Tipo, Produto, Diversos e Cliente)
  // allowNew: mostra sempre "+ ..." no fim da lista quando o texto escrito ainda não existe
  function abrirLista({ titulo, itens, placeholder, seed = "", onSelect, onFreeText, max = 300, freeLabel, isFree, allowNew = false }) {
    const el = criarOverlay(`
      <header><span>${esc(titulo)}</span><button type="button" data-x>✕</button></header>
      <div class="orc-body">
        <input type="text" class="orc-input" placeholder="${esc(placeholder || "Pesquisar...")}" autocomplete="off" />
        <div class="orc-list"></div>
      </div>
      <div class="orc-foot"></div>`, "orc-picker");

    const input = el.querySelector("input");
    const list = el.querySelector(".orc-list");
    const foot = el.querySelector(".orc-foot");
    let filtrados = [];
    let ativo = 0;

    // "novo" = o texto escrito não existe exatamente na lista
    const temNovo = () => {
      const txt = input.value.trim();
      return !!(allowNew && onFreeText && txt && !itens.some((it) => norm(it.label) === norm(txt)));
    };
    const total = () => Math.min(filtrados.length, max) + (temNovo() && filtrados.length ? 1 : 0);

    function filtrar() {
      const tokens = norm(input.value).split(/\s+/).filter(Boolean);
      filtrados = tokens.length
        ? itens.filter((it) => tokens.every((t) => it._s.includes(t)))
        : itens;
      if (isFree && isFree(input.value.trim())) filtrados = []; // código especial: só mostra a opção de adicionar
      ativo = 0;
      desenhar();
    }

    function desenhar() {
      const vis = filtrados.slice(0, max);
      if (!vis.length) {
        const txt = input.value.trim();
        list.innerHTML = onFreeText && txt && (!isFree || isFree(txt))
          ? `<div class="orc-item active" data-free>${esc(freeLabel ? freeLabel(txt) : `Usar "${txt}"`)}</div>`
          : `<div class="orc-item empty">Nenhum resultado</div>`;
      } else {
        let html = vis.map((it, i) =>
          `<div class="orc-item${i === ativo ? " active" : ""}" data-i="${i}"><span>${esc(it.label)}</span>${it.extra ? `<small>${esc(it.extra)}</small>` : ""}</div>`
        ).join("");
        if (temNovo()) {
          const txt = input.value.trim();
          html += `<div class="orc-item${ativo === vis.length ? " active" : ""}" data-free>${esc(freeLabel ? freeLabel(txt) : `Usar "${txt}"`)}</div>`;
        }
        list.innerHTML = html;
      }
      foot.textContent = `${filtrados.length} resultado(s)`;
      const a = list.querySelector(".active");
      if (a) a.scrollIntoView({ block: "nearest" });
    }

    function escolher(i) {
      const it = i >= 0 && i < Math.min(filtrados.length, max) ? filtrados[i] : null;
      if (!it) {
        if (onFreeText && input.value.trim() && (!isFree || isFree(input.value.trim()))) { const t = input.value.trim(); fecharOverlay(); onFreeText(t); }
        return;
      }
      fecharOverlay();
      onSelect(it);
    }

    input.addEventListener("input", filtrar);
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); ativo = Math.max(0, Math.min(ativo + 1, total() - 1)); desenhar(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); ativo = Math.max(ativo - 1, 0); desenhar(); }
      else if (e.key === "PageDown") { e.preventDefault(); ativo = Math.max(0, Math.min(ativo + 8, total() - 1)); desenhar(); }
      else if (e.key === "PageUp") { e.preventDefault(); ativo = Math.max(ativo - 8, 0); desenhar(); }
      else if (e.key === "Enter") { e.preventDefault(); if (!e.repeat) escolher(ativo); }
      else if (e.key === "Escape") { e.preventDefault(); fecharOverlay(); }
      e.stopPropagation();
    });
    list.addEventListener("click", (e) => {
      if (e.target.closest("[data-free]")) { escolher(-1); return; }
      const d = e.target.closest(".orc-item[data-i]");
      if (d) escolher(parseInt(d.dataset.i));
    });
    el.querySelector("[data-x]").addEventListener("click", fecharOverlay);

    input.value = seed;
    filtrar();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  // Pede um texto simples (seed = letra(s) já escritas na grelha → aparecem no campo)
  function pedirTexto({ titulo, label, valor = "", seed = "", placeholder = "", onOk }) {
    const el = criarOverlay(`
      <header><span>${esc(titulo)}</span><button type="button" data-x>✕</button></header>
      <div class="orc-body">
        <label>${esc(label)}</label>
        <input type="text" class="orc-input" placeholder="${esc(placeholder)}" autocomplete="off" />
      </div>
      `);
    const input = el.querySelector("input");
    input.value = seed || valor;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.repeat) return;
        const t = input.value.trim();
        if (!t) { toast("⚠️ Escreve um texto", "warning"); return; }
        fecharOverlay(); onOk(t);
      } else if (e.key === "Escape") { e.preventDefault(); fecharOverlay(); }
      e.stopPropagation();
    });
    el.querySelector("[data-x]").addEventListener("click", fecharOverlay);
    input.focus();
    if (seed) input.setSelectionRange(input.value.length, input.value.length);
    else input.select();
  }

  // Janela pequena: Qtd / Comprimento / Largura  (+ m² ao vivo)
  //   Diversos → só Qtd | Linear → Qtd + m² (editável) | restantes → Qtd / Comp. / Larg.
  // campoInicial: "qtd" | "comp" | "larg" | "m2" → campo que fica com o cursor ao abrir
  function abrirDimensoes(r, campoInicial = "qtd") {
    const row = rows[r];
    const linear = !!row.linear;
    const soQtd = row.diversos && !linear;
    const el = criarOverlay(`
      <header><span>${esc(row.label || row.descricao)}</span><button type="button" data-x>✕</button></header>
      <div class="orc-body">
        <div class="${soQtd ? "" : "orc-dims-grid"}">
          <div><label>Quantidade</label><input type="text" inputmode="decimal" class="orc-input" data-f="qtd" autocomplete="off" /></div>
          ${linear ? `
          <div><label>m² (total)</label><input type="text" inputmode="decimal" class="orc-input" data-f="m2" autocomplete="off" /></div>` : soQtd ? "" : `
          <div><label>Comprimento (m)</label><input type="text" inputmode="decimal" class="orc-input" data-f="comp" autocomplete="off" /></div>
          <div><label>Largura (m)</label><input type="text" inputmode="decimal" class="orc-input" data-f="larg" autocomplete="off" /></div>`}
        </div>
        ${soQtd || linear ? "" : `<div class="orc-m2">m²: <span data-m2>0.0000</span></div>`}
      </div>
      `);

    const campos = [...el.querySelectorAll("input[data-f]")];
    const f = (n) => el.querySelector(`[data-f="${n}"]`);
    f("qtd").value = row.qtd || 1;
    if (linear) f("m2").value = row.m2 ? fmt4(row.m2) : "";
    else if (!soQtd) { f("comp").value = row.comp ? fmt4(row.comp) : ""; f("larg").value = row.larg ? fmt4(row.larg) : ""; }

    const m2El = el.querySelector("[data-m2]");
    const atualizarM2 = () => {
      if (!m2El) return;
      const m = (parseNum(f("qtd").value) || 0) * (parseNum(f("comp").value) || 0) * (parseNum(f("larg").value) || 0);
      m2El.textContent = m.toFixed(4);
    };

    function confirmar() {
      const q = parseNum(f("qtd").value);
      if (!(q > 0)) { toast("⚠️ Quantidade deve ser maior que zero", "warning"); f("qtd").focus(); return; }
      let co = 1, la = 1, m2 = null;
      if (linear) {
        m2 = parseNum(f("m2").value);
        if (!(m2 > 0)) { toast("⚠️ O m² deve ser maior que zero", "warning"); f("m2").focus(); return; }
      } else if (!soQtd) {
        co = parseNum(f("comp").value); la = parseNum(f("larg").value);
        if (!(co > 0)) { toast("⚠️ Comprimento deve ser maior que zero", "warning"); f("comp").focus(); return; }
        if (!(la > 0)) { toast("⚠️ Largura deve ser maior que zero", "warning"); f("larg").focus(); return; }
      }
      pushUndo();
      row.qtd = q;
      if (linear) row.m2 = m2;
      else if (!soQtd) { row.comp = co; row.larg = la; }
      fecharOverlay();
      guardarRascunho();
      setCur(r, C.PRECO); // m² já calculados na linha → Enter para meter o preço
    }

    campos.forEach((inp, i) => {
      inp.addEventListener("focus", () => inp.select());
      inp.addEventListener("input", atualizarM2);
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (e.repeat) return;
          if (i < campos.length - 1) campos[i + 1].focus(); else confirmar();
        } else if (e.key === "Escape") { e.preventDefault(); fecharOverlay(); }
        e.stopPropagation();
      });
    });
    el.querySelector("[data-x]").addEventListener("click", fecharOverlay);
    atualizarM2();
    (f(campoInicial) || campos[0]).focus();
  }

  // -------------------------------------------------
  // PICKERS ESPECÍFICOS
  // -------------------------------------------------
  function abrirTipo(r, seed = "") {
    const itens = tipos.map((t) => ({ label: t.nome, tipo: t, _s: norm(t.nome) }));
    itens.push({ label: "+ Adicionar novo tipo...", novo: true, _s: "" });
    // "novo" aparece sempre: marca-o para ficar sempre visível
    itens[itens.length - 1]._s = "novo tipo adicionar";
    abrirLista({
      titulo: `Linha ${r + 1} — Tipo`,
      itens,
      placeholder: "Pesquisar tipo...",
      seed,
      onSelect: (it) => {
        if (it.novo) { novoTipo(r); return; }
        definirTipo(r, it.tipo);
      },
    });
  }

  function definirTipo(r, t) {
    pushUndo();
    const row = rows[r];
    const eraDiv = row.diversos;
    const nomeTipo = (t.nome || "").trim().toLowerCase();
    const isLinear = nomeTipo === "linear";
    const isDiv = nomeTipo === "diversos" || isLinear; // Linear comporta-se como Diversos (artigo livre, sem comp./larg.)
    row.tipoId = t.id;
    row.tipoNome = t.nome;
    row.diversos = isDiv;
    if (!isLinear) row.m2 = null;
    row.linear = isLinear;
    if (eraDiv !== isDiv) {
      // mudou entre "diversos/linear" e normal → o produto deixa de fazer sentido
      Object.assign(row, { brandKey: "", brandNome: "", webId: null, descricao: "", acabamento: "", espessura: null, label: "", refPreco: null, comp: null, larg: null, m2: null });
    }
    guardarRascunho();
    setCur(r, C.PROD);
  }

  function novoTipo(r) {
    pedirTexto({
      titulo: "Novo tipo",
      label: "Nome do novo tipo",
      placeholder: "Ex.: Rodapé",
      onOk: async (nome) => {
        const n = nome.charAt(0).toUpperCase() + nome.slice(1);
        try {
          const { data, error } = await supabase.from("type_products").insert([{ nome: n }]).select();
          if (error) throw error;
          tipos.push({ id: data[0].id, nome: data[0].nome });
          tipos.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt"));
          toast("✅ Novo tipo adicionado", "success");
          definirTipo(r, { id: data[0].id, nome: data[0].nome });
        } catch (err) {
          toast("❌ Erro ao adicionar tipo: " + (err.message || err), "danger");
          setCur(r, C.TIPO);
        }
      },
    });
  }

  // Depois de escolher o produto: se a linha já tem quantidade e medidas
  // (ex.: opção copiada da anterior) vai direto ao preço; senão pede as medidas.
  function seguirAposProduto(r) {
    const row = rows[r];
    const medidasOk = row.qtd > 0 && (row.linear ? row.m2 > 0 : row.diversos || (row.comp > 0 && row.larg > 0));
    if (medidasOk) setCur(r, C.PRECO); else abrirDimensoes(r);
  }

  // Aplica um artigo livre (Diversos / Linear) à linha
  function aplicarDiverso(r, texto) {
    const row = rows[r];
    pushUndo();
    Object.assign(row, { descricao: texto, label: texto, brandKey: "", brandNome: "", webId: null, acabamento: "", espessura: null, refPreco: null });
    guardarRascunho();
    setCur(r, C.PROD);
    seguirAposProduto(r);
  }

  // Guarda um artigo novo de "Diversos" na base de dados (tabela diversos_opcoes)
  async function guardarOpcaoDiverso(texto) {
    if (diversosOpcoes.some((d) => norm(d.label) === norm(texto))) return;
    try {
      const { data, error } = await supabase.from("diversos_opcoes").insert([{ descricao: texto }]).select();
      if (error) throw error;
      diversosOpcoes.push({ id: data[0].id, label: data[0].descricao, _s: norm(data[0].descricao) });
      diversosOpcoes.sort((a, b) => a.label.localeCompare(b.label, "pt"));

    } catch (err) {
      toast("⚠️ Não foi possível guardar na base de dados: " + (err.message || err), "warning");
    }
  }

  function abrirProduto(r, seed = "") {
    const row = rows[r];
    if (!row.tipoId) { toast("⚠️ Escolhe primeiro o tipo", "warning"); setCur(r, C.TIPO); return; }

    // DIVERSOS: lista de artigos guardados na BD (pesquisa + "guardar e usar" se for novo)
    if (row.diversos && !row.linear) {
      abrirLista({
        titulo: `Linha ${r + 1} — Artigo (Diversos)`,
        itens: diversosOpcoes,
        placeholder: "Pesquisar ou escrever novo artigo...",
        seed,
        allowNew: true,
        freeLabel: (t) => `+ Guardar e usar "${t}"`,
        onSelect: (it) => aplicarDiverso(r, it.label),
        onFreeText: async (t) => { await guardarOpcaoDiverso(t); aplicarDiverso(r, t); },
      });
      return;
    }

    // LINEAR: texto livre
    if (row.linear) {
      pedirTexto({
        titulo: `Linha ${r + 1} — Artigo (Linear)`,
        label: "Descrição do artigo",
        valor: row.descricao,
        seed,
        placeholder: "Descreve o artigo...",
        onOk: (t) => aplicarDiverso(r, t),
      });
      return;
    }

    abrirLista({
      titulo: `Linha ${r + 1} — Produto`,
      itens: produtos,
      placeholder: "Pesquisar produto...",
      seed,
      freeLabel: (t) => `Usar "${t}" como produto livre`,
      onSelect: (p) => {
        pushUndo();
        Object.assign(row, {
          brandKey: p.brandKey, brandNome: p.brandNome, webId: p.webId, descricao: p.descricao,
          acabamento: p.acabamento, espessura: p.espessura, label: p.label, refPreco: p.preco,
        });
        // preço antigo deixa de ser válido se o produto mudou
        row.preco = null;
        guardarRascunho();
        setCur(r, C.PROD);
        seguirAposProduto(r); // Enter na lista → abre Qtd / Comp / Larg (ou vai ao preço se já existirem)
      },
      onFreeText: (t) => {
        pushUndo();
        Object.assign(row, { brandKey: "", brandNome: "", webId: null, descricao: t, acabamento: "", espessura: null, label: t, refPreco: null, preco: null });
        guardarRascunho();
        setCur(r, C.PROD);
        seguirAposProduto(r);
      },
    });
  }

  function abrirCliente(seed = "") {
    abrirLista({
      titulo: "Cliente",
      itens: clientes,
      placeholder: "Pesquisar cliente...",
      seed,
      freeLabel: () => "+ Adicionar novo cliente",
      isFree: (t) => t === CODIGO_NOVO_CLIENTE,
      onSelect: (it) => selecionarCliente(it.original),
      onFreeText: () => novoCliente(),
    });
  }

  // Há clientes na BD sem "descricao" (null): nunca devolve null, senão o sort rebenta
  const labelCliente = (c) => {
    const nome = (c.descricao || "").trim() || (c.descricao2 || "").trim() || `Cliente ${c.id}`;
    return c.descricao && c.descricao2 ? `${c.descricao} (${c.descricao2})` : nome;
  };

  const detalhesClienteHtml = (c) =>
    `${esc(c.contribuinte || "---")} | <strong>Telefone:</strong> ${esc(c.telefone || "---")}<br><small>${esc(c.morada || "")}</small>`;

  function selecionarCliente(c) {
    selectedCliente = c;
    clienteId.value = c.id;
    clienteNome.value = c.descricao;
    clearCliente.classList.remove("d-none");
    clienteDetalhes.innerHTML = detalhesClienteHtml(c);
    window.selectedClienteData = c;
    guardarRascunho();
    setCur(firstEmptyRow(), C.TIPO);
  }

  // Cliente novo: só Nome e Telefone (escrever o código 749 + Enter na pesquisa abre isto)
  function novoCliente() {
    const el = criarOverlay(`
      <header><span>Novo cliente</span><button type="button" data-x>✕</button></header>
      <div class="orc-body">
        <label>Nome</label>
        <input type="text" class="orc-input" data-f="nome" autocomplete="off" />
        <label>Telefone</label>
        <input type="text" class="orc-input" data-f="tel" autocomplete="off" />
      </div>`);
    const nome = el.querySelector('[data-f="nome"]');
    const tel = el.querySelector('[data-f="tel"]');

    async function guardar() {
      const n = nome.value.trim();
      if (!n) { toast("⚠️ Escreve o nome do cliente", "warning"); nome.focus(); return; }
      try {
        const { data, error } = await supabase
          .from("clientes")
          .insert([{ descricao: n, contribuinte: null, telefone: tel.value.trim() || null }])
          .select();
        if (error) throw error;
        const c = data[0];
        const label = labelCliente(c);
        clientes.push({ label, extra: c.contribuinte || "", original: c, _s: norm(label) });
        clientes.sort((a, b) => (a.label || "").localeCompare(b.label || "", "pt"));
        toast("✅ Cliente adicionado", "success");
        fecharOverlay();
        selecionarCliente(c);
      } catch (err) {
        toast("❌ Erro ao adicionar cliente: " + (err.message || err), "danger");
      }
    }

    [nome, tel].forEach((inp, i) => {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); if (e.repeat) return; i === 0 ? tel.focus() : guardar(); }
        else if (e.key === "Escape") { e.preventDefault(); fecharOverlay(); }
        e.stopPropagation();
      });
    });
    el.querySelector("[data-x]").addEventListener("click", fecharOverlay);
    nome.focus();
  }

  function firstEmptyRow() {
    const i = rows.findIndex(linhaVazia);
    return i === -1 ? 0 : i;
  }

  // -------------------------------------------------
  // EDIÇÃO INLINE (Preço/m² e Desc.)
  // -------------------------------------------------
  function editarInline(r, c, inicial = null) {
    const row = rows[r];
    const td = tbody.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
    if (!td) return;
    cur = { r, c };
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.className = "cell-input";
    input.autocomplete = "off";
    if (c === C.PRECO) {
      input.value = inicial !== null ? inicial : row.preco ? String(row.preco) : "";
    } else {
      input.value = inicial !== null ? inicial : String(row.desc ?? 0);
    }
    td.innerHTML = "";
    td.appendChild(input);
    editing = { r, c, input };
    input.focus();
    if (inicial === null) input.select(); else input.setSelectionRange(input.value.length, input.value.length);

    let terminado = false;
    const terminar = (modo) => {
      if (terminado) return;
      terminado = true;
      const v = parseNum(input.value);
      if (modo !== "cancel") {
        if (c === C.PRECO) {
          if (input.value.trim() === "") {
            if (modo === "enter") {
              toast("⚠️ Indica o preço/m²", "warning");
              terminado = false; input.focus(); return;
            }
          } else if (!(v >= 0)) {
            toast("⚠️ Preço inválido", "warning");
            terminado = false; input.focus(); return;
          } else { pushUndo(); row.preco = v; }
        } else {
          let d = input.value.trim() === "" ? 0 : v;
          if (!(d >= 0) || d > 100) { toast("⚠️ Desconto tem de estar entre 0 e 100", "warning"); terminado = false; input.focus(); input.select(); return; }
          pushUndo();
          row.desc = d;
        }
      }
      editing = null;
      guardarRascunho();

      if (modo === "enter") {
        if (c === C.PRECO) { cur = { r, c: C.DESC }; render(); editarInline(r, C.DESC); return; }
        // Desc. → próxima linha
        if (opcaoAtiva > 0) {
          // opção copiada: salta para o produto da próxima linha já criada
                    const prox = rows.findIndex((x, idx) => idx > r && !linhaVazia(x) && !linhaCompleta(x));
          if (prox !== -1) { setCur(prox, C.PROD); return; }
        }
        garantirLinhas(r + 1);
        setCur(r + 1, C.TIPO);
        return;
      }
      if (modo === "tab") { setCur(r, c + 1); return; }
      if (modo === "down") { garantirLinhas(r + 1); setCur(r + 1, c); return; }
      if (modo === "up") { setCur(r - 1, c); return; }
      setCur(r, c); // cancel / blur
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); if (!e.repeat) terminar("enter"); }
      else if (e.key === "Escape") { e.preventDefault(); terminar("cancel"); }
      else if (e.key === "Tab") { e.preventDefault(); terminar("tab"); }
      // setas ↑/↓: guardam o que está escrito e passam à linha de cima/baixo
      else if (e.key === "ArrowDown") { e.preventDefault(); terminar("down"); }
      else if (e.key === "ArrowUp") { e.preventDefault(); terminar("up"); }
      e.stopPropagation();
    });
    input.addEventListener("blur", () => { if (!terminado && editing && editing.input === input) terminar("blur"); });
  }

  // -------------------------------------------------
  // AÇÃO DE UMA CÉLULA (Enter / duplo clique / escrever uma letra)
  // -------------------------------------------------
  function ativarCelula(r, c, seed = "") {
    const row = rows[r];
    switch (c) {
      case C.TIPO: abrirTipo(r, seed); break;
      case C.PROD: abrirProduto(r, seed); break;
      case C.QTD: case C.COMP: case C.LARG:
        if (!row.descricao) { toast("⚠️ Escolhe primeiro o produto", "warning"); setCur(r, row.tipoId ? C.PROD : C.TIPO); return; }
        // abre a janela já com o cursor na coluna em que clicaste (Qtd / Comp. / Larg.)
        abrirDimensoes(r, c === C.COMP ? "comp" : c === C.LARG ? "larg" : "qtd"); break;
      case C.PRECO: case C.DESC:
        if (!row.descricao) { toast("⚠️ Escolhe primeiro o produto", "warning"); setCur(r, row.tipoId ? C.PROD : C.TIPO); return; }
        editarInline(r, c, seed || null); break;
      case C.M2:
        if (row.linear) { // só no Linear o m² pode ser alterado à mão
          if (!row.descricao) { toast("⚠️ Escolhe primeiro o produto", "warning"); setCur(r, C.PROD); return; }
          abrirDimensoes(r, "m2"); break;
        }
        setCur(r, C.PRECO); break;
      default: // subtotal, totais: só leitura
        setCur(r, C.PRECO);
    }
  }

  // Apaga a linha: as de baixo sobem (mantém sempre o mesmo nº de linhas)
  function apagarLinha(r) {
    pushUndo();
    rows.splice(r, 1);
    rows.push(novaLinha());
    guardarRascunho();
    render();
  }

  function limparCelula(r, c) {
    if (c === C.TIPO) { apagarLinha(r); return; }
    pushUndo();
    const row = rows[r];
    if (c === C.PROD) Object.assign(row, { brandKey: "", brandNome: "", webId: null, descricao: "", acabamento: "", espessura: null, label: "", refPreco: null });
    else if (c === C.QTD) row.qtd = null;
    else if (c === C.COMP) row.comp = null;
    else if (c === C.LARG) row.larg = null;
    else if (c === C.M2 && row.linear) row.m2 = null;
    else if (c === C.PRECO) row.preco = null;
    else if (c === C.DESC) row.desc = 0;
    // se a linha ficou totalmente vazia, desaparece e as de baixo sobem
    if (linhaVazia(row) && rows.length > 1) {
      rows.splice(r, 1);
      rows.push(novaLinha());
    }
    guardarRascunho();
    render();
  }

  // -------------------------------------------------
  // TECLADO E RATO NA GRELHA
  // -------------------------------------------------
  wrap.addEventListener("keydown", (e) => {
    if (editing || overlay) return;
    const { r, c } = cur;
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); desfazer(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); refazer(); }
      return; // Ctrl+C / Ctrl+V seguem para os eventos copy/paste
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); garantirLinhas(r + 1); setCur(r + 1, c); break;
      case "ArrowUp": e.preventDefault(); setCur(r - 1, c); break;
      case "ArrowLeft": e.preventDefault(); setCur(r, c - 1); break;
      case "ArrowRight": e.preventDefault(); setCur(r, c + 1); break;
      case "Tab": e.preventDefault(); e.shiftKey ? setCur(r, c - 1) : setCur(r, c + 1); break;
      case "Enter": e.preventDefault(); if (!e.repeat) ativarCelula(r, c); break;
      case "Delete": case "Backspace":
        e.preventDefault();
        if (e.shiftKey) apagarLinha(r); // Shift+Supr: apaga a linha toda
        else limparCelula(r, c);
        break;
      case "Home": e.preventDefault(); setCur(r, FIRST_COL); break;
      case "End": e.preventDefault(); setCur(r, LAST_COL); break;
      default:
        // escrever diretamente numa célula de preço/desc (como no Excel) ou para pesquisar
        // (Tipo / Produto — inclui Diversos e Linear: a letra aparece logo no campo)
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if ((c === C.PRECO || c === C.DESC) && /[0-9.,]/.test(e.key)) { e.preventDefault(); ativarCelula(r, c, e.key); }
          else if ((c === C.TIPO || c === C.PROD) && /\S/.test(e.key)) { e.preventDefault(); ativarCelula(r, c, e.key); }
        }
    }
  });

  // Seleção com o rato + duplo clique (detetado no mousedown, porque a grelha
  // é redesenhada a cada seleção e o evento "dblclick" nativo perder-se-ia)
  let ultimoClique = { t: 0, r: -1, c: -1 };
  tbody.addEventListener("mousedown", (e) => {
    if (e.target.closest("[data-clear]")) return;
    const td = e.target.closest("td[data-c]");
    if (!td || editing || overlay) return;
    e.preventDefault();
    const r = parseInt(td.dataset.r);
    const c = parseInt(td.dataset.c);
    const agora = Date.now();
    const duplo = agora - ultimoClique.t < 450 && ultimoClique.r === r && ultimoClique.c === c;
    ultimoClique = { t: duplo ? 0 : agora, r, c };
    setCur(r, c);
    if (duplo) ativarCelula(r, c);
  });

  tbody.addEventListener("click", (e) => {
    const x = e.target.closest("[data-clear]");
    if (!x) return;
    const r = parseInt(x.dataset.clear);
    apagarLinha(r);
    setCur(r, C.TIPO);
  });

  btnMaisLinhas.addEventListener("click", () => {
    for (let i = 0; i < ADD_ROWS; i++) rows.push(novaLinha());
    render();
    toast(`➕ ${ADD_ROWS} linhas adicionadas (total: ${rows.length})`, "info");
  });

  // -------------------------------------------------
  // COPIAR / COLAR (colunas Produto e Preço/m²)
  // -------------------------------------------------
  const gridAtiva = () =>
    !editing && !overlay && document.getElementById("orcamentoRoot") === root && document.activeElement === wrap;

  function aoCopiar(e) {
    if (!gridAtiva()) return;
    const row = rows[cur.r];
    let texto = null;
    if (cur.c === C.PROD && row.descricao) {
      texto = row.label || row.descricao;
      clipInterno = {
        tipo: "prod", texto,
        dados: {
          diversos: row.diversos, linear: row.linear, tipoId: row.tipoId, tipoNome: row.tipoNome,
          brandKey: row.brandKey, brandNome: row.brandNome, webId: row.webId, descricao: row.descricao,
          acabamento: row.acabamento, espessura: row.espessura, label: row.label,
        },
      };
    } else if (cur.c === C.PRECO && row.preco) {
      texto = String(row.preco).replace(".", ",");
      clipInterno = { tipo: "preco", texto };
    }
    if (texto === null) return;
    e.clipboardData.setData("text/plain", texto);
    e.preventDefault();
  }

  function colarProduto(r, texto) {
    const row = rows[r];
    const src = clipInterno && clipInterno.tipo === "prod" && clipInterno.texto === texto ? clipInterno.dados : null;
    let dados = src;
    if (!dados) {
      const m = produtos.find((p) => norm(p.label) === norm(texto));
      if (m) dados = { diversos: false, brandKey: m.brandKey, brandNome: m.brandNome, webId: m.webId, descricao: m.descricao, acabamento: m.acabamento, espessura: m.espessura, label: m.label };
    }
    if (!dados && !row.tipoId) { toast("⚠️ Escolhe primeiro o tipo", "warning"); return; }
    if (dados && !row.tipoId && !(src && src.tipoId)) { toast("⚠️ Escolhe primeiro o tipo", "warning"); return; }
    if (dados && row.tipoId && !!dados.diversos !== !!row.diversos) { toast("⚠️ O tipo desta linha não é compatível com este produto", "warning"); return; }

    pushUndo();
    if (!row.tipoId && src) {
      Object.assign(row, { tipoId: src.tipoId, tipoNome: src.tipoNome, diversos: !!src.diversos, linear: !!src.linear });
    }
    if (dados) {
      Object.assign(row, {
        brandKey: dados.brandKey || "", brandNome: dados.brandNome || "", webId: dados.webId ?? null,
        descricao: dados.descricao, acabamento: dados.acabamento || "", espessura: dados.espessura ?? null,
        label: dados.label || dados.descricao, refPreco: null,
      });
    } else {
      Object.assign(row, { brandKey: "", brandNome: "", webId: null, descricao: texto, acabamento: "", espessura: null, label: texto, refPreco: null });
    }
    guardarRascunho();
    render();
  }

  function aoColar(e) {
    if (!gridAtiva()) return;
    const texto = ((e.clipboardData && e.clipboardData.getData("text/plain")) || "").replace(/\r/g, "");
    if (!texto.trim()) return;

    if (cur.c === C.PROD) {
      e.preventDefault();
      colarProduto(cur.r, texto.split("\n")[0].trim());
    } else if (cur.c === C.PRECO) {
      e.preventDefault();
      const valores = texto.split("\n").filter((l) => l.trim() !== "").map((l) => parseNum(l.replace(/[€\s]/g, "")));
      if (valores.some((v) => !(v >= 0))) { toast("⚠️ Preço inválido", "warning"); return; }
      pushUndo();
      garantirLinhas(cur.r + valores.length - 1);
      valores.forEach((v, i) => { rows[cur.r + i].preco = v; });
      guardarRascunho();
      render();
    }
  }

  // listeners no document: limpa os da visita anterior a esta página
  if (window.__orcClipHandlers) {
    document.removeEventListener("copy", window.__orcClipHandlers.copy);
    document.removeEventListener("paste", window.__orcClipHandlers.paste);
  }
  window.__orcClipHandlers = { copy: aoCopiar, paste: aoColar };
  document.addEventListener("copy", aoCopiar);
  document.addEventListener("paste", aoColar);

  // -------------------------------------------------
  // CLIENTE
  // -------------------------------------------------
  clienteNome.addEventListener("click", () => abrirCliente());
  clienteNome.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); abrirCliente(); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); abrirCliente(e.key); }
  });
  clearCliente.addEventListener("click", (e) => {
    e.stopPropagation();
    clienteNome.value = ""; clienteId.value = ""; clienteDetalhes.innerHTML = "";
    selectedCliente = null; window.selectedClienteData = null;
    clearCliente.classList.add("d-none");
    guardarRascunho();
    clienteNome.focus();
  });

  // -------------------------------------------------
  // LIMPAR TUDO
  // -------------------------------------------------
  function resetTudo(depoisDeGuardar = false) {
    if (depoisDeGuardar) { undoStack = []; redoStack = []; } else pushUndo();
    rows = Array.from({ length: DEFAULT_ROWS }, novaLinha);
    opcoes = [{ rows, cur: { r: 0, c: C.TIPO } }];
    opcaoAtiva = 0;
    cur = { r: 0, c: C.TIPO };
    clienteNome.value = ""; clienteId.value = ""; clienteDetalhes.innerHTML = "";
    selectedCliente = null; window.selectedClienteData = null;
    clearCliente.classList.add("d-none");
    limparRascunho();
    render();
  }

  btnLimpar.addEventListener("click", () => {
    sincronizarOpcaoAtiva();
    const temDados = opcoes.some((o) => o.rows.some((r) => !linhaVazia(r))) || clienteNome.value.trim();
    if (!temDados) { toast("⚠️ Não há dados para limpar", "warning"); return; }
    const el = criarOverlay(`
      <header><span>Limpar Orçamento</span><button type="button" data-x>✕</button></header>
      <div class="orc-body">Tem a certeza que deseja limpar <strong>todo o orçamento</strong>?<br><br>Esta ação remove todas as linhas (de todas as opções) e os dados do cliente.</div>
      <div class="orc-foot d-flex gap-2 justify-content-end">
        <button type="button" class="btn btn-secondary btn-sm" data-x>Cancelar</button>
        <button type="button" class="btn btn-danger btn-sm" data-ok>Limpar Tudo</button>
      </div>`);
    el.querySelectorAll("[data-x]").forEach((b) => b.addEventListener("click", fecharOverlay));
    el.querySelector("[data-ok]").addEventListener("click", () => { fecharOverlay(); resetTudo(); toast("🔄 Orçamento limpo com sucesso", "success"); });
    el.querySelector("[data-ok]").focus();
  });

  // -------------------------------------------------
  // GUARDAR
  // -------------------------------------------------
  btnGuardar.addEventListener("click", async () => {
    if (editing || overlay) return;

    if (!clienteNome.value.trim()) {
      toast("⚠️ Escolhe o cliente", "warning");
      clienteNome.focus();
      return;
    }

    sincronizarOpcaoAtiva();
    const multi = opcoes.length > 1;

    // valida cada opção (a opção 1 tem de ter linhas; as outras não podem ficar vazias/incompletas)
    const usadasPorOpcao = [];
    for (let o = 0; o < opcoes.length; o++) {
      const usadas = opcoes[o].rows.map((row, i) => ({ row, i })).filter((x) => !linhaVazia(x.row));
      const nome = multi ? `Opção ${o + 1}: ` : "";
      if (usadas.length === 0) {
        if (multi) {
          mudarOpcao(o);
          toast(`⚠️ A Opção ${o + 1} está vazia. Preenche-a ou elimina-a antes de guardar.`, "warning");
        } else {
          toast("⚠️ Adiciona pelo menos uma linha ao orçamento", "warning");
        }
        return;
      }
      const incompletas = usadas.filter((x) => !linhaCompleta(x.row));
      if (incompletas.length) {
        mudarOpcao(o);
        toast(`⚠️ ${nome}linha(s) incompleta(s): ${incompletas.map((x) => x.i + 1).join(", ")}. Completa-as ou limpa-as antes de guardar.`, "warning");
        const f = incompletas[0].row;
        const colFalta = !f.tipoId ? C.TIPO : !f.descricao.trim() ? C.PROD : !(f.qtd > 0) ? C.QTD : f.linear ? (!(f.m2 > 0) ? C.M2 : C.PRECO) : (!f.diversos && (!(f.comp > 0) || !(f.larg > 0))) ? C.COMP : C.PRECO;
        setCur(incompletas[0].i, colFalta);
        return;
      }
      usadasPorOpcao.push(usadas);
    }

    try {
      btnGuardar.disabled = true;
      toast(modoEdicao ? "⏳ A guardar alterações..." : "⏳ A guardar orçamento...", "info");

      // As opções são alternativas (não se somam): total_geral = total da Opção 1 (SEM IVA)
      const totalGeral = usadasPorOpcao[0].reduce((s, x) => s + calc(x.row).total, 0);

      const montarItens = (orcId) => {
        const itens = [];
        usadasPorOpcao.forEach((usadas, o) => {
          usadas.forEach(({ row }) => {
            itens.push({
              orcamento_id: orcId,
              ...(multi ? { pagina: o + 1 } : {}), // só grava a opção quando há mais do que uma
              tipo_id: row.tipoId,
              brand: row.diversos ? "" : row.brandKey || "",
              descricao: row.descricao,
              quantidade: row.qtd,
              comprimento: row.linear ? Number((row.m2 / row.qtd).toFixed(6)) : row.diversos ? 1 : row.comp,
              largura: row.diversos ? 1 : row.larg,
              espessura: row.diversos ? 0 : row.espessura ?? 0,
              type: row.diversos ? null : row.acabamento || null,
              preco_mt2: row.preco,
              desconto_percentagem: row.desc || 0,
            });
          });
        });
        return itens;
      };

      // ---- MODO EDIÇÃO: atualiza o orçamento existente ----
      // Ordem pensada para nunca perder dados: 1) insere os itens novos,
      // 2) apaga os antigos (se falhar, desfaz os novos), 3) atualiza o cabeçalho.
      if (modoEdicao) {
        const { data: novos, error: insErr } = await supabase
          .from("orcamento_itens")
          .insert(montarItens(editId))
          .select("id");
        if (insErr) throw insErr;
        const novosIds = (novos || []).map((n) => n.id);

        if (itensGuardadosIds.length) {
          const { error: delErr } = await supabase.from("orcamento_itens").delete().in("id", itensGuardadosIds);
          if (delErr) {
            if (novosIds.length) await supabase.from("orcamento_itens").delete().in("id", novosIds);
            throw delErr;
          }
        }
        itensGuardadosIds = novosIds; // se o passo 3 falhar e o utilizador tentar de novo, não duplica

        const { error: upErr } = await supabase
          .from("orcamentos")
          .update({
            cliente_nome: clienteNome.value.trim(),
            cliente_id: clienteId.value ? parseInt(clienteId.value) : null,
            total_geral: totalGeral,
          })
          .eq("id", editId);
        if (upErr) throw upErr;

        toast("✅ Orçamento atualizado com sucesso!", "success");
        if (typeof goToRoute === "function") goToRoute("/list-orcamento");
        return;
      }

      const { data: orc, error: orcErr } = await supabase
        .from("orcamentos")
        .insert([{
          cliente_nome: clienteNome.value.trim(),
          cliente_id: clienteId.value ? parseInt(clienteId.value) : null,
          total_geral: totalGeral,
          data_criacao: new Date().toISOString(),
        }])
        .select();
      if (orcErr) throw new Error(orcErr.message);

      const orcId = orc[0].id;
      const itens = montarItens(orcId);

      const { error: itErr } = await supabase.from("orcamento_itens").insert(itens);
      if (itErr) {
        // não deixar um orçamento "vazio" para trás
        await supabase.from("orcamentos").delete().eq("id", orcId);
        throw itErr;
      }

      toast("✅ Orçamento guardado com sucesso!", "success");
      resetTudo(true);
    } catch (err) {
      console.error("❌ Erro ao guardar:", err);
      const msg = err.message || String(err);
      toast(/pagina/i.test(msg)
        ? "❌ Falta a coluna 'pagina' na tabela orcamento_itens. Corre o SQL das Opções no Supabase (ver instruções)."
        : "❌ Erro ao guardar orçamento: " + msg, "danger");
    } finally {
      btnGuardar.disabled = false;
    }
  });

  // -------------------------------------------------
  // CARREGAR DADOS (tipos, marcas, produtos + espessuras, clientes, diversos)
  // -------------------------------------------------
  async function carregarDados() {
    const [tiposRes, brandsRes, website, thick, clientesRes] = await Promise.all([
      fetchAll("type_products", "id, nome", "nome"),
      fetchAll("brands", "display_name, website_key", "display_name"),
      fetchAll("website", "id, Brand, Title_pt", "id"),
      fetchAll("product_thicknesses", "website_item_id, thickness, type, price_per_m2", "id"),
      fetchAll("clientes", "*", "descricao"),
    ]);

    tipos = tiposRes
  .map((t) => ({ id: t.id, nome: t.nome }))
  .sort((a, b) =>
    (a.nome || "").localeCompare(b.nome || "", "pt", { sensitivity: "base" })
  );

    clientes = clientesRes.map((c) => {
      const label = labelCliente(c);
      return { label, extra: c.contribuinte || "", original: c, _s: norm(label) };
    });

    const brandNome = {};
    brandsRes.forEach((b) => { brandNome[b.website_key] = b.display_name; });
    brandNomePorKey = brandNome;
    const webById = {};
    website.forEach((w) => { webById[w.id] = w; });

    // Uma entrada por (produto × espessura × acabamento):
    // "Dekton - Marmorio Polido 4mm"
    const lista = [];
    const comEspessura = new Set();
    thick.forEach((t) => {
      const w = webById[t.website_item_id];
      if (!w) return;
      comEspessura.add(w.id);
      const marca = brandNome[w.Brand] || w.Brand || "";
      const acab = (t.type || "").toString().trim();
      const esp = t.thickness;
      const label = `${marca} - ${w.Title_pt}${acab ? " " + acab : ""}${esp !== null && esp !== undefined ? " " + esp + "mm" : ""}`;
      lista.push({
        label, brandKey: w.Brand, brandNome: marca, webId: w.id, descricao: w.Title_pt,
        acabamento: acab, espessura: esp, preco: t.price_per_m2,
        _s: norm(label + " " + w.Brand),
      });
    });

    // produtos sem espessura/preço configurados continuam disponíveis
    website.forEach((w) => {
      if (comEspessura.has(w.id)) return;
      const marca = brandNome[w.Brand] || w.Brand || "";
      const label = `${marca} - ${w.Title_pt}`;
      lista.push({
        label, brandKey: w.Brand, brandNome: marca, webId: w.id, descricao: w.Title_pt,
        acabamento: "", espessura: null, preco: null, _s: norm(label + " " + w.Brand),
      });
    });

    lista.sort((a, b) => (a.label || "").localeCompare(b.label || "", "pt", { numeric: true }));
    produtos = lista;

    // Artigos "Diversos" guardados — fora do Promise.all para não rebentar
    // se a tabela diversos_opcoes ainda não existir
    try {
      const dv = await fetchAll("diversos_opcoes", "id, descricao", "descricao");
      diversosOpcoes = dv.map((d) => ({ id: d.id, label: d.descricao, _s: norm(d.descricao) }));
    } catch (err) {
      console.warn("⚠️ Tabela diversos_opcoes indisponível:", err);
      diversosOpcoes = [];
    }
  }

  // -------------------------------------------------
  // MODO EDIÇÃO: carrega o orçamento e preenche o formulário
  // -------------------------------------------------
  function itemParaLinha(it) {
    const tipo = tipos.find((t) => String(t.id) === String(it.tipo_id));
    const tipoNome = tipo ? tipo.nome : `Tipo ${it.tipo_id}`;
    const linear = tipoNome.trim().toLowerCase() === "linear";
    const diversos = tipoNome.trim().toLowerCase() === "diversos" || it.brand === "diversos" || linear;
    const brandKey = diversos ? "" : it.brand || "";
    const brandNome = brandKey ? brandNomePorKey[brandKey] || brandKey : "";
    const acabamento = diversos ? "" : it.type || "";
    const esp = Number(it.espessura);
    const espessura = diversos || !(esp > 0) ? null : esp;
    const prod = brandKey ? produtos.find((p) => p.brandKey === brandKey && p.descricao === it.descricao) : null;
    const label = diversos || !brandKey
      ? it.descricao
      : `${brandNome} - ${it.descricao}${acabamento ? " " + acabamento : ""}${espessura !== null ? " " + espessura + "mm" : ""}`;
    return {
      ...novaLinha(),
      tipoId: it.tipo_id, tipoNome, diversos, linear,
      m2: linear ? (Number(it.quantidade) || 0) * (Number(it.comprimento) || 0) * (Number(it.largura) || 1) || null : null,
      brandKey, brandNome, webId: prod ? prod.webId : null,
      descricao: it.descricao || "", acabamento, espessura, label,
      qtd: Number(it.quantidade) || null,
      comp: diversos ? null : Number(it.comprimento) || null,
      larg: diversos ? null : Number(it.largura) || null,
      preco: Number(it.preco_mt2) || 0,
      desc: Number(it.desconto_percentagem) || 0,
    };
  }

  async function carregarOrcamentoParaEdicao() {
    const { data: orc, error } = await supabase.from("orcamentos").select("*").eq("id", editId).single();
    if (error || !orc) throw new Error(error?.message || `Orçamento ${editId} não encontrado`);
    const { data: itens, error: e2 } = await supabase
      .from("orcamento_itens").select("*").eq("orcamento_id", editId).order("id", { ascending: true });
    if (e2) throw e2;
    itensGuardadosIds = (itens || []).map((i) => i.id);

    // cliente
    const cli = orc.cliente_id != null
      ? (clientes.find((c) => String(c.original.id) === String(orc.cliente_id)) || {}).original
      : null;
    if (cli) {
      selectedCliente = cli;
      window.selectedClienteData = cli;
      clienteId.value = cli.id;
      clienteNome.value = cli.descricao;
      clienteDetalhes.innerHTML = detalhesClienteHtml(cli);
    } else {
      clienteId.value = orc.cliente_id ?? "";
      clienteNome.value = orc.cliente_nome || "";
      clienteDetalhes.innerHTML = "";
    }
    clearCliente.classList.toggle("d-none", !clienteNome.value);

    // opções (cada "pagina" = 1 opção) e linhas
    const grupos = new Map();
    (itens || []).forEach((it) => {
      const n = it.pagina || 1;
      if (!grupos.has(n)) grupos.set(n, []);
      grupos.get(n).push(it);
    });
    const novas = [...grupos.keys()].sort((a, b) => a - b).map((n) => {
      const rs = grupos.get(n).map(itemParaLinha);
      const alvo = Math.max(DEFAULT_ROWS, rs.length + 1);
      while (rs.length < alvo) rs.push(novaLinha());
      return { rows: rs, cur: { r: 0, c: C.TIPO } };
    });
    if (novas.length) {
      opcoes = novas;
      opcaoAtiva = 0;
      rows = opcoes[0].rows;
    }
    cur = { r: 0, c: C.TIPO };
    undoStack = [];
    redoStack = [];
    render();
  }

  // -------------------------------------------------
  // INICIALIZAÇÃO
  // -------------------------------------------------
  rows = Array.from({ length: DEFAULT_ROWS }, novaLinha);
  opcoes = [{ rows, cur: { r: 0, c: C.TIPO } }];
  opcaoAtiva = 0;

  if (modoEdicao) {
    if (tituloEl) tituloEl.textContent = `Editar Orçamento Nº ${editId}`;
    if (btnGuardarTxt) btnGuardarTxt.textContent = "Guardar Alterações";
    if (btnCancelarEdicao) {
      btnCancelarEdicao.classList.remove("d-none");
      btnCancelarEdicao.addEventListener("click", () => {
        if (typeof goToRoute === "function") goToRoute("/list-orcamento");
      });
    }
    btnLimpar.classList.add("d-none");
    btnGuardar.disabled = true; // só ativa depois de o orçamento estar carregado
  } else {
    restaurarRascunho();
  }
  render();

  try {
    await carregarDados();
  } catch (err) {
    console.error("❌ Erro ao carregar dados:", err);
    toast("❌ Erro ao carregar dados: " + (err.message || err), "danger");
  }

  if (modoEdicao) {
    try {
      await carregarOrcamentoParaEdicao();
      btnGuardar.disabled = false;
    } catch (err) {
      console.error("❌ Erro ao carregar orçamento para edição:", err);
      toast("❌ Erro ao carregar o orçamento: " + (err.message || err), "danger");
    }
  }

  wrap.focus({ preventScroll: true });
};