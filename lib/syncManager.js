// Offline-First Outbox & Auto-Sync Engine for Firebase Realtime Database
import {
  initFirebase,
  syncMasterJobsToRTDB,
  syncRosterToRTDB,
  syncDailyExecToRTDB,
  syncNotesToRTDB,
} from "./firebase";
import { ref, onValue } from "firebase/database";

const QUEUE_KEY = "ops_pending_sync_queue_v1";

// 1. Get current pending queue from localStorage
export const getPendingSyncQueue = () => {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

// 2. Save queue to localStorage
const savePendingSyncQueue = (queue) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

// 3. Add or update pending sync item in the queue
export const queueSyncAction = (type, payload) => {
  if (typeof window === "undefined") return;
  const queue = getPendingSyncQueue();

  // Replace existing pending item of same type if it exists, otherwise append
  const existingIdx = queue.findIndex((item) => {
    if (type === "DAILY_EXEC") {
      return item.type === "DAILY_EXEC" && item.dateStr === payload.dateStr;
    }
    return item.type === type;
  });

  const queueItem = {
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    payload,
    queuedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = queueItem;
  } else {
    queue.push(queueItem);
  }

  savePendingSyncQueue(queue);
};

// 4. Drain queue: push all pending changes to Firebase Realtime Database
export const flushPendingSyncQueue = async (uid) => {
  if (!uid || typeof window === "undefined") return { flushed: 0 };
  const queue = getPendingSyncQueue();
  if (queue.length === 0) return { flushed: 0 };

  console.log(
    `[SyncEngine] Menyinkronkan ${queue.length} perubahan tertunda ke Firebase...`,
  );

  const remaining = [];
  let flushedCount = 0;

  for (const item of queue) {
    try {
      if (item.type === "MASTER_JOBS") {
        await syncMasterJobsToRTDB(uid, item.payload);
      } else if (item.type === "ROSTER") {
        await syncRosterToRTDB(uid, item.payload);
      } else if (item.type === "DAILY_EXEC") {
        await syncDailyExecToRTDB(uid, item.payload.dateStr, item.payload.data);
      } else if (item.type === "NOTES") {
        await syncNotesToRTDB(uid, item.payload);
      }
      flushedCount++;
    } catch (err) {
      console.error(
        `[SyncEngine] Gagal mengirim item ${item.type}, simpan untuk dicoba lagi nanti:`,
        err,
      );
      remaining.push(item);
    }
  }

  savePendingSyncQueue(remaining);
  return { flushed: flushedCount, remaining: remaining.length };
};

// 5. Setup auto-sync trigger on reconnect (Online event & Firebase .info/connected)
export const setupAutoSyncListener = (getUid, onStatusChange) => {
  if (typeof window === "undefined") return () => {};

  let isConnectedToFirebase = false;

  const handleOnline = async () => {
    const uid = getUid();
    if (!uid) return;
    if (onStatusChange)
      onStatusChange({ status: "syncing", label: "Menyinkronkan..." });
    const res = await flushPendingSyncQueue(uid);
    if (onStatusChange) {
      onStatusChange({
        status: "online",
        label: "Cloud Synced",
        pendingCount: getPendingSyncQueue().length,
      });
    }
  };

  const handleOffline = () => {
    if (onStatusChange) {
      onStatusChange({
        status: "offline",
        label: `Offline (${getPendingSyncQueue().length} tertunda)`,
        pendingCount: getPendingSyncQueue().length,
      });
    }
  };

  // Native browser events
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Firebase Realtime Database live connection status (.info/connected)
  const instance = initFirebase();
  let unsubConnected = () => {};

  if (instance && instance.rtdb) {
    const connectedRef = ref(instance.rtdb, ".info/connected");
    unsubConnected = onValue(connectedRef, async (snap) => {
      isConnectedToFirebase = snap.val() === true;
      if (isConnectedToFirebase) {
        const uid = getUid();
        if (uid) {
          await flushPendingSyncQueue(uid);
        }
        if (onStatusChange) {
          onStatusChange({
            status: "online",
            label: "Cloud Synced",
            pendingCount: getPendingSyncQueue().length,
          });
        }
      } else {
        if (onStatusChange) {
          const pending = getPendingSyncQueue().length;
          onStatusChange({
            status: "offline",
            label:
              pending > 0 ? `Offline (${pending} tertunda)` : "Offline Mode",
            pendingCount: pending,
          });
        }
      }
    });
  }

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    unsubConnected();
  };
};
