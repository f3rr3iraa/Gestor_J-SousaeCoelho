const loginForm = document.getElementById("loginForm");
const contentLogin = document.getElementById("content-login");
const contentDashboard = document.getElementById("content-dashboard");
const logoutBtn = document.getElementById("logoutBtn");

// --- Check login ---
function isLogged() {
  return sessionStorage.getItem("token") === "logged";
}

// --- Atualizar UI ---
function updateUI() {
  if (isLogged()) {
    contentLogin.classList.add("d-none");
    contentDashboard.classList.remove("d-none");
  } else {
    contentLogin.classList.remove("d-none");
    contentDashboard.classList.add("d-none");
  }
}

// --- Toast ---
function showErrorToast(msg, duration = 6000) {
  const toastEl = document.createElement("div");
  toastEl.className = "toast align-items-center text-bg-danger border-0 position-fixed bottom-0 end-0 m-3";
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  document.body.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: duration });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

// --- Login submit ---
loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value;

  try {
    const res = await fetch("/.netlify/functions/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass })
    });

    if (!res.ok) {
      showErrorToast("❌ Utilizador ou senha inválidos!");
      return;
    }

    sessionStorage.setItem("token", "logged");
    updateUI();
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
  } catch (err) {
    showErrorToast("Erro ao ligar ao servidor");
    console.error(err);
  }
});

// --- Logout ---
logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("token");
  updateUI();
});


// --- Ativar menu ---
function setActive(element) {
    document.querySelectorAll('#menu .nav-link').forEach(link => {
        link.classList.remove('active');
        link.classList.add('text-white'); 
    });
    element.classList.add('active');
    element.classList.remove('text-white'); 
}

const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

// Toggle do mostrar/ocultar password
togglePassword.addEventListener("click", function () {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        togglePassword.classList.replace("bi-eye-slash", "bi-eye");
    } else {
        passwordInput.type = "password";
        togglePassword.classList.replace("bi-eye", "bi-eye-slash");
    }
});

// Muda a cor do ícone consoante o foco e se há texto
function updateIconColor() {
    if (passwordInput === document.activeElement || passwordInput.value !== "") {
        togglePassword.classList.add("active");
    } else {
        togglePassword.classList.remove("active");
    }
}

passwordInput.addEventListener("focus", updateIconColor);
passwordInput.addEventListener("blur", updateIconColor);
passwordInput.addEventListener("input", updateIconColor);

// Inicializar estado ao carregar
updateIconColor();



// --- Inicializa ---
updateUI();

window.onload = () => {
    document.getElementById("content-login").classList.remove("preload-hidden");
};
