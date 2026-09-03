// =====================================================
// NOTAS.JS — Recados com calendário mensal
// =====================================================

window.initNotas = async function () {
  if (!window.supabaseClient) {
    showMessage("❌ Supabase não inicializado", "danger");
    return;
  }

  const supabase = window.supabaseClient;

  const calendarBody = document.getElementById("notasCalendarBody");
  const mesLabel = document.getElementById("notasMesLabel");
  const prevBtn = document.getElementById("notasPrevMonth");
  const nextBtn = document.getElementById("notasNextMonth");
  const hojeBtn = document.getElementById("notasHojeBtn");

  const dayOffcanvasEl = document.getElementById("notasDayOffcanvas");
  const dayOffcanvas = new bootstrap.Offcanvas(dayOffcanvasEl);
  const notasDayTitle = document.getElementById("notasDayTitle");
  const notasDayList = document.getElementById("notasDayList");
  const notasNovaForm = document.getElementById("notasNovaForm");
  const notasNovoTexto = document.getElementById("notasNovoTexto");

  const MESES_PT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const hoje = new Date();
  let anoAtual = hoje.getFullYear();
  let mesAtual = hoje.getMonth(); // 0-11

  let diaSelecionado = null; // string "YYYY-MM-DD"
  let notasDoMes = {}; // { "YYYY-MM-DD": [ {id, texto, concluido, autor, ...} ] }

  function getAutorAtual() {
    // Nota: "currentSession" é uma variável global (declarada com let no
    // index.js) — NÃO fica pendurada em "window", por isso tem de ser lida
    // diretamente e não como "window.currentSession".
    return (
      currentSession?.user?.user_metadata?.display_name ||
      currentSession?.user?.email ||
      "-"
    );
  }

  function formatDateKey(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function formatDataHora(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    const dataStr = d.toLocaleDateString("pt-PT");
    const horaStr = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    return `${dataStr} - ${horaStr}`;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // =====================================================
  // CARREGAR NOTAS DO MÊS (só para pintar o calendário)
  // =====================================================
  async function carregarNotasDoMes() {
    const inicio = formatDateKey(anoAtual, mesAtual, 1);
    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const fim = formatDateKey(anoAtual, mesAtual, ultimoDia);

    const { data, error } = await supabase
      .from("notas")
      .select("id, data, concluido")
      .gte("data", inicio)
      .lte("data", fim);

    if (error) {
      showMessage("❌ Erro ao carregar notas: " + error.message, "danger");
      notasDoMes = {};
      return;
    }

    notasDoMes = {};
    (data || []).forEach((n) => {
      if (!notasDoMes[n.data]) notasDoMes[n.data] = [];
      notasDoMes[n.data].push(n);
    });
  }

  // =====================================================
  // RENDERIZAR CALENDÁRIO
  // =====================================================
  function renderCalendario() {
    mesLabel.textContent = `${MESES_PT[mesAtual]} ${anoAtual}`;

    // Semana a começar em Segunda-feira: 0=Seg ... 6=Dom
    const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay(); // 0=Dom (JS)
    const offsetSegunda = (primeiroDiaSemana + 6) % 7;
    const totalDias = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const diasMesAnterior = new Date(anoAtual, mesAtual, 0).getDate();

    const celulas = [];

    // Dias do fim do mês anterior (só visuais, cinza)
    for (let i = offsetSegunda; i > 0; i--) {
      celulas.push({ dia: diasMesAnterior - i + 1, outroMes: true });
    }

    // Dias do mês atual
    for (let dia = 1; dia <= totalDias; dia++) {
      celulas.push({ dia, outroMes: false });
    }

    // Dias do início do mês seguinte, só para completar a grelha (múltiplo de 7)
    let diaSeguinte = 1;
    while (celulas.length % 7 !== 0) {
      celulas.push({ dia: diaSeguinte, outroMes: true });
      diaSeguinte++;
    }

    let html = "";

    celulas.forEach((cel, index) => {
      if (index % 7 === 0) html += "<tr>";

      if (cel.outroMes) {
        html += `
          <td class="notas-cell-outro-mes">
            <div class="notas-cell-inner">
              <span class="notas-cell-numero">${cel.dia}</span>
            </div>
          </td>
        `;
      } else {
        const chave = formatDateKey(anoAtual, mesAtual, cel.dia);
        const notasDoDia = notasDoMes[chave] || [];
        const pendentes = notasDoDia.filter((n) => !n.concluido).length;
        const concluidas = notasDoDia.filter((n) => n.concluido).length;

        const ehHoje =
          anoAtual === hoje.getFullYear() &&
          mesAtual === hoje.getMonth() &&
          cel.dia === hoje.getDate();

        let badges = "";
        if (pendentes > 0) badges += `<span class="notas-day-dot bg-warning">${pendentes}</span>`;
        if (concluidas > 0) badges += `<span class="notas-day-dot bg-success">${concluidas}</span>`;

        html += `
          <td class="notas-cell" data-dia="${cel.dia}">
            <div class="notas-cell-inner">
              <span class="notas-cell-numero ${ehHoje ? "notas-cell-hoje" : ""}">${cel.dia}</span>
              <div class="notas-day-badges">${badges}</div>
            </div>
          </td>
        `;
      }

      if (index % 7 === 6) html += "</tr>";
    });

    calendarBody.innerHTML = html;

    calendarBody.querySelectorAll(".notas-cell").forEach((cell) => {
      cell.addEventListener("click", () => {
        const dia = parseInt(cell.dataset.dia);
        abrirDia(formatDateKey(anoAtual, mesAtual, dia));
      });
    });
  }

  async function atualizarCalendario() {
    await carregarNotasDoMes();
    renderCalendario();
  }

  // =====================================================
  // ABRIR OFFCANVAS DE UM DIA
  // =====================================================
  async function abrirDia(chaveData) {
    diaSelecionado = chaveData;
    const [y, m, d] = chaveData.split("-");
    notasDayTitle.textContent = `Notas de ${d}/${m}/${y}`;
    notasNovoTexto.value = "";
    dayOffcanvas.show();
    await carregarNotasDoDia();
  }

  async function carregarNotasDoDia() {
    if (!diaSelecionado) return;

    notasDayList.innerHTML = `<p class="text-muted small">A carregar...</p>`;

    const { data: notas, error } = await supabase
      .from("notas")
      .select("*")
      .eq("data", diaSelecionado)
      .order("created_at", { ascending: true });

    if (error) {
      notasDayList.innerHTML = `<p class="text-danger small">Erro ao carregar notas.</p>`;
      return;
    }

    if (!notas || notas.length === 0) {
      notasDayList.innerHTML = `<p class="text-muted small">Ainda não há notas para este dia.</p>`;
      return;
    }

    const notaIds = notas.map((n) => n.id);
    const { data: respostas } = await supabase
      .from("notas_respostas")
      .select("*")
      .in("nota_id", notaIds)
      .order("created_at", { ascending: true });

    const respostasPorNota = {};
    (respostas || []).forEach((r) => {
      if (!respostasPorNota[r.nota_id]) respostasPorNota[r.nota_id] = [];
      respostasPorNota[r.nota_id].push(r);
    });

    notasDayList.innerHTML = notas
      .map((nota) => renderNotaCard(nota, respostasPorNota[nota.id] || []))
      .join("");

    ligarEventosNotas();
  }

  function renderNotaCard(nota, respostas) {
    const dataHora = formatDataHora(nota.created_at);

    const respostasHtml = respostas
      .map((r) => {
        return `
          <div class="notas-reply">
            <div class="notas-reply-header">
              <strong>${escapeHtml(r.autor || "-")}</strong>
              <span class="text-muted small">${formatDataHora(r.created_at)}</span>
            </div>
            <div class="notas-reply-texto">${escapeHtml(r.texto)}</div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="notas-card ${nota.concluido ? "notas-card-concluida" : ""}" data-nota-id="${nota.id}">
        <div class="notas-card-header">
          <strong>${escapeHtml(nota.autor || "-")}</strong>
          <span class="text-muted small">${dataHora}</span>
        </div>
        <div class="notas-card-texto">${escapeHtml(nota.texto)}</div>

        <div class="notas-card-actions">
          <button class="btn btn-sm ${nota.concluido ? "btn-success" : "btn-outline-success"} btn-concluir">
            <i class="bi bi-check2-circle me-1"></i>${nota.concluido ? "Concluída" : "Marcar como concluída"}
          </button>
          <button class="btn btn-sm btn-outline-secondary btn-toggle-respostas">
            <i class="bi bi-reply me-1"></i>Responder ${respostas.length ? `(${respostas.length})` : ""}
          </button>
        </div>

        <div class="notas-replies d-none">
          ${respostasHtml || `<p class="text-muted small mb-2">Sem respostas ainda.</p>`}
          <form class="notas-reply-form d-flex gap-2 mt-2">
            <input type="text" class="form-control form-control-sm notas-reply-input" placeholder="Escrever resposta..." required>
            <button type="submit" class="btn btn-sm btn-primary"><i class="bi bi-send"></i></button>
          </form>
        </div>
      </div>
    `;
  }

  function ligarEventosNotas() {
    // Marcar como concluída
    notasDayList.querySelectorAll(".btn-concluir").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const card = btn.closest(".notas-card");
        const notaId = card.dataset.notaId;
        const estaConcluida = card.classList.contains("notas-card-concluida");

        const { error } = await supabase
          .from("notas")
          .update({ concluido: !estaConcluida })
          .eq("id", notaId);

        if (error) {
          showMessage("❌ Erro ao atualizar nota: " + error.message, "danger");
          return;
        }

        await carregarNotasDoDia();
        await atualizarCalendario();
      });
    });

    // Mostrar/esconder respostas
    notasDayList.querySelectorAll(".btn-toggle-respostas").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".notas-card");
        card.querySelector(".notas-replies").classList.toggle("d-none");
      });
    });

    // Responder
    notasDayList.querySelectorAll(".notas-reply-form").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const card = form.closest(".notas-card");
        const notaId = card.dataset.notaId;
        const input = form.querySelector(".notas-reply-input");
        const texto = input.value.trim();
        if (!texto) return;

        const { error } = await supabase.from("notas_respostas").insert([
          {
            nota_id: notaId,
            texto,
            autor: getAutorAtual(),
          },
        ]);

        if (error) {
          showMessage("❌ Erro ao enviar resposta: " + error.message, "danger");
          return;
        }

        await carregarNotasDoDia();
      });
    });
  }

  // =====================================================
  // NOVA NOTA
  // =====================================================
  notasNovaForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!diaSelecionado) return;

    const texto = notasNovoTexto.value.trim();
    if (!texto) return;

    const { error } = await supabase.from("notas").insert([
      {
        data: diaSelecionado,
        texto,
        autor: getAutorAtual(),
        concluido: false,
      },
    ]);

    if (error) {
      showMessage("❌ Erro ao adicionar nota: " + error.message, "danger");
      return;
    }

    notasNovoTexto.value = "";
    showMessage("✅ Nota adicionada!", "success");
    await carregarNotasDoDia();
    await atualizarCalendario();
  });

  // =====================================================
  // NAVEGAÇÃO DE MÊS
  // =====================================================
  prevBtn.addEventListener("click", async () => {
    mesAtual--;
    if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
    await atualizarCalendario();
  });

  nextBtn.addEventListener("click", async () => {
    mesAtual++;
    if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
    await atualizarCalendario();
  });

  hojeBtn.addEventListener("click", async () => {
    anoAtual = hoje.getFullYear();
    mesAtual = hoje.getMonth();
    await atualizarCalendario();
  });

  // =====================================================
  // REALTIME
  // =====================================================
  window.notasRealtimeCallback = async () => {
    await atualizarCalendario();
    if (diaSelecionado && dayOffcanvasEl.classList.contains("show")) {
      await carregarNotasDoDia();
    }
  };

  if (typeof window.ativarRealtimeNotas === "function") {
    await window.ativarRealtimeNotas();
  }

  // =====================================================
  // INICIALIZAR
  // =====================================================
  await atualizarCalendario();

  console.log("✅ Notas/Recados inicializado");
};