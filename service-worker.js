// Nombre del caché (¡Cambiado para forzar la actualización!)
const CACHE_NAME = "v2-bytecraft-stable-cache"; 

// Archivos a almacenar para modo offline. 
// Usando rutas relativas "./" para mayor compatibilidad con hosting local.
const FILES_TO_CACHE = [
  "./", // Raíz (normalmente resuelve a login.html o index.html)
  "./offline.html", 
  "./login.html",
  "./login.css",
  "./login.js",
  "./dashboard.html",
  "./dashboard.css",
  "./dashboard.js",
  "./manifest.json",
  "./72x72.png", // Reincorporados
  "./96x96.png",
  "./128x128.png",
  "./192x192.png",
  "./512x512.png"
];

// Instalar SW y guardar archivos
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Intentando cachear los archivos de la lista.");
      // El error de "Failed to fetch" ocurre aquí si cualquier archivo no se encuentra.
      return cache.addAll(FILES_TO_CACHE).catch(err => {
        // En caso de error, mostramos qué archivo pudo haber fallado (si el navegador lo indica)
        console.error('⚠️ ERROR CRÍTICO al cachear archivos:', err);
        // NOTA: Si este error persiste, elimine los archivos PNG temporalmente para verificar si son la causa.
      });
    })
  );
  self.skipWaiting();
});

// Activación: Limpia cachés antiguas
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Intercepta peticiones y usa cache-first con fallback a offline.html
self.addEventListener("fetch", event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then(cacheResp => {
      // 1. Si está en caché, lo devuelve
      if (cacheResp) {
        return cacheResp;
      }
      
      // 2. Si no está en caché, intenta ir a la red
      return fetch(event.request).catch(error => {
        // 3. SI LA RED FALLA: Proporciona la página de fallback si es una petición de navegación
        if (event.request.mode === 'navigate' || event.request.destination === 'document') {
           console.log('Error de red. Mostrando página de fallback.');
           return caches.match("./offline.html");
        }
        // Para otros recursos, simplemente deja que la petición falle (error de imagen o fuente)
        throw error; 
      });
    })
  );
});

// ------------------------------
// MANEJO DE NOTIFICACIONES PUSH (Mantenido)
// ------------------------------
self.addEventListener("push", event => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || "Notificación";
  const options = {
    body: data.body || "Tienes un nuevo mensaje",
    icon: "128x128.png"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow("./dashboard.html")
  );
});