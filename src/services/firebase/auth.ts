import { Platform } from "react-native";
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { auth, firebaseSetupMessage, googleProvider, isFirebaseConfigured } from "./config";
import { UserProfile } from "@/types";

WebBrowser.maybeCompleteAuthSession();

export const toProfile = (user: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}): UserProfile => ({
  id: user.uid,
  name: user.displayName ?? user.email?.split("@")[0] ?? "Splitit User",
  email: user.email ?? "",
  upiId: user.email ? `${user.email.split("@")[0]}@upi` : "",
  avatar: user.photoURL ?? undefined,
  totalOwed: 0,
  totalReceivable: 0,
  netBalance: 0,
  updatedAt: Date.now()
});

export async function signInWithGoogleWeb(): Promise<UserProfile> {
  if (!isFirebaseConfigured) throw new Error(firebaseSetupMessage);
  const result = await signInWithPopup(auth, googleProvider);
  return toProfile(result.user);
}

export async function signInWithGoogleIdToken(idToken: string): Promise<UserProfile> {
  if (!isFirebaseConfigured) throw new Error(firebaseSetupMessage);
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return toProfile(result.user);
}

export function useGoogleAuthRequest() {
  const env = process.env as Record<string, string | undefined>;
  return Google.useIdTokenAuthRequest({
    webClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
  });
}

export async function signInWithGoogle(): Promise<UserProfile | null> {
  if (Platform.OS === "web") return signInWithGoogleWeb();
  return null;
}

export const observeAuth = (callback: (profile: UserProfile | null) => void) =>
  onAuthStateChanged(auth, (user) => callback(user ? toProfile(user) : null));

export const signOut = () => firebaseSignOut(auth);
