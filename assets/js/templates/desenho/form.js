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
          const panelRodamao = document.getElementById("neFieldsRodamao");
  const panelFrisos = document.getElementById("neFieldsFrisos");
  const fLabelFrisos = document.getElementById("neLabelFrisos");
  const panelLine = document.getElementById("neFieldsLine");
  const fLabelLine = document.getElementById("neLabelLine");
  const fDashedLine = document.getElementById("neDashedLine");
       const lineBar = document.getElementById("neLineBar");
  const arrowBar = document.getElementById("neArrowBar");
  const arrow90Bar = document.getElementById("neArrow90Bar");
  const polyBar = document.getElementById("nePolyBar");
  const panelBrace = document.getElementById("neFieldsBrace");
  const fLabelBrace = document.getElementById("neLabelBrace");
  const fBraceWidth = document.getElementById("neBraceWidth");
  const fBraceFlip = document.getElementById("neBraceFlip");
    const panelPio = document.getElementById("neFieldsPio");
  const fPioWField = document.getElementById("nePioWField");
  const fPioHField = document.getElementById("nePioHField");
  const fPioRaioField = document.getElementById("nePioRaioField");
  const fPioNomeField = document.getElementById("nePioNomeField");
  const fPioFuroField = document.getElementById("nePioFuroField");
  const fPioExtraTipoField = document.getElementById("nePioExtraTipoField");
  const fPioExtraLadoField = document.getElementById("nePioExtraLadoField");
  const fPioExtraLadoFieldWrap = document.getElementById("nePioExtraLadoFieldWrap");
  const allPanels = [panelRect, panelCircle, panelPolygon, panelArrow, panelText, panelLine, panelBrace, panelPio];

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
       const fWDimMode = document.getElementById("neWDimMode");
  const fHDimMode = document.getElementById("neHDimMode");
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
  const parallelModeBtn = document.getElementById("neToggleParallelMode");
  const meModeBtn = document.getElementById("neToggleMEMode");
  const dimPanel = document.getElementById("neDimPanel");
  const fDimValue = document.getElementById("neDimValue");
  const showGridChk = document.getElementById("neShowGrid");
  const panelArrow90 = document.getElementById("neFieldsArrow90");
  const panelMulti = document.getElementById("neMultiSelection");

        const fDimPosition = document.getElementById("neDimPosition");
  const fDimPositionWrap = document.getElementById("neDimPositionWrap");
  const dimValueModalEl = document.getElementById("neModalDimValue");
  const dimValueModal = new bootstrap.Modal(dimValueModalEl);
  const fModalDimValue = document.getElementById("neModalDimValueInput");
  const fMarcarPorAcabar = document.getElementById("neMarcarPorAcabar");
    const fRodQuantidade = document.getElementById("neRodQuantidade");
    const fRodComp = document.getElementById("neRodComp");
  const fRodLarg = document.getElementById("neRodLarg");
  const fRodEsp = document.getElementById("neRodEsp");
    const fRodWDimMode = document.getElementById("neRodWDimMode");
  const fRodHDimMode = document.getElementById("neRodHDimMode");
  const fRodShowDims = document.getElementById("neRodShowDims");
  const fRodShowRect = document.getElementById("neRodShowRect");
    const fRodMaisPropBtn = document.getElementById("neRodMaisPropBtn");

  const fRodMaisProp = document.getElementById("neRodMaisProp");
  const fRodRGroup = document.getElementById("neRodRGroup");
  const fRodRAllWrap = document.getElementById("neRodRAllWrap");
  const fRodRGridWrap = document.getElementById("neRodRGridWrap");
  const fRodRAll = document.getElementById("neRodRAll");
  const fRodRTL = document.getElementById("neRodRTL");
  const fRodRTR = document.getElementById("neRodRTR");
  const fRodRBR = document.getElementById("neRodRBR");
  const fRodRBL = document.getElementById("neRodRBL");
    allPanels.push(panelArrow90);
  allPanels.push(panelFrisos);
  allPanels.push(panelRodamao);

   function neDesativarModosEdgeDim() {
  if (editor.getTool() !== "select") editor.setTool("select");
  edgeModeBtn.classList.remove("ne-tool-active");
  edgeModeBtn.style.backgroundColor = "";
  meModeBtn.classList.remove("ne-tool-active");
  meModeBtn.style.backgroundColor = "";
  dimModeBtn.classList.remove("ne-tool-active");
  dimModeBtn.style.backgroundColor = "";
  parallelModeBtn.classList.remove("ne-tool-active");
  parallelModeBtn.style.backgroundColor = "";
}

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

    // Conversão de exibição: os cantos são guardados sempre em mm
    // internamente, mas o utilizador escreve/vê sempre em cm.
    function neRadiusMmToCm(mm) { return Math.round(mm || 0) / 10; }
    function neRadiusCmToMm(cmValue) {
      const cm = parseFloat(cmValue);
      return isNaN(cm) ? 0 : cm * 10;
    }

      // Nunca deixar o Enter submeter o formulário
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
    const chave = neDraftKey();
    clearTimeout(neDraftSaveTimeout);
    neDraftSaveTimeout = setTimeout(() => {
      try {
        sessionStorage.setItem(chave, JSON.stringify(neColetarRascunho()));
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

  let neDimPanelAtivo = false;
  
     let neUltimoSelecionadoId = null;

      editor.onSelectionChange((selectedList) => {
    refreshScaleInfo();
    neGuardarRascunho();
    hideAllPanels();
       if (!editor.isDrawingLine()) lineBar.classList.add("d-none");
    if (!editor.isDrawingPolygon()) polyBar.classList.add("d-none");
    if (!editor.isDrawingArrow()) arrowBar.classList.add("d-none");
       if (!editor.isDrawingArrow90()) arrow90Bar.classList.add("d-none");

        // painel de medida ativo (seta / modo Medida): é ele que manda
    if (neDimPanelAtivo) {
      panelEmpty.classList.add("d-none");
      neUltimoSelecionadoId = null;
      return;
    }

    if (!selectedList || selectedList.length === 0) {
      panelEmpty.classList.remove("d-none");
      neUltimoSelecionadoId = null;
      return;
    }
    panelEmpty.classList.add("d-none");

    let selected = selectedList[0];

    if (selectedList.length > 1) {
      // Grupo "Pio" (retângulo + furo): trata como se fosse só o
      // retângulo selecionado, para continuar a mostrar o painel de
      // propriedades do Pio em vez do aviso de seleção múltipla.
      const pioRect = selectedList.find((s) => s.type === "rect" && s.isPio);
      const isGrupoPio = pioRect && selectedList.length >= 2 &&
        selectedList.every((s) => s.groupId === pioRect.groupId);

      if (isGrupoPio) {
        selected = pioRect;
      } else {
        panelMulti.classList.remove("d-none");
        panelMulti.textContent = `${selectedList.length} formas selecionadas — arrasta uma delas para mover todas juntas.`;
        neUltimoSelecionadoId = null;
        return;
      }
    }

    const mudouSelecao = selected.id !== neUltimoSelecionadoId;
    neUltimoSelecionadoId = selected.id;

        if (selected.type === "rect" && selected.isRodamao) {
      panelRodamao.classList.remove("d-none");
      if (!mudouSelecao) return;
            fRodQuantidade.value = selected.quantidade || 1;
            fRodComp.value = selected.rodComp ?? "";
      fRodLarg.value = selected.rodLarg ?? "";
      fRodEsp.value = selected.rodEsp ?? "";
             fRodWDimMode.value = selected.wDimMode || "auto";
      fRodHDimMode.value = selected.hDimMode || "auto";
      fRodShowDims.checked = selected.showDims !== false;
      fRodShowRect.checked = selected.showRect !== false;
      const rRod = selected.r || [0, 0, 0, 0];
      fRodRTL.value = neRadiusMmToCm(rRod[0]);
      fRodRTR.value = neRadiusMmToCm(rRod[1]);
      fRodRBR.value = neRadiusMmToCm(rRod[2]);
      fRodRBL.value = neRadiusMmToCm(rRod[3]);
      const rRodIguais = rRod.every((v) => Math.round(v || 0) === Math.round(rRod[0] || 0));
      fRodRAll.value = rRodIguais ? neRadiusMmToCm(rRod[0]) : "";
      fRodRGroup.checked = false;
      neAplicarModoRodRGroup(false);
      fRodMaisProp.classList.add("d-none");
              } else if (selected.type === "rect" && selected.isPio) {
      panelPio.classList.remove("d-none");
      if (!mudouSelecao) return;
      fPioWField.value = window.neFormatMeasureInput(selected.w);
      fPioHField.value = window.neFormatMeasureInput(selected.h);
      const rPio = selected.r || [0, 0, 0, 0];
      fPioRaioField.value = neRadiusMmToCm(rPio[0]);
      fPioNomeField.value = selected.pioNome || "";
           const furoInfo = editor.getPioFuroInfo();
      fPioFuroField.checked = !!(furoInfo && furoInfo.hasFuro);
      const extraInfo = editor.getPioExtraInfo();
      fPioExtraTipoField.value = extraInfo && extraInfo.tipo ? extraInfo.tipo : "";
      fPioExtraLadoField.value = extraInfo && extraInfo.lado ? extraInfo.lado : "direita";
      fPioExtraLadoFieldWrap.classList.toggle("d-none", !fPioExtraTipoField.value);
    } else if (selected.type === "rect") {
      panelRect.classList.remove("d-none");
      if (!mudouSelecao) return;
      fW.value = window.neFormatMeasureInput(selected.w);
      fH.value = window.neFormatMeasureInput(selected.h);
      const r = selected.r || [0, 0, 0, 0];
      fRTL.value = neRadiusMmToCm(r[0]);
      fRTR.value = neRadiusMmToCm(r[1]);
      fRBR.value = neRadiusMmToCm(r[2]);
      fRBL.value = neRadiusMmToCm(r[3]);
      const rIguais = r.every((v) => Math.round(v || 0) === Math.round(r[0] || 0));
      fRAll.value = rIguais ? neRadiusMmToCm(r[0]) : "";
      fRGroup.checked = false;
      neAplicarModoRGroup(false);
            fLabelRect.value = selected.label || "";
      fWDimMode.value = selected.wDimMode || "auto";
      fHDimMode.value = selected.hDimMode || "auto";
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
    } else if (selected.type === "arrow90") {
      panelArrow90.classList.remove("d-none");
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
    } else if (selected.type === "frisos") {
      panelFrisos.classList.remove("d-none");
      if (!mudouSelecao) return;
      fLabelFrisos.value = selected.label || "";
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
      const cm = parseFloat(fRTL.value) || 0;
      fRAll.value = cm;
      fRTL.value = cm; fRTR.value = cm; fRBR.value = cm; fRBL.value = cm;
      const mm = neRadiusCmToMm(cm);
      editor.updateSelected({ r: [mm, mm, mm, mm] });
    }
  });

  [fRTL, fRTR, fRBR, fRBL].forEach((input) => {
    input.addEventListener("input", () => {
      editor.updateSelected({
        r: [neRadiusCmToMm(fRTL.value), neRadiusCmToMm(fRTR.value), neRadiusCmToMm(fRBR.value), neRadiusCmToMm(fRBL.value)],
      });
    });
  });
  fRAll.addEventListener("input", () => {
    const cm = parseFloat(fRAll.value) || 0;
    fRTL.value = cm; fRTR.value = cm; fRBR.value = cm; fRBL.value = cm;
    const mm = neRadiusCmToMm(cm);
    editor.updateSelected({ r: [mm, mm, mm, mm] });
  });
  fLabelRect.addEventListener("input", () => editor.updateSelected({ label: fLabelRect.value }));
      fWDimMode.addEventListener("change", () => editor.updateSelected({ wDimMode: fWDimMode.value }));
  fHDimMode.addEventListener("change", () => editor.updateSelected({ hDimMode: fHDimMode.value }));
  fShowDims.addEventListener("change", () => editor.updateSelected({ showDims: fShowDims.checked }));

  // PIO — painel dedicado, iguala os campos ao modal "Novo pio personalizado"
  fPioWField.addEventListener("input", () => {
    const mm = window.neParseMeasure(fPioWField.value);
    if (!isNaN(mm) && mm > 0) editor.updateSelected({ w: mm });
  });
  fPioHField.addEventListener("input", () => {
    const mm = window.neParseMeasure(fPioHField.value);
    if (!isNaN(mm) && mm > 0) editor.updateSelected({ h: mm });
  });
  fPioRaioField.addEventListener("input", () => {
    const mm = neRadiusCmToMm(fPioRaioField.value);
    editor.updateSelected({ r: [mm, mm, mm, mm] });
  });
    fPioNomeField.addEventListener("input", () => {
    const temNome = fPioNomeField.value.trim().length > 0;
        editor.updateSelected({ pioNome: fPioNomeField.value, showDims: !temNome, wDimMode: "top-in", hDimMode: "left-in" });
  });
   fPioFuroField.addEventListener("change", () => editor.setPioFuroAtivo(fPioFuroField.checked));
  fPioExtraTipoField.addEventListener("change", () => {
    fPioExtraLadoFieldWrap.classList.toggle("d-none", !fPioExtraTipoField.value);
    editor.setPioExtra(fPioExtraTipoField.value || null, fPioExtraLadoField.value);
  });
  fPioExtraLadoField.addEventListener("change", () => {
    editor.setPioExtra(fPioExtraTipoField.value || null, fPioExtraLadoField.value);
  });
  fRadius.addEventListener("input", () => {
    const mm = window.neParseMeasure(fRadius.value);
    if (!isNaN(mm) && mm > 0) editor.updateSelected({ radius: mm });
  });
  fLabelCircle.addEventListener("input", () => editor.updateSelected({ label: fLabelCircle.value }));
  fCurved.addEventListener("change", () => editor.updateSelected({ curved: fCurved.checked }));
  fCurvedText.addEventListener("input", () => editor.updateSelected({ curvedText: fCurvedText.value }));

  fLabelPolygon.addEventListener("input", () => editor.updateSelected({ label: fLabelPolygon.value }));
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
    neDesativarModosEdgeDim();
    rectBarW.value = "";
    rectBarH.value = "";
    rectModal.show();
  });
  rectModalEl.addEventListener("shown.bs.modal", () => rectBarW.focus());
  document.getElementById("neAddCircle").addEventListener("click", () => { neDesativarModosEdgeDim(); editor.addCircle(); refreshScaleInfo(); });
      document.getElementById("neAddArrow").addEventListener("click", () => {
    neDesativarModosEdgeDim();
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
      neDesativarModosEdgeDim();
      const dashed = el.getAttribute("data-style") === "dashed";
      editor.startLine(dashed);
      lineBar.classList.remove("d-none");
    });
  });
  document.getElementById("neLineCancel").addEventListener("click", () => {
    editor.cancelLine();
    lineBar.classList.add("d-none");
  });
      document.getElementById("neAddArrow90").addEventListener("click", () => {
    neDesativarModosEdgeDim();
    editor.startArrow90Draw();
    arrow90Bar.classList.remove("d-none");
  });
  document.getElementById("neArrow90Cancel").addEventListener("click", () => {
    editor.cancelArrow90Draw();
    arrow90Bar.classList.add("d-none");
  });
   document.getElementById("neAddBrace").addEventListener("click", () => { neDesativarModosEdgeDim(); editor.addBrace(); refreshScaleInfo(); });
  document.getElementById("neAddText").addEventListener("click", () => { neDesativarModosEdgeDim(); editor.addText(); refreshScaleInfo(); });
