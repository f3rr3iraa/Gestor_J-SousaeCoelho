window.ativarRealtimeItems = async function () {
    const client = await initSupabaseClient();
    if (window.itemsRealtimeChannel) return;

    window.itemsRealtimeChannel = client
        .channel("items-realtime")
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "items" },
            () => {
                const r = window.currentRoute;
                if (r === "/list-products") initHomeSupabase("on");
                if (r === "/list-reservations") initHomeSupabase("off");
                if (r === "/our-reservations") initHomeSupabase("nosso");
            }
        )
        .subscribe();
};
