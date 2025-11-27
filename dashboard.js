// =========================================
// ✅ REGISTRO DEL SERVICE WORKER (PWA)
// =========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Asegúrate de que la ruta sea correcta
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => {
                console.log('Service Worker registrado con éxito. Alcance:', reg.scope);
                // 🌟 NUEVO: Llamar a la solicitud de permiso justo después de registrar el SW.
                requestNotificationPermission(); 
            })
            .catch(err => {
                console.error('Fallo el registro del Service Worker:', err);
            });
    });
}
// =========================================

// ---------------------------------------------
// 🔔 FUNCIONES DE NOTIFICACIÓN DE ESCRITORIO
// ---------------------------------------------

function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.warn("Este navegador no soporta notificaciones de escritorio.");
        return;
    }

    if (Notification.permission === "granted") {
        console.log("Permiso de notificación ya concedido.");
        return;
    }

    if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("Permiso de notificación concedido.");
            } else {
                console.log("Permiso de notificación denegado.");
            }
        });
    }
}

/**
 * Muestra una notificación de escritorio persistente (via Service Worker) o simple.
 * @param {string} title Título de la notificación.
 * @param {string} body Cuerpo del mensaje.
 */
function showDesktopNotification(title, body) {
    if (Notification.permission === "granted") {
        // Usamos el registro del Service Worker para notificaciones persistentes
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
             navigator.serviceWorker.ready.then(registration => {
                // El Service Worker se encarga de mostrarla (utilizando los iconos ya cacheados)
                registration.showNotification(title, {
                    body: body,
                    icon: '192x192.png', 
                    vibrate: [200, 100, 200],
                    tag: 'data-update-' + Date.now(),
                    // La acción por defecto es la que pusimos en service-worker.js (abrir dashboard.html)
                });
            });
        } else {
            // Fallback a notificación simple del navegador (no persistente)
            new Notification(title, { body: body, icon: '192x192.png' });
        }
    }
}


// --- FUNCIONES DE GESTIÓN DE NOTIFICACIONES (Modificada para Push) ---
/**
 * Agrega una notificación a la lista interna y dispara una notificación de escritorio.
 * @param {string} message Mensaje de la notificación.
 * @param {string} title Título de la notificación de escritorio.
 */
function addNotification(message, title = 'ByteCraft Alert') { 
    const newNotification = {
        id: Date.now(),
        message: message,
        read: false,
        timestamp: Date.now()
    };
    localDB.notifications.unshift(newNotification);
    localDB.notifications = localDB.notifications.slice(0, 20); 
    saveDB();
    renderNotifications();
    
    // 🌟 Disparar la Notificación de Escritorio
    showDesktopNotification(title, message);
}
// --- FIN FUNCIONES DE NOTIFICACIONES ---


// =============================================
// 📡 MANEJO DE ESTADO DE CONEXIÓN (OFFLINE MODE)
// =============================================
let isAppOnline = navigator.onLine; // Estado inicial

/**
 * Muestra/Oculta el banner de estado de red y actualiza el estado global.
 */
function updateNetworkStatusUI() {
    isAppOnline = navigator.onLine;
    const banner = document.getElementById('network-status-banner');

    if (!banner) return;

    if (isAppOnline) {
        // 1. Ocultar banner (con mensaje temporal de éxito si estaba visible)
        if (!banner.classList.contains('-translate-y-full')) {
            banner.style.backgroundColor = '#10b981'; // Tailwind: emerald-500
            banner.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Conexión Restablecida';
            // Ocultar después de un breve momento
            setTimeout(() => {
                banner.classList.add('-translate-y-full');
            }, 1000); 
        } else {
             // Si estaba oculto y volvemos a online, simplemente asegurar que esté oculto
             banner.classList.add('-translate-y-full');
        }
    } else {
        // 1. Mostrar banner de alerta "Conectando a la red"
        banner.classList.remove('-translate-y-full');
        banner.style.backgroundColor = '#f59e0b'; // Tailwind: amber-500
        banner.innerHTML = '<i class="fas fa-plug mr-2"></i> Conectando a la red...';
    }
}
// --- FIN FUNCIONES DE UTILIDAD PARA OFFLINE ---


// --- CONFIGURACIÓN & RUTAS ---
const appConfig = {
    default_route: "dashboard",
    routes: {
        dashboard: { title: "Dashboard - ByteCraft", template_id: "template-dashboard" },
        clientes: { title: "Clientes - ByteCraft", template_id: "template-clientes" },
        tareas: { title: "Tareas - ByteCraft", template_id: "template-tareas" },
        colaboradores: { title: "Colaboradores - ByteCraft", template_id: "template-colaboradores" },
        proyectos: { title: "Proyectos - ByteCraft", template_id: "template-proyectos" },
        configuracion: { title: "Configuración - ByteCraft", template_id: "template-configuracion" }
    }
};

// NUEVA CONFIGURACIÓN: Roles de Colaboradores
const COLLABORATOR_ROLES = ["Administrador", "Trabajador", "Desarrollador Senior", "Diseñador UI/UX", "Tester", "Contador"];

// --- BASE DE DATOS LOCAL (Inicialización) ---
const initialDBState = { // Estado inicial para restauración
    tasks: [
        { id: 1, title: 'Revisar servidor principal', status: 'Pendiente', assigneeId: 1, clientId: 1, time_spent: 0, duedate: '2025-12-01', priority: 'Alta', description: 'Revisión mensual de logs y rendimiento.' },
        { id: 2, title: 'Actualizar iconos de la App', status: 'Completada', assigneeId: null, clientId: null, time_spent: 3600000, duedate: '2025-11-20', priority: 'Media', description: 'Cambio de set de iconos según el nuevo branding.' },
        { id: 3, title: 'Reunión de planificación de sprint', status: 'En Curso', assigneeId: 2, clientId: 2, time_spent: 7200000, duedate: '2025-11-28', priority: 'Alta', description: 'Preparar la agenda y documentos.' }
    ],
    clients: [
        { id: 1, name: 'Innovatech Solutions', contact: 'contacto@innovatech.com' },
        { id: 2, name: 'Global Marketing Corp', contact: 'info@globalmkt.net' }
    ],
    projects: [
        { id: 1, name: 'Plataforma e-commerce V2', clientId: 1, duedate: '2026-03-01', status: 'En Curso' },
        { id: 2, name: 'Campaña de lanzamiento Q4', clientId: 2, duedate: '2025-12-15', status: 'Pendiente' }
    ],
    // Colaboradores iniciales con los nuevos roles
    collaborators: [
        { id: 1, name: 'Ana Fernández', role: 'Desarrollador Senior', email: 'ana@bytecraft.com' },
        { id: 2, name: 'Carlos Ruiz', role: 'Diseñador UI/UX', email: 'carlos@bytecraft.com' }
    ],
    notifications: [
        { id: 1, message: 'La tarea "Revisar servidor principal" está próxima a vencer.', read: false, timestamp: Date.now() - 3600000 },
        { id: 2, message: 'Nuevo cliente "SoftStream" añadido.', read: false, timestamp: Date.now() - 7200000 },
        { id: 3, message: 'Proyecto e-commerce V2 actualizado a "En Curso".', read: false, timestamp: Date.now() - 10800000 }
    ],
    deleted_items: [] // Papelera de reciclaje
};