document.querySelectorAll(".ne-extra-pio-option").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    neDesativarModosEdgeDim();
    const tipo = el.getAttribute("data-extra");
    if (tipo === "frisos") editor.addFrisos();
    else if (tipo === "rampa") editor.addRampa();
    refreshScaleInfo();
  });
});
  fLabelFrisos.addEventListener("input", () => editor.updateSelected({ label: fLabelFrisos.value }));

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

      const pioModalEl = document.getElementById("neModalAddPio");
  const pioModal = new bootstrap.Modal(pioModalEl);
  const pioComprimento = document.getElementById("nePioComprimento");
  const pioLargura = document.getElementById("nePioLargura");
  const pioRaio = document.getElementById("nePioRaio");
  const pioFuro = document.getElementById("nePioFuro");
  const pioNome = document.getElementById("nePioNome");

     const pioExtraTipo = document.getElementById("nePioExtraTipo");
  const pioExtraLado = document.getElementById("nePioExtraLado");
  const pioExtraLadoWrap = document.getElementById("nePioExtraLadoWrap");
  pioExtraTipo.addEventListener("change", () => {
    pioExtraLadoWrap.classList.toggle("d-none", !pioExtraTipo.value);
  });

  document.querySelectorAll(".ne-pio-option").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      neDesativarModosEdgeDim();
      // por agora só existe "Personalizado" — outras opções vêm depois
      pioComprimento.value = "";
      pioLargura.value = "";
      pioRaio.value = "";
      pioNome.value = "";
      pioFuro.checked = true;
      pioExtraTipo.value = "";
      pioExtraLado.value = "direita";
      pioExtraLadoWrap.classList.add("d-none");
      pioModal.show();
    });
  });
  pioModalEl.addEventListener("shown.bs.modal", () => pioComprimento.focus());

  document.getElementById("nePioConfirm").addEventListener("click", () => {
    const comp = window.neParseMeasure(pioComprimento.value);
    const larg = window.neParseMeasure(pioLargura.value);
    if (isNaN(comp) || comp <= 0 || isNaN(larg) || larg <= 0) {
      showMessage("Escreve o comprimento e a largura antes de adicionar (ex: 60 cm ou 0.60).", "danger");
      return;
    }
    const raioMm = neRadiusCmToMm(pioRaio.value);
    editor.addPio(comp, larg, raioMm, pioFuro.checked, pioNome.value.trim(), pioExtraTipo.value || null, pioExtraLado.value);
    pioModal.hide();
    refreshScaleInfo();
  });

       [pioComprimento, pioLargura, pioRaio, pioNome].forEach((input, idx, arr) => {
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (idx < arr.length - 1) {
        const proximo = arr[idx + 1];
        proximo.focus();
        if (typeof proximo.select === "function") proximo.select();
      } else {
        document.getElementById("nePioConfirm").click();
      }
    });
  });
    function neSubstituirPontoPorVirgula(input) {
    input.addEventListener("input", () => {
      if (input.value.includes(".")) {
        const pos = input.selectionStart;
        input.value = input.value.replace(/\./g, ",");
        input.setSelectionRange(pos, pos);
      }
    });
  }

  // ---------------------------------------------------------------
  // RODAMÃO
  // ---------------------------------------------------------------
  function neAplicarModoRodRGroup(agrupado) {
    fRodRAllWrap.classList.toggle("d-none", !agrupado);
    fRodRGridWrap.classList.toggle("d-none", agrupado);
  }
  fRodRGroup.addEventListener("change", () => {
    neAplicarModoRodRGroup(fRodRGroup.checked);
    if (fRodRGroup.checked) {
      const cm = parseFloat(fRodRTL.value) || 0;
      fRodRAll.value = cm;
      fRodRTL.value = cm; fRodRTR.value = cm; fRodRBR.value = cm; fRodRBL.value = cm;
      const mm = neRadiusCmToMm(cm);
      editor.updateSelected({ r: [mm, mm, mm, mm] });
    }
  });
  [fRodRTL, fRodRTR, fRodRBR, fRodRBL].forEach((input) => {
    input.addEventListener("input", () => {
      editor.updateSelected({
        r: [neRadiusCmToMm(fRodRTL.value), neRadiusCmToMm(fRodRTR.value), neRadiusCmToMm(fRodRBR.value), neRadiusCmToMm(fRodRBL.value)],
      });
    });
  });
  fRodRAll.addEventListener("input", () => {
    const cm = parseFloat(fRodRAll.value) || 0;
    fRodRTL.value = cm; fRodRTR.value = cm; fRodRBR.value = cm; fRodRBL.value = cm;
    const mm = neRadiusCmToMm(cm);
    editor.updateSelected({ r: [mm, mm, mm, mm] });
  });

  fRodMaisPropBtn.addEventListener("click", () => {
    fRodMaisProp.classList.toggle("d-none");
  });

  fRodQuantidade.addEventListener("input", () => {
    const v = parseInt(fRodQuantidade.value, 10);
    if (!isNaN(v) && v > 0) editor.updateSelected({ quantidade: v });
  });

   
    fRodWDimMode.addEventListener("change", () => editor.updateSelected({ wDimMode: fRodWDimMode.value }));
  fRodHDimMode.addEventListener("change", () => editor.updateSelected({ hDimMode: fRodHDimMode.value }));
  fRodShowDims.addEventListener("change", () => editor.updateSelected({ showDims: fRodShowDims.checked }));
  fRodShowRect.addEventListener("change", () => editor.updateSelected({ showRect: fRodShowRect.checked }));
  
      [[fRodComp, "rodComp"], [fRodLarg, "rodLarg"], [fRodEsp, "rodEsp"]].forEach(([el, key]) => {
    el.addEventListener("input", () => editor.updateSelected({ [key]: el.value }));
    el.addEventListener("change", () => {
      const mm = window.neParseMeasure(el.value);
      if (!isNaN(mm)) {
        el.value = window.neFormatMeasure(mm);
        editor.updateSelected({ [key]: el.value });
      }
    });
  });

  const rodamaoModalEl = document.getElementById("neModalAddRodamao");
  const rodamaoModal = new bootstrap.Modal(rodamaoModalEl);
  const rodQuantidadeModal = document.getElementById("neRodamaoQuantidade");
  const rodComprimentoModal = document.getElementById("neRodamaoComprimento");
  const rodLarguraModal = document.getElementById("neRodamaoLargura");
  const rodEspessuraModal = document.getElementById("neRodamaoEspessura");

       [rodComprimentoModal, rodLarguraModal, rodEspessuraModal].forEach(neSubstituirPontoPorVirgula);

    
   const rodamaoTotalModalEl = document.getElementById("neModalRodamaoTotal");
  const rodamaoTotalModal = new bootstrap.Modal(rodamaoTotalModalEl);
  const rodTotalInput = document.getElementById("neRodamaoTotalInput");
  const rodTotalEdit = document.getElementById("neRodamaoTotalEdit");
  const rodProgresso = document.getElementById("neRodamaoProgresso");

  let neRodTotal = 1;      // quantos rodamões diferentes vão ser adicionados
  let neRodFeitos = 0;     // quantos já foram adicionados nesta sequência
  let neAbrirRodamaoDepois = false;

  function neAtualizarProgressoRodamao() {
    rodTotalEdit.value = neRodTotal;
        rodProgresso.textContent = `${neNomeRod()} ${Math.min(neRodFeitos + 1, neRodTotal)} de ${neRodTotal}`;
  }

  function neLimparCamposRodamao() {
    rodQuantidadeModal.value = 1;
    rodComprimentoModal.value = "";
    rodLarguraModal.value = "";
    rodEspessuraModal.value = "";
  }

    let neModoPeitoril = false;
  function neNomeRod() { return neModoPeitoril ? "Peitoril" : "Rodamão"; }

  function neAbrirFluxoRodamao(peitoril) {
    neDesativarModosEdgeDim();
    neModoPeitoril = peitoril;
    document.getElementById("neRodamaoTotalTitulo").innerHTML =
      `<i class="bi bi-${peitoril ? "fonts" : "border-width"} me-2"></i>${peitoril ? "Peitoris" : "Rodamões"} a adicionar`;
    document.getElementById("neRodamaoModalTitulo").innerHTML =
      `<i class="bi bi-${peitoril ? "fonts" : "border-width"} me-2"></i>Novo ${peitoril ? "peitoril" : "rodamão"}`;
    rodTotalInput.value = 1;
    rodamaoTotalModal.show();
  }
  document.getElementById("neAddRodamao").addEventListener("click", () => neAbrirFluxoRodamao(false));
  document.getElementById("neAddPeitoril").addEventListener("click", () => neAbrirFluxoRodamao(true));

  rodamaoTotalModalEl.addEventListener("shown.bs.modal", () => {
    rodTotalInput.focus();
    rodTotalInput.select();
  });
  rodTotalInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    document.getElementById("neRodamaoTotalConfirm").click();
  });

  document.getElementById("neRodamaoTotalConfirm").addEventListener("click", () => {
    const t = parseInt(rodTotalInput.value, 10);
    if (isNaN(t) || t <= 0) {
      showMessage("Escreve quantos rodamões diferentes queres adicionar.", "danger");
      return;
    }
    neRodTotal = t;
    neRodFeitos = 0;
    neAbrirRodamaoDepois = true;
    rodamaoTotalModal.hide();
  });

  // só abre o modal seguinte depois deste fechar de vez (evita glitches)
  rodamaoTotalModalEl.addEventListener("hidden.bs.modal", () => {
    if (!neAbrirRodamaoDepois) return;
    neAbrirRodamaoDepois = false;
    neLimparCamposRodamao();
    neAtualizarProgressoRodamao();
    rodamaoModal.show();
  });

  rodamaoModalEl.addEventListener("shown.bs.modal", () => {
    rodQuantidadeModal.focus();
    rodQuantidadeModal.select();
  });

  // o total pode ser alterado a meio da sequência
  rodTotalEdit.addEventListener("input", () => {
    const t = parseInt(rodTotalEdit.value, 10);
    if (isNaN(t) || t <= 0) return;
    neRodTotal = t;
    if (neRodFeitos >= neRodTotal) {
      rodamaoModal.hide();
      return;
    }
        rodProgresso.textContent = `${neNomeRod()} ${neRodFeitos + 1} de ${neRodTotal}`;
  });

  document.getElementById("neRodamaoConfirm").addEventListener("click", () => {
    const qtd = parseInt(rodQuantidadeModal.value, 10);
    const comp = rodComprimentoModal.value.trim();
    const larg = rodLarguraModal.value.trim();
    const esp = rodEspessuraModal.value.trim();

    if (!comp || !larg || !esp) {
      showMessage("Escreve o comprimento, a largura e a espessura antes de adicionar.", "danger");
      return;
    }
    if (isNaN(qtd) || qtd <= 0) {
      showMessage("Escreve uma quantidade válida.", "danger");
      return;
    }
        editor.addRodamao(comp, larg, esp, qtd, neModoPeitoril);
    refreshScaleInfo();

    neRodFeitos++;
    if (neRodFeitos < neRodTotal) {
      // continua no mesmo modal, já com os campos limpos, para o seguinte
      neLimparCamposRodamao();
      neAtualizarProgressoRodamao();
      rodQuantidadeModal.focus();
      rodQuantidadeModal.select();
    } else {
      rodamaoModal.hide();
    }
  });

  [rodQuantidadeModal, rodComprimentoModal, rodLarguraModal, rodEspessuraModal].forEach((input, idx, arr) => {
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (idx < arr.length - 1) {
        arr[idx + 1].focus();
        arr[idx + 1].select();
      } else {
        document.getElementById("neRodamaoConfirm").click();
      }
    });
  });

       document.getElementById("neAddPolygon").addEventListener("click", () => {
    neDesativarModosEdgeDim();
    editor.startPolygon();
    polyBar.classList.remove("d-none");
  });
  document.getElementById("nePolyCancel").addEventListener("click", () => {
    editor.cancelPolygon();
    polyBar.classList.add("d-none");
  });

     edgeModeBtn.addEventListener("click", () => {
      const active = editor.getTool() === "edge";
    meModeBtn.classList.remove("ne-tool-active"); meModeBtn.style.backgroundColor = "";
    editor.setTool(active ? "select" : "edge");
    edgeModeBtn.classList.toggle("ne-tool-active", !active);
    edgeModeBtn.style.backgroundColor = active ? "" : "#c0392b";
    if (!active) {
      dimModeBtn.classList.remove("ne-tool-active"); dimModeBtn.style.backgroundColor = "";
      parallelModeBtn.classList.remove("ne-tool-active"); parallelModeBtn.style.backgroundColor = "";
    }
  });

    const parallelValueModalEl = document.getElementById("neModalParallelValue");
  const parallelValueModal = new bootstrap.Modal(parallelValueModalEl);
  const fParallelValue = document.getElementById("neModalParallelValueInput");

   let neParalelaConfirmada = false;

  editor.onParallelSelectionChange((sel) => {
    if (!sel) return;
    fParallelValue.value = "";
    neParalelaConfirmada = false;
    parallelValueModal.show();
  });

  function confirmarLinhaParalela() {
    const mm = window.neParseMeasure(fParallelValue.value);
    const shape = editor.createParallelLine(mm);
    if (shape) neParalelaConfirmada = true; // só desativa se de facto criou a linha
    parallelValueModal.hide();
  }

  fParallelValue.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    confirmarLinhaParalela();
  });
  document.getElementById("neModalParallelConfirm").addEventListener("click", confirmarLinhaParalela);
  document.getElementById("neModalParallelCancel").addEventListener("click", () => {
    neParalelaConfirmada = false;
    editor.clearParallelSelection();
  });
  parallelValueModalEl.addEventListener("hidden.bs.modal", () => {
    // se o modal fechar sem confirmar (ex: clicar fora, Esc), limpa a
    // seleção verde para não ficar "presa"
    editor.clearParallelSelection();

    if (neParalelaConfirmada) {
      // confirmou -> desativa o modo "Linha Paralela"
      editor.setTool("select");
      parallelModeBtn.classList.remove("ne-tool-active");
      parallelModeBtn.style.backgroundColor = "";
    }
    // cancelou (ou fechou sem confirmar) -> o modo mantém-se ativo
    neParalelaConfirmada = false;
  });
  parallelValueModalEl.addEventListener("shown.bs.modal", () => {
    fParallelValue.focus();
    fParallelValue.select();
  });

  dimModeBtn.addEventListener("click", () => {
      const active = editor.getTool() === "dim";
    meModeBtn.classList.remove("ne-tool-active"); meModeBtn.style.backgroundColor = "";
    editor.setTool(active ? "select" : "dim");
    dimModeBtn.classList.toggle("ne-tool-active", !active);
    dimModeBtn.style.backgroundColor = active ? "" : "#2e7dd7";
    if (!active) {
      edgeModeBtn.classList.remove("ne-tool-active"); edgeModeBtn.style.backgroundColor = "";
      parallelModeBtn.classList.remove("ne-tool-active"); parallelModeBtn.style.backgroundColor = "";
    }
  });

  parallelModeBtn.addEventListener("click", () => {
        const active = editor.getTool() === "parallel";
    meModeBtn.classList.remove("ne-tool-active"); meModeBtn.style.backgroundColor = "";
    editor.setTool(active ? "select" : "parallel");
    parallelModeBtn.classList.toggle("ne-tool-active", !active);
    parallelModeBtn.style.backgroundColor = active ? "" : "#2ecc71";
    if (!active) {
      edgeModeBtn.classList.remove("ne-tool-active"); edgeModeBtn.style.backgroundColor = "";
      dimModeBtn.classList.remove("ne-tool-active"); dimModeBtn.style.backgroundColor = "";
    }
  });
  meModeBtn.addEventListener("click", () => {
  const active = editor.getTool() === "me";
  editor.setTool(active ? "select" : "me");
  meModeBtn.classList.toggle("ne-tool-active", !active);
  meModeBtn.style.backgroundColor = active ? "" : "#d4a600";
  if (!active) {
    edgeModeBtn.classList.remove("ne-tool-active"); edgeModeBtn.style.backgroundColor = "";
    dimModeBtn.classList.remove("ne-tool-active"); dimModeBtn.style.backgroundColor = "";
    parallelModeBtn.classList.remove("ne-tool-active"); parallelModeBtn.style.backgroundColor = "";
  }
});

       let neDimModalSyncing = false;

