// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBi_3rG4Kn31tvjsXl6kB_C2iYZhdOEuO0",
  authDomain: "soma-social.firebaseapp.com",
  projectId: "soma-social",
  storageBucket: "soma-social.firebasestorage.app",
  messagingSenderId: "44064741792",
  appId: "1:44064741792:web:232214570fc8bc58dcecc5",
  measurementId: "G-KS591CG0QZ"
};

firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Gouache Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
      icon: '/favicon.ico?v=20241115',
      badge: '/favicon.ico?v=20241115',
    data: payload.data,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
