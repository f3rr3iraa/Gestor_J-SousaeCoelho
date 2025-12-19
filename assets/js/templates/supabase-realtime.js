// ============================
// SUPABASE REALTIME - ITEMS
// ============================

let realtimeTimer = null;

window.ativarRealtimeItems = async function () {
  if (window.itemsRealtimeChannel) return; // já ativo nesta aba

  const client = await initSupabaseClient();

  window.itemsRealtimeChannel = client
    .channel("items-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "items" },
      (payload) => {
        clearTimeout(realtimeTimer);
        realtimeTimer = setTimeout(() => {
          const route = window.currentRoute;

          // Atualiza conforme a aba atual
          if (route === "/list-products") {
            window.isRealtimeUpdate = true;
            initHomeSupabase("on");
          } else if (route === "/list-reservations") {
            window.isRealtimeUpdate = true;
            initHomeSupabase("off");
          } else if (route === "/our-reservations") {
            window.isRealtimeUpdate = true;
            initHomeSupabase("nosso");
          }
        }, 250);
      }
    )
    .subscribe();
};

// ============================
// Garantir que todas as abas atualizem
// ============================

// 1. Ativa Realtime ao carregar a aba
window.addEventListener("load", async () => {
  if (!window.realtimeItemsAtivo) {
    await ativarRealtimeItems();
    window.realtimeItemsAtivo = true;
  }
});

// 2. Reativa se aba voltar do background
document.addEventListener("visibilitychange", async () => {
  if (!window.realtimeItemsAtivo && !document.hidden) {
    await ativarRealtimeItems();
    window.realtimeItemsAtivo = true;
  }
});
