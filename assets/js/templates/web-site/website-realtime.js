window.initWebsiteRealtime = function (reloadCallback) {
  if (!window.supabaseClient) return null;

  const supabase = window.supabaseClient;

  // Remove canal anterior se já existir
  const existingChannel = supabase.getChannels().find(
    (ch) => ch.topic === 'realtime:website-changes'
  );
  if (existingChannel) {
    supabase.removeChannel(existingChannel);
  }

  const channel = supabase
    .channel('website-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'website' },
      (payload) => {
        if (typeof reloadCallback === 'function') {
          reloadCallback();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};