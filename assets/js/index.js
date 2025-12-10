// --- Login Form ---
const loginForm = document.getElementById("loginForm");
const contentLogin = document.getElementById("content-login");
const contentDashboard = document.getElementById("content-dashboard");
const content = document.getElementById("content");
const logoutBtn = document.getElementById("logoutBtn");

const STORED_USER_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"; // admin
const STORED_PASS_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"; // 1234

// --- Função SHA256 ---
async function sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// --- Gerar Token Simples ---
function generateToken(username) {
    return btoa(`${username}:no-exp`);
}

function getTokenData() {
    const token = sessionStorage.getItem("token");
    if (!token) return null;
    const decoded = atob(token);
    if (decoded.endsWith(":no-exp")) return { username: decoded.split(":")[0], exp: Infinity };
    return null;
}


function isLogged() {
    return getTokenData() !== null;
}

// --- Atualizar UI ---
function updateUI() {
    if (isLogged()) {
        contentLogin.classList.add("d-none");
        contentDashboard.classList.remove("d-none");
        content.classList.remove("d-none");
    } else {
        contentLogin.classList.remove("d-none");
        contentDashboard.classList.add("d-none");
        content.classList.add("d-none");
    }
}

// --- Toast de erro ---
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

    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

// --- Fechar todos os toasts ---
function closeAllErrorToasts() {
    const errorToasts = document.querySelectorAll(".toast-error");
    errorToasts.forEach(el => {
        const toastInstance = bootstrap.Toast.getInstance(el);
        if (toastInstance) toastInstance.hide();
        else el.remove();
    });
}

// --- Submit login ---
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value;

    const userHash = await sha256(user);
    const passHash = await sha256(pass);

    if (userHash === STORED_USER_HASH && passHash === STORED_PASS_HASH) {
    closeAllErrorToasts();
    const token = generateToken(user);
    sessionStorage.setItem("token", token);
    
    // ✅ Limpar os inputs após login bem-sucedido
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";

    updateUI(); 
    window.history.pushState({}, "", "/home");
    if (typeof locationHandler === "function") locationHandler();
} else {
    showErrorToast("❌ Utilizador ou senha inválidos!", 60000);
}

});

// --- Logout ---
logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("token");
    updateUI();
    window.history.pushState({}, "", "/");
    if (typeof locationHandler === "function") locationHandler();
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

// --- Inicializa ---
updateUI();

window.onload = () => {
    document.getElementById("content-login").classList.remove("preload-hidden");
};
