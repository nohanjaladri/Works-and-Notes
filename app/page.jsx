"use client";

import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import DailyDashboard from "../components/DailyDashboard";
import MasterJobDesk from "../components/MasterJobDesk";
import MonthlyRoster from "../components/MonthlyRoster";
import NotesHub from "../components/NotesHub";
import AuthModal from "../components/AuthModal";
import {
  getMasterJobs,
  saveMasterJobs,
  getAllRoster,
  saveRosterForMonth,
  getNotes,
  saveNotes,
  getShiftForDate,
} from "../lib/storage";
import {
  subscribeToAuth,
  syncMasterJobsToRTDB,
  syncRosterToRTDB,
  syncNotesToRTDB,
  subscribeToRTDBUserData,
} from "../lib/firebase";
import {
  queueSyncAction,
  flushPendingSyncQueue,
  setupAutoSyncListener,
  getPendingSyncQueue,
} from "../lib/syncManager";

export default function Home() {
  const [activeTab, setActiveTab] = useState("daily");
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Sync state (online / offline / syncing)
  const [syncStatus, setSyncStatus] = useState({
    status: "online",
    label: "Cloud Synced",
    pendingCount: 0,
  });

  // Core app state
  const [masterJobs, setMasterJobs] = useState({
    PAGI: [],
    SIANG: [],
    MALAM: [],
  });
  const [rosterData, setRosterData] = useState({});
  const [notes, setNotes] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);

  // Load initial data on mount
  useEffect(() => {
    // 1. Auth subscription
    const unsubscribe = subscribeToAuth((authUser) => {
      setUser(authUser);
    });

    // 2. Load storage data from local cache
    const loadedMaster = getMasterJobs();
    setMasterJobs(loadedMaster);

    const loadedRoster = getAllRoster();
    setRosterData(loadedRoster);

    const loadedNotes = getNotes();
    setNotes(loadedNotes);

    // 3. Detect today's shift
    const todayStr = new Date().toISOString().slice(0, 10);
    const shift = getShiftForDate(todayStr);
    setCurrentShift(shift);

    return () => unsubscribe();
  }, []);

  // Real-time Cloud Firebase Realtime Database synchronization & auto-reconnect listener
  useEffect(() => {
    if (!user || user.isLocalOffline) return;

    // Listen to Firebase RTDB live updates
    const unsubRTDB = subscribeToRTDBUserData(user.uid, (cloudData) => {
      if (cloudData) {
        if (cloudData.masterJobs) {
          setMasterJobs(cloudData.masterJobs);
          saveMasterJobs(cloudData.masterJobs);
        }
        if (cloudData.roster) {
          setRosterData(cloudData.roster);
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "ops_roster_v1",
              JSON.stringify(cloudData.roster),
            );
          }
        }
        if (cloudData.notes) {
          setNotes(cloudData.notes);
          saveNotes(cloudData.notes);
        }
      }
    });

    // Setup auto-reconnect trigger: drain pending queue when internet is available
    const cleanupSync = setupAutoSyncListener(
      () => user.uid,
      (status) => setSyncStatus(status),
    );

    // Initial flush if there are any leftover offline changes
    flushPendingSyncQueue(user.uid).then(() => {
      const pending = getPendingSyncQueue().length;
      setSyncStatus({
        status: pending > 0 ? "offline" : "online",
        label: pending > 0 ? `Offline (${pending} tertunda)` : "Cloud Synced",
        pendingCount: pending,
      });
    });

    return () => {
      unsubRTDB();
      cleanupSync();
    };
  }, [user]);

  // Update current shift if roster changes
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const shift = getShiftForDate(todayStr);
    setCurrentShift(shift);
  }, [rosterData]);

  const handleSaveMasterJobs = async (newMaster) => {
    setMasterJobs(newMaster);
    saveMasterJobs(newMaster);
    const targetUid = user?.uid || "default_device";
    try {
      setSyncStatus({
        status: "syncing",
        label: "Menyinkronkan...",
        pendingCount: 0,
      });
      await syncMasterJobsToRTDB(targetUid, newMaster);
      setSyncStatus({
        status: "online",
        label: "Cloud Synced",
        pendingCount: 0,
      });
    } catch (err) {
      console.warn("[SaveMaster] Gagal sync ke RTDB:", err);
      queueSyncAction("MASTER_JOBS", newMaster);
      const pending = getPendingSyncQueue().length;
      const label = err?.message?.includes("PERMISSION_DENIED")
        ? "Izin Ditolak (Rules)"
        : "Offline";
      setSyncStatus({
        status: "offline",
        label: `${label} (${pending} tertunda)`,
        pendingCount: pending,
      });
    }
  };

  const handleSaveRoster = async (yearMonth, monthData) => {
    saveRosterForMonth(yearMonth, monthData);
    const updatedRoster = getAllRoster();
    setRosterData(updatedRoster);
    const targetUid = user?.uid || "default_device";
    try {
      setSyncStatus({
        status: "syncing",
        label: "Menyinkronkan...",
        pendingCount: 0,
      });
      await syncRosterToRTDB(targetUid, updatedRoster);
      setSyncStatus({
        status: "online",
        label: "Cloud Synced",
        pendingCount: 0,
      });
    } catch (err) {
      console.warn("[SaveRoster] Gagal sync ke RTDB:", err);
      queueSyncAction("ROSTER", updatedRoster);
      const pending = getPendingSyncQueue().length;
      const label = err?.message?.includes("PERMISSION_DENIED")
        ? "Izin Ditolak (Rules)"
        : "Offline";
      setSyncStatus({
        status: "offline",
        label: `${label} (${pending} tertunda)`,
        pendingCount: pending,
      });
    }
  };

  const handleSaveNotes = async (newNotes) => {
    setNotes(newNotes);
    saveNotes(newNotes);
    const targetUid = user?.uid || "default_device";
    try {
      setSyncStatus({
        status: "syncing",
        label: "Menyinkronkan...",
        pendingCount: 0,
      });
      await syncNotesToRTDB(targetUid, newNotes);
      setSyncStatus({
        status: "online",
        label: "Cloud Synced",
        pendingCount: 0,
      });
    } catch (err) {
      console.warn("[SaveNotes] Gagal sync ke RTDB:", err);
      queueSyncAction("NOTES", newNotes);
      const pending = getPendingSyncQueue().length;
      const label = err?.message?.includes("PERMISSION_DENIED")
        ? "Izin Ditolak (Rules)"
        : "Offline";
      setSyncStatus({
        status: "offline",
        label: `${label} (${pending} tertunda)`,
        pendingCount: pending,
      });
    }
  };

  const handleRefreshAllData = () => {
    setMasterJobs(getMasterJobs());
    setRosterData(getAllRoster());
    setNotes(getNotes());
    const todayStr = new Date().toISOString().slice(0, 10);
    setCurrentShift(getShiftForDate(todayStr));
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Top Navbar & Mobile Bottom Tab Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        currentShift={currentShift}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        syncStatus={syncStatus}
      />

      {/* Main Content Workspace */}
      <main className="flex-1">
        {activeTab === "daily" && (
          <DailyDashboard
            user={user}
            masterJobs={masterJobs}
            rosterData={rosterData}
            onSaveRoster={handleSaveRoster}
            onNavigateToMaster={() => setActiveTab("master")}
          />
        )}

        {activeTab === "master" && (
          <MasterJobDesk
            masterJobs={masterJobs}
            onSaveMasterJobs={handleSaveMasterJobs}
          />
        )}

        {activeTab === "roster" && (
          <MonthlyRoster
            rosterData={rosterData}
            onSaveRoster={handleSaveRoster}
          />
        )}

        {activeTab === "notes" && (
          <NotesHub
            notes={notes}
            onSaveNotes={handleSaveNotes}
            onRefreshAllData={handleRefreshAllData}
          />
        )}
      </main>

      {/* Auth Modal (Firebase Login / Register / Config) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(u) => setUser(u)}
      />
    </div>
  );
}
