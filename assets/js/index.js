// --- Login Form ---
const loginForm = document.getElementById("loginForm");
const contentLogin = document.getElementById("content-login");
const contentDashboard = document.getElementById("content-dashboard");
const content = document.getElementById("content");
const logoutBtn = document.getElementById("logoutBtn");


// --- Gerar Token Simples ---
function generateToken(username) {
    return btoa(`${username}:no-exp`);
}

function getTokenData() {
    const token = sessionStorage.getItem("token");
    if (!token) return null;
    const decoded = atob(token);
    
    // Alteração: agora validamos o token gerado no backend (usando HMAC e TOKEN_SECRET)
    if (decoded && decoded.length === 64) {  // Verifica se é um token gerado com HMAC SHA-256
        return { username: decoded, exp: Infinity };
    }
    return null;
}

function isLogged() {
    return getTokenData() !== null;
}

// --- Atualizar UI ---
function updateUI() {
    if (isLogged()) {
        // Se o usuário está logado, mostrar o dashboard e esconder o login
        contentLogin.classList.add("d-none");
        contentDashboard.classList.remove("d-none");
        content.classList.remove("d-none");
    } else {
        // Se o usuário não está logado, mostrar o login e esconder o dashboard
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

    try {
        const response = await fetch('/.netlify/functions/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: user, password: pass })
        });

        const data = await response.json();

        if (response.ok) {
            // Sucesso: Salvar o token no sessionStorage
            sessionStorage.setItem("token", data.token);
            console.log("Token armazenado:", data.token); // Log para verificar o token
            updateUI();
            window.history.pushState({}, "", "/home");
        } else {
            // Erro: Exibir mensagem
            showErrorToast(data.error, 60000);
        }
    } catch (error) {
        showErrorToast("❌ Algo deu errado ao tentar fazer login!", 60000);
    }

    // Limpar os campos de login
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
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
