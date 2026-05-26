// =====================================================
// FOLHA-HORAS.JS
// =====================================================

window.initFolhaHoras = async function () {
  if (!window.supabaseClient) {
    showMessage("❌ Supabase não inicializado", "danger");
    return;
  }

  const supabase = window.supabaseClient;

  // =====================================================
  // ELEMENTOS DOM
  // =====================================================
  const novoFuncionarioNome     = document.getElementById("novoFuncionarioNome");
  const novoFuncionarioCargo    = document.getElementById("novoFuncionarioCargo");
  const btnAdicionarFuncionario = document.getElementById("btnAdicionarFuncionario");
  const funcionariosBody        = document.getElementById("funcionariosBody");

  const inputMesInicio          = document.getElementById("selectMesInicio");
  const inputMesFim             = document.getElementById("selectMesFim");
  const inputAno                = document.getElementById("selectAno");
  const mesInicioDropdown       = document.getElementById("mesInicioDropdown");
  const mesFimDropdown          = document.getElementById("mesFimDropdown");
  const anoDropdown             = document.getElementById("anoDropdown");

  const inputFuncionarios       = document.getElementById("selectFuncionarios");
  const funcionariosDropdown    = document.getElementById("funcionariosDropdown");
  const btnGerarFolhas          = document.getElementById("btnGerarFolhas");
  const btnGerarPDF             = document.getElementById("btnGerarPDF");
  const areaImpressao           = document.getElementById("areaImpressao");

  // =====================================================
  // ESTADO
  // =====================================================
  let funcionarios = [];
  let funcionariosSelecionados = new Set();

  const MESES_PT = [
    "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const HORA_MANHA_ENTRADA = "08:30";
  const HORA_MANHA_SAIDA   = "12:00";
  const HORA_TARDE_ENTRADA = "13:30";
  const HORA_TARDE_SAIDA   = "18:00";

  // =====================================================
  // ESTADO DOS DROPDOWNS DE PERÍODO
  // =====================================================
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  let mesInicioSelecionado = mesAtual;
  let mesFimSelecionado    = mesAtual;
  let anoSelecionado       = anoAtual;

  const MESES_DATA = MESES_PT.slice(1).map((nome, i) => ({ display: nome, value: i + 1 }));

  const anosData = [];
  for (let a = anoAtual - 2; a <= anoAtual + 2; a++) {
    anosData.push({ display: String(a), value: a });
  }

  // =====================================================
  // SETUP DROPDOWN SIMPLES
  // =====================================================
  function setupSimpleDropdown(inputEl, dropdownEl, data, valorInicial, onSelect) {
    let estadoAtual = valorInicial;
    let currentFocus = -1;

    const inicial = data.find(d => d.value === estadoAtual);
    if (inicial) inputEl.value = inicial.display;

    function closeDropdown() {
      dropdownEl.classList.remove("show");
      dropdownEl.innerHTML = "";
      currentFocus = -1;
    }

    function openDropdown() {
      dropdownEl.innerHTML = "";
      data.forEach((item) => {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        if (item.value === estadoAtual) div.classList.add("autocomplete-active");
        div.textContent = item.display;
        div.addEventListener("click", (e) => {
          e.stopPropagation();
          inputEl.value = item.display;
          estadoAtual = item.value;
          onSelect(item.value);
          closeDropdown();
        });
        dropdownEl.appendChild(div);
      });
      dropdownEl.classList.add("show");

      const ativo = dropdownEl.querySelector(".autocomplete-active");
      if (ativo) setTimeout(() => ativo.scrollIntoView({ block: "nearest" }), 0);
    }

    inputEl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dropdownEl.classList.contains("show")) {
        closeDropdown();
      } else {
        document.querySelectorAll(".autocomplete-dropdown.show").forEach(d => {
          if (d !== dropdownEl) { d.classList.remove("show"); d.innerHTML = ""; }
        });
        openDropdown();
      }
    });

    inputEl.addEventListener("keydown", (e) => {
      const items = dropdownEl.getElementsByClassName("autocomplete-item");
      if (!dropdownEl.classList.contains("show")) { openDropdown(); return; }

      if (e.keyCode === 40) {
        e.preventDefault();
        currentFocus = Math.min(currentFocus + 1, items.length - 1);
      } else if (e.keyCode === 38) {
        e.preventDefault();
        currentFocus = Math.max(currentFocus - 1, 0);
      } else if (e.keyCode === 13 && currentFocus >= 0) {
        e.preventDefault();
        items[currentFocus].click();
        return;
      } else if (e.keyCode === 27) {
        closeDropdown();
        return;
      }

      Array.from(items).forEach((el, i) =>
        el.classList.toggle("autocomplete-active", i === currentFocus)
      );
      if (items[currentFocus]) items[currentFocus].scrollIntoView({ block: "nearest" });
    });

    document.addEventListener("click", (e) => {
      if (!dropdownEl.contains(e.target) && e.target !== inputEl) closeDropdown();
    });
  }

  setupSimpleDropdown(inputMesInicio, mesInicioDropdown, MESES_DATA, mesInicioSelecionado, (v) => { mesInicioSelecionado = v; });
  setupSimpleDropdown(inputMesFim,    mesFimDropdown,    MESES_DATA, mesFimSelecionado,    (v) => { mesFimSelecionado = v; });
  setupSimpleDropdown(inputAno,       anoDropdown,       anosData,   anoSelecionado,       (v) => { anoSelecionado = v; });

  // =====================================================
  // SETUP DROPDOWN MULTI-SELEÇÃO (FUNCIONÁRIOS)
  // Registado UMA só vez — openDropdown lê sempre os
  // dados actuais através do closure sobre `funcionarios`
  // =====================================================
  let multiDropdownInitialized = false;

  function setupMultiDropdown() {
    // Garante que os listeners só são registados uma vez
    if (multiDropdownInitialized) return;
    multiDropdownInitialized = true;

    function closeDropdown() {
      funcionariosDropdown.classList.remove("show");
      funcionariosDropdown.innerHTML = "";
    }

    function openDropdown() {
      funcionariosDropdown.innerHTML = "";

      // Opção "Todos"
      const todosChecked = funcionarios.length > 0 && funcionarios.every(f => funcionariosSelecionados.has(f.id));
      const divTodos = document.createElement("div");
      divTodos.className = "autocomplete-item autocomplete-item-check";
      divTodos.innerHTML = `<span class="multi-check-icon">${todosChecked ? "✓" : ""}</span><strong>Todos</strong>`;
      divTodos.addEventListener("click", (e) => {
        e.stopPropagation();
        if (todosChecked) {
          funcionariosSelecionados.clear();
        } else {
          funcionarios.forEach(f => funcionariosSelecionados.add(f.id));
        }
        atualizarInputFuncionarios();
        openDropdown();
      });
      funcionariosDropdown.appendChild(divTodos);

      // Separador
      const sep = document.createElement("div");
      sep.style.cssText = "border-top: 1px solid #e0e0e0; margin: 2px 0;";
      funcionariosDropdown.appendChild(sep);

      // Cada funcionário
      funcionarios.forEach(f => {
        const checked = funcionariosSelecionados.has(f.id);
        const div = document.createElement("div");
        div.className = "autocomplete-item autocomplete-item-check";
        div.innerHTML = `<span class="multi-check-icon">${checked ? "✓" : ""}</span>${f.nome}`;
        div.addEventListener("click", (e) => {
          e.stopPropagation();
          if (funcionariosSelecionados.has(f.id)) {
            funcionariosSelecionados.delete(f.id);
          } else {
            funcionariosSelecionados.add(f.id);
          }
          atualizarInputFuncionarios();
          openDropdown();
        });
        funcionariosDropdown.appendChild(div);
      });

      funcionariosDropdown.classList.add("show");
    }

    inputFuncionarios.addEventListener("click", (e) => {
      e.stopPropagation();
      if (funcionariosDropdown.classList.contains("show")) {
        closeDropdown();
      } else {
        document.querySelectorAll(".autocomplete-dropdown.show").forEach(d => {
          if (d !== funcionariosDropdown) { d.classList.remove("show"); d.innerHTML = ""; }
        });
        openDropdown();
      }
    });

    document.addEventListener("click", (e) => {
      if (!funcionariosDropdown.contains(e.target) && e.target !== inputFuncionarios) closeDropdown();
    });
  }

  // =====================================================
  // ATUALIZAR TEXTO DO INPUT DE FUNCIONÁRIOS
  // =====================================================
  function atualizarInputFuncionarios() {
    const sel = funcionarios.filter(f => funcionariosSelecionados.has(f.id));
    if (sel.length === 0) {
      inputFuncionarios.value = "Nenhum selecionado";
    } else if (sel.length === funcionarios.length) {
      inputFuncionarios.value = "Todos (" + funcionarios.length + ")";
    } else if (sel.length === 1) {
      inputFuncionarios.value = sel[0].nome;
    } else {
      inputFuncionarios.value = sel.length + " selecionados";
    }
  }

  // =====================================================
  // CARREGAR FUNCIONÁRIOS
  // =====================================================
  async function carregarFuncionarios() {
    try {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      funcionarios = data || [];
      renderTabelaFuncionarios();
      renderDropdownFuncionarios();
    } catch (err) {
      showMessage("❌ Erro ao carregar funcionários: " + err.message, "danger");
    }
  }

  // =====================================================
  // RENDERIZAR DROPDOWN DE FUNCIONÁRIOS
  // =====================================================
  function renderDropdownFuncionarios() {
    if (funcionariosSelecionados.size === 0) {
      funcionarios.forEach(f => funcionariosSelecionados.add(f.id));
    } else {
      funcionarios.forEach(f => funcionariosSelecionados.add(f.id));
      const ids = new Set(funcionarios.map(f => f.id));
      for (const id of funcionariosSelecionados) {
        if (!ids.has(id)) funcionariosSelecionados.delete(id);
      }
    }
    atualizarInputFuncionarios();
    setupMultiDropdown();
  }

  // =====================================================
  // RENDERIZAR TABELA DE FUNCIONÁRIOS
  // =====================================================
  function renderTabelaFuncionarios() {
    if (!funcionarios.length) {
      funcionariosBody.innerHTML = `<tr><td colspan="4" class="text-muted">Nenhum funcionário registado</td></tr>`;
      return;
    }

    funcionariosBody.innerHTML = "";
    funcionarios.forEach(f => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${f.nome}</td>
        <td>${f.cargo || ""}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1"
            title="Editar" data-id="${f.id}" data-nome="${f.nome}" data-cargo="${f.cargo || ""}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger"
            title="Eliminar" data-id="${f.id}" data-nome="${f.nome}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      funcionariosBody.appendChild(tr);
    });
  }


  // =====================================================
  // ADICIONAR FUNCIONÁRIO
  // =====================================================
  btnAdicionarFuncionario.addEventListener("click", async () => {
    const nome  = novoFuncionarioNome.value.trim();
    const cargo = novoFuncionarioCargo.value.trim() || null;

    if (!nome) {
      showMessage("⚠️ O nome é obrigatório", "warning");
      novoFuncionarioNome.focus();
      return;
    }

    // ✅ Verificar se já existe um funcionário com o mesmo nome
  const jaExiste = funcionarios.some(f => f.nome.toLowerCase() === nome.toLowerCase());
  if (jaExiste) {
    showMessage("⚠️ Já existe um funcionário com esse nome", "warning");
    novoFuncionarioNome.focus();
    return;
  }

    try {
      showMessage("⏳ A adicionar funcionário...", "info");
      const { error } = await supabase
        .from("funcionarios")
        .insert([{ nome, cargo }]);
      if (error) throw error;

      showMessage("✅ Funcionário adicionado!", "success");
      novoFuncionarioNome.value = "";
      novoFuncionarioCargo.value = "";
      // carregarFuncionarios() será chamado pelo realtime;
      // chamamos também localmente para resposta imediata
      await carregarFuncionarios();
    } catch (err) {
      showMessage("❌ Erro: " + err.message, "danger");
    }
  });

  document.getElementById("btnSalvarEdicaoFuncionario").addEventListener("click", async () => {
    const id    = parseInt(document.getElementById("editFuncId").value);
    const nome  = document.getElementById("editFuncNome").value.trim();
    const cargo = document.getElementById("editFuncCargo").value.trim() || null;

    if (!nome) {
      showMessage("⚠️ O nome é obrigatório", "warning");
      return;
    }

    // ✅ Verificar se já existe outro funcionário com o mesmo nome
  const jaExiste = funcionarios.some(f => f.nome.toLowerCase() === nome.toLowerCase() && f.id !== id);
  if (jaExiste) {
    showMessage("⚠️ Já existe um funcionário com esse nome", "warning");
    return;
  }

    try {
      const { error } = await supabase
        .from("funcionarios")
        .update({ nome, cargo })
        .eq("id", id);

      if (error) throw error;

      showMessage("✅ Funcionário atualizado!", "success");
      bootstrap.Offcanvas.getInstance(document.getElementById("editFuncionarioOffcanvas")).hide();
      await carregarFuncionarios();
    } catch (err) {
      showMessage("❌ Erro: " + err.message, "danger");
    }
  });
  // =====================================================
  // AÇÕES NA TABELA (ATIVAR/DESATIVAR E ELIMINAR)
  // =====================================================
  funcionariosBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = parseInt(btn.dataset.id);

    if (btn.title === "Editar") {
      document.getElementById("editFuncId").value = id;
      document.getElementById("editFuncNome").value = btn.dataset.nome;
      document.getElementById("editFuncCargo").value = btn.dataset.cargo;
      const offcanvas = new bootstrap.Offcanvas(document.getElementById("editFuncionarioOffcanvas"));
      offcanvas.show();
      return;
    }

    if (btn.title === "Eliminar") {
      const nome = btn.dataset.nome;
      if (!confirm(`Eliminar o funcionário "${nome}"? Todas as folhas de horas associadas serão apagadas.`)) return;
      try {
        const { error } = await supabase.from("funcionarios").delete().eq("id", id);
        if (error) throw error;
        funcionariosSelecionados.delete(id);
        showMessage("✅ Funcionário eliminado", "success");
        await carregarFuncionarios();
      } catch (err) {
        showMessage("❌ Erro: " + err.message, "danger");
      }
    }
  });

  // =====================================================
  // GERAR HTML DE UMA FOLHA DE HORAS
  // =====================================================
  function gerarFolhaHTML(funcionario, mes, ano) {
    const nomeMes = MESES_PT[mes];
    const diasNoMes = new Date(ano, mes, 0).getDate();

    let linhas = "";
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataDia = new Date(ano, mes - 1, dia);
      const diaSemana = dataDia.getDay();
      const nomeDiaSemana = DIAS_SEMANA[diaSemana];
      const ehFimDeSemana = diaSemana === 0 || diaSemana === 6;

      let maEntr = "", maSaid = "", taEntr = "", taSaid = "";
      if (!ehFimDeSemana) {
        maEntr = HORA_MANHA_ENTRADA;
        maSaid = HORA_MANHA_SAIDA;
        taEntr = HORA_TARDE_ENTRADA;
        taSaid = HORA_TARDE_SAIDA;
      }

      const classRow = ehFimDeSemana ? "row-fim-semana" : "";

      linhas += `
        <tr class="${classRow}">
          <td class="col-dia"><strong>${String(dia).padStart(2, "0")}</strong></td>
          <td class="col-dia-semana">${nomeDiaSemana}</td>
          <td class="col-hora">${maEntr}</td>
          <td class="col-hora">${maSaid}</td>
          <td class="col-hora">${taEntr}</td>
          <td class="col-hora">${taSaid}</td>
          <td class="col-rubrica"></td>
        </tr>
      `;
    }

    return `
    <div class="folha-hora-page">

      <!-- CABEÇALHO -->
      <div class="fh-header">
        <div class="fh-header-empresa">
          <div class="empresa-nome">J Sousa &amp; Coelho Lda</div>
          <p>Rua da Indústria, nº 130</p>
          <p>4595-355 Penamaior</p>
          <p>Paços de Ferreira, Portugal</p>
        </div>
        <div class="fh-header-funcionario">
          <div class="fh-titulo">Ficha Tempo de Trabalho</div>
          <div class="fh-nome-func">${funcionario.nome}</div>
          ${funcionario.cargo ? `<div class="fh-cargo-func">${funcionario.cargo}</div>` : ""}
        </div>
      </div>

      <hr class="fh-divider">

      <div class="fh-mes-label">${nomeMes} de ${ano}</div>

      <table class="fh-table">
        <thead>
          <tr>
            <th class="col-dia" rowspan="2">Dia</th>
            <th class="col-dia-semana" rowspan="2">Sem.</th>
            <th colspan="2">Manhã</th>
            <th colspan="2">Tarde</th>
            <th class="col-rubrica" rowspan="2">Rubrica</th>
          </tr>
          <tr>
            <th class="col-hora">Entrada</th>
            <th class="col-hora">Saída</th>
            <th class="col-hora">Entrada</th>
            <th class="col-hora">Saída</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>

      <div class="fh-page-footer">
        <hr class="pdf-divider-legal">
        <div class="pdf-footer">
          <div class="pdf-footer-logo">
            <img src="assets/images/jsousacoelho_logo.png" alt="J Sousa &amp; Coelho">
          </div>
          <div class="pdf-footer-divider"></div>
          <div class="pdf-footer-info">
            <p class="footer-description">Telef: 255 862 343 &nbsp;|&nbsp; Fax: 255 866 206 <br>E-mail: jscoelho@sapo.pt</p>
          </div>
        </div>
      </div>

    </div>
    `;
  }

  // =====================================================
  // OBTER FUNCIONÁRIOS SELECIONADOS
  // =====================================================
  function getFuncionariosSelecionados() {
    return funcionarios.filter(f => funcionariosSelecionados.has(f.id));
  }

  // =====================================================
  // GERAR FOLHAS
  // =====================================================
  function gerarFolhas() {
    const mesInicio = mesInicioSelecionado;
    const mesFim    = mesFimSelecionado;
    const ano       = anoSelecionado;

    if (mesInicio > mesFim) {
      showMessage("⚠️ O mês de início não pode ser posterior ao mês de fim", "warning");
      return;
    }

    const selecionados = getFuncionariosSelecionados();
    if (!selecionados.length) {
      showMessage("⚠️ Seleciona pelo menos um funcionário", "warning");
      return;
    }

    let html = "";
    for (let mes = mesInicio; mes <= mesFim; mes++) {
      selecionados.forEach(func => {
        html += gerarFolhaHTML(func, mes, ano);
      });
    }

    areaImpressao.innerHTML = html;
    areaImpressao.classList.remove("d-none");



    const totalFolhas = selecionados.length * (mesFim - mesInicio + 1);
    showMessage(`✅ ${totalFolhas} folha(s) gerada(s)`, "success");
    return totalFolhas;
  }

  // =====================================================
  // BOTÃO GERAR E IMPRIMIR
  // =====================================================
