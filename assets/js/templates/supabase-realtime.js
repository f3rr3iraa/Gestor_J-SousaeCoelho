// ============================
// SUPABASE REALTIME - ITEMS (com BroadcastChannel)
// ============================

window.ativarRealtimeItems = async function () {
  const client = await initSupabaseClient();

  // Evita criar múltiplos canais
  if (window.itemsRealtimeChannel) return;

  // BroadcastChannel para comunicar entre abas
  const bc = new BroadcastChannel('items_channel');
  window.itemsBroadcast = bc;

  // Receber mensagens de outras abas
  bc.onmessage = (event) => {
    const { estado } = event.data;
    if (!estado) return;
    window.isRealtimeUpdate = true;
    initHomeSupabase(estado);
  };

  // Canal Supabase
  window.itemsRealtimeChannel = client
    .channel("items-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "items" },
      (payload) => {
        const estado = payload.new?.estado || payload.old?.estado;
        if (!estado) return;

        // Atualiza a própria aba
        window.isRealtimeUpdate = true;
        initHomeSupabase(estado);

        // Notifica outras abas
        bc.postMessage({ estado });
      }
    )
    .subscribe();
};
