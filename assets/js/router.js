const routes = {
  404: {
    template: "/templates/404.html",
    title: "404",
    description: "Page not Found",
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
  "/list-reservations": {
    template: "/templates/list-reservations.html",
    title: "list-reservations",
    description: "List Reservations Page",
  },
  "/list-products": {
    template: "/templates/list-products.html",
    title: "list-products",
    description: "List Products Page",
  },
  "/our-reservations": {
    template: "/templates/our-reservations.html",
    title: "our-reservations",
    description: "List Our Reservations Page",
  },
};

const route = (event) => {
  event = event || window.event;
  event.preventDefault();

  const targetUrl = new URL(event.target.href, window.location.origin);

  if (targetUrl.origin === window.location.origin) {
    window.history.pushState({}, "", targetUrl.pathname);
  } else {
    window.open(targetUrl.href, "_blank");
  }
};

// ===========================
// MAIN LOCATION HANDLER
// ===========================
const locationHandler = async () => {
  if (!isLogged()) {
    console.log("Não está logado, redirecionando para login...");
    document.getElementById("content-login").classList.remove("d-none");
    document.getElementById("content-dashboard").classList.add("d-none");
    document.getElementById("content").classList.add("d-none");
    return;
  }

  // Inicializações específicas por página
  if (!window.supabaseClient) {
    await initSupabaseClient();
  }

  if (!window.realtimeItemsAtivo) {
    await ativarRealtimeItems();
    window.realtimeItemsAtivo = true;
  }

  let location = window.location.pathname;
  if (location === "/") {
    // Redireciona para /home se estiver logado
    window.history.replaceState({}, "", "/home");
    location = "/home";
  }

  let route = routes[location] || routes["404"];
  if (route.title === "404") {
    window.history.pushState({}, "", "/home");
    location = "/home";
    route = routes[location];
  }

  window.currentRoute = location;
  const html = await fetch(route.template).then((res) => res.text());
  document.getElementById("content").innerHTML = html;

  if (window.initFormSupabase && location === "/form") initFormSupabase();
  if (
    window.initHomeSpaceSupabase &&
    (location === "/" || location === "/home")
  )
    initHomeSpaceSupabase();
  if (window.initHomeSupabase && location === "/list-products") {
    initHomeSupabase("on");
    ativarPaginacao();
  }
  if (window.initHomeSupabase && location === "/list-reservations") {
    initHomeSupabase("off");
    ativarPaginacao();
  }
  if (window.initHomeSupabase && location === "/our-reservations") {
    initHomeSupabase("nosso");
    ativarPaginacao();
  }

  await changeActive(location);
  setTimeout(() => window.scrollTo({ top: 0 }), 0);
};

// ===========================
// MENU ACTIVE LINK
// ===========================
async function changeActive(location) {
  const links = document.querySelectorAll("#menu a");
  links.forEach((link) => {
    link.classList.remove("active");
    const onclickAttr = link.getAttribute("onclick");
    if (onclickAttr && onclickAttr.includes(`goToRoute('${location}')`)) {
      link.classList.add("active");
    }
  });
}

// ===========================
// SPA NAVIGATION
// ===========================
function goToRoute(route) {
  window.history.pushState({}, "", route);
  locationHandler();
}

// ===========================
// BIND POPSTATE & GLOBALS
// ===========================
window.onpopstate = locationHandler;
window.route = route;

// Inicializa página atual
locationHandler();
