// ================================
// REALTIME WEBSITE
// ================================
window.initWebsiteRealtime = function (reloadCallback) {
  if (!window.supabaseClient) {
    return null;
  }

  const supabase = window.supabaseClient;

  // ================================
  // SUBSCRIÇÃO AO CANAL REALTIME
  // ================================
  const channel = supabase
    .channel('website-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'website'
      },
      (payload) => {
        // Recarregar dados
        if (typeof reloadCallback === 'function') {
          reloadCallback();
        }
      }
    )
    .subscribe();

  // ================================
  // RETORNAR FUNÇÃO DE CLEANUP
  // ================================
  return () => {
    supabase.removeChannel(channel);
  };
};