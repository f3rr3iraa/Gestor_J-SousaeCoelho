// --- Login Form ---
const loginForm = document.getElementById("loginForm");
const contentLogin = document.getElementById("content-login");
const contentDashboard = document.getElementById("content-dashboard");
const content = document.getElementById("content");
const logoutBtn = document.getElementById("logoutBtn");

const LOGIN_USER = "admin";
const LOGIN_PASS = "1234";



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
// --- Submit login ---
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Evita o comportamento padrão do formulário (recarregar a página)

    const user = document.getElementById("username").value.trim(); // Pega o nome de usuário
    const pass = document.getElementById("password").value; // Pega a senha

    // Faz a requisição POST para o endpoint do Netlify Functions
    try {
        const response = await fetch('/.netlify/functions/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: user, password: pass }) // Envia o corpo com as credenciais
        });

        const data = await response.json(); // Converte a resposta para JSON

        if (response.ok) {
            // ✅ Login bem-sucedido
            closeAllErrorToasts(); // Fecha qualquer mensagem de erro
            sessionStorage.setItem("token", data.token); // Armazena o token no sessionStorage

            // Limpar os inputs após login bem-sucedido
            document.getElementById("username").value = "";
            document.getElementById("password").value = "";

            updateUI(); // Atualiza a UI com o novo estado (usuário logado)
            window.history.pushState({}, "", "/home"); // Muda a URL para /home
            if (typeof locationHandler === "function") locationHandler(); // Chama a função de localização, se existir
        } else {
            // ❌ Credenciais inválidas
            showErrorToast(data.message || "❌ Ocorreu um erro no servidor", 60000);
        }
    } catch (error) {
        console.error('Erro no login:', error); // Exibe erros no console
        showErrorToast("❌ Ocorreu um erro inesperado!", 60000); // Exibe mensagem de erro
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