editor.onDimSelectionChange((sel, opts) => {
  if (!sel) { neDimPanelAtivo = false; dimPanel.classList.add("d-none"); return; }
  neDimPanelAtivo = true;
  hideAllPanels();
  panelEmpty.classList.add("d-none");
  dimPanel.classList.remove("d-none");

  const valorTexto = (sel.dimValue !== null && sel.dimValue !== undefined) ? window.neFormatMeasureInput(sel.dimValue) : "";
  fDimValue.value = valorTexto;

  fDimPositionWrap.classList.remove("d-none");
  if (sel.shapeLevel) {
    fDimPosition.innerHTML = `
      <option value="auto">Automática (por baixo)</option>
      <option value="outside">Por cima</option>
      <option value="inside">Por baixo</option>
    `;
  } else {
    fDimPosition.innerHTML = `
      <option value="auto">Automática</option>
      <option value="outside">Por fora</option>
      <option value="inside">Por dentro</option>
    `;
  }
  const posMode = sel.dimInside === undefined ? "auto" : (sel.dimInside ? "inside" : "outside");
  fDimPosition.value = posMode;

  // seleção normal (clicar noutra seta): só atualiza o painel, não abre o modal
  if (opts && opts.silent) return;

  neDimModalSyncing = true;
  fModalDimValue.value = valorTexto;
  neDimModalSyncing = false;
  dimValueModal.show();
});

   fDimValue.addEventListener("input", () => {
    const mm = window.neParseMeasure(fDimValue.value);
    editor.setDimValue(isNaN(mm) ? null : mm);
  });
  // ao sair do campo (ou Enter) confirma e põe a peça à escala
  fDimValue.addEventListener("change", () => {
    const mm = window.neParseMeasure(fDimValue.value);
    editor.setDimValue(isNaN(mm) ? null : mm, true);
  });
  fDimPosition.addEventListener("change", () => {
    editor.setDimInside(fDimPosition.value);
  });

      function neConfirmarMedidaModal() {
    const mm = window.neParseMeasure(fModalDimValue.value);
    editor.setDimValue(isNaN(mm) ? null : mm, true);
    fDimValue.value = fModalDimValue.value;
    dimValueModal.hide();
  }

  fModalDimValue.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    neConfirmarMedidaModal();
  });
  document.getElementById("neModalDimValueConfirm").addEventListener("click", neConfirmarMedidaModal);
  dimValueModalEl.addEventListener("shown.bs.modal", () => {
    fModalDimValue.focus();
    fModalDimValue.select();
  });

   document.getElementById("neBringForward").addEventListener("click", () => { neDesativarModosEdgeDim(); editor.bringForward(); });
  document.getElementById("neSendBackward").addEventListener("click", () => { neDesativarModosEdgeDim(); editor.sendBackward(); });

  document.getElementById("neDeleteShape").addEventListener("click", () => { neDesativarModosEdgeDim(); editor.deleteSelected(); });
  document.getElementById("neClearAll").addEventListener("click", () => {
    neDesativarModosEdgeDim();
    if (confirm("Tens a certeza que queres limpar todo o desenho?")) editor.clearAll();
  });

  document.querySelectorAll(".ne-flip-action").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    neDesativarModosEdgeDim();
    editor.rotateOrFlipSelected(el.getAttribute("data-action"));
    refreshScaleInfo();
  });
});