let localDB = JSON.parse(localStorage.getItem('bytecraft_db'));

// Si no hay DB local, usa el estado inicial
if (!localDB) {
    localDB = JSON.parse(JSON.stringify(initialDBState)); // Deep copy
    saveDB();
}

function saveDB() {
    localStorage.setItem('bytecraft_db', JSON.stringify(localDB));
}

// HELPER para generar el HTML de opciones de Rol
function getRoleOptionsHTML(selectedRole = '') {
    return COLLABORATOR_ROLES.map(role => `
        <option value="${role}" ${role === selectedRole ? 'selected' : ''}>${role}</option>
    `).join('');
}

// NUEVOS HELPERS PARA TAREAS
// HELPER para generar el HTML de opciones de Colaborador (Asignado a)
function getCollaboratorOptionsHTML(selectedId = null) {
    let options = '<option value="">Sin Asignar</option>';
    localDB.collaborators.forEach(collab => {
        options += `<option value="${collab.id}" ${collab.id == selectedId ? 'selected' : ''}>${collab.name}</option>`;
    });
    return options;
}

// HELPER para generar el HTML de opciones de Cliente
function getClientOptionsHTML(selectedId = null) {
    let options = '<option value="">Sin Cliente</option>';
    localDB.clients.forEach(client => {
        options += `<option value="${client.id}" ${client.id == selectedId ? 'selected' : ''}>${client.name}</option>`;
    });
    return options;
}


// --- FUNCIÓN DE UTILIDAD: DESCARGAR DATA (Mantenida) ---
function downloadDBData() {
    // 1. Preparamos el objeto a exportar (excluimos notificaciones para que sea una copia de seguridad limpia)
    const exportData = {
        clients: localDB.clients,
        projects: localDB.projects,
        tasks: localDB.tasks,
        collaborators: localDB.collaborators,
        deleted_items: localDB.deleted_items
    };
    
    // 2. Convertimos el objeto a una cadena JSON
    const dataStr = JSON.stringify(exportData, null, 2); 
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    // 3. Creamos un elemento <a> invisible para simular la descarga
    const exportFileDefaultName = `bytecraft_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    
    // 4. Simulamos el clic y removemos el elemento
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    
    // 5. Notificamos
    addNotification('Copia de seguridad de la base de datos descargada con éxito.', '💾 Copia de Seguridad');
}
// --- FIN FUNCIÓN DE UTILIDAD ---


// --- FUNCIONES DE GESTIÓN DE NOTIFICACIONES (Mantenida) ---
// addNotification fue movida y modificada arriba.

function renderNotifications() {
    const notificationList = document.getElementById('notification-list');
    const notificationBadge = document.getElementById('notification-badge');
    const unreadCount = localDB.notifications.filter(n => !n.read).length;

    if (notificationBadge) {
        if (unreadCount > 0) {
            notificationBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            notificationBadge.classList.remove('hidden');
        } else {
            notificationBadge.classList.add('hidden');
        }
    }
    
    if (notificationList) {
        if (localDB.notifications.length === 0) {
            notificationList.innerHTML = '<p class="p-4 text-center text-gray-500">No hay notificaciones.</p>';
        } else {
            notificationList.innerHTML = localDB.notifications.slice(0, 5).map(n => `
                <div class="p-4 ${n.read ? 'bg-white' : 'bg-indigo-50'} hover:bg-gray-50 transition flex justify-between items-start text-sm">
                    <p class="text-gray-700 ${n.read ? '' : 'font-semibold'}">${n.message}</p>
                    <span class="text-xs text-gray-400 ml-2">${timeAgo(n.timestamp)}</span>
                </div>
            `).join('');
            
            // Añadir botón para ver todo (simulado, pero necesario si hay más de 5)
            if (localDB.notifications.length > 5) {
                notificationList.innerHTML += `<div class="p-2 text-center border-t border-gray-100">
                    <button onclick="markAllNotificationsAsRead();" class="text-xs text-indigo-500 hover:text-indigo-700">Marcar todas como leídas</button>
                </div>`;
            } else if (localDB.notifications.length > 0) {
                notificationList.innerHTML += `<div class="p-2 text-center border-t border-gray-100">
                    <button onclick="markAllNotificationsAsRead();" class="text-xs text-indigo-500 hover:text-indigo-700">Marcar todas como leídas</button>
                </div>`;
            }
        }
    }
}

function timeAgo(timestamp) {
    const seconds = Math.floor((new Date() - timestamp) / 1000);
    let interval = seconds / 31536000;

    if (interval > 1) return Math.floor(interval) + " años";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " días";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " horas";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutos";
    return Math.floor(seconds) + " segundos";
}

function markAllNotificationsAsRead() {
    localDB.notifications.forEach(n => n.read = true);
    saveDB();
    renderNotifications();
}

// Event listener para mostrar/ocultar el dropdown
document.getElementById('notification-button')?.addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('notification-dropdown');
    dropdown.classList.toggle('hidden');
});

// Cierra el dropdown si se hace click fuera
window.addEventListener('click', function(e) {
    const dropdown = document.getElementById('notification-dropdown');
    const button = document.getElementById('notification-button');
    if (dropdown && button && !dropdown.contains(e.target) && !button.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});
// --- FIN FUNCIONES DE NOTIFICACIONES ---


// --- PWA (Instalación) (Mantenidas) ---
let deferredPrompt;
const installButton = document.getElementById('install-button');
const desktopNavCards = document.getElementById('desktop-nav-cards');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installButton) {
        installButton.classList.remove('hidden');
    }
});

if (installButton) {
    installButton.addEventListener('click', (e) => {
        installButton.classList.add('hidden');
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('El usuario aceptó la instalación.');
                } else {
                    console.log('El usuario rechazó la instalación.');
                    installButton.classList.remove('hidden');
                }
                deferredPrompt = null;
            });
        }
    });
}

window.addEventListener('appinstalled', (e) => {
    if (installButton) {
        installButton.classList.add('hidden');
    }
});
// -----------------------------


// --- FUNCIONES DE NAVEGACIÓN (Mantenidas) ---
function navigate(page, pushState = true) {
    const route = appConfig.routes[page];
    if (!route) {
        console.error('Ruta no encontrada:', page);
        return;
    }

    // 1. Actualizar URL y Título
    document.title = route.title;
    if (pushState) {
        history.pushState(null, route.title, `#${page}`);
    }

    // 2. Renderizar Contenido
    const content = document.getElementById('app-content');
    const template = document.getElementById(route.template_id);
    if (content && template) {
        content.innerHTML = template.innerHTML;
        // La función de renderizado específica se llama a continuación
        callRenderFunction(page);
    }

    // 3. Actualizar la navegación móvil y de desktop
    updateNavLinks(page);
    
    // 4. Mostrar u ocultar botón de retroceso en móvil
    const backButton = document.getElementById('back-button');
    if (backButton) {
        // En una app PWA de una sola página, el botón de retroceso solo tiene sentido
        // si la ruta actual no es el dashboard.
        if (page !== appConfig.default_route) {
            backButton.style.display = 'flex';
        } else {
            backButton.style.display = 'none';
        }
    }
    
    // 5. Actualizar la variable global de ruta actual
    window.current_route = page;
}

