self.addEventListener("push", (event) => {
  const { title, body } = event.data ? event.data.json() : { title: "UptimeWatch", body: "" };
  event.waitUntil(self.registration.showNotification(title, { body, icon: "/icon.svg", tag: title }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/dashboard"));
});
