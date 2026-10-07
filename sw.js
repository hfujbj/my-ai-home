self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("push", event => {
  let data = {}; try { data = event.data ? event.data.json() : {}; } catch (_) { data = { body: event.data ? event.data.text() : "" }; }
  const title = data.title || "我的 AI 小屋";
  const options = { body: data.body || "AI 给你留了一条消息～", icon: data.icon || "/favicon.ico", badge: data.badge || "/favicon.ico", data: { url: data.url || "/" }, tag: data.tag || "ai-home-message", renotify: true };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if ("focus" in c) { c.focus(); return c.navigate ? c.navigate(url) : null; }
    return clients.openWindow(url);
  }));
});
