// ================================
// REALTIME CLIENTE
// ================================
window.initClienteRealtime = function (reloadCallback) {
  if (!window.supabaseClient) {
    return null;
  }

  const supabase = window.supabaseClient;

  // Remove canais de visitas anteriores (ver nota em orcamento-realtime.js)
  supabase
    .getChannels()
    .filter((ch) => ch.topic.startsWith('realtime:cliente-changes'))
    .forEach((ch) => supabase.removeChannel(ch));

  let timer = null;
  const pedirReload = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (typeof reloadCallback === 'function') {
        reloadCallback();
      }
    }, 300);
  };

  const channel = supabase
    .channel(`cliente-changes-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'clientes' },
      pedirReload
    )
    .subscribe();

  // ================================
  // RETORNAR FUNÇÃO DE CLEANUP
  // ================================
  return () => {
    clearTimeout(timer);
    supabase.removeChannel(channel);
  };
};