// =====================================================
// BOTÃO GERAR E IMPRIMIR
// =====================================================
btnGerarFolhas.addEventListener("click", async () => {
  const total = gerarFolhas();
  if (!total) return;

  try {
    showMessage("⏳ A preparar impressão...", "info");

    if (!window.jspdf) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      document.head.appendChild(script);
      await new Promise(resolve => { script.onload = resolve; });
    }
    if (!window.html2canvas) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      document.head.appendChild(script);
      await new Promise(resolve => { script.onload = resolve; });
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const paginas = areaImpressao.querySelectorAll(".folha-hora-page");

    for (let i = 0; i < paginas.length; i++) {
      const canvas = await html2canvas(paginas[i], {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, 0, pageW, Math.min(imgH, pageH));
    }

    // Abre diálogo de impressão
    pdf.autoPrint();
    // Abre diálogo de impressão
const blob = pdf.output("blob");
const url = URL.createObjectURL(blob);
const iframe = document.createElement("iframe");
iframe.style.display = "none";
iframe.src = url;
document.body.appendChild(iframe);
iframe.onload = () => {
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => {
    document.body.removeChild(iframe);
    URL.revokeObjectURL(url);
  }, 1000);
};

areaImpressao.innerHTML = "";
areaImpressao.classList.add("d-none");

    showMessage("✅ PDF pronto para imprimir!", "success");

  } catch (err) {
    console.error("Erro ao imprimir:", err);
    showMessage("❌ Erro ao imprimir: " + err.message, "danger");
  }
});

