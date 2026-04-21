/* Firebase Messaging service worker placeholder.
   Add your Firebase config and messaging handlers here when enabling web push. */

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Medicine Reminder";
  const options = {
    body: data.body || "It is time to take your medicine.",
    icon: "/icon-192.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
