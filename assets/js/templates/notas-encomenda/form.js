window.initNotaEncomendaForm = async function () {
  if (!window.supabaseClient) {
    showMessage("❌ Supabase não inicializado", "danger");
    return;
  }
  const supabase = window.supabaseClient;

  // ---------------------------------------------------------------
  // ELEMENTOS
  // ---------------------------------------------------------------
  const form = document.getElementById("notaEncomendaForm");
  const notaIdEl = document.getElementById("notaId");
  const notaNumeroEl = document.getElementById("notaNumero");
    const clienteEl = document.getElementById("notaCliente");
  const materialEl = document.getElementById("notaMaterial");
  const tipoEl = document.getElementById("notaTipo");
  const dataCriacaoEl = document.getElementById("notaDataCriacao");
  const dataEntregaEl = document.getElementById("notaDataEntrega");
    const observacoesEl = document.getElementById("notaObservacoes");
  const observacoesLabelEl = document.getElementById("notaObservacoesLabel");
  const tituloEl = document.getElementById("notaFormTitulo");

  const sheetContainer = document.getElementById("neSheetContainer");
  const panelEmpty = document.getElementById("neNoSelection");
  const panelRect = document.getElementById("neFieldsRect");
  const panelCircle = document.getElementById("neFieldsCircle");
  const panelPolygon = document.getElementById("neFieldsPolygon");
  const panelArrow = document.getElementById("neFieldsArrow");
    const panelText = document.getElementById("neFieldsText");
  const panelLine = document.getElementById("neFieldsLine");
  const fLabelLine = document.getElementById("neLabelLine");
  const fDashedLine = document.getElementById("neDashedLine");
     const lineBar = document.getElementById("neLineBar");
  const arrowBar = document.getElementById("neArrowBar");
  const polyBar = document.getElementById("nePolyBar");
    const panelBrace = document.getElementById("neFieldsBrace");
  const fLabelBrace = document.getElementById("neLabelBrace");
  const fBraceWidth = document.getElementById("neBraceWidth");
  const fBraceFlip = document.getElementById("neBraceFlip");
  const allPanels = [panelRect, panelCircle, panelPolygon, panelArrow, panelText, panelLine, panelBrace];

  const fW = document.getElementById("neW");
  const fH = document.getElementById("neH");
    const fRTL = document.getElementById("neRTL");
  const fRTR = document.getElementById("neRTR");
  const fRBR = document.getElementById("neRBR");
  const fRBL = document.getElementById("neRBL");
  const fRAll = document.getElementById("neRAll");
  const fRGroup = document.getElementById("neRGroup");
  const fRAllWrap = document.getElementById("neRAllWrap");
  const fRGridWrap = document.getElementById("neRGridWrap");
  const fLabelRect = document.getElementById("neLabelRect");

  const fRadius = document.getElementById("neRadius");
  const fLabelCircle = document.getElementById("neLabelCircle");
  const fCurved = document.getElementById("neCurved");
  const fCurvedText = document.getElementById("neCurvedText");

  const fLabelPolygon = document.getElementById("neLabelPolygon");
  const fLabelArrow = document.getElementById("neLabelArrow");
  const fLabelArrow90 = document.getElementById("neLabelArrow90");
    const fDimsInside = document.getElementById("neDimsInside");
  const fShowDims = document.getElementById("neShowDims");

  const fTextContent = document.getElementById("neTextContent");
  const fFontSize = document.getElementById("neFontSize");

  const scaleSelect = document.getElementById("neScaleSelect");
  const scaleCustom = document.getElementById("neScaleCustom");
  const scaleInfo = document.getElementById("neScaleInfo");
  const rectModalEl = document.getElementById("neModalAddRect");
  const rectModal = new bootstrap.Modal(rectModalEl);
  const rectBarW = document.getElementById("neRectBarW");
  const rectBarH = document.getElementById("neRectBarH");
    const edgeModeBtn = document.getElementById("neToggleEdgeMode");
  const dimModeBtn = document.getElementById("neToggleDimMode");
  const dimPanel = document.getElementById("neDimPanel");
  const fDimValue = document.getElementById("neDimValue");
  const showGridChk = document.getElementById("neShowGrid");
  const panelArrow90 = document.getElementById("neFieldsArrow90");
  const panelMulti = document.getElementById("neMultiSelection");

    const fDimPosition = document.getElementById("neDimPosition");
  const dimValueModalEl = document.getElementById("neModalDimValue");
  const dimValueModal = new bootstrap.Modal(dimValueModalEl);
  const fModalDimValue = document.getElementById("neModalDimValueInput");
  const fMarcarPorAcabar = document.getElementById("neMarcarPorAcabar");
  allPanels.push(panelArrow90);

  // ---------------------------------------------------------------
  // ESTADO INICIAL
  // ---------------------------------------------------------------
  function bloquearDataCriacao(valor) {
    dataCriacaoEl.value = valor;
    dataCriacaoEl.dataset.locked = valor;
  }
  bloquearDataCriacao(new Date().toISOString().slice(0, 10));

  // segurança extra: se por algum motivo o valor mudar, repõe o bloqueado
  dataCriacaoEl.addEventListener("input", () => {
    if (dataCriacaoEl.value !== dataCriacaoEl.dataset.locked) {
      dataCriacaoEl.value = dataCriacaoEl.dataset.locked;
    }
  });

  // Data de entrega nunca pode ser no passado
  dataEntregaEl.min = new Date().toISOString().slice(0, 10);

    const editor = window.createNotaEditor(sheetContainer);

      // Nunca deixar o Enter submeter o formulário (só clicando no botão
  // "Guardar Nota"). Nos campos onde o Enter já tem uma ação própria
  // (avançar para o campo seguinte), essa ação continua a funcionar,
  // porque estes handlers já chamam preventDefault antes de chegar aqui.
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  });
  
  // ---------------------------------------------------------------
  // RASCUNHO AUTOMÁTICO
  // Protege contra perda de dados se a página recarregar sozinha
  // (ex: minimizar o telemóvel, trocar de app) antes de guardares.
  // Guarda automaticamente tudo o que vais preenchendo/desenhando e,
  // se detetar um rascunho por recuperar ao abrir a página, pergunta
  // se queres repor esse trabalho.
  // ---------------------------------------------------------------
  function neDraftKey() {
    const id = new URLSearchParams(window.location.search).get("id");
    return id ? `neRascunhoNotaEncomenda_${id}` : "neRascunhoNotaEncomenda_nova";
  }

   function neColetarRascunho() {
    return {
      cliente: clienteEl.value,
      material: materialEl.value,
      tipo: tipoEl.value,
      dataCriacao: dataCriacaoEl.value,
      dataEntrega: dataEntregaEl.value,
      observacoes: observacoesEl.value,
      scaleSelectValue: scaleSelect.value,
      scaleCustomValue: scaleCustom.value,
      shapes: editor.getShapes(),
      forcarPorAcabar: fMarcarPorAcabar.checked,
      guardadoEm: Date.now(),
    };
  }

  let neDraftSaveTimeout = null;
  function neGuardarRascunho() {
    clearTimeout(neDraftSaveTimeout);
    neDraftSaveTimeout = setTimeout(() => {
      try {
        sessionStorage.setItem(neDraftKey(), JSON.stringify(neColetarRascunho()));
      } catch (err) {
        console.warn("Aviso: não foi possível guardar o rascunho da nota:", err);
      }
    }, 500);
  }

  function neLimparRascunho() {
    clearTimeout(neDraftSaveTimeout);
    try {
      sessionStorage.removeItem(neDraftKey());
    } catch (err) {
      // ignora
    }
  }

    function neRestaurarRascunho(draft) {
    clienteEl.value = draft.cliente || "";
    toggleClearNotaCliente();
    materialEl.value = draft.material || "";
    tipoEl.value = draft.tipo || "";
    if (draft.dataCriacao) bloquearDataCriacao(draft.dataCriacao);
    dataEntregaEl.value = draft.dataEntrega || "";
    observacoesEl.value = draft.observacoes || "";
    fMarcarPorAcabar.checked = !!draft.forcarPorAcabar;
    editor.setShapes(draft.shapes || []);

    if (draft.scaleSelectValue === "custom") {
      scaleSelect.value = "custom";
      scaleCustom.classList.remove("d-none");
      scaleCustom.value = draft.scaleCustomValue || "";
      const v = parseFloat(draft.scaleCustomValue);
      editor.setScale(v > 0 ? v : null);
    } else if (draft.scaleSelectValue) {
      scaleSelect.value = draft.scaleSelectValue;
      scaleCustom.classList.add("d-none");
      editor.setScale(draft.scaleSelectValue === "auto" ? null : parseFloat(draft.scaleSelectValue));
    }

    refreshScaleInfo();
    syncObservacoesObrigatorias();
  }

    function neVerificarRascunhoPendente() {
    let raw;
    try {
      raw = sessionStorage.getItem(neDraftKey());
    } catch (err) {
      return;
    }
    if (!raw) return;

    let draft;
    try {
      draft = JSON.parse(raw);
    } catch (err) {
      return;
    }

    neRestaurarRascunho(draft);
  }

  [clienteEl, materialEl, dataEntregaEl, observacoesEl].forEach((el) => {
    el.addEventListener("input", neGuardarRascunho);
  });
  tipoEl.addEventListener("change", neGuardarRascunho);
  scaleSelect.addEventListener("change", neGuardarRascunho);
  scaleCustom.addEventListener("input", neGuardarRascunho);

  function hideAllPanels() {
    allPanels.forEach((p) => p.classList.add("d-none"));
    panelMulti.classList.add("d-none");
  }

  function refreshScaleInfo() {
    const info = editor.getScaleInfo();
    scaleInfo.textContent = `Escala usada: 1:${Math.round(info.den)}${info.auto ? " (automática)" : ""}`;
  }

     let neUltimoSelecionadoId = null;

      editor.onSelectionChange((selectedList) => {
    refreshScaleInfo();
    neGuardarRascunho();
    hideAllPanels();
    if (!editor.isDrawingLine()) lineBar.classList.add("d-none");
    if (!editor.isDrawingPolygon()) polyBar.classList.add("d-none");
    if (!editor.isDrawingArrow()) arrowBar.classList.add("d-none");

    if (!selectedList || selectedList.length === 0) {
      panelEmpty.classList.remove("d-none");
      neUltimoSelecionadoId = null;
      return;
    }
    panelEmpty.classList.add("d-none");

    if (selectedList.length > 1) {
      panelMulti.classList.remove("d-none");
      panelMulti.textContent = `${selectedList.length} formas selecionadas — arrasta uma delas para mover todas juntas.`;
      neUltimoSelecionadoId = null;
      return;
    }

    const selected = selectedList[0];
    const mudouSelecao = selected.id !== neUltimoSelecionadoId;
    neUltimoSelecionadoId = selected.id;

    if (selected.type === "rect") {
      panelRect.classList.remove("d-none");
      if (!mudouSelecao) return;
      fW.value = window.neFormatMeasureInput(selected.w);
      fH.value = window.neFormatMeasureInput(selected.h);
      const r = selected.r || [0, 0, 0, 0];
            fRTL.value = Math.round(r[0] || 0);
      fRTR.value = Math.round(r[1] || 0);
      fRBR.value = Math.round(r[2] || 0);
      fRBL.value = Math.round(r[3] || 0);
      const rIguais = r.every((v) => Math.round(v || 0) === Math.round(r[0] || 0));
      fRAll.value = rIguais ? Math.round(r[0] || 0) : "";
      fRGroup.checked = false;
      neAplicarModoRGroup(false);
      fLabelRect.value = selected.label || "";
      fDimsInside.checked = !!selected.dimsInside;
      fShowDims.checked = selected.showDims !== false;
    } else if (selected.type === "circle") {
      panelCircle.classList.remove("d-none");
      if (!mudouSelecao) return;
      fRadius.value = window.neFormatMeasureInput(selected.radius);
      fLabelCircle.value = selected.label || "";
      fCurved.checked = !!selected.curved;
      fCurvedText.value = selected.curvedText || "";
    } else if (selected.type === "polygon") {
      panelPolygon.classList.remove("d-none");
      if (!mudouSelecao) return;
      fLabelPolygon.value = selected.label || "";
    } else if (selected.type === "arrow") {
      panelArrow.classList.remove("d-none");
      if (!mudouSelecao) return;
      fLabelArrow.value = selected.label || "";
    } else if (selected.type === "arrow90") {
      panelArrow90.classList.remove("d-none");
      if (!mudouSelecao) return;
      fLabelArrow90.value = selected.label || "";
    } else if (selected.type === "line") {
      panelLine.classList.remove("d-none");
      if (!mudouSelecao) return;
      fLabelLine.value = selected.label || "";
      fDashedLine.checked = !!selected.dashed;
    } else if (selected.type === "brace") {
      panelBrace.classList.remove("d-none");
      if (!mudouSelecao) return;
      fLabelBrace.value = selected.label || "";
      const w = selected.width || 20;
      fBraceWidth.value = Math.round(Math.abs(w));
      fBraceFlip.checked = w < 0;
    } else if (selected.type === "text") {
      panelText.classList.remove("d-none");
      if (!mudouSelecao) return;
      fTextContent.value = selected.content || "";
      fFontSize.value = selected.fontSize || 4;
    }
  });

  // Largura/Altura aceitam texto com unidade: "64.3 cm", "1.432 m", "54"...
  // Sem unidade assume-se cm. Só se atualiza o desenho quando o valor é
  // válido, para não estragar a peça enquanto o utilizador ainda escreve.
  fW.addEventListener("input", () => {
    const mm = window.neParseMeasure(fW.value);
    if (!isNaN(mm) && mm > 0) editor.updateSelected({ w: mm });
  });
  fH.addEventListener("input", () => {
    const mm = window.neParseMeasure(fH.value);
    if (!isNaN(mm) && mm > 0) editor.updateSelected({ h: mm });
  });
    function neAplicarModoRGroup(agrupado) {
    fRAllWrap.classList.toggle("d-none", !agrupado);
    fRGridWrap.classList.toggle("d-none", agrupado);
  }

  fRGroup.addEventListener("change", () => {
    neAplicarModoRGroup(fRGroup.checked);
    if (fRGroup.checked) {
      // ao entrar no modo "grupo", usa o valor do canto Sup. esq. como
      // ponto de partida e aplica-o já a todos os cantos
      const n = parseFloat(fRTL.value) || 0;
      fRAll.value = n;
      fRTL.value = n; fRTR.value = n; fRBR.value = n; fRBL.value = n;
      editor.updateSelected({ r: [n, n, n, n] });
    }
  });

  [fRTL, fRTR, fRBR, fRBL].forEach((input) => {
    input.addEventListener("input", () => {
      editor.updateSelected({
        r: [parseFloat(fRTL.value) || 0, parseFloat(fRTR.value) || 0, parseFloat(fRBR.value) || 0, parseFloat(fRBL.value) || 0],
      });
    });
  });
  fRAll.addEventListener("input", () => {
    const n = parseFloat(fRAll.value) || 0;
    fRTL.value = n; fRTR.value = n; fRBR.value = n; fRBL.value = n;
    editor.updateSelected({ r: [n, n, n, n] });
  });
  fRAll.addEventListener("input", () => {
    const n = parseFloat(fRAll.value) || 0;
    fRTL.value = n;
    fRTR.value = n;
    fRBR.value = n;
    fRBL.value = n;
    editor.updateSelected({ r: [n, n, n, n] });
  });
  fLabelRect.addEventListener("input", () => editor.updateSelected({ label: fLabelRect.value }));
    fDimsInside.addEventListener("change", () => editor.updateSelected({ dimsInside: fDimsInside.checked }));
  fShowDims.addEventListener("change", () => editor.updateSelected({ showDims: fShowDims.checked }));

  fRadius.addEventListener("input", () => {
    const mm = window.neParseMeasure(fRadius.value);
    if (!isNaN(mm) && mm > 0) editor.updateSelected({ radius: mm });
  });
  fLabelCircle.addEventListener("input", () => editor.updateSelected({ label: fLabelCircle.value }));
  fCurved.addEventListener("change", () => editor.updateSelected({ curved: fCurved.checked }));
  fCurvedText.addEventListener("input", () => editor.updateSelected({ curvedText: fCurvedText.value }));

  fLabelPolygon.addEventListener("input", () => editor.updateSelected({ label: fLabelPolygon.value }));
    fLabelArrow.addEventListener("input", () => editor.updateSelected({ label: fLabelArrow.value }));
  fLabelArrow90.addEventListener("input", () => editor.updateSelected({ label: fLabelArrow90.value }));
   fLabelLine.addEventListener("input", () => editor.updateSelected({ label: fLabelLine.value }));
  fDashedLine.addEventListener("change", () => editor.updateSelected({ dashed: fDashedLine.checked }));

  fLabelBrace.addEventListener("input", () => editor.updateSelected({ label: fLabelBrace.value }));
  function applyBraceWidth() {
    const abs = Math.max(2, parseFloat(fBraceWidth.value) || 20);
    const sign = fBraceFlip.checked ? -1 : 1;
    editor.updateSelected({ width: abs * sign });
  }
  fBraceWidth.addEventListener("input", applyBraceWidth);
  fBraceFlip.addEventListener("change", applyBraceWidth);

  fTextContent.addEventListener("input", () => editor.updateSelected({ content: fTextContent.value }));
  fFontSize.addEventListener("input", () => {
    const v = parseFloat(fFontSize.value);
    if (!isNaN(v) && v > 0) editor.updateSelected({ fontSize: v });
  });
  // ---------------------------------------------------------------
  // FERRAMENTAS DA TOOLBAR
  // ---------------------------------------------------------------
  document.getElementById("neAddRect").addEventListener("click", () => {
    rectBarW.value = "";
    rectBarH.value = "";
    rectModal.show();
  });
  rectModalEl.addEventListener("shown.bs.modal", () => rectBarW.focus());
  document.getElementById("neAddCircle").addEventListener("click", () => { editor.addCircle(); refreshScaleInfo(); });
      document.getElementById("neAddArrow").addEventListener("click", () => {
    editor.startArrow();
    arrowBar.classList.remove("d-none");
  });
  document.getElementById("neArrowCancel").addEventListener("click", () => {
    editor.cancelArrow();
    arrowBar.classList.add("d-none");
  });
  document.querySelectorAll(".ne-line-style").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const dashed = el.getAttribute("data-style") === "dashed";
      editor.startLine(dashed);
      lineBar.classList.remove("d-none");
    });
  });
  document.getElementById("neLineCancel").addEventListener("click", () => {
    editor.cancelLine();
    lineBar.classList.add("d-none");
  });
  document.querySelectorAll(".ne-arrow90-dir").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const dir = el.getAttribute("data-dir");
    editor.addArrow90(dir);
    refreshScaleInfo();
  });
});
  document.getElementById("neAddBrace").addEventListener("click", () => { editor.addBrace(); refreshScaleInfo(); });
  document.getElementById("neAddText").addEventListener("click", () => { editor.addText(); refreshScaleInfo(); });

  showGridChk.addEventListener("change", () => editor.setShowGrid(showGridChk.checked));

  document.getElementById("neRectBarConfirm").addEventListener("click", () => {
    const w = window.neParseMeasure(rectBarW.value);
    const h = window.neParseMeasure(rectBarH.value);
    if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
      showMessage("Escreve a largura e a altura antes de adicionar (ex: 64.3 cm ou 1.42 m).", "danger");
      return;
    }
    editor.addRect(w, h);
    rectModal.hide();
    refreshScaleInfo();
  });
  [rectBarW, rectBarH].forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (input === rectBarW) {
        rectBarH.focus();
        rectBarH.select();
      } else {
        document.getElementById("neRectBarConfirm").click();
      }
    });
  });

    document.getElementById("neAddPolygon").addEventListener("click", () => {
    editor.startPolygon();
    polyBar.classList.remove("d-none");
  });
  document.getElementById("nePolyCancel").addEventListener("click", () => {
    editor.cancelPolygon();
    polyBar.classList.add("d-none");
  });

    edgeModeBtn.addEventListener("click", () => {
    const active = editor.getTool() === "edge";
    editor.setTool(active ? "select" : "edge");
    edgeModeBtn.classList.toggle("ne-tool-active", !active);
    edgeModeBtn.style.backgroundColor = active ? "" : "#c0392b";
    if (!active) { dimModeBtn.classList.remove("ne-tool-active"); dimModeBtn.style.backgroundColor = ""; }
  });

  dimModeBtn.addEventListener("click", () => {
    const active = editor.getTool() === "dim";
    editor.setTool(active ? "select" : "dim");
    dimModeBtn.classList.toggle("ne-tool-active", !active);
    dimModeBtn.style.backgroundColor = active ? "" : "#2e7dd7";
    if (!active) { edgeModeBtn.classList.remove("ne-tool-active"); edgeModeBtn.style.backgroundColor = ""; }
  });

    let neDimModalSyncing = false;

  editor.onDimSelectionChange((sel) => {
    if (!sel) { dimPanel.classList.add("d-none"); return; }
    hideAllPanels();
    panelEmpty.classList.add("d-none");
    dimPanel.classList.remove("d-none");

    const valorTexto = (sel.dimValue !== null && sel.dimValue !== undefined) ? window.neFormatMeasureInput(sel.dimValue) : "";
    const posMode = sel.dimInside === undefined ? "auto" : (sel.dimInside ? "inside" : "outside");
    fDimValue.value = valorTexto;
    fDimPosition.value = posMode;

    // abre logo o modal ao centro para escrever a medida assim que se
    // seleciona uma linha em modo "Cota manual"
    neDimModalSyncing = true;
    fModalDimValue.value = valorTexto;
    neDimModalSyncing = false;
    dimValueModal.show();
  });

  fDimValue.addEventListener("input", () => {
    const mm = window.neParseMeasure(fDimValue.value);
    editor.setDimValue(isNaN(mm) ? null : mm);
  });
  fDimPosition.addEventListener("change", () => {
    editor.setDimInside(fDimPosition.value);
  });

    fModalDimValue.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const mm = window.neParseMeasure(fModalDimValue.value);
    editor.setDimValue(isNaN(mm) ? null : mm);
    fDimValue.value = fModalDimValue.value;
    dimValueModal.hide();
  });
  document.getElementById("neModalDimValueConfirm").addEventListener("click", () => {
    dimValueModal.hide();
  });
  dimValueModalEl.addEventListener("shown.bs.modal", () => {
    fModalDimValue.focus();
    fModalDimValue.select();
  });

  document.getElementById("neBringForward").addEventListener("click", () => editor.bringForward());
  document.getElementById("neSendBackward").addEventListener("click", () => editor.sendBackward());

  document.getElementById("neDeleteShape").addEventListener("click", () => editor.deleteSelected());
  document.getElementById("neClearAll").addEventListener("click", () => {
    if (confirm("Tens a certeza que queres limpar todo o desenho?")) editor.clearAll();
  });

  document.querySelectorAll(".ne-flip-action").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    editor.rotateOrFlipSelected(el.getAttribute("data-action"));
    refreshScaleInfo();
  });
});

