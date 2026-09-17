"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Clock,
  FileText,
  Copy,
  Download,
  Trash2,
  RotateCcw,
  Check,
  Server,
  Building2,
  Package,
  Calendar,
  Send,
} from "lucide-react";
import {
  getShiftForDate,
  getDailyExecution,
  saveDailyExecution,
} from "../lib/storage";
import { syncDailyExecToRTDB } from "../lib/firebase";
import { queueSyncAction } from "../lib/syncManager";

export default function DailyDashboard({
  user,
  masterJobs,
  rosterData,
  onSaveRoster,
  onNavigateToMaster,
}) {
  const [todayStr, setTodayStr] = useState("");
  const [todayShift, setTodayShift] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [activeTaskElapsed, setActiveTaskElapsed] = useState(0);

  // Ad-hoc modal
  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false);
  const [adHocTitle, setAdHocTitle] = useState("");
  const [adHocLocation, setAdHocLocation] = useState("Warehouse");
  const [adHocPriority, setAdHocPriority] = useState("P1");
  const [adHocPreempt, setAdHocPreempt] = useState(true);

  // Handover Report Modal
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverText, setHandoverText] = useState("");
  const [copyReportSuccess, setCopyReportSuccess] = useState(false);

  // New Log input for active task
  const [newLogText, setNewLogText] = useState("");

  const timerRef = useRef(null);

  // Initialize today's date & load daily execution
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setTodayStr(today);

    const shift = getShiftForDate(today);
    setTodayShift(shift);

    // Check if we already have daily execution state stored for today
    const storedExec = getDailyExecution(today);
    if (storedExec && storedExec.tasks && storedExec.tasks.length > 0) {
      setTasks(storedExec.tasks);
      setActiveTaskId(storedExec.activeTaskId || null);
    } else if (shift && shift !== "OFF") {
      // Auto-load from master job desk for this shift
      loadJobDeskFromMaster(shift, today);
    }
  }, [rosterData, masterJobs]);

  // Handle live timer for active task
  useEffect(() => {
    if (activeTaskId) {
      timerRef.current = setInterval(() => {
        setTasks((prevTasks) => {
          return prevTasks.map((t) => {
            if (t.id === activeTaskId && t.status === "in-progress") {
              const updatedElapsed = (t.elapsedSec || 0) + 1;
              return { ...t, elapsedSec: updatedElapsed };
            }
            return t;
          });
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTaskId]);

  // Persist state whenever tasks or activeTaskId change
  useEffect(() => {
    if (todayStr && tasks.length > 0) {
      const payload = {
        tasks,
        activeTaskId,
        updatedAt: new Date().toISOString(),
      };
      saveDailyExecution(todayStr, payload);
      if (user && !user.isLocalOffline) {
        syncDailyExecToRTDB(user.uid, todayStr, payload).catch(() => {
          queueSyncAction("DAILY_EXEC", { dateStr: todayStr, data: payload });
        });
      }
    }
  }, [tasks, activeTaskId, todayStr, user]);

  const loadJobDeskFromMaster = (shift, dateStr) => {
    const masterList = (masterJobs && masterJobs[shift]) || [];
    const initializedTasks = masterList.map((item) => ({
      id: `task-${item.id}-${Date.now()}`,
      masterId: item.id,
      title: item.title,
      targetTime: item.targetTime,
      location: item.location,
      priority: item.priority || "P2",
      isAdHoc: false,
      status: "scheduled", // scheduled | in-progress | paused | completed
      elapsedSec: 0,
      startedAt: null,
      completedAt: null,
      checklist: (item.checklist || []).map((c) => ({ ...c, isDone: false })),
      logs: [],
    }));
    setTasks(initializedTasks);
    setActiveTaskId(null);
    saveDailyExecution(dateStr, {
      tasks: initializedTasks,
      activeTaskId: null,
    });
  };

  const handleManualSetTodayShift = (selectedShift) => {
    const yearMonth = todayStr.slice(0, 7);
    const updated = { ...rosterData[yearMonth], [todayStr]: selectedShift };
    onSaveRoster(yearMonth, updated);
    setTodayShift(selectedShift);
    if (selectedShift !== "OFF") {
      loadJobDeskFromMaster(selectedShift, todayStr);
    }
  };

  // Queue & Task Actions
  const handleStartTask = (taskId) => {
    // If another task is in-progress, pause it first
    const nowStr = new Date().toLocaleTimeString("id-ID", { hour12: false });
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: "in-progress",
          startedAt: t.startedAt || nowStr,
        };
      }
      if (t.status === "in-progress" && t.id !== taskId) {
        return {
          ...t,
          status: "paused",
          logs: [
            ...(t.logs || []),
            { timestamp: nowStr, text: "Dijeda sementara (pause)." },
          ],
        };
      }
      return t;
    });
    setTasks(updated);
    setActiveTaskId(taskId);
  };

  const handlePauseTask = (taskId) => {
    const nowStr = new Date().toLocaleTimeString("id-ID", { hour12: false });
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: "paused",
          logs: [
            ...(t.logs || []),
            { timestamp: nowStr, text: "Dijeda sementara (pause)." },
          ],
        };
      }
      return t;
    });
    setTasks(updated);
    if (activeTaskId === taskId) {
      setActiveTaskId(null);
    }
  };

  const handleResumeTask = (taskId) => {
    handleStartTask(taskId);
  };

  const handleCompleteTask = (taskId) => {
    const nowStr = new Date().toLocaleTimeString("id-ID", { hour12: false });
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        // Also check all checklists
        const checkedList = (t.checklist || []).map((c) => ({
          ...c,
          isDone: true,
        }));
        return {
          ...t,
          status: "completed",
          completedAt: nowStr,
          checklist: checkedList,
          logs: [
            ...(t.logs || []),
            { timestamp: nowStr, text: "Pekerjaan selesai ditandai (Done)." },
          ],
        };
      }
      return t;
    });
    setTasks(updated);
    if (activeTaskId === taskId) {
      setActiveTaskId(null);
    }
  };

  const handleDeleteTask = (taskId) => {
    if (!confirm("Hapus tugas ini dari daftar hari ini?")) return;
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    if (activeTaskId === taskId) setActiveTaskId(null);
  };

  // Toggle Sub-checklist item
  const handleToggleChecklist = (taskId, chkId) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const updatedChk = (t.checklist || []).map((c) => {
          if (c.id === chkId) {
            return { ...c, isDone: !c.isDone };
          }
          return c;
        });
        return { ...t, checklist: updatedChk };
      }
      return t;
    });
    setTasks(updated);
  };

  // Add work log to active task
  const handleAddLog = (e) => {
    e?.preventDefault();
    if (!newLogText.trim() || !activeTaskId) return;

    const nowStr = new Date().toLocaleTimeString("id-ID", { hour12: false });
    const updated = tasks.map((t) => {
      if (t.id === activeTaskId) {
        return {
          ...t,
          logs: [
            ...(t.logs || []),
            { timestamp: nowStr, text: newLogText.trim() },
          ],
        };
      }
      return t;
    });
    setTasks(updated);
    setNewLogText("");
  };

  // Quick preset snippet into log
  const handleInsertSnippet = (snippet) => {
    setNewLogText((prev) => (prev ? `${prev} - ${snippet}` : snippet));
  };

  // Insert Ad-hoc Job
  const handleCreateAdHocJob = (e) => {
    e.preventDefault();
    if (!adHocTitle.trim()) return;

    const nowTimeStr = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const nowSecondsStr = new Date().toLocaleTimeString("id-ID", {
      hour12: false,
    });

    const newAdHoc = {
      id: `adhoc-${Date.now()}`,
      title: adHocTitle.trim(),
      targetTime: nowTimeStr,
      location: adHocLocation,
      priority: adHocPriority,
      isAdHoc: true,
      status: adHocPreempt ? "in-progress" : "scheduled",
      elapsedSec: 0,
      startedAt: adHocPreempt ? nowSecondsStr : null,
      completedAt: null,
      checklist: [
        {
          id: `c-${Date.now()}-1`,
          text: "Investigasi & Analisis Penyebab",
          isDone: false,
        },
        {
          id: `c-${Date.now()}-2`,
          text: "Tindakan Perbaikan / Solusi Teknis",
          isDone: false,
        },
        {
          id: `c-${Date.now()}-3`,
          text: "Verifikasi Operasional & Konfirmasi User",
          isDone: false,
        },
      ],
      logs: [
        {
          timestamp: nowSecondsStr,
          text: `Tiket insiden dadakan dibuat [${adHocPriority}].`,
        },
      ],
    };

    let updatedTasks = [...tasks];

    if (adHocPreempt) {
      // Pause any current task
      updatedTasks = updatedTasks.map((t) => {
        if (t.status === "in-progress") {
          return {
            ...t,
            status: "paused",
            logs: [
              ...(t.logs || []),
              {
                timestamp: nowSecondsStr,
                text: "Dijeda untuk pengerjaan insiden dadakan: " + adHocTitle,
              },
            ],
          };
        }
        return t;
      });
      // Slot at the top of the queue
      updatedTasks.unshift(newAdHoc);
      setActiveTaskId(newAdHoc.id);
    } else {
      updatedTasks.push(newAdHoc);
    }

    setTasks(updatedTasks);
    setAdHocTitle("");
    setIsAdHocModalOpen(false);
  };

  // Handover Report Generator (.TXT)
  const handleGenerateHandoverReport = () => {
    const officerName = user ? user.displayName || user.email : "IT Support";
    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const adHocCount = tasks.filter((t) => t.isAdHoc).length;

    let txt = `============================================================\n`;
    txt += `LAPORAN HANDOVER OPERASIONAL IT - ${todayShift || "SHIFT"}\n`;
    txt += `Petugas : ${officerName}\n`;
    txt += `Tanggal : ${todayStr}\n`;
    txt += `Status  : ${completedCount}/${tasks.length} Selesai (${adHocCount} Insiden Dadakan)\n`;
    txt += `============================================================\n\n`;

    // Routine section
    const routineTasks = tasks.filter((t) => !t.isAdHoc);
    txt += `[RUTINITAS SHIFT & SOP]\n`;
    if (routineTasks.length === 0) {
      txt += `- Belum ada rutinitas terdaftar.\n`;
    } else {
      routineTasks.forEach((t) => {
        const durationMins = Math.round((t.elapsedSec || 0) / 60);
        const statusTag =
          t.status === "completed"
            ? "DONE"
            : t.status === "paused"
              ? "PAUSED"
              : "PENDING";
        txt += `• [${t.targetTime}] [${t.location}] ${t.title} -> ${statusTag} (${durationMins}m)\n`;
        if (t.logs && t.logs.length > 0) {
          t.logs.forEach((l) => {
            txt += `    └ [${l.timestamp}] ${l.text}\n`;
          });
        }
      });
    }

    // Ad-hoc section
    const adHocTasks = tasks.filter((t) => t.isAdHoc);
    txt += `\n[INSIDEN DADAKAN / AD-HOC TICKETS]\n`;
    if (adHocTasks.length === 0) {
      txt += `- Tidak ada insiden dadakan.\n`;
    } else {
      adHocTasks.forEach((t) => {
        const durationMins = Math.round((t.elapsedSec || 0) / 60);
        const statusTag = t.status === "completed" ? "RESOLVED" : "IN-PROGRESS";
        txt += `• [${t.priority}] [${t.location}] ${t.title} -> ${statusTag} (${durationMins}m)\n`;
        if (t.logs && t.logs.length > 0) {
          t.logs.forEach((l) => {
            txt += `    └ [${l.timestamp}] ${l.text}\n`;
          });
        }
      });
    }

    // Follow-up pending
    const pendingTasks = tasks.filter((t) => t.status !== "completed");
    txt += `\n[CATATAN FOLLOW-UP SHIFT BERIKUTNYA]\n`;
    if (pendingTasks.length === 0) {
      txt += `- Semua pekerjaan shift ini telah terselesaikan dengan baik (Clear).\n`;
    } else {
      pendingTasks.forEach((t) => {
        txt += `- Pending: ${t.title} (${t.location})\n`;
      });
    }
    txt += `============================================================\n`;

    setHandoverText(txt);
    setIsHandoverModalOpen(true);
  };

  const handleCopyHandover = () => {
    navigator.clipboard.writeText(handoverText);
    setCopyReportSuccess(true);
    setTimeout(() => setCopyReportSuccess(false), 2000);
  };

  const handleDownloadHandoverTxt = () => {
    const blob = new Blob([handoverText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Handover_${todayShift}_${todayStr}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatSeconds = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const progressPercent =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 pb-24 md:pb-12">
      {/* Top Banner: Shift Status & Quick Actions */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">
              TANGGAL: {todayStr}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs font-mono font-bold text-sky-400">
              {todayShift ? `JADWAL: ${todayShift}` : "JADWAL BELUM DISET"}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-100 mt-0.5">
            Operational Task & Queue Engine
          </h2>
          {/* Progress bar */}
          <div className="flex items-center gap-3 mt-2">
            <div className="w-36 sm:w-48 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              {progressPercent}% Selesai ({completedCount}/{tasks.length})
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAdHocModalOpen(true)}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-sm transition animate-pulse"
          >
            <Plus className="w-4 h-4" />+ Job Dadakan (Ad-hoc)
          </button>

          <button
            onClick={handleGenerateHandoverReport}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-800 flex items-center gap-1.5 transition"
          >
            <FileText className="w-4 h-4 text-sky-400" />
            Generate Handover .TXT
          </button>
        </div>
      </div>

      {/* Case 1: Today shift is not set */}
      {!todayShift && (
        <div className="bg-amber-950/30 border border-amber-800/80 rounded-xl p-4 sm:p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-200">
                Jadwal Shift Hari Ini Belum Diatur
              </h3>
              <p className="text-xs text-amber-300/80 mt-1">
                Kalender bulanan Anda belum mencatat shift untuk hari ini (
                {todayStr}). Pilih shift Anda sekarang agar sistem memuat job
                desk yang sesuai:
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => handleManualSetTodayShift("PAGI")}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-sky-950 text-sky-300 border border-sky-800 hover:bg-sky-900"
                >
                  Set Shift Pagi
                </button>
                <button
                  onClick={() => handleManualSetTodayShift("SIANG")}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900"
                >
                  Set Shift Siang
                </button>
                <button
                  onClick={() => handleManualSetTodayShift("MALAM")}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-purple-950 text-purple-300 border border-purple-800 hover:bg-purple-900"
                >
                  Set Shift Malam
                </button>
                <button
                  onClick={() => handleManualSetTodayShift("OFF")}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
                >
                  Set Libur (Off)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case 2: Today is OFF */}
      {todayShift === "OFF" && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8 text-center my-8">
          <Calendar className="w-10 h-10 text-zinc-500 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-zinc-200">
            Hari Ini Anda Sedang Libur (Off)
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
            Selamat beristirahat! Jika ada penggantian shift dadakan, Anda dapat
            mengganti shift di atas.
          </p>
        </div>
      )}

      {/* Case 3: Shift is set, but no jobs in Master Job Desk */}
      {todayShift && todayShift !== "OFF" && tasks.length === 0 && (
        <div className="bg-zinc-950 border border-dashed border-zinc-800 rounded-xl p-8 sm:p-12 text-center">
          <Clock className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-200">
            Belum Ada Job Desk Tersimpan untuk {todayShift}
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 mb-5">
            Sistem dimulai dari data bersih. Silakan masukkan job desk rutin
            Anda (seperti Checklist PTL Warehouse, Hardware Office, Sweeping) di
            menu Master Job Desk.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onNavigateToMaster}
              className="px-4 py-2 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow"
            >
              Buka Kelola Master Job Desk
            </button>
            <button
              onClick={() => setIsAdHocModalOpen(true)}
              className="px-4 py-2 rounded text-xs font-semibold bg-red-600 hover:bg-red-500 text-white"
            >
              + Buat Job Dadakan Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Operational Split-Pane (60% Queue / 40% Inspector) */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (Queue & Timeline) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                Alur Timeline & Antrean Tugas ({tasks.length})
              </h3>
              <span className="text-[11px] font-mono text-zinc-500">
                Klik kartu untuk memeriksa detail
              </span>
            </div>

            <div className="space-y-2.5">
              {tasks.map((task) => {
                const isSelected = activeTaskId === task.id;
                const isRunning = task.status === "in-progress";
                const isPaused = task.status === "paused";
                const isDone = task.status === "completed";

                return (
                  <div
                    key={task.id}
                    onClick={() => setActiveTaskId(task.id)}
                    className={`rounded-lg border p-3.5 transition cursor-pointer select-none ${
                      isRunning
                        ? "bg-sky-950/20 border-sky-600 ring-1 ring-sky-500"
                        : isPaused
                          ? "bg-amber-950/20 border-amber-700"
                          : isDone
                            ? "bg-zinc-950/80 border-zinc-800 opacity-70"
                            : isSelected
                              ? "bg-zinc-900 border-zinc-600"
                              : "bg-zinc-900/70 border-zinc-800/90 hover:border-zinc-700"
                    } ${task.isAdHoc ? "border-l-4 border-l-red-500" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        {/* Status Icon */}
                        <div className="mt-0.5">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isRunning ? (
                            <div className="w-4 h-4 rounded-full bg-sky-500 animate-ping" />
                          ) : isPaused ? (
                            <Pause className="w-4 h-4 text-amber-400" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-zinc-600" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-sky-400">
                              {task.targetTime}
                            </span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-xs font-semibold text-zinc-100">
                              {task.title}
                            </span>
                            {task.isAdHoc && (
                              <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800 text-[10px] font-mono font-bold">
                                AD-HOC {task.priority}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                            <span>{task.location}</span>
                            <span>•</span>
                            <span>
                              Checklist:{" "}
                              {task.checklist?.filter((c) => c.isDone).length ||
                                0}
                              /{task.checklist?.length || 0}
                            </span>
                            {task.elapsedSec > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-sky-300">
                                  {formatSeconds(task.elapsedSec)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isDone && (
                          <>
                            {isRunning ? (
                              <button
                                onClick={() => handlePauseTask(task.id)}
                                className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1"
                                title="Pause tugas ini"
                              >
                                <Pause className="w-3 h-3" /> Pause
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStartTask(task.id)}
                                className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1"
                                title="Mulai kerjakan"
                              >
                                <Play className="w-3 h-3" />{" "}
                                {task.elapsedSec > 0 ? "Resume" : "Start"}
                              </button>
                            )}

                            <button
                              onClick={() => handleCompleteTask(task.id)}
                              className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
                              title="Tandai selesai"
                            >
                              <Check className="w-3 h-3" /> Done
                            </button>
                          </>
                        )}

                        {task.isAdHoc && (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 rounded text-zinc-500 hover:text-red-400"
                            title="Hapus job dadakan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (Active Task Inspector & Logs) */}
          <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 rounded-xl p-4 sm:p-5 sticky top-20 shadow-sm">
            {activeTask ? (
              <div className="space-y-4">
                {/* Active Header */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-800">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {activeTask.location} • {activeTask.targetTime}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-zinc-100 mt-1.5">
                      {activeTask.title}
                    </h3>
                  </div>

                  {/* Stopwatch */}
                  <div className="text-right">
                    <div className="text-base sm:text-lg font-mono font-bold text-sky-400">
                      {formatSeconds(activeTask.elapsedSec || 0)}
                    </div>
                    <span className="text-[10px] text-zinc-500 uppercase font-mono">
                      {activeTask.status}
                    </span>
                  </div>
                </div>

                {/* Sub-Checklist with Big Touch Targets */}
                <div>
                  <h4 className="text-xs font-mono font-semibold text-zinc-400 uppercase mb-2">
                    Checklist Pemeriksaan Lapangan
                  </h4>
                  {!activeTask.checklist ||
                  activeTask.checklist.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">
                      Tidak ada sub-checklist khusus untuk tugas ini.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {activeTask.checklist.map((chk) => (
                        <label
                          key={chk.id}
                          className="flex items-center gap-3 p-2 rounded bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 cursor-pointer min-h-[44px] transition"
                        >
                          <input
                            type="checkbox"
                            checked={chk.isDone}
                            onChange={() =>
                              handleToggleChecklist(activeTask.id, chk.id)
                            }
                            className="w-4 h-4 rounded border-zinc-700 text-sky-500 focus:ring-0 focus:ring-offset-0 bg-zinc-950"
                          />
                          <span
                            className={`text-xs ${chk.isDone ? "line-through text-zinc-500" : "text-zinc-200"}`}
                          >
                            {chk.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Log Snippets */}
                <div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Quick Snippets:
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {[
                      "Semua normal",
                      "Selesai di-reboot",
                      "Kabel diganti",
                      "Follow-up vendor",
                      "User konfirmasi OK",
                    ].map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleInsertSnippet(s)}
                        className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 hover:text-sky-300 hover:border-zinc-700"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Log Input */}
                <form onSubmit={handleAddLog} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tulis catatan log lapangan..."
                    value={newLogText}
                    onChange={(e) => setNewLogText(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" /> Log
                  </button>
                </form>

                {/* Stream of Logs */}
                {activeTask.logs && activeTask.logs.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto pt-2 border-t border-zinc-800">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      Riwayat Log Task Ini:
                    </span>
                    {activeTask.logs.map((log, idx) => (
                      <div
                        key={idx}
                        className="text-xs font-mono text-zinc-400 flex items-start gap-1.5"
                      >
                        <span className="text-zinc-500 text-[10px]">
                          [{log.timestamp}]
                        </span>
                        <span>{log.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">
                  Pilih salah satu tugas di sebelah kiri untuk melihat checklist
                  & mencatat log.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Job Dadakan (Ad-hoc) */}
      {isAdHocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-900 border border-red-900/60 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 bg-red-950/30 flex items-center justify-between">
              <h3 className="text-sm font-bold text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Sisipkan Job Dadakan (Ad-hoc)
              </h3>
              <button
                onClick={() => setIsAdHocModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdHocJob} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Deskripsi Insiden / Tugas{" "}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PTL Jalur 3 Macet atau Printer Kasir Mati"
                  value={adHocTitle}
                  onChange={(e) => setAdHocTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Lokasi
                  </label>
                  <select
                    value={adHocLocation}
                    onChange={(e) => setAdHocLocation(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs"
                  >
                    <option value="Warehouse">Warehouse</option>
                    <option value="Data Center">Data Center</option>
                    <option value="Office">Office</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={adHocPriority}
                    onChange={(e) => setAdHocPriority(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs font-mono"
                  >
                    <option value="P1">P1 (Kritis / Down)</option>
                    <option value="P2">P2 (High Urgensi)</option>
                    <option value="P3">P3 (Normal)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adHocPreempt}
                    onChange={(e) => setAdHocPreempt(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 text-red-500"
                  />
                  <span>
                    Langsung kerjakan sekarang (Jeda/Pause tugas rutin yang
                    sedang berjalan)
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdHocModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded bg-red-600 hover:bg-red-500 text-white shadow"
                >
                  Sisipkan ke Antrean
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Handover Report (.TXT) */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                Laporan Handover Shift (.TXT)
              </h3>
              <button
                onClick={() => setIsHandoverModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <textarea
                rows={16}
                readOnly
                value={handoverText}
                className="w-full p-3 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs leading-relaxed focus:outline-none"
              ></textarea>
            </div>

            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-500">
                Siap kirim ke WhatsApp / Email
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyHandover}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 border border-zinc-700 transition"
                >
                  {copyReportSuccess ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>
                    {copyReportSuccess
                      ? "Tersalin ke Clipboard!"
                      : "Salin ke WhatsApp"}
                  </span>
                </button>
                <button
                  onClick={handleDownloadHandoverTxt}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .TXT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
