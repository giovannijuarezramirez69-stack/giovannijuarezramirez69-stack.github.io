// =========================================
// ✅ REGISTRO DEL SERVICE WORKER (PWA) - CÓDIGO AÑADIDO
// =========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Asegúrate de que la ruta sea correcta
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => {
                console.log('Service Worker registrado con éxito. Alcance:', reg.scope);
            })
            .catch(err => {
                console.error('Fallo el registro del Service Worker:', err);
            });
    });
}
// =========================================

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm");
    const errorMsg = document.getElementById("login-error");

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const username = document
            .getElementById("username")
            .value.toLowerCase()
            .trim();
        const password = document.getElementById("password").value;

        errorMsg.classList.add("hidden");

        if (username === "admin" && password === "admin") {
            // Guardar sesión y redirigir
            localStorage.setItem('bytecraft_session', 'active');
            window.location.href = "dashboard.html"; 
        } else {
            errorMsg.textContent = "Usuario o contraseña incorrectos.";
            errorMsg.classList.remove("hidden");
        }
    });
});