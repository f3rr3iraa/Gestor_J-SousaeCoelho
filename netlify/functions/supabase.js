async function initSupabase() {
  const res = await fetch("/.netlify/functions/config");
  const cfg = await res.json();

  window.supabaseClient = supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseKey
  );
}

initSupabase();
