window.initNotaEncomendaRealtime = function (reloadCallback) {
  if (!window.supabaseClient) {
    return null;
  }

  const supabase = window.supabaseClient;

  const existente = supabase.getChannels().find((ch) => ch.topic === "realtime:notas-encomenda-changes");
  if (existente) {
    supabase.removeChannel(existente);
  }

  const channel = supabase
    .channel("notas-encomenda-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notas_encomenda",
      },
      (payload) => {
        if (typeof reloadCallback === "function") {
          reloadCallback();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};