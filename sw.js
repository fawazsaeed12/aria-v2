const CACHE = 'aria-v2';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'ARIA', body: 'You have a reminder!' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'aria',
      vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction || false
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});

self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'SCHEDULE_CHECK') return;
  const { tasks, timetable, now } = e.data;
  const nowDate = new Date(now);
  const nowMins = nowDate.getHours() * 60 + nowDate.getMinutes();
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayDay = DAYS[nowDate.getDay()];

  timetable.forEach(cls => {
    if (cls.day !== todayDay) return;
    const [h, m] = cls.start.split(':').map(Number);
    const diff = (h * 60 + m) - nowMins;
    if (diff === 10) {
      self.registration.showNotification('📚 Class in 10 minutes', {
        body: `${cls.course}${cls.room ? ' · ' + cls.room : ''}`,
        icon: '/icon.svg', tag: 'cls-' + cls.id, vibrate: [300, 100, 300], requireInteraction: true
      });
    }
    if (diff === 0) {
      self.registration.showNotification('🔔 Class Starting Now', {
        body: `${cls.course}${cls.room ? ' in ' + cls.room : ''}`,
        icon: '/icon.svg', tag: 'cls-now-' + cls.id, vibrate: [400, 100, 400], requireInteraction: true
      });
    }
  });

  tasks.forEach(t => {
    if (t.done || !t.due) return;
    const diff = Math.round((new Date(t.due) - nowDate) / 60000);
    if (diff === 15) {
      self.registration.showNotification('⏰ Task Due in 15 min', {
        body: `"${t.title}"`, icon: '/icon.svg', tag: 'task-' + t.id, vibrate: [200, 100, 200]
      });
    }
    if (diff <= 0 && diff > -2) {
      self.registration.showNotification('🚨 Task Due Now!', {
        body: `"${t.title}"`, icon: '/icon.svg', tag: 'task-due-' + t.id, vibrate: [400, 100, 400], requireInteraction: true
      });
    }
  });
});
