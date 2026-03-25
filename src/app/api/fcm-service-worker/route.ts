import { NextResponse } from "next/server";
import { getFirebaseWebConfig } from "@/lib/firebase/public-config";

/**
 * Serves the Firebase messaging service worker with your web app config.
 * Rewritten from /firebase-messaging-sw.js (see next.config.ts).
 */
export async function GET() {
  const config = getFirebaseWebConfig();
  if (!config.apiKey || !config.projectId) {
    return new NextResponse("// Firebase not configured", {
      status: 404,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  const body = `importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
firebase.initializeApp(${JSON.stringify(config)});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var link = event.notification.data && event.notification.data.link;
  if (link) {
    event.waitUntil(clients.openWindow(link));
  } else {
    event.waitUntil(clients.openWindow('/dashboard'));
  }
});

var messaging = firebase.messaging();
messaging.onBackgroundMessage(function (payload) {
  var n = payload.notification || {};
  var data = payload.data || {};
  self.registration.showNotification(n.title || 'Harley Event Dashboard', {
    body: n.body || '',
    icon: '/favicon.ico',
    data: data,
  });
});
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
