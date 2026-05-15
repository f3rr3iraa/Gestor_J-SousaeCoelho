// ================================
// REALTIME ORCAMENTO
// ================================
window.initOrcamentoRealtime = function (reloadCallback) {
  if (!window.supabaseClient) {
    return null;
  }

  const supabase = window.supabaseClient;

  // ================================
  // SUBSCRIÇÃO AO CANAL REALTIME
  // ================================
  const channel = supabase
    .channel('orcamento-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'orcamentos'
      },
      (payload) => {
        if (typeof reloadCallback === 'function') {
          reloadCallback();
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'orcamento_itens'
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