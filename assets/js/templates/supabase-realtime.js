// ============================
// SUPABASE REALTIME - ITEMS
// ============================

let realtimeTimer = null;

window.ativarRealtimeItems = async function () {
    const client = await initSupabaseClient();
    if (window.itemsRealtimeChannel) return;

    window.itemsRealtimeChannel = client
        .channel("items-realtime")
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "items" },
            () => {

                // === debounce para evitar múltiplos reloads ===
                clearTimeout(realtimeTimer);
                realtimeTimer = setTimeout(() => {

                    // === sinaliza que é update realtime (sem loading) ===
                    window.isRealtimeUpdate = true;

                    const r = window.currentRoute;

                    if (r === "/list-products") {
                        initHomeSupabase("on");
                    }
                    else if (r === "/list-reservations") {
                        initHomeSupabase("off");
                    }
                    else if (r === "/our-reservations") {
                        initHomeSupabase("nosso");
                    }

                }, 250);
            }
        )
        .subscribe();
};