function handleGoBack() {
    window.history.back();
}

function updateNavLinks(activePage) {
    // Para navegación móvil (menú inferior)
    document.querySelectorAll('#mobile-nav .nav-link').forEach(link => {
        if (link.dataset.page === activePage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Para navegación de desktop (títulos)
    const pageTitleElement = document.getElementById('page-title');
    if (pageTitleElement) {
        const titleText = activePage.charAt(0).toUpperCase() + activePage.slice(1);
        pageTitleElement.innerHTML = `<span class="text-gradient">${titleText}</span>`;
    }
}

// Función auxiliar para llamar a la función de renderizado correcta
function callRenderFunction(page) {
    switch (page) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'clientes':
            renderClients();
            break;
        case 'proyectos':
            renderProjects();
            break;
        case 'tareas':
            renderTasks();
            break;
        case 'colaboradores':
            renderCollaborators();
            break;
        case 'configuracion':
            renderConfiguracion();
            break;
        default:
            // Si la ruta no tiene una función de renderizado específica, no hacemos nada.
            break;
    }
}

function logout() {
    localStorage.removeItem('bytecraft_session');
    // Forzar la recarga para limpiar el estado de la PWA
    window.location.href = "login.html"; 
}
// -----------------------------


// --- FUNCIONES DE MODAL (Mantenidas) ---
function openModal(modalId) {
    closeModals(); // Asegura que solo se abre uno
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        // Si el modal es el de añadir colaborador, rellenar el select
        if (modalId === 'modal-collaborator') {
            document.getElementById('collab-role').innerHTML = getRoleOptionsHTML();
        }
    }
}

function closeModals() {
    document.querySelectorAll('.fixed.inset-0').forEach(modal => {
        modal.classList.add('hidden');
    });
}
// -----------------------------


// --- FUNCIONES DE CLIENTES (Actualizadas con Verificación de Conexión) ---

function openAddClientModal() {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE APERTURA DE MODAL
        alert("Modificación deshabilitada. Conéctate a la red para añadir nuevos clientes.");
        return;
    }
    document.getElementById('addClientForm')?.reset();
    openModal('modal-client');
}

function handleAddClient(event) {
    event.preventDefault();
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ENVÍO DE FORMULARIO
        alert("Modificación deshabilitada. Conéctate a la red para añadir nuevos clientes.");
        return;
    }
    const name = document.getElementById('client-name').value.trim();
    const contact = document.getElementById('client-contact').value;
    const newClient = { id: Date.now(), name, contact };
    localDB.clients.push(newClient);
    saveDB();
    renderClients();
    closeModals();
    // 🌟 NOTIFICACIÓN DE ESCRITORIO
    addNotification(`Nuevo Cliente: "${name}" añadido.`, '👥 Nuevo Cliente');
    document.getElementById('addClientForm').reset();
}

function openEditClientModal(clientId) {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE APERTURA DE MODAL
        alert("Modificación deshabilitada. Conéctate a la red para editar clientes.");
        return;
    }
    const client = localDB.clients.find(c => c.id === clientId);
    if (!client) return;
    document.getElementById('edit-client-id').value = client.id;
    document.getElementById('edit-client-name').value = client.name;
    document.getElementById('edit-client-contact').value = client.contact;
    openModal('modal-edit-client');
}

function handleEditClient(event) {
    event.preventDefault();
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ENVÍO DE FORMULARIO
        alert("Modificación deshabilitada. Conéctate a la red para editar clientes.");
        return;
    }
    const id = parseInt(document.getElementById('edit-client-id').value);
    const name = document.getElementById('edit-client-name').value;
    const contact = document.getElementById('edit-client-contact').value;
    const clientIndex = localDB.clients.findIndex(c => c.id === id);
    if (clientIndex !== -1) {
        localDB.clients[clientIndex].name = name;
        localDB.clients[clientIndex].contact = contact;
        saveDB();
        renderClients();
        closeModals();
        // 🌟 NOTIFICACIÓN DE ESCRITORIO
        addNotification(`Cliente: "${name}" actualizado.`, '✏️ Cliente Actualizado');
    }
}

