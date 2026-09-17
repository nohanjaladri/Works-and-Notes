// Firebase Authentication & Realtime Database Setup (Modular v10 SDK)
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { getDatabase, ref, set, get, onValue } from "firebase/database";

// Configuration with Realtime Database URL support
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCKtJLM2YSB-pN3S2h-i0qDOf5_W5lJSoQ",
  authDomain: "work-notes-d3ca6.firebaseapp.com",
  databaseURL:
    "https://work-notes-d3ca6-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "work-notes-d3ca6",
  storageBucket: "work-notes-d3ca6.firebasestorage.app",
  messagingSenderId: "397650930944",
  appId: "1:397650930944:web:f1c2b53b46657318bd97e5",
};

export const getStoredFirebaseConfig = () => {
  if (typeof window === "undefined") return DEFAULT_FIREBASE_CONFIG;
  try {
    const saved = localStorage.getItem("ops_firebase_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && !parsed.apiKey.includes("Placeholder")) {
        // Ensure databaseURL is present
        if (!parsed.databaseURL) {
          parsed.databaseURL = DEFAULT_FIREBASE_CONFIG.databaseURL;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read stored Firebase config", e);
  }
  return DEFAULT_FIREBASE_CONFIG;
};

export const saveFirebaseConfigToStorage = (config) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("ops_firebase_config", JSON.stringify(config));
};

let app;
let auth;
let rtdb;

export const initFirebase = () => {
  if (typeof window === "undefined") return null;
  const config = getStoredFirebaseConfig();
  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    // Initialize Realtime Database
    rtdb = getDatabase(app, config.databaseURL);
    return { app, auth, rtdb };
  } catch (err) {
    console.warn("Firebase init warning:", err.message);
    return null;
  }
};

// Convert plain username (e.g. "nohan") to internal auth identifier
const normalizeUsername = (username) => {
  const clean = username.trim().toLowerCase();
  if (clean.includes("@")) return clean;
  return `${clean}@ops-internal.local`;
};

// ==========================================
// Authentication Functions (Username & Password)
// ==========================================

export const loginWithUsername = async (username, password) => {
  const instance = initFirebase();
  if (!instance || !instance.auth) {
    throw new Error("Firebase Auth belum siap.");
  }
  const emailIdentifier = normalizeUsername(username);
  const userCredential = await signInWithEmailAndPassword(
    instance.auth,
    emailIdentifier,
    password,
  );

  const cleanUsername = username.includes("@")
    ? username.split("@")[0]
    : username;
  const u = {
    uid: userCredential.user.uid,
    username: cleanUsername,
    displayName: userCredential.user.displayName || cleanUsername,
    isLocalOffline: false,
  };
  localStorage.setItem("ops_auth_user", JSON.stringify(u));
  return u;
};

export const registerWithUsername = async (
  username,
  password,
  displayName = "",
) => {
  const instance = initFirebase();
  if (!instance || !instance.auth) {
    throw new Error("Firebase Auth belum siap.");
  }
  const cleanUsername = username.includes("@")
    ? username.split("@")[0]
    : username.trim().toLowerCase();
  const emailIdentifier = normalizeUsername(username);

  const userCredential = await createUserWithEmailAndPassword(
    instance.auth,
    emailIdentifier,
    password,
  );
  const finalName = displayName.trim() || cleanUsername;

  if (userCredential.user) {
    await updateProfile(userCredential.user, { displayName: finalName });
  }

  const u = {
    uid: userCredential.user.uid,
    username: cleanUsername,
    displayName: finalName,
    isLocalOffline: false,
  };
  localStorage.setItem("ops_auth_user", JSON.stringify(u));
  return u;
};

export const logoutUser = async () => {
  const instance = initFirebase();
  try {
    if (instance && instance.auth) {
      await signOut(instance.auth);
    }
  } catch (e) {
    console.error("Sign out error:", e);
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem("ops_auth_user");
  }
};

export const subscribeToAuth = (callback) => {
  if (typeof window === "undefined") return () => {};

  const storedUser = localStorage.getItem("ops_auth_user");
  if (storedUser) {
    try {
      callback(JSON.parse(storedUser));
    } catch (e) {}
  }

  const instance = initFirebase();
  if (instance && instance.auth) {
    return onAuthStateChanged(instance.auth, (user) => {
      if (user) {
        const cleanName =
          user.displayName || (user.email ? user.email.split("@")[0] : "user");
        const u = {
          uid: user.uid,
          username: cleanName,
          displayName: cleanName,
          isLocalOffline: false,
        };
        localStorage.setItem("ops_auth_user", JSON.stringify(u));
        callback(u);
      } else {
        localStorage.removeItem("ops_auth_user");
        callback(null);
      }
    });
  } else {
    return () => {};
  }
};

// ==========================================
// Firebase Realtime Database Sync Functions
// ==========================================

export const syncMasterJobsToRTDB = async (
  uid = "default_device",
  masterJobs,
) => {
  const instance = initFirebase();
  if (!instance || !instance.rtdb)
    throw new Error("Firebase RTDB belum terinisialisasi.");
  const targetUid = uid || "default_device";
  const dbRef = ref(instance.rtdb, `users/${targetUid}/masterJobs`);
  await set(dbRef, masterJobs);
};

export const syncRosterToRTDB = async (uid = "default_device", roster) => {
  const instance = initFirebase();
  if (!instance || !instance.rtdb)
    throw new Error("Firebase RTDB belum terinisialisasi.");
  const targetUid = uid || "default_device";
  const dbRef = ref(instance.rtdb, `users/${targetUid}/roster`);
  await set(dbRef, roster);
};

export const syncDailyExecToRTDB = async (
  uid = "default_device",
  dateStr,
  dailyData,
) => {
  if (!dateStr) return;
  const instance = initFirebase();
  if (!instance || !instance.rtdb)
    throw new Error("Firebase RTDB belum terinisialisasi.");
  const targetUid = uid || "default_device";
  const dbRef = ref(instance.rtdb, `users/${targetUid}/daily_logs/${dateStr}`);
  await set(dbRef, dailyData);
};

export const syncNotesToRTDB = async (uid = "default_device", notes) => {
  const instance = initFirebase();
  if (!instance || !instance.rtdb)
    throw new Error("Firebase RTDB belum terinisialisasi.");
  const targetUid = uid || "default_device";
  const dbRef = ref(instance.rtdb, `users/${targetUid}/notes`);
  await set(dbRef, notes);
};

// Real-time listener for Realtime Database
export const subscribeToRTDBUserData = (uid, onData) => {
  if (!uid) return () => {};
  const instance = initFirebase();
  if (!instance || !instance.rtdb) return () => {};

  const userRef = ref(instance.rtdb, `users/${uid}`);
  return onValue(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        onData(data);
      }
    },
    (error) => {
      console.warn("RTDB listener error:", error.message);
    },
  );
};
