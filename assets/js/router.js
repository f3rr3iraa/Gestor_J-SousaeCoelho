const routes = {
    404: {
        template: "/templates/404.html",
        title: "404",
        description: "Page not Found"
    },
    "/home": {
        template: "/templates/home.html",
        title: "home",
        description: "Home Page",
    },
    "/form": {
        template: "/templates/form.html",
        title: "form",
        description: "Form Page",
    },
    "/list-orders": {
        template: "/templates/list-orders.html",
        title: "list-orders",
        description: "List Orders Page",
    },
    "/list-products": {
        template: "/templates/list-products.html",
        title: "list-products",
        description: "List Products Page",
    },

}

const route = (event) => {
    event = event || window.event;
    event.preventDefault();

    const targeUrl = new URL(event.target.href, window.location.origin);

    if (targeUrl.origin === window.location.origin) {
        window.history.pushState({}, "", targeUrl.pathname); 
    } else
        window.open(targeUrl.href, "_blanck");
};

const locationHandler = async () => {
    // Se não está logado, mostra só o login
    if (!sessionStorage.getItem("logged")) {
        document.getElementById("content-login").classList.remove("d-none");
        document.getElementById("content-dashboard").classList.add("d-none");
        document.getElementById("content").classList.add("d-none");
        return;
    }

    // Obtém a rota atual
    let location = window.location.pathname || "/";
    let route = routes[location] || routes["404"];

    // Se não existe a rota, mostra 404 sem redirecionar para "/"
    if (route === routes["404"]) {
        document.title = route.title;
        const html = await fetch(route.template).then(res => res.text());
        document.getElementById('content').innerHTML = html;
        console.warn(`Rota não encontrada: ${location}`);
        return;
    }

    // Atualiza o título da página
    document.title = route.title;

    // Carrega o template
    const html = await fetch(route.template).then(res => res.text());
    document.getElementById('content').innerHTML = html;

    // Inicializa funcionalidades específicas de cada rota
    if (window.initFormSupabase && location === "/form") {
        console.log("⚙️ A inicializar formulário Supabase após injeção SPA...");
        initFormSupabase();
    }

    await changeActive(location);

    // Sobe ao topo da página
    setTimeout(() => window.scrollTo({ top: 0 }), 0);
};



async function changeActive(location) {
    console.log("location => ", location);
}

function goToRoute(route) {
    window.history.pushState({}, "", route);
    locationHandler();
}

window.onpopstate = locationHandler;
window.route = route;
locationHandler();