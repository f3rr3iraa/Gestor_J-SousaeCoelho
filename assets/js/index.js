// --- Login Form ---
const loginForm = document.getElementById("loginForm");
const contentLogin = document.getElementById("content-login");
const contentDashboard = document.getElementById("content-dashboard");
const content = document.getElementById("content");
const logoutBtn = document.getElementById("logoutBtn");




// --- Sessão via Supabase Auth ---
let currentSession = null;

function isLogged() {
    return currentSession !== null;
}

async function initAuth() {
    const supabase = await initSupabaseClient();

    const { data: { session } } = await supabase.auth.getSession();
    currentSession = session;
    updateUI();
    if (typeof window.locationHandler === "function") {
        window.locationHandler();
    }

        supabase.auth.onAuthStateChange((event, session) => {
        currentSession = session;
        updateUI();

        // Só recarrega a rota atual quando o estado de autenticação
        // realmente muda (login/logout). Eventos como TOKEN_REFRESHED ou
        // USER_UPDATED disparam sozinhos quando se volta a dar foco à
        // aba (ex: minimizar e voltar) e não devem recarregar a página
        // atual, para não perder o que estava a ser preenchido/desenhado.
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;

        if (typeof window.locationHandler === "function") {
            window.locationHandler();
        }
    });
}

// --- Atualizar UI ---
function updateUI() {
    if (isLogged()) {
        contentLogin.classList.add("d-none");
        contentDashboard.classList.remove("d-none");
        content.classList.remove("d-none");

        const displayName = currentSession.user.user_metadata?.display_name || currentSession.user.email;
        document.getElementById("userDisplayName").textContent = displayName;
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
        const supabase = await initSupabaseClient();
        const { error } = await supabase.auth.signInWithPassword({
            email: user,
            password: pass
        });

        if (!error) {
            closeAllErrorToasts();
            document.getElementById("username").value = "";
            document.getElementById("password").value = "";

            window.history.pushState({}, "", "/home");
            if (typeof locationHandler === "function") locationHandler();
        } else {
            showErrorToast(error.message || "❌ Ocorreu um erro no servidor", 60000);
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showErrorToast("❌ Ocorreu um erro inesperado!", 60000);
    }
});



// --- Logout ---
logoutBtn.addEventListener("click", async () => {
    const supabase = await initSupabaseClient();
    await supabase.auth.signOut();
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
initAuth();

window.onload = () => {
    document.getElementById("content-login").classList.remove("preload-hidden");
};


document.addEventListener("wheel", function(e) {
  if (document.activeElement.type === "number") {
    document.activeElement.blur();
  }
}, { passive: false });