function deleteClient(clientId) {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ACCIÓN
        alert("Modificación deshabilitada. Conéctate a la red para eliminar clientes.");
        return;
    }
    if (confirm('¿Estás seguro de que quieres eliminar este cliente? Se moverá a la papelera.')) {
        const clientIndex = localDB.clients.findIndex(c => c.id === clientId);
        if (clientIndex !== -1) {
            const client = localDB.clients.splice(clientIndex, 1)[0];
            client.deleted_at = Date.now();
            client.type = 'client';
            localDB.deleted_items.unshift(client);
            saveDB();
            renderClients();
            addNotification(`Cliente: "${client.name}" movido a la papelera.`, '🗑️ Eliminado');
        }
    }
}

function renderClients() {
    const list = document.getElementById('clients-list');
    const noClients = document.getElementById('no-clients');

    if (!list) return;

    if (localDB.clients.length === 0) {
        list.innerHTML = '';
        noClients?.classList.remove('hidden');
    } else {
        noClients?.classList.add('hidden');
        list.innerHTML = localDB.clients.map(client => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${client.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">${client.contact}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="openEditClientModal(${client.id})" class="text-indigo-500 hover:text-indigo-700 mr-3" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteClient(${client.id})" class="text-red-500 hover:text-red-700" title="Eliminar">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        // También actualizar la lista de clientes recientes en el dashboard si está activo.
        if (window.current_route === 'dashboard') {
             renderDashboard();
        }
    }
}
// --- FIN FUNCIONES DE CLIENTES ---


// --- FUNCIONES DE PROYECTOS (Actualizadas con Verificación de Conexión) ---

function openAddProjectModal() {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE APERTURA DE MODAL
        alert("Modificación deshabilitada. Conéctate a la red para añadir nuevos proyectos.");
        return;
    }
    document.getElementById('addProjectForm')?.reset();
    // Rellenar select de clientes
    document.getElementById('project-client').innerHTML = getClientOptionsHTML();
    // Establecer la fecha límite por defecto (ej. 1 mes después)
    const defaultDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    document.getElementById('project-duedate').value = defaultDate;
    openModal('modal-project');
}

function handleAddProject(event) {
    event.preventDefault();
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ENVÍO DE FORMULARIO
        alert("Modificación deshabilitada. Conéctate a la red para añadir nuevos proyectos.");
        return;
    }
    const name = document.getElementById('project-name').value.trim();
    const clientId = parseInt(document.getElementById('project-client').value);
    const duedate = document.getElementById('project-duedate').value;
    const status = document.getElementById('project-status').value;
    
    const newProject = { id: Date.now(), name, clientId, duedate, status };
    localDB.projects.push(newProject);
    saveDB();
    renderProjects();
    closeModals();
    addNotification(`Nuevo Proyecto: "${name}" creado.`, '🏗️ Nuevo Proyecto');
    document.getElementById('addProjectForm').reset();
}

function openEditProjectModal(projectId) {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE APERTURA DE MODAL
        alert("Modificación deshabilitada. Conéctate a la red para editar proyectos.");
        return;
    }
    const project = localDB.projects.find(p => p.id === projectId);
    if (!project) return;
    // Rellenar selects del modal de edición
    document.getElementById('edit-project-client').innerHTML = getClientOptionsHTML(project.clientId);
    document.getElementById('edit-project-id').value = project.id;
    document.getElementById('edit-project-name').value = project.name;
    document.getElementById('edit-project-duedate').value = project.duedate;
    document.getElementById('edit-project-status').value = project.status;
    openModal('modal-edit-project');
}

function handleEditProject(event) {
    event.preventDefault();
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ENVÍO DE FORMULARIO
        alert("Modificación deshabilitada. Conéctate a la red para editar proyectos.");
        return;
    }
    const id = parseInt(document.getElementById('edit-project-id').value);
    const name = document.getElementById('edit-project-name').value;
    const clientId = parseInt(document.getElementById('edit-project-client').value);
    const duedate = document.getElementById('edit-project-duedate').value;
    const status = document.getElementById('edit-project-status').value;
    
    const projectIndex = localDB.projects.findIndex(p => p.id === id);
    if (projectIndex !== -1) {
        localDB.projects[projectIndex].name = name;
        localDB.projects[projectIndex].clientId = clientId;
        localDB.projects[projectIndex].duedate = duedate;
        localDB.projects[projectIndex].status = status;
        saveDB();
        renderProjects();
        closeModals();
        addNotification(`Proyecto: "${name}" actualizado.`, '🛠️ Proyecto Editado');
    }
}

function deleteProject(projectId) {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ACCIÓN
        alert("Modificación deshabilitada. Conéctate a la red para eliminar proyectos.");
        return;
    }
    if (confirm('¿Estás seguro de que quieres eliminar este proyecto? Se moverá a la papelera.')) {
        const projectIndex = localDB.projects.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
            const project = localDB.projects.splice(projectIndex, 1)[0];
            project.deleted_at = Date.now();
            project.type = 'project';
            localDB.deleted_items.unshift(project);
            saveDB();
            renderProjects();
            addNotification(`Proyecto: "${project.name}" movido a la papelera.`, '🗑️ Eliminado');
        }
    }
}

