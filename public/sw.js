const CACHE = 'aria-v2';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return; // never cache API calls
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).catch(() => caches.match('/index.html'))));
});
self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : { title: 'ARIA', body: 'Reminder!' };
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: '/icon.svg', badge: '/icon.svg', tag: d.tag || 'aria', vibrate: [200, 100, 200], requireInteraction: !!d.sticky }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(ws => ws.length ? ws[0].focus() : clients.openWindow('/')));
});
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'CHECK') return;
  const { tasks, tt, now } = e.data;
  const d = new Date(now), nm = d.getHours() * 60 + d.getMinutes();
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today = DAYS[d.getDay()];
  tt.filter(c => c.day === today).forEach(c => {
    const [h, m] = c.start.split(':').map(Number), diff = h * 60 + m - nm;
    if (diff === 10) self.registration.showNotification('📚 Class in 10 min', { body: `${c.course}${c.room ? ' · ' + c.room : ''}`, icon: '/icon.svg', tag: 'c10-' + c.id, vibrate: [300, 100, 300], requireInteraction: true });
    if (diff === 0)  self.registration.showNotification('🔔 Class Starting', { body: `${c.course}${c.room ? ' in ' + c.room : ''}`, icon: '/icon.svg', tag: 'c0-' + c.id, vibrate: [400, 100, 400], requireInteraction: true });
  });
  tasks.filter(t => !t.done && t.due).forEach(t => {
    const diff = Math.round((new Date(t.due) - d) / 60000);
    if (diff === 15) self.registration.showNotification('⏰ Task Due Soon', { body: `"${t.title}" in 15 min`, icon: '/icon.svg', tag: 't15-' + t.id });
    if (diff <= 0 && diff > -2) self.registration.showNotification('🚨 Task Due Now', { body: `"${t.title}"`, icon: '/icon.svg', tag: 't0-' + t.id, requireInteraction: true });
  });
});