// =====================================================
// BOTÃO EXPORTAR PDF
// =====================================================
btnGerarPDF.addEventListener("click", async () => {
  const total = gerarFolhas();
  if (!total) return;

  try {
    showMessage("⏳ A gerar PDF...", "info");

    if (!window.jspdf) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      document.head.appendChild(script);
      await new Promise(resolve => { script.onload = resolve; });
    }
    if (!window.html2canvas) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      document.head.appendChild(script);
      await new Promise(resolve => { script.onload = resolve; });
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const paginas = areaImpressao.querySelectorAll(".folha-hora-page");

    for (let i = 0; i < paginas.length; i++) {
      const canvas = await html2canvas(paginas[i], {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, 0, pageW, Math.min(imgH, pageH));
    }

    const nomeMesInicio = MESES_PT[mesInicioSelecionado];
    const nomeMesFim    = MESES_PT[mesFimSelecionado];
    let nomeArquivo = `Folhas_Horas_${nomeMesInicio}`;
    if (mesInicioSelecionado !== mesFimSelecionado) nomeArquivo += `_a_${nomeMesFim}`;
    nomeArquivo += `_${anoSelecionado}.pdf`;

    pdf.save(nomeArquivo);

    areaImpressao.innerHTML = "";
areaImpressao.classList.add("d-none");

    showMessage("✅ PDF exportado com sucesso!", "success");

  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    showMessage("❌ Erro ao gerar PDF: " + err.message, "danger");
  }
});

  // =====================================================
  // ESTILOS DE IMPRESSÃO
  // =====================================================
  if (!document.getElementById("fh-print-style")) {
  const style = document.createElement("style");
  style.id = "fh-print-style";
  style.textContent = `
    @media print {
      /* Esconde tudo no body */
      body * { visibility: hidden !important; }
      
      /* Mostra apenas a área de impressão e tudo dentro dela */
      #areaImpressao,
      #areaImpressao * { visibility: visible !important; }
      
      /* Posiciona no topo da página */
      #areaImpressao {
        display: block !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
      }
      
      .folha-hora-page {
        border: none !important;
        margin: 0 !important;
        padding: 12mm 12mm 8mm 12mm !important;
        page-break-after: always;
      }
      .folha-hora-page:last-child { page-break-after: auto; }
    }
  `;
  document.head.appendChild(style);
}

  // =====================================================
  // REGISTAR CALLBACK REALTIME
  // Quando o Supabase Realtime detecta mudanças na tabela
  // funcionarios, recarrega automaticamente os dados
  // =====================================================
  window.folhaHorasRealtimeCallback = async (payload) => {
    await carregarFuncionarios();
  };

  // =====================================================
  // INICIALIZAR
  // =====================================================
  await carregarFuncionarios();

  // Ativar realtime se ainda não estiver ativo
  if (typeof window.ativarRealtimeFuncionarios === "function") {
    await window.ativarRealtimeFuncionarios();
  }

  console.log("✅ Folha de Horas inicializada");
};