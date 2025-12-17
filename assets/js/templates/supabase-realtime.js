// ============================
// SUPABASE REALTIME - ITEMS
// ============================

window.ativarRealtimeItems = async function () {
  const client = await initSupabaseClient();
  if (window.itemsRealtimeChannel) return;

  window.itemsRealtimeChannel = client
    .channel("items-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "items" },
      (payload) => {

        if (!payload.new && !payload.old) return;

        const route = window.currentRoute;
        const estadoAtual =
          route === "/list-products" ? "on" :
          route === "/list-reservations" ? "off" :
          route === "/our-reservations" ? "nosso" :
          null;

        if (!estadoAtual) return;

        handleRealtimeItem(payload, estadoAtual);
      }
    )
    .subscribe();
};