document.getElementById("neUndo").addEventListener("click", () => { neDesativarModosEdgeDim(); editor.undo(); });

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
  // Pronto e Entregue só se alteram na lista (list-desenho).
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
  tituloEl.textContent = "Editar Desenho";
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
    neLimparRascunho();   // <-- adicionar aqui: descarta qualquer rascunho antigo desta nota

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
            // guarda SEMPRE a escala realmente usada no editor (arredondada para cima,
      // para nunca cortar nada), para a impressão ser igual ao que vês
      escala: Math.ceil(scaleInfo.den),
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
    goToRoute("/list-desenho");
  });

  // ---------------------------------------------------------------
  // LIMPAR FORMULÁRIO (mantém-se na mesma página, limpa tudo)
  // ---------------------------------------------------------------
  document.getElementById("btnLimparFormularioNota").addEventListener("click", () => {
    limparApenasCamposFormulario();
    neGuardarRascunho();
  });

  function limparApenasCamposFormulario() {
    clienteEl.value = "";
    toggleClearNotaCliente();
    materialEl.value = "";
    tipoEl.value = "";
    dataEntregaEl.value = "";
    observacoesEl.value = "";
    fMarcarPorAcabar.checked = false;
    syncObservacoesObrigatorias();
  }


  
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
  tituloEl.textContent = "Novo Desenho";

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
    showMessage("A guardar desenho...", "info");

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

            showMessage("Desenho guardada com sucesso!", "success");
      neLimparRascunho();
      limparFormularioTotal();
        } finally {
      desbloquearFormulario();
      btnGuardarNota.innerHTML = htmlOriginal;
    }
  });
};