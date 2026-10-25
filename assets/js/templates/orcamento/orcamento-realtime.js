// ================================
// REALTIME ORCAMENTO
// ================================
window.initOrcamentoRealtime = function (reloadCallback) {
  if (!window.supabaseClient) {
    return null;
  }

  const supabase = window.supabaseClient;

  // supabase.channel(nome) devolve o canal JÁ EXISTENTE se o nome for igual.
  // Como esse canal já está subscrito, os novos callbacks não ficavam ligados e
  // continuava a disparar o callback da visita anterior à página (a recarregar
  // uma tabela que já nem existe no ecrã). Por isso removemos sempre o anterior
  // e criamos um canal novo com nome único.
  supabase
    .getChannels()
    .filter((ch) => ch.topic.startsWith('realtime:orcamento-changes'))
    .forEach((ch) => supabase.removeChannel(ch));

  // Guardar um orçamento com N produtos gera vários eventos seguidos
  // (1 do orçamento + N dos itens). Agrupamos tudo num único reload.
  let timer = null;
  const pedirReload = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (typeof reloadCallback === 'function') {
        reloadCallback();
      }
    }, 400);
  };

  const channel = supabase
    .channel(`orcamento-changes-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orcamentos' },
      pedirReload
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orcamento_itens' },
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