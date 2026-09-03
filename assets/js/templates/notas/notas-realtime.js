// =====================================================
// NOTAS-REALTIME.JS
// Ativado UMA vez no arranque da app (via router.js),
// tal como os outros realtime files do projeto.
// =====================================================

window.notasRealtimeCallback = null;
window.notasRealtimeAtivo = false;

window.ativarRealtimeNotas = async function () {
  if (window.notasRealtimeAtivo) return;
  if (!window.supabaseClient) return;

  window.notasRealtimeAtivo = true;

  window.supabaseClient
    .channel("notas-global")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notas" },
      (payload) => {
        if (window.currentRoute === "/list-notas" && typeof window.notasRealtimeCallback === "function") {
          window.notasRealtimeCallback(payload);
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notas_respostas" },
      (payload) => {
        if (window.currentRoute === "/list-notas" && typeof window.notasRealtimeCallback === "function") {
          window.notasRealtimeCallback(payload);
        }
      }
    )
    .subscribe((status) => {
      console.log("📡 Canal notas-global:", status);
    });

  console.log("✅ Realtime Notas ativado (global)");
};