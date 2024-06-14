// @odoo-module ignore

/* eslint-disable no-restricted-globals */
const cacheName = "odoo-sw-cache";
const cachedRequests = ["/odoo/offline"];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(cachedRequests)));
});

const navigateOrDisplayOfflinePage = async (request) => {
    try {
        return await fetch(request);
    } catch (requestError) {
        if (
            request.method === "GET" && ["Failed to fetch", "Load failed"].includes(requestError.message)
        ) {
            if (cachedRequests.includes("/odoo/offline")) {
                const cache = await caches.open(cacheName);
                const cachedResponse = await cache.match("/odoo/offline");
                if (cachedResponse) {
                    return cachedResponse;
                }
            }
        }
        throw requestError;
    }
};

self.addEventListener("fetch", (event) => {
    if (
        (event.request.mode === "navigate" && event.request.destination === "document") ||
        // request.mode = navigate isn't supported in all browsers => check for http header accept:text/html
        event.request.headers.get("accept").includes("text/html")
    ) {
        event.respondWith(navigateOrDisplayOfflinePage(event.request));
    }
});
/* eslint-env serviceworker */
/* eslint-disable no-restricted-globals */
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    if (event.notification.data) {
        const {
            action,
            model,
            res_id
        } = event.notification.data;
        if (model === "discuss.channel") {
            clients.openWindow(`/odoo/${res_id}/action-${action}`);
        } else {
            const modelPath = model.includes(".") ? model : `m-${model}`;
            clients.openWindow(`/odoo/${modelPath}/${res_id}`);
        }
    }
});
self.addEventListener("push", (event) => {
    const notification = event.data.json();
    self.registration.showNotification(notification.title, notification.options || {});
});
self.addEventListener("pushsubscriptionchange", async (event) => {
    const subscription = await self.registration.pushManager.subscribe(
        event.oldSubscription.options
    );
    await fetch("/web/dataset/call_kw/mail.push.device/register_devices", {
        headers: {
            "Content-type": "application/json",
        },
        body: JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "call",
            params: {
                model: "mail.push.device",
                method: "register_devices",
                args: [],
                kwargs: {
                    ...subscription.toJSON(),
                    previousEndpoint: event.oldSubscription.endpoint,
                },
                context: {},
            },
        }),
        method: "POST",
        mode: "cors",
        credentials: "include",
    });
});