// --- Login Form ---
const loginForm = document.getElementById("loginForm");
const contentLogin = document.getElementById("content-login");
const contentDashboard = document.getElementById("content-dashboard");
const content = document.getElementById("content");
const logoutBtn = document.getElementById("logoutBtn");

// Atualiza a interface conforme o estado de login
function updateUI() {
  const logged = sessionStorage.getItem("logged") === "true";

  if (logged) {
    contentLogin.classList.add("d-none");
    contentDashboard.classList.remove("d-none");
    content.classList.remove("d-none");
  } else {
    contentLogin.classList.remove("d-none");
    contentDashboard.classList.add("d-none");
    content.classList.add("d-none");
  }
}

// --- Toast de Erro ---
function showErrorToast(messageText, duration = 60000) {
  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center text-bg-danger border-0 position-fixed bottom-0 end-0 m-3 toast-error`;
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${messageText}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  document.body.appendChild(toastEl);

  const toast = new bootstrap.Toast(toastEl, { delay: duration });
  toast.show();

  toastEl.addEventListener("hidden.bs.toast", () => {
    toastEl.remove();
  });
}

// Fecha todos os toasts
function closeAllErrorToasts() {
  document.querySelectorAll(".toast-error").forEach(el => {
    const toastInstance = bootstrap.Toast.getInstance(el);
    if (toastInstance) toastInstance.hide();
    else el.remove();
  });
}

// --- LOGIN SUPABASE ---
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showErrorToast("❌ Utilizador ou senha inválidos!", 60000);
    return;
  }

  closeAllErrorToasts();

  sessionStorage.setItem("logged", "true");
  updateUI();
  window.history.pushState({}, "", "/home");

  if (typeof locationHandler === "function") locationHandler();
});

// --- LOGOUT SUPABASE ---
logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  sessionStorage.removeItem("logged");
  updateUI();
  window.history.pushState({}, "", "/");

  if (typeof locationHandler === "function") locationHandler();
});

// Sidebar active highlight
function setActive(element) {
  document.querySelectorAll('#menu .nav-link').forEach(link => {
    link.classList.remove('active');
    link.classList.add('text-white');
  });

  element.classList.add('active');
  element.classList.remove('text-white');
}

// --- LISTENER DE SESSÃO DO SUPABASE ---
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (session) {
    sessionStorage.setItem("logged", "true");
  } else {
    sessionStorage.removeItem("logged");
  }

  updateUI();
});

// Atualiza a UI no arranque
updateUI();
