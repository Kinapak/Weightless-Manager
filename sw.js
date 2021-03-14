let cacheName = "vPWA-Beta"; // Включает номер версии
let logging = true; // Включено ли логирование в консоль (t/f)

let installUrls = [ // Урлы, которые должны кэшироваться во время установки
	location.href
];

function log(log){
	if(logging) console.log("[Service Worker] " + log);
}

// Установка Service Worker
self.addEventListener('install', function(e){
	log("Installing");
	
	e.waitUntil(
		caches.open(cacheName).then((cache) => {
			log("Caching");
			return cache.addAll(installUrls).then(() => {
				log("Cache success");
			});
		}).catch((error) => {
			log("Open cache failed with error");
			log(error);
			return false;
		})
	);
});

// Fetching content using Service Worker
self.addEventListener('fetch', function(e){
	e.respondWith(
		caches.match(e.request).then(function(r){
			log('Fetching resource: ' + e.request.url);
			return r || fetch(e.request).then(function(response){
				return caches.open(cacheName).then(function(cache){
					log('Caching new resource: ' + e.request.url);
					cache.put(e.request, response.clone());
					return response;
				});
			});
		})
	);
});
