// ================================
// REALTIME CLIENTE
// ================================
window.initClienteRealtime = function (reloadCallback) {
  if (!window.supabaseClient) {
    return null;
  }

  const supabase = window.supabaseClient;

  // ================================
  // SUBSCRIÇÃO AO CANAL REALTIME
  // ================================
  const channel = supabase
    .channel('cliente-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'clientes'
      },
      (payload) => {
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