function renderProjects() {
    const list = document.getElementById('projects-list');
    const noProjects = document.getElementById('no-projects');

    if (!list) return;

    if (localDB.projects.length === 0) {
        list.innerHTML = '';
        noProjects?.classList.remove('hidden');
    } else {
        noProjects?.classList.add('hidden');
        list.innerHTML = localDB.projects.map(project => {
            const client = localDB.clients.find(c => c.id === project.clientId);
            const clientName = client ? client.name : 'Sin Cliente';
            const statusClass = project.status === 'Completado' ? 'bg-green-100 text-green-800' :
                                project.status === 'En Curso' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800';
            
            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${project.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">${clientName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${project.duedate}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                            ${project.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="openEditProjectModal(${project.id})" class="text-indigo-500 hover:text-indigo-700 mr-3" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteProject(${project.id})" class="text-red-500 hover:text-red-700" title="Eliminar">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}
// --- FIN FUNCIONES DE PROYECTOS ---


// --- FUNCIONES DE TAREAS (Actualizadas con Verificación de Conexión) ---

// NUEVA FUNCIÓN: Abrir Modal de Añadir Tarea
function openAddTaskModal() {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE APERTURA DE MODAL
        alert("Modificación deshabilitada. Conéctate a la red para añadir nuevas tareas.");
        return;
    }
    document.getElementById('addTaskForm')?.reset();
    // Llenar los campos SELECT con los helpers
    document.getElementById('task-assignee-add').innerHTML = getCollaboratorOptionsHTML();
    document.getElementById('task-client-add').innerHTML = getClientOptionsHTML();
    // Establecer la fecha límite por defecto (ej. 7 días después)
    const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    document.getElementById('task-duedate-add').value = defaultDate;
    // Mostrar el modal
    openModal('modal-add-task');
}

// NUEVA FUNCIÓN: Manejar la Adición de Tarea Completa
function handleAddTask(event) {
    event.preventDefault();
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ENVÍO DE FORMULARIO
        alert("Modificación deshabilitada. Conéctate a la red para añadir nuevas tareas.");
        return;
    }
    const title = document.getElementById('task-title-add').value.trim();
    const description = document.getElementById('task-description-add').value.trim();
    const duedate = document.getElementById('task-duedate-add').value;
    const priority = document.getElementById('task-priority-add').value;
    const assigneeId = document.getElementById('task-assignee-add').value ? parseInt(document.getElementById('task-assignee-add').value) : null;
    const clientId = document.getElementById('task-client-add').value ? parseInt(document.getElementById('task-client-add').value) : null;
    const status = document.getElementById('task-status-add').value;

    const newTask = { 
        id: Date.now(), 
        title, 
        description, 
        status, 
        assigneeId, 
        clientId, 
        duedate, 
        priority,
        time_spent: 0 // Nuevo campo para el tiempo total
    };
    
    localDB.tasks.push(newTask);
    saveDB();
    renderTasks();
    closeModals();
    addNotification(`Nueva Tarea: "${title}" (${priority}) asignada.`, '📝 Nueva Tarea');
    document.getElementById('addTaskForm').reset();
}

function openEditTaskModal(taskId) {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE APERTURA DE MODAL
        alert("Modificación deshabilitada. Conéctate a la red para editar tareas.");
        return;
    }
    const task = localDB.tasks.find(t => t.id === taskId);
    if (!task) return;
    // Llenar SELECTS
    document.getElementById('edit-task-assignee').innerHTML = getCollaboratorOptionsHTML(task.assigneeId);
    document.getElementById('edit-task-client').innerHTML = getClientOptionsHTML(task.clientId);

    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-description').value = task.description;
    document.getElementById('edit-task-duedate').value = task.duedate;
    document.getElementById('edit-task-priority').value = task.priority;
    document.getElementById('edit-task-status').value = task.status;
    
    openModal('modal-edit-task');
}

function handleEditTask(event) {
    event.preventDefault();
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ENVÍO DE FORMULARIO
        alert("Modificación deshabilitada. Conéctate a la red para editar tareas.");
        return;
    }
    const id = parseInt(document.getElementById('edit-task-id').value);
    const title = document.getElementById('edit-task-title').value.trim();
    const description = document.getElementById('edit-task-description').value.trim();
    const duedate = document.getElementById('edit-task-duedate').value;
    const priority = document.getElementById('edit-task-priority').value;
    const assigneeId = document.getElementById('edit-task-assignee').value ? parseInt(document.getElementById('edit-task-assignee').value) : null;
    const clientId = document.getElementById('edit-task-client').value ? parseInt(document.getElementById('edit-task-client').value) : null;
    const status = document.getElementById('edit-task-status').value;
    
    const taskIndex = localDB.tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
        localDB.tasks[taskIndex].title = title;
        localDB.tasks[taskIndex].description = description;
        localDB.tasks[taskIndex].duedate = duedate;
        localDB.tasks[taskIndex].priority = priority;
        localDB.tasks[taskIndex].assigneeId = assigneeId;
        localDB.tasks[taskIndex].clientId = clientId;
        localDB.tasks[taskIndex].status = status;
        saveDB();
        renderTasks();
        closeModals();
        addNotification(`Tarea: "${title}" actualizada.`, '✏️ Tarea Editada');
    }
}

function deleteTask(taskId) {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ACCIÓN
        alert("Modificación deshabilitada. Conéctate a la red para eliminar tareas.");
        return;
    }
    if (confirm('¿Estás seguro de que quieres eliminar esta tarea? Se moverá a la papelera.')) {
        const taskIndex = localDB.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            const task = localDB.tasks.splice(taskIndex, 1)[0];
            task.deleted_at = Date.now();
            task.type = 'task';
            localDB.deleted_items.unshift(task);
            saveDB();
            renderTasks();
            addNotification(`Tarea: "${task.title}" movida a la papelera.`, '🗑️ Eliminado');
        }
    }
}

// NUEVA FUNCIÓN: Toggle status de tarea (para el botón en la lista)
function toggleTaskStatus(taskId) {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ACCIÓN
        alert("Modificación deshabilitada. Conéctate a la red para cambiar el estado de las tareas.");
        return;
    }
    const taskIndex = localDB.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        const currentStatus = localDB.tasks[taskIndex].status;
        const newStatus = currentStatus === 'Completada' ? 'Pendiente' : 'Completada';
        localDB.tasks[taskIndex].status = newStatus;
        saveDB();
        renderTasks();
        addNotification(`Estado de Tarea: "${localDB.tasks[taskIndex].title}" cambiado a ${newStatus}.`, '🔄 Tarea Actualizada');
    }
}

function renderTasks() {
    const list = document.getElementById('tasks-list');
    const noTasks = document.getElementById('no-tasks');
    const filterStatus = document.getElementById('task-filter-status')?.value || 'All';
    
    if (!list) return;

    // Filtrar tareas (excluir completadas si el filtro es "Pendiente", que es el default)
    const filteredTasks = localDB.tasks.filter(t => 
        filterStatus === 'All' || t.status === filterStatus
    );

    if (filteredTasks.length === 0) {
        list.innerHTML = '';
        noTasks?.classList.remove('hidden');
    } else {
        noTasks?.classList.add('hidden');
        list.innerHTML = filteredTasks.map(task => {
            const assignee = task.assigneeId ? localDB.collaborators.find(c => c.id === task.assigneeId)?.name : 'Sin Asignar';
            const client = task.clientId ? localDB.clients.find(c => c.id === task.clientId)?.name : 'Sin Cliente';
            const priorityClass = task.priority === 'Alta' || task.priority === 'Urgente' ? 'bg-red-500' : 
                                  task.priority === 'Media' ? 'bg-yellow-500' : 'bg-green-500';
            const statusClass = task.status === 'Completada' ? 'border-green-400' : 
                                task.status === 'En Curso' ? 'border-blue-400' : 'border-yellow-400';
            const statusIcon = task.status === 'Completada' ? 'fa-check-circle' : 'fa-hourglass-half';
            
            return `
                <div class="task-item bg-white p-5 rounded-xl shadow-lg border-l-4 ${statusClass} flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start mb-2">
                            <h4 class="text-lg font-bold text-gray-800">${task.title}</h4>
                            <span class="${priorityClass} text-white px-2 py-0.5 rounded text-xs font-semibold">${task.priority}</span>
                        </div>
                        <p class="text-sm text-gray-600 mb-3">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-gray-100 space-y-2">
                        <div class="flex items-center text-xs text-gray-500">
                            <i class="fas ${statusIcon} mr-2 w-4"></i> Estado: <span class="font-medium ml-1">${task.status}</span>
                        </div>
                        <div class="flex items-center text-xs text-gray-500">
                            <i class="fas fa-calendar-alt mr-2 w-4"></i> Límite: <span class="font-medium ml-1">${task.duedate}</span>
                        </div>
                        <div class="flex items-center text-xs text-gray-500">
                            <i class="fas fa-user-tag mr-2 w-4"></i> Asignado: <span class="font-medium ml-1">${assignee}</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mt-4">
                        <button onclick="toggleTaskStatus(${task.id})" class="px-3 py-1 text-xs ${task.status === 'Completada' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-500 text-white hover:bg-green-600'} rounded-full transition">
                            <i class="fas ${task.status === 'Completada' ? 'fa-undo-alt' : 'fa-check'} mr-1"></i> ${task.status === 'Completada' ? 'Marcar Pendiente' : 'Completar'}
                        </button>
                        <div class="space-x-2">
                            <button onclick="openEditTaskModal(${task.id})" class="text-indigo-500 hover:text-indigo-700" title="Editar Tarea">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteTask(${task.id})" class="text-red-500 hover:text-red-700" title="Eliminar Tarea">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    // Listener de filtro
    document.getElementById('task-filter-status')?.addEventListener('change', renderTasks);
    // Para actualizar el dashboard
    if (window.current_route === 'dashboard') {
         renderDashboard();
    }
}
// --- FIN FUNCIONES DE TAREAS ---


// --- FUNCIONES DE COLABORADORES (Actualizadas con Verificación de Conexión) ---

// NUEVA FUNCIÓN: Abrir Modal de Añadir Colaborador
function openAddCollaboratorModal() {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE APERTURA DE MODAL
        alert("Modificación deshabilitada. Conéctate a la red para añadir nuevos colaboradores.");
        return;
    }
    document.getElementById('addCollaboratorForm')?.reset();
    // Rellenar el SELECT de roles (reutilizando el helper)
    document.getElementById('collab-role').innerHTML = getRoleOptionsHTML();
    openModal('modal-collaborator');
}

// NUEVA FUNCIÓN: Manejar la Adición de Colaborador
function handleAddCollaborator(event) {
    event.preventDefault();
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ENVÍO DE FORMULARIO
        alert("Modificación deshabilitada. Conéctate a la red para añadir nuevos colaboradores.");
        return;
    }
    const name = document.getElementById('collab-name').value.trim();
    const email = document.getElementById('collab-email').value.trim();
    const role = document.getElementById('collab-role').value;

    const newCollab = { id: Date.now(), name, email, role };
    localDB.collaborators.push(newCollab);
    saveDB();
    renderCollaborators();
    closeModals();
    addNotification(`Nuevo Colaborador: "${name}" (${role}) añadido.`, '🤝 Nuevo Miembro');
    document.getElementById('addCollaboratorForm').reset();
}

// NUEVA FUNCIÓN: Abrir Modal de Edición de Colaborador
function openEditCollaboratorModal(collaboratorId) {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE APERTURA DE MODAL
        alert("Modificación deshabilitada. Conéctate a la red para editar colaboradores.");
        return;
    }
    const collab = localDB.collaborators.find(c => c.id === collaboratorId);
    if (!collab) return;
    document.getElementById('edit-collab-id').value = collab.id;
    document.getElementById('edit-collab-name').value = collab.name;
    document.getElementById('edit-collab-email').value = collab.email;
    // Llenar el SELECT de roles (reutilizando el helper)
    document.getElementById('edit-collab-role').innerHTML = getRoleOptionsHTML(collab.role);
    openModal('modal-edit-collaborator');
}

// NUEVA FUNCIÓN: Manejar la Edición de Colaborador
function handleEditCollaborator(event) {
    event.preventDefault();
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ENVÍO DE FORMULARIO
        alert("Modificación deshabilitada. Conéctate a la red para editar colaboradores.");
        return;
    }
    const id = parseInt(document.getElementById('edit-collab-id').value);
    const name = document.getElementById('edit-collab-name').value;
    const email = document.getElementById('edit-collab-email').value;
    const role = document.getElementById('edit-collab-role').value;

    const collabIndex = localDB.collaborators.findIndex(c => c.id === id);
    if (collabIndex !== -1) {
        localDB.collaborators[collabIndex].name = name;
        localDB.collaborators[collabIndex].email = email;
        localDB.collaborators[collabIndex].role = role;
        saveDB();
        renderCollaborators();
        closeModals();
        addNotification(`Colaborador: "${name}" actualizado.`, '✏️ Miembro Editado');
        // También necesitamos re-renderizar las tareas para actualizar los nombres de los asignados
        if (window.current_route === 'tareas') renderTasks();
    }
}

function deleteCollaborator(collaboratorId) {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ACCIÓN
        alert("Modificación deshabilitada. Conéctate a la red para eliminar colaboradores.");
        return;
    }
    if (confirm('¿Estás seguro de que quieres eliminar a este colaborador? Se moverá a la papelera.')) {
        const collabIndex = localDB.collaborators.findIndex(c => c.id === collaboratorId);
        if (collabIndex !== -1) {
            const collab = localDB.collaborators.splice(collabIndex, 1)[0];
            collab.deleted_at = Date.now();
            collab.type = 'collaborator';
            localDB.deleted_items.unshift(collab);
            saveDB();
            renderCollaborators();
            addNotification(`Colaborador: "${collab.name}" movido a la papelera.`, '🗑️ Eliminado');
            // Quitar el asignado de las tareas si lo tenía
            localDB.tasks.forEach(task => {
                if (task.assigneeId === collab.id) {
                    task.assigneeId = null;
                }
            });
            saveDB();
            // Re-renderizar tareas si estamos en esa vista.
            if (window.current_route === 'tareas') renderTasks();
        }
    }
}

function renderCollaborators() {
    const list = document.getElementById('collaborators-list');
    const noCollaborators = document.getElementById('no-collaborators');

    if (!list) return;

    if (localDB.collaborators.length === 0) {
        list.innerHTML = '';
        noCollaborators?.classList.remove('hidden');
    } else {
        noCollaborators?.classList.add('hidden');
        list.innerHTML = localDB.collaborators.map(collab => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${collab.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${collab.email}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${collab.role}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="openEditCollaboratorModal(${collab.id})" class="text-indigo-500 hover:text-indigo-700 mr-3" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteCollaborator(${collab.id})" class="text-red-500 hover:text-red-700" title="Eliminar">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}
// --- FIN FUNCIONES DE COLABORADORES ---


// --- FUNCIONES DE CONFIGURACIÓN (Mantenidas) ---
function handleImportDB(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.clients && importedData.projects && importedData.tasks) {
                // Sobrescribir la base de datos local
                localDB.clients = importedData.clients || [];
                localDB.projects = importedData.projects || [];
                localDB.tasks = importedData.tasks || [];
                localDB.collaborators = importedData.collaborators || [];
                localDB.deleted_items = importedData.deleted_items || [];
                // Mantener notificaciones existentes, si las hay, o resetear.
                localDB.notifications = localDB.notifications || initialDBState.notifications; 
                saveDB();
                document.getElementById('import-status').textContent = '✅ Datos importados y guardados con éxito. Recargando en 3s...';
                addNotification('Base de datos restaurada desde un archivo de copia de seguridad.', '💾 Restauración Exitosa');
                
                // Recargar la página para limpiar el estado y renderizar todo.
                setTimeout(() => window.location.reload(), 3000);
            } else {
                document.getElementById('import-status').textContent = '❌ Error: El archivo JSON no tiene la estructura de ByteCraft (clientes, proyectos, tareas...).';
            }
        } catch (error) {
            document.getElementById('import-status').textContent = '❌ Error al procesar el archivo: ' + error.message;
        }
        event.target.value = ''; // Limpiar el input file
    };
    reader.onerror = function() {
        document.getElementById('import-status').textContent = '❌ Error al leer el archivo.';
    };
    reader.readAsText(file);
}

function restoreInitialDB() {
    if (confirm('ADVERTENCIA: ¿Estás seguro de que quieres ELIMINAR TODOS TUS DATOS y restaurar la base de datos a su estado inicial de fábrica? Esta acción es irreversible.')) {
        localStorage.removeItem('bytecraft_db');
        addNotification('Restauración de la base de datos completada.', '🗑️ Datos Eliminados');
        window.location.reload(); 
    }
}

function renderConfiguracion() {
    const deletedList = document.getElementById('deleted-items-list');
    const noDeletedItems = document.getElementById('no-deleted-items');
    
    if (!deletedList) return;

    if (localDB.deleted_items.length === 0) {
        deletedList.innerHTML = '';
        noDeletedItems?.classList.remove('hidden');
    } else {
        noDeletedItems?.classList.add('hidden');
        deletedList.innerHTML = localDB.deleted_items.map(item => {
            const date = new Date(item.deleted_at).toLocaleString();
            let icon, color, nameField;
            
            switch(item.type) {
                case 'client':
                    icon = 'fa-user-times';
                    color = 'text-teal-500';
                    nameField = item.name;
                    break;
                case 'project':
                    icon = 'fa-project-diagram';
                    color = 'text-purple-500';
                    nameField = item.name;
                    break;
                case 'task':
                    icon = 'fa-tasks';
                    color = 'text-yellow-500';
                    nameField = item.title;
                    break;
                case 'collaborator':
                    icon = 'fa-user-times';
                    color = 'text-blue-500';
                    nameField = item.name;
                    break;
                default:
                    icon = 'fa-trash-alt';
                    color = 'text-gray-500';
                    nameField = 'Elemento Desconocido';
            }
            
            return `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div class="flex items-center">
                        <i class="fas ${icon} ${color} mr-3"></i>
                        <div>
                            <p class="text-sm font-medium text-gray-800">${nameField} <span class="text-xs font-normal text-gray-500">(${item.type})</span></p>
                            <p class="text-xs text-gray-400">Eliminado: ${date}</p>
                        </div>
                    </div>
                    <div class="space-x-2">
                        <button onclick="restoreItem(${item.id}, '${item.type}')" class="text-green-500 hover:text-green-700" title="Restaurar">
                            <i class="fas fa-trash-restore-alt"></i>
                        </button>
                        <button onclick="deleteItemPermanently(${item.id})" class="text-red-500 hover:text-red-700" title="Eliminar Permanentemente">
                            <i class="fas fa-times-circle"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function restoreItem(id, type) {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ACCIÓN
        alert("Modificación deshabilitada. Conéctate a la red para restaurar elementos.");
        return;
    }
    const itemIndex = localDB.deleted_items.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
        const item = localDB.deleted_items.splice(itemIndex, 1)[0];
        // Quitar el campo de eliminación y restaurar
        delete item.deleted_at;
        delete item.type;

        switch (type) {
            case 'client':
                localDB.clients.push(item);
                break;
            case 'project':
                localDB.projects.push(item);
                break;
            case 'task':
                localDB.tasks.push(item);
                break;
            case 'collaborator':
                localDB.collaborators.push(item);
                break;
        }

        saveDB();
        renderConfiguracion(); // Re-renderizar la papelera
        addNotification(`Elemento restaurado: ${item.name || item.title}.`, '✅ Restaurado');
        // Si el usuario está en otra vista que usa estos datos, se actualizará al navegar.
    }
}

function deleteItemPermanently(id) {
    if (!isAppOnline) { // 🛑 NUEVA VERIFICACIÓN DE ACCIÓN
        alert("Modificación deshabilitada. Conéctate a la red para eliminar elementos permanentemente.");
        return;
    }
    if (confirm('Esta acción eliminará el elemento permanentemente. ¿Estás seguro?')) {
        const itemIndex = localDB.deleted_items.findIndex(item => item.id === id);
        if (itemIndex !== -1) {
            const item = localDB.deleted_items.splice(itemIndex, 1)[0];
            saveDB();
            renderConfiguracion();
            addNotification(`Eliminado permanentemente el elemento ID: ${id}.`, '🔥 Permanente');
        }
    }
}
// --- FIN FUNCIONES DE CONFIGURACIÓN ---


// --- FUNCIONES DEL DASHBOARD (Mantenidas) ---
function renderDashboard() {
    const statsContainer = document.getElementById('dashboard-stats');
    const priorityTasksList = document.getElementById('priority-tasks');
    const noPriorityTasks = document.getElementById('no-priority-tasks');
    const recentClientsList = document.getElementById('recent-clients');
    const noRecentClients = document.getElementById('no-recent-clients');

    if (!statsContainer) return;
    
    // 1. CÁLCULO DE ESTADÍSTICAS
    const totalTasks = localDB.tasks.length;
    const pendingTasks = localDB.tasks.filter(t => t.status !== 'Completada').length;
    const totalClients = localDB.clients.length;
    const totalProjects = localDB.projects.length;

    // Función para crear la tarjeta de estadística
    const createStatCard = (icon, color, title, value) => `
        <div class="bg-white p-5 rounded-xl shadow-lg border-l-4 border-${color}-500 flex items-center justify-between">
            <div>
                <p class="text-sm font-medium text-gray-500">${title}</p>
                <p class="text-3xl font-bold text-gray-900">${value}</p>
            </div>
            <i class="fas ${icon} text-4xl text-${color}-400 opacity-50"></i>
        </div>
    `;

    statsContainer.innerHTML = [
        createStatCard('fa-tasks', 'yellow', 'Tareas Pendientes', pendingTasks),
        createStatCard('fa-check-circle', 'green', 'Tareas Totales', totalTasks),
        createStatCard('fa-users', 'teal', 'Total Clientes', totalClients),
        createStatCard('fa-project-diagram', 'purple', 'Total Proyectos', totalProjects)
    ].join('');
    
    // 2. TAREAS DE ALTA PRIORIDAD
    const highPriorityTasks = localDB.tasks
        .filter(t => t.priority === 'Alta' || t.priority === 'Urgente')
        .filter(t => t.status !== 'Completada')
        .sort((a, b) => new Date(a.duedate) - new Date(b.duedate));

    if (highPriorityTasks.length > 0) {
        priorityTasksList.innerHTML = highPriorityTasks.slice(0, 5).map(task => {
            const priorityClass = task.priority === 'Urgente' ? 'bg-red-500' : 'bg-red-300';
            return `
                <li class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border-l-4 border-red-500">
                    <span class="text-sm font-medium text-gray-700">${task.title}</span>
                    <div class="flex items-center space-x-3">
                         <span class="text-xs text-gray-500">Límite: ${task.duedate}</span>
                         <span class="${priorityClass} text-white px-2 py-0.5 rounded text-xs font-semibold">${task.priority}</span>
                         <button onclick="toggleTaskStatus(${task.id})" class="text-green-500 hover:text-green-700" title="Completar">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </li>
            `;
        }).join('');
        noPriorityTasks?.classList.add('hidden');
    } else {
        priorityTasksList.innerHTML = '';
        noPriorityTasks?.classList.remove('hidden');
    }
    
    // 3. CLIENTES RECIENTES
    const recentClients = [...localDB.clients] // Clonar para no modificar el original
        .sort((a, b) => b.id - a.id) // Ordenar por ID descendente (más recientes primero)
        .slice(0, 5);
        
    if (recentClients.length > 0) {
        recentClientsList.innerHTML = recentClients.map(client => `
             <li class="flex items-center bg-gray-50 p-3 rounded-lg">
                <i class="fas fa-user-circle text-xl text-teal-500 mr-3"></i>
                <div>
                    <p class="text-sm font-medium text-gray-700">${client.name}</p>
                    <p class="text-xs text-gray-400">${client.contact}</p>
                </div>
            </li>
        `).join('');
        noRecentClients?.classList.add('hidden');
    } else {
        recentClientsList.innerHTML = '';
        noRecentClients?.classList.remove('hidden');
    }
}
// --- FIN FUNCIONES DEL DASHBOARD ---


document.addEventListener("DOMContentLoaded", function () {
    // 1. Manejo de Navegación por Hash y carga inicial
    
    // 🌟 INICIALIZAR EL ESTADO DE CONEXIÓN Y EVENT LISTENERS (NUEVO)
    updateNetworkStatusUI();
    window.addEventListener('online', updateNetworkStatusUI);
    window.addEventListener('offline', updateNetworkStatusUI);
    
    // El resto del código se ejecuta con el estado de red inicial
    const initialHash = window.location.hash.substring(1);
    const current_route = appConfig.routes[initialHash] ? initialHash : appConfig.default_route;
    // Establecer la ruta actual como global para que `updateNetworkStatusUI` pueda re-renderizar
    window.current_route = current_route; 
    navigate(current_route, false); // No empujar estado al cargar

    // 2. Listener para la navegación de desktop/cards
    document.querySelectorAll('.dashboard-card').forEach(card => {
        card.addEventListener('click', function() {
            navigate(this.dataset.page);
        });
    });

    // 3. Renderizar notificaciones
    renderNotifications();

    // 4. Listeners para Formularios (solo para que no fallen las referencias)
    document.getElementById('addClientForm')?.addEventListener('submit', handleAddClient); 
    document.getElementById('editClientForm')?.addEventListener('submit', handleEditClient);
    document.getElementById('addProjectForm')?.addEventListener('submit', handleAddProject); 
    document.getElementById('editProjectForm')?.addEventListener('submit', handleEditProject);
    document.getElementById('addCollaboratorForm')?.addEventListener('submit', handleAddCollaborator);
    document.getElementById('editCollaboratorForm')?.addEventListener('submit', handleEditCollaborator);
    document.getElementById('addTaskForm')?.addEventListener('submit', handleAddTask);
    document.getElementById('editTaskForm')?.addEventListener('submit', handleEditTask);
});

window.addEventListener('popstate', () => {
    const hash = window.location.hash.substring(1);
    const page = appConfig.routes[hash] ? hash : appConfig.default_route;
    navigate(page, false); // No empujar estado de nuevo al navegar con back/forward
});