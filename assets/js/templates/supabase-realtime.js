// ============================
// SUPABASE REALTIME - ITEMS
// ============================

async function ativarRealtimeItems() {
    const client = await initSupabaseClient();

    // evita múltiplas subscrições
    if (window.itemsRealtimeChannel) return;

    window.itemsRealtimeChannel = client
        .channel("items-realtime")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "items"
            },
            (payload) => {
                console.log("🔄 Realtime items:", payload.eventType);

                // só atualiza se estivermos numa página de listas
                const route = window.currentRoute;

                if (route === "/list-products") {
                    initHomeSupabase("on");
                } 
                else if (route === "/list-reservations") {
                    initHomeSupabase("off");
                } 
                else if (route === "/our-reservations") {
                    initHomeSupabase("nosso");
                }
            }
        )
        .subscribe();
}