document.getElementById("neUndo").addEventListener("click", () => editor.undo());

  // Escala
  scaleSelect.addEventListener("change", () => {
    if (scaleSelect.value === "auto") {
      scaleCustom.classList.add("d-none");
      editor.setScale(null);
    } else if (scaleSelect.value === "custom") {
      scaleCustom.classList.remove("d-none");
      scaleCustom.focus();
    } else {
      scaleCustom.classList.add("d-none");
      editor.setScale(parseFloat(scaleSelect.value));
    }
    refreshScaleInfo();
  });
  scaleCustom.addEventListener("input", () => {
    const v = parseFloat(scaleCustom.value);
    if (v > 0) editor.setScale(v);
    refreshScaleInfo();
  });
    refreshScaleInfo();

  // ---------------------------------------------------------------
  // OBSERVAÇÕES OBRIGATÓRIAS QUANDO "SOBRA"
  // ---------------------------------------------------------------
    function syncObservacoesObrigatorias() {
    const obrigatorio = tipoEl.value === "sobra";
    observacoesEl.required = obrigatorio;
    observacoesLabelEl.textContent = obrigatorio ? "Observações *" : "Observações";
    observacoesEl.placeholder = obrigatorio
      ? "Obrigatório para Sobra: descreve a sobra (medidas, material, etc.)"
      : "Notas adicionais...";
  }
  tipoEl.addEventListener("change", syncObservacoesObrigatorias);

  // ---------------------------------------------------------------
  // ESTADO DA NOTA (Por acabar / Desenho pronto)
  // Pronto e Entregue só se alteram na lista (list-nota-encomenda).
  // ---------------------------------------------------------------
  function neCamposEmFaltaParaEstado() {
    const faltaMaterial = !materialEl.value.trim();
    const faltaGestao = !tipoEl.value;
    const faltaEntrega = !dataEntregaEl.value;
    return faltaMaterial || faltaGestao || faltaEntrega;
  }

  function neCalcularEstado() {
    return (neCamposEmFaltaParaEstado() || fMarcarPorAcabar.checked) ? "por_acabar" : "desenho_pronto";
  }

  // ---------------------------------------------------------------
  // AUTOCOMPLETE DO CLIENTE (mesmo visual do dropdown da Marca) + navegação
  // por teclado: setas para escolher, Enter para confirmar e avançar
  // ---------------------------------------------------------------
  const notaClienteDropdown = document.getElementById("notaClienteDropdown");
  const clearNotaClienteBtn = document.getElementById("clearNotaCliente");
  let listaClientesNota = [];
  let notaClienteItensAtuais = [];
  let notaClienteActiveIndex = -1;

  async function carregarListaClientes() {
    const { data, error } = await supabase.from("clientes_encomendas").select("nome").order("nome");
    if (!error && data) listaClientesNota = data.map((c) => c.nome);
  }
  carregarListaClientes();

  function toggleClearNotaCliente() {
    clearNotaClienteBtn.classList.toggle("d-none", !clienteEl.value);
  }

  function fecharNotaClienteDropdown() {
    notaClienteDropdown.classList.remove("show");
    notaClienteActiveIndex = -1;
  }

  function destacarNotaClienteItem() {
    notaClienteDropdown.querySelectorAll(".autocomplete-item").forEach((el, i) => {
      el.classList.toggle("autocomplete-active", i === notaClienteActiveIndex);
    });
  }

  function selecionarNotaClienteItem(nome) {
    clienteEl.value = nome;
    toggleClearNotaCliente();
    fecharNotaClienteDropdown();
  }

  function renderNotaClienteDropdown(lista) {
    notaClienteItensAtuais = lista;
    notaClienteActiveIndex = -1;

    if (!lista.length) {
      notaClienteDropdown.innerHTML = `<div class="autocomplete-item disabled">Sem clientes correspondentes — escreve para criar um novo</div>`;
      notaClienteDropdown.classList.add("show");
      return;
    }

    notaClienteDropdown.innerHTML = lista
      .map((nome) => `<div class="autocomplete-item" data-nome="${escapeHtml(nome)}">${escapeHtml(nome)}</div>`)
      .join("");
    notaClienteDropdown.classList.add("show");

    notaClienteDropdown.querySelectorAll(".autocomplete-item").forEach((item) => {
      item.addEventListener("click", () => {
        selecionarNotaClienteItem(item.getAttribute("data-nome"));
        materialEl.focus();
      });
    });
  }

  function filtrarESugerirNotaCliente() {
    const termo = clienteEl.value.trim().toLowerCase();
    const filtradas = termo
      ? listaClientesNota.filter((n) => n.toLowerCase().includes(termo))
      : listaClientesNota;
    renderNotaClienteDropdown(filtradas);
  }

  clienteEl.addEventListener("focus", filtrarESugerirNotaCliente);
  clienteEl.addEventListener("input", () => {
    toggleClearNotaCliente();
    filtrarESugerirNotaCliente();
  });

  clienteEl.addEventListener("keydown", (e) => {
    const aberto = notaClienteDropdown.classList.contains("show");

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!aberto) { filtrarESugerirNotaCliente(); return; }
      if (!notaClienteItensAtuais.length) return;
      notaClienteActiveIndex = (notaClienteActiveIndex + 1) % notaClienteItensAtuais.length;
      destacarNotaClienteItem();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!aberto || !notaClienteItensAtuais.length) return;
      notaClienteActiveIndex = (notaClienteActiveIndex - 1 + notaClienteItensAtuais.length) % notaClienteItensAtuais.length;
      destacarNotaClienteItem();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (aberto && notaClienteActiveIndex >= 0 && notaClienteItensAtuais[notaClienteActiveIndex]) {
        selecionarNotaClienteItem(notaClienteItensAtuais[notaClienteActiveIndex]);
      } else {
        fecharNotaClienteDropdown();
      }
      materialEl.focus();
    } else if (e.key === "Escape") {
      fecharNotaClienteDropdown();
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#notaCliente") && !e.target.closest("#notaClienteDropdown")) {
      fecharNotaClienteDropdown();
    }
  });

  clearNotaClienteBtn.addEventListener("click", () => {
    clienteEl.value = "";
    toggleClearNotaCliente();
    fecharNotaClienteDropdown();
    clienteEl.focus();
  });

  // ---------------------------------------------------------------
  // NAVEGAÇÃO POR ENTER: Cliente -> Material -> Gestão -> Data criação ->
  // Data entrega -> Observações
  // ---------------------------------------------------------------
  function focarComEnter(el, e) {
    e.preventDefault();
    el.focus();
    if (typeof el.select === "function") el.select();
  }
  materialEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") focarComEnter(tipoEl, e);
  });
  tipoEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") focarComEnter(dataCriacaoEl, e);
  });
  dataCriacaoEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") focarComEnter(dataEntregaEl, e);
  });
  dataEntregaEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") focarComEnter(observacoesEl, e);
  });

  // ---------------------------------------------------------------
  // MODO EDIÇÃO (?id=)
  // ---------------------------------------------------------------
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id");
  let notaAtual = null;

  if (editId) {
    tituloEl.textContent = "Editar Nota de Encomenda";
    const { data, error } = await supabase
      .from("notas_encomenda")
      .select("*")
      .eq("id", editId)
      .maybeSingle();

    if (error || !data) {
      showMessage("Não foi possível carregar a nota pedida.", "danger");
    } else {
      notaAtual = data;
      notaIdEl.value = data.id;
      notaNumeroEl.value = data.id;
      clienteEl.value = data.cliente_nome || "";
      materialEl.value = data.material || "";
      tipoEl.value = data.tipo || "";
            bloquearDataCriacao(data.data_criacao || dataCriacaoEl.value);      
      dataEntregaEl.value = data.data_entrega || "";
      observacoesEl.value = data.observacoes || "";
      fMarcarPorAcabar.checked = !!data.forcar_por_acabar;
      editor.setShapes(data.desenho || []);

      const presetScales = ["10", "20", "25", "50", "75", "100", "200"];
      if (data.escala && data.escala > 0) {
        const escalaStr = String(Math.round(data.escala));
        if (presetScales.includes(escalaStr)) {
          scaleSelect.value = escalaStr;
          scaleCustom.classList.add("d-none");
        } else {
          scaleSelect.value = "custom";
          scaleCustom.classList.remove("d-none");
          scaleCustom.value = escalaStr;
        }
        editor.setScale(data.escala);
      } else {
        scaleSelect.value = "auto";
        scaleCustom.classList.add("d-none");
        editor.setScale(null);
      }

            refreshScaleInfo();
      syncObservacoesObrigatorias();
    }
  }

  neVerificarRascunhoPendente();

  // ---------------------------------------------------------------
  // PRÉ-VISUALIZAÇÃO
  // ---------------------------------------------------------------
    async function montarNotaParaPreview() {
    const scaleInfo = editor.getScaleInfo();
    let idPreview = notaIdEl.value || null;

    if (!idPreview) {
      const { data: ultimaNota } = await supabase
        .from("notas_encomenda")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      idPreview = ultimaNota ? ultimaNota.id + 1 : 1;
    }

    return {
      id: idPreview,
      cliente_nome: clienteEl.value,
      material: materialEl.value,
      tipo: tipoEl.value,
      data_criacao: dataCriacaoEl.value,
      data_entrega: dataEntregaEl.value,
      observacoes: observacoesEl.value,
      escala: scaleInfo.auto ? null : Math.round(scaleInfo.den),
    };
    
  }

  async function abrirPreview() {
    const nota = await montarNotaParaPreview();
    const shapes = editor.getShapes();
    const dataUrl = await window.neGetPreviewDataUrl(nota, shapes);
    document.getElementById("neModalPreviewBody").innerHTML =
      `<img src="${dataUrl}" class="img-fluid border" alt="Pré-visualização da nota">`;
    new bootstrap.Modal(document.getElementById("neModalPreview")).show();
  }

  document.getElementById("neOpenPreview").addEventListener("click", abrirPreview);

  document.getElementById("neModalImprimir").addEventListener("click", async () => {
    const nota = await montarNotaParaPreview();
    window.neImprimirNota(nota, editor.getShapes());
  });

  // ---------------------------------------------------------------
  // CANCELAR
  // ---------------------------------------------------------------
  document.getElementById("btnCancelarNota").addEventListener("click", () => {
    goToRoute("/list-nota-encomenda");
  });

  // ---------------------------------------------------------------
  // LIMPAR FORMULÁRIO (mantém-se na mesma página, limpa tudo)
  // ---------------------------------------------------------------
  document.getElementById("btnLimparFormularioNota").addEventListener("click", () => {
    limparFormularioTotal();
    neLimparRascunho();
  });


  
    // Garante que o cliente fica gravado na tabela clientes_encomendas.
  // Se já existir (comparação sem sensibilidade a maiúsculas), não duplica.
  async function garantirClienteEncomenda(nome) {
    const nomeTrim = (nome || "").trim();
    if (!nomeTrim) return;

    const { data: existente, error: erroBusca } = await supabase
      .from("clientes_encomendas")
      .select("id")
      .ilike("nome", nomeTrim)
      .maybeSingle();

    if (erroBusca) {
      console.warn("Aviso: não foi possível verificar cliente existente:", erroBusca.message);
      return;
    }

    if (!existente) {
      const { error: erroInsercao } = await supabase
        .from("clientes_encomendas")
        .insert({ nome: nomeTrim });
      if (erroInsercao) {
        console.warn("Aviso: não foi possível guardar novo cliente:", erroInsercao.message);
      } else {
        carregarListaClientes();
      }
    }
  }

    // ---------------------------------------------------------------
  // CONFIRMAÇÃO DE CAMPOS NÃO PREENCHIDOS (modal ao centro do ecrã)
  // ---------------------------------------------------------------
  const modalCamposFaltaEl = document.getElementById("neModalCamposFalta");
  const modalCamposFalta = new bootstrap.Modal(modalCamposFaltaEl);
  const camposFaltaLista = document.getElementById("neCamposFaltaLista");
  const btnCamposFaltaConfirmar = document.getElementById("neCamposFaltaConfirmar");

    function confirmarCamposEmFalta(campos) {
    return new Promise((resolve) => {
      camposFaltaLista.innerHTML = campos.map((c) => `<li>${escapeHtml(c)}</li>`).join("");
      let decidido = false;

      const onConfirmar = () => {
        decidido = true;
        modalCamposFalta.hide();
        resolve(true);
      };
      const onEscondido = () => {
        btnCamposFaltaConfirmar.removeEventListener("click", onConfirmar);
        modalCamposFaltaEl.removeEventListener("hidden.bs.modal", onEscondido);
        if (!decidido) resolve(false);
      };

      btnCamposFaltaConfirmar.addEventListener("click", onConfirmar);
      modalCamposFaltaEl.addEventListener("hidden.bs.modal", onEscondido);
      modalCamposFalta.show();
    });
  }

  // ---------------------------------------------------------------
  // GUARDAR
  // ---------------------------------------------------------------
   const btnGuardarNota = form.querySelector('button[type="submit"]');
  let elementosBloqueados = [];

  function bloquearFormulario() {
    // guarda só os elementos que estavam ativos, para não "destravar"
    // sem querer campos que já estavam desativados de propósito (ex: Nº)
    elementosBloqueados = Array.from(form.querySelectorAll("input, select, textarea, button"))
      .filter((el) => !el.disabled);
    elementosBloqueados.forEach((el) => { el.disabled = true; });
  }

  function desbloquearFormulario() {
    elementosBloqueados.forEach((el) => { el.disabled = false; });
    elementosBloqueados = [];
  }
  function limparFormularioTotal() {
  notaAtual = null;

  notaIdEl.value = "";
  notaNumeroEl.value = "";
  clienteEl.value = "";
  materialEl.value = "";
  tipoEl.value = "";
  bloquearDataCriacao(new Date().toISOString().slice(0, 10));
  dataEntregaEl.min = new Date().toISOString().slice(0, 10);
  dataEntregaEl.value = "";
    observacoesEl.value = "";
  fMarcarPorAcabar.checked = false;
  tituloEl.textContent = "Nova Nota de Encomenda";

  editor.clearAll();

  scaleSelect.value = "auto";
  scaleCustom.classList.add("d-none");
  scaleCustom.value = "";
  editor.setScale(null);
  refreshScaleInfo();

  syncObservacoesObrigatorias();

  const url = new URL(window.location.href);
  url.searchParams.delete("id");
  window.history.replaceState({}, "", url);
}

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (btnGuardarNota.disabled) return;

        if (!clienteEl.value.trim() || !dataCriacaoEl.value) {
      showMessage("Preenche os campos obrigatórios (cliente e data de criação).", "danger");
      return;
    }

    if (tipoEl.value === "sobra" && !observacoesEl.value.trim()) {
      showMessage("Ao selecionar \"Sobra\" é obrigatório preencher as Observações.", "danger");
      observacoesEl.focus();
      return;
    }

    const camposEmFalta = [];
    if (!materialEl.value.trim()) camposEmFalta.push("Material");
    if (!tipoEl.value) camposEmFalta.push("Gestão");
    if (!dataEntregaEl.value) camposEmFalta.push("Data de entrega");

    if (camposEmFalta.length) {
      const continuar = await confirmarCamposEmFalta(camposEmFalta);
      if (!continuar) return;
    }

    const htmlOriginal = btnGuardarNota.innerHTML;
    bloquearFormulario();
    btnGuardarNota.innerHTML = `<i class="bi bi-hourglass-split me-2"></i> A guardar...`;
    showMessage("A guardar nota de encomenda...", "info");

    try {
      const shapes = editor.getShapes();
      const nota = await montarNotaParaPreview();

      let previewUrl = notaAtual?.preview_url || null;
      try {
        const dataUrl = await window.neGetPreviewDataUrl(nota, shapes, { scalePxPerMm: 3 });
        const blob = await (await fetch(dataUrl)).blob();
        const fileName = `nota_${nota.id || "novo"}_${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from("notas-encomenda")
          .upload(fileName, blob, { upsert: true, contentType: "image/png" });

        if (!uploadError) {
          const { data: publicData } = supabase.storage.from("notas-encomenda").getPublicUrl(fileName);
          previewUrl = publicData.publicUrl;
        } else {
          console.warn("Aviso: não foi possível guardar a imagem de pré-visualização:", uploadError.message);
        }
      } catch (err) {
        console.warn("Aviso: falha ao gerar a imagem de pré-visualização:", err);
      }

            const estadoCalculado = neCalcularEstado();
      const estadoFinal = (notaAtual && (notaAtual.estado === "pronto" || notaAtual.estado === "entregue"))
        ? notaAtual.estado
        : estadoCalculado;

      const payload = {
        cliente_nome: clienteEl.value.trim(),
        material: nota.material ? nota.material.trim() : null,
        tipo: tipoEl.value || null,
        data_criacao: dataCriacaoEl.value,
        data_entrega: dataEntregaEl.value || null,
        observacoes: observacoesEl.value.trim() || null,
        escala: nota.escala,
        desenho: shapes,
        preview_url: previewUrl,
        estado: estadoFinal,
        forcar_por_acabar: fMarcarPorAcabar.checked,
      };


      let result;
      if (notaIdEl.value) {
        result = await supabase.from("notas_encomenda").update(payload).eq("id", notaIdEl.value).select().maybeSingle();
      } else {
        result = await supabase.from("notas_encomenda").insert(payload).select().maybeSingle();
      }

            if (result.error) {
        showMessage(`Erro ao guardar nota: ${result.error.message}`, "danger");
        return;
      }

            await garantirClienteEncomenda(clienteEl.value);

      showMessage("Nota de encomenda guardada com sucesso!", "success");
      limparFormularioTotal();
      neLimparRascunho();
        } finally {
      desbloquearFormulario();
      btnGuardarNota.innerHTML = htmlOriginal;
    }
  });
};