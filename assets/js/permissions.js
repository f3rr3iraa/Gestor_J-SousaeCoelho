// permissions.js
// ===========================
// PERMISSÕES POR UTILIZADOR
// ===========================
// O utilizador ruicnc@gmail.com só pode aceder às páginas de
// "Chapas e Sobras". Qualquer outra rota (incluindo /home) é
// redireccionada automaticamente para /form-chapas-e-sobras.

const CHAPAS_ONLY_EMAIL = "ruicnc@gmail.com";

// Rotas às quais este utilizador tem acesso
const CHAPAS_ONLY_ALLOWED_ROUTES = [
  "/form-chapas-e-sobras",
  "/list-products",
  "/list-reservations",
  "/our-reservations",
];

// Rota para onde é sempre redireccionado fora das permitidas
const CHAPAS_ONLY_REDIRECT_ROUTE = "/form-chapas-e-sobras";

function isChapasOnlyUser() {
  const email = window.currentSession?.user?.email;
  return !!email && email.toLowerCase() === CHAPAS_ONLY_EMAIL;
}

function applyRoutePermissions(location) {
  if (isChapasOnlyUser() && !CHAPAS_ONLY_ALLOWED_ROUTES.includes(location)) {
    return CHAPAS_ONLY_REDIRECT_ROUTE;
  }
  return location;
}

function applyMenuPermissions() {
  const idsParaEsconder = [
    "menuHome",
    "menuCatalogo",
    "menuDesenho",
    "menuOrcamento",
    "menuClientes",
    "menuFolhaHoras",
    "menuNotas",
  ];

  const restrito = isChapasOnlyUser();

  idsParaEsconder.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("d-none", restrito);
  });

  if (restrito) {
    const collapseChapas = document.getElementById("collapseChapas");
    if (collapseChapas && !collapseChapas.classList.contains("show")) {
      collapseChapas.classList.add("show");
      const button = collapseChapas.previousElementSibling?.querySelector("button");
      if (button) button.classList.remove("collapsed");
    }
  }
}

window.isChapasOnlyUser = isChapasOnlyUser;
window.applyRoutePermissions = applyRoutePermissions;
window.applyMenuPermissions = applyMenuPermissions;