import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const env = process.env as Record<string, string | undefined>;

const envConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(envConfig.apiKey && envConfig.authDomain && envConfig.projectId && envConfig.appId);

export const firebaseSetupMessage =
  "Add Firebase values to .env using .env.example, then restart Expo. The app shell is running, but login and Firestore need those credentials.";

const firebaseConfig = isFirebaseConfigured
  ? envConfig
  : {
      apiKey: "demo-api-key",
      authDomain: "demo-splitit.firebaseapp.com",
      projectId: "demo-splitit",
      storageBucket: "demo-splitit.appspot.com",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:demo"
    };

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
