var V="almacen-v3";var F=["./","./index.html","./manifest.json","./icono-192.png","./icono-512.png"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(F)}));self.skipWaiting()});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==V}).map(function(x){return caches.delete(x)}))}));self.clients.claim()});
self.addEventListener("fetch",function(e){var u=new URL(e.request.url);
if(e.request.method!=="GET"||(u.origin!==location.origin&&u.hostname!=="www.gstatic.com"))return;
e.respondWith(fetch(e.request).then(function(r){var c=r.clone();caches.open(V).then(function(x){x.put(e.request,c)});return r}).catch(function(){return caches.match(e.request).then(function(m){return m||caches.match("./index.html")})}))});
self.addEventListener("push",function(e){var p={};try{p=e.data.json()}catch(x){}var n=p.notification||p.data||{};
e.waitUntil(self.registration.showNotification(n.title||"Mi Almacén",{body:n.body||"Revisa tus vencimientos",icon:"icono-192.png",badge:"icono-192.png",tag:"vence"}))});
self.addEventListener("notificationclick",function(e){e.notification.close();e.waitUntil(clients.matchAll({type:"window"}).then(function(l){return l.length?l[0].focus():clients.openWindow("./")}))});
