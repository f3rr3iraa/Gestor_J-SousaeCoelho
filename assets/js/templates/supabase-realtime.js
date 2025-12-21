// ============================
// SUPABASE REALTIME - ITEMS
// ============================

let realtimeTimer = null;

window.ativarRealtimeItems = async function () {
  const client = await initSupabaseClient();
  if (window.itemsRealtimeChannel) return;

  window.itemsRealtimeChannel = client
    .channel("items-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "items" },
      (payload) => {
        clearTimeout(realtimeTimer);
        realtimeTimer = setTimeout(() => {
          const route = window.currentRoute;
          const estadoNovo = payload.new?.estado;
          const estadoAntigo = payload.old?.estado;

          // === LISTA PRODUTOS ===
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
