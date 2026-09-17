// Storage Layer - Local-First persistence for Roster, Master Job Desks, Daily Logs, and Notes

const STORAGE_KEYS = {
  MASTER_JOBS: "ops_master_jobs_v1",
  ROSTER: "ops_roster_v1",
  DAILY_EXECUTION: "ops_daily_exec_v1",
  NOTES: "ops_notes_v1",
};

// 1. Master Job Desk (Starts 100% EMPTY as requested)
export const getMasterJobs = () => {
  if (typeof window === "undefined") return { PAGI: [], SIANG: [], MALAM: [] };
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MASTER_JOBS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load master jobs:", e);
  }
  // Clean initial state: completely empty
  return {
    PAGI: [],
    SIANG: [],
    MALAM: [],
  };
};

export const saveMasterJobs = (jobs) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.MASTER_JOBS, JSON.stringify(jobs));
};

// 2. Monthly Shift Roster
export const getAllRoster = () => {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ROSTER);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load roster:", e);
  }
  return {};
};

export const saveRosterForMonth = (yearMonth, monthData) => {
  if (typeof window === "undefined") return;
  const all = getAllRoster();
  all[yearMonth] = { ...all[yearMonth], ...monthData };
  localStorage.setItem(STORAGE_KEYS.ROSTER, JSON.stringify(all));
};

export const getShiftForDate = (dateStr) => {
  // dateStr format: YYYY-MM-DD
  const yearMonth = dateStr.slice(0, 7);
  const all = getAllRoster();
  if (all[yearMonth] && all[yearMonth][dateStr]) {
    return all[yearMonth][dateStr].toUpperCase();
  }
  return null;
};

// 3. Daily Execution State (Today's active tasks, timestamps, timers, logs)
export const getDailyExecution = (dateStr) => {
  if (typeof window === "undefined") return null;
  try {
    const allExec = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.DAILY_EXECUTION) || "{}",
    );
    return allExec[dateStr] || null;
  } catch (e) {
    return null;
  }
};

export const saveDailyExecution = (dateStr, data) => {
  if (typeof window === "undefined") return;
  try {
    const allExec = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.DAILY_EXECUTION) || "{}",
    );
    allExec[dateStr] = data;
    localStorage.setItem(STORAGE_KEYS.DAILY_EXECUTION, JSON.stringify(allExec));
  } catch (e) {
    console.error("Failed to save daily execution:", e);
  }
};

// 4. Notes (.txt files)
export const getNotes = () => {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [];
};

export const saveNotes = (notes) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
};

// 5. Smart Parser for External AI Roster Text
export const parseRosterText = (text, fallbackYearMonth) => {
  const lines = text.split("\n");
  let detectedYearMonth = fallbackYearMonth;
  const result = {};
  let parsedCount = 0;

  // Regex helper to detect Month if mentioned: # BULAN: 2026-09
  const monthMatch = text.match(/#?\s*BULAN\s*[:=]\s*(\d{4}-\d{2})/i);
  if (monthMatch && monthMatch[1]) {
    detectedYearMonth = monthMatch[1];
  }

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    // Remove markdown bullets (- , * , 1. , • , |)
    line = line
      .replace(/^[-*•|\d.]+\s*/, "")
      .replace(/\|/g, " ")
      .trim();

    // Match: Date (YYYY-MM-DD or DD) followed by separator and shift keyword
    const match = line.match(
      /(\d{4}-\d{2}-\d{2}|\b\d{1,2}\b)\s*[:=,\-\t\s]\s*([a-zA-Z]+)/i,
    );
    if (match) {
      let datePart = match[1];
      let shiftCodeRaw = match[2].toUpperCase().trim();

      // Normalize shift code
      let shift = null;
      if (shiftCodeRaw.startsWith("P") || shiftCodeRaw === "MORNING") {
        shift = "PAGI";
      } else if (shiftCodeRaw.startsWith("S") || shiftCodeRaw === "AFTERNOON") {
        shift = "SIANG";
      } else if (shiftCodeRaw.startsWith("M") || shiftCodeRaw === "NIGHT") {
        shift = "MALAM";
      } else if (
        shiftCodeRaw.startsWith("O") ||
        shiftCodeRaw.startsWith("L") ||
        shiftCodeRaw === "OFF"
      ) {
        shift = "OFF";
      }

      if (shift) {
        let fullDateStr = "";
        if (datePart.length <= 2) {
          const paddedDay = datePart.padStart(2, "0");
          fullDateStr = `${detectedYearMonth}-${paddedDay}`;
        } else {
          fullDateStr = datePart;
          detectedYearMonth = datePart.slice(0, 7);
        }

        result[fullDateStr] = shift;
        parsedCount++;
      }
    }
  }

  return {
    yearMonth: detectedYearMonth,
    rosterMap: result,
    count: parsedCount,
  };
};

// 6. Backup & Restore Data
export const exportAllDataAsJSON = () => {
  return JSON.stringify(
    {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      masterJobs: getMasterJobs(),
      roster: getAllRoster(),
      notes: getNotes(),
    },
    null,
    2,
  );
};

export const importAllDataFromJSON = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    if (data.masterJobs)
      localStorage.setItem(
        STORAGE_KEYS.MASTER_JOBS,
        JSON.stringify(data.masterJobs),
      );
    if (data.roster)
      localStorage.setItem(STORAGE_KEYS.ROSTER, JSON.stringify(data.roster));
    if (data.notes)
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(data.notes));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
