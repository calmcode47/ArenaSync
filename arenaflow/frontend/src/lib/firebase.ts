import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, getIdToken } from "firebase/auth";
import { getMessaging, getToken, Messaging } from "firebase/messaging";

/**
 * firebase.ts — Firebase JS SDK initialization for the frontend
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let messaging: Messaging | null = null;

/**
 * Initializes Firebase if the project ID is available.
 * Guards against double initialization.
 */
export const initFirebase = (): void => {
  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    console.warn("Firebase: VITE_FIREBASE_PROJECT_ID is not set. Firebase functions are disabled.");
    return;
  }

  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Messaging only works in secure contexts (HTTPS or localhost)
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        messaging = getMessaging(app);
      } catch (e) {
        console.warn("Firebase Messaging: Failed to initialize. Notifications may not be supported.");
      }
    }
    
    console.log("Firebase: SDK initialized successfully.");
  } else {
    app = getApps()[0];
    auth = getAuth(app);
  }
};

/**
 * Returns the Firebase Auth instance.
 */
export const getFirebaseAuth = (): Auth | null => {
  if (!auth) initFirebase();
  return auth;
};

/**
 * Returns the Firebase ID token for the currently signed-in user.
 */
export const getFirebaseIdToken = async (): Promise<string | null> => {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth || !firebaseAuth.currentUser) return null;

  try {
    return await getIdToken(firebaseAuth.currentUser);
  } catch (error) {
    console.error("Firebase: Failed to fetch ID token:", error);
    return null;
  }
};

/**
 * Requests notification permission and retrieves the FCM token.
 */
export const requestFCMToken = async (): Promise<string | null> => {
  if (!app) initFirebase();
  if (!app || !messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY // Optional but recommended
      });
      return token;
    }
    return null;
  } catch (error) {
    console.warn("Firebase: Failed to get FCM token:", error);
    return null;
  }
};
