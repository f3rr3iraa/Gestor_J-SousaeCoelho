// =====================================================
// FOLHA-HORAS-REALTIME.JS
// Ativado UMA vez no arranque da app (via router.js),
// tal como os outros realtime files do projeto.
// Atualiza a UI automaticamente em qualquer monitor/tab
// que tenha a rota /list-folha-horas aberta.
// =====================================================

window.folhaHorasRealtimeCallback = null;
window.folhaHorasRealtimeAtivo    = false;

window.ativarRealtimeFuncionarios = async function () {
  // Garante que o canal só é criado uma vez por sessão
  if (window.folhaHorasRealtimeAtivo) return;
  if (!window.supabaseClient) return;

  window.folhaHorasRealtimeAtivo = true;

  window.supabaseClient
    .channel("funcionarios-global")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "funcionarios" },
      (payload) => {
        console.log("📡 Realtime funcionarios:", payload.eventType, payload);

        // Só atualiza a UI se a página de folha de horas estiver ativa
        if (
          window.currentRoute === "/list-folha-horas" &&
          typeof window.folhaHorasRealtimeCallback === "function"
        ) {
          window.folhaHorasRealtimeCallback(payload);
        }
      }
    )
    .subscribe((status) => {
      console.log("📡 Canal funcionarios-global:", status);
    });

  console.log("✅ Realtime Funcionarios ativado (global)");
};