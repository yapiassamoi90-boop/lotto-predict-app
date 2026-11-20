/* ==========================================================================
   LOTO 5/90 RESEARCH LAB — app.js
   VERSION 14.2 — Dev.Assamoi / H@B

   Laboratoire statistique :
   - Historique des tirages actuels : 5 gagnants + 5 machines
   - Archives historiques séparées : 6 numéros
   - Analyse chronologique sans fuite temporelle
   - Fréquences, retards, parités, sommes et dizaines
   - Analyse par heure (01H à 23H) + Base de 2 boules
   - Matrice hybride
   - Backtesting avec comparaison aléatoire
   - Import / export JSON
   - Ajout, suppression et filtrage de tirages
   - OCR avec Tesseract.js si disponible

   IMPORTANT :
   Les scores sont des indicateurs descriptifs.
   Ils ne prédisent pas avec certitude les tirages futurs.
   ========================================================================== */

"use strict";

/* ==========================================================================
   1. CONFIGURATION
   ========================================================================== */

const APP_VERSION = "14.2";

const STORAGE_KEY = "loto590_history_v12";
const ARCHIVE_STORAGE_KEY = "loto590_archive_1993_2011_v12";

const STORAGE_KEY_V14 = "loto590_history_v14";
const ARCHIVE_STORAGE_KEY_V14 = "loto590_archive_v14";

const ALL_HOURS = [
  "01H", "03H", "07H", "08H", "10H",
  "13H", "16H", "18H", "19H", "20H",
  "21H", "22H", "23H"
];

const NUMBER_MIN = 1;
const NUMBER_MAX = 90;
const WINNER_COUNT = 5;
const MACHINE_COUNT = 5;
const ARCHIVE_NUMBER_COUNT = 6;

const DEFAULT_TARGET_HOUR = "10H";
const MAX_RECENT_DRAWS = 15;

/* --------------------------------------------------------------------------
   BASE HISTORIQUE INITIALE (SEED_HISTORY)
   -------------------------------------------------------------------------- */
const SEED_HISTORY = [
  // --- 19/11/2026 (Jeudi) ---
  { date: "2026-11-19", hour: "13H", winners: [77, 84, 27, 38, 82], machines: [52, 61, 49, 19, 14] },
  { date: "2026-11-19", hour: "10H", winners: [90, 51, 74, 48, 13], machines: [82, 25, 83, 52, 59] },
  { date: "2026-11-19", hour: "08H", winners: [17, 26, 87, 21, 68], machines: [2, 1, 7, 73, 74] },
  { date: "2026-11-19", hour: "07H", winners: [42, 58, 74, 19, 30], machines: [81, 24, 27, 21, 39] },

  // --- 18/11/2026 (Mercredi) ---
  { date: "2026-11-18", hour: "23H", winners: [7, 81, 82, 85, 40], machines: [42, 31, 19, 26, 79] },
  { date: "2026-11-18", hour: "22H", winners: [17, 3, 72, 34, 85], machines: [14, 73, 62, 41, 22] },
  { date: "2026-11-18", hour: "21H", winners: [41, 42, 48, 72, 38], machines: [47, 56, 18, 22, 20] },
  { date: "2026-11-18", hour: "18H", winners: [78, 13, 25, 90, 44], machines: [77, 23, 9, 7, 80] },
  { date: "2026-11-18", hour: "16H", winners: [85, 73, 34, 16, 47], machines: [22, 13, 14, 36, 64] },
  { date: "2026-11-18", hour: "13H", winners: [37, 42, 38, 36, 18], machines: [81, 19, 26, 10, 44] },
  { date: "2026-11-18", hour: "10H", winners: [82, 54, 2, 49, 19], machines: [43, 5, 11, 37, 6] },
  { date: "2026-11-18", hour: "08H", winners: [47, 86, 10, 63, 46], machines: [67, 38, 71, 32, 74] },
  { date: "2026-11-18", hour: "07H", winners: [70, 66, 61, 29, 75], machines: [39, 81, 40, 8, 17] },

  // --- 17/11/2026 (Mardi) ---
  { date: "2026-11-17", hour: "23H", winners: [69, 88, 52, 1, 35], machines: [39, 8, 64, 22, 71] },
  { date: "2026-11-17", hour: "22H", winners: [56, 78, 75, 14, 4], machines: [67, 89, 6, 87, 18] },
  { date: "2026-11-17", hour: "21H", winners: [77, 56, 29, 49, 10], machines: [21, 81, 43, 54, 28] },
  { date: "2026-11-17", hour: "18H", winners: [65, 36, 87, 19, 73], machines: [86, 7, 9, 76, 32] },
  { date: "2026-11-17", hour: "16H", winners: [65, 23, 40, 41, 50], machines: [26, 59, 13, 22, 7] },
  { date: "2026-11-17", hour: "13H", winners: [50, 21, 59, 85, 25], machines: [3, 35, 5, 27, 28] },
  { date: "2026-11-17", hour: "10H", winners: [9, 13, 21, 29, 38], machines: [58, 78, 57, 44, 70] },
  { date: "2026-11-17", hour: "08H", winners: [73, 63, 49, 70, 16], machines: [28, 37, 50, 82, 10] },
  { date: "2026-11-17", hour: "07H", winners: [20, 15, 88, 81, 80], machines: [25, 41, 82, 58, 56] },

  // --- 16/11/2026 (Lundi) ---
  { date: "2026-11-16", hour: "23H", winners: [3, 20, 13, 50, 25], machines: [30, 86, 51, 46, 26] },
  { date: "2026-11-16", hour: "22H", winners: [20, 30, 13, 87, 59], machines: [22, 90, 35, 80, 3] },
  { date: "2026-11-16", hour: "21H", winners: [60, 15, 51, 48, 41], machines: [71, 24, 4, 5, 57] },
  { date: "2026-11-16", hour: "18H", winners: [68, 3, 58, 6, 38], machines: [15, 21, 13, 84, 69] },
  { date: "2026-11-16", hour: "16H", winners: [76, 29, 60, 19, 67], machines: [24, 81, 10, 18, 49] },
  { date: "2026-11-16", hour: "13H", winners: [65, 79, 88, 87, 45], machines: [2, 29, 59, 28, 46] },
  { date: "2026-11-16", hour: "10H", winners: [24, 65, 54, 63, 45], machines: [51, 8, 20, 28, 59] },
  { date: "2026-11-16", hour: "08H", winners: [48, 38, 21, 5, 68], machines: [36, 57, 73, 59, 78] },
  { date: "2026-11-16", hour: "07H", winners: [19, 54, 37, 39, 20], machines: [64, 10, 38, 82, 62] },

  // --- 15/11/2026 (Dimanche) ---
  { date: "2026-11-15", hour: "23H", winners: [15, 56, 39, 76, 21], machines: [59, 65, 68, 25, 26] },
  { date: "2026-11-15", hour: "22H", winners: [60, 83, 33, 63, 89], machines: [11, 22, 78, 44, 75] },
  { date: "2026-11-15", hour: "21H", winners: [65, 48, 77, 15, 14], machines: [36, 79, 21, 82, 30] },
  { date: "2026-11-15", hour: "20H", winners: [71, 52, 14, 37, 3], machines: [33, 70, 12, 47, 8] },
  { date: "2026-11-15", hour: "18H", winners: [81, 85, 58, 51, 71], machines: [43, 50, 38, 18, 66] },
  { date: "2026-11-15", hour: "16H", winners: [76, 64, 63, 48, 16], machines: [36, 30, 3, 34, 37] },
  { date: "2026-11-15", hour: "13H", winners: [29, 11, 28, 35, 43], machines: [38, 54, 37, 75, 59] },
  { date: "2026-11-15", hour: "10H", winners: [64, 33, 16, 22, 71], machines: [37, 90, 11, 35, 2] },
  { date: "2026-11-15", hour: "08H", winners: [79, 62, 10, 81, 88], machines: [83, 34, 75, 76, 16] },
  { date: "2026-11-15", hour: "07H", winners: [58, 83, 78, 49, 79], machines: [13, 74, 71, 39, 31] },
  { date: "2026-11-15", hour: "03H", winners: [60, 35, 50, 33, 53], machines: [79, 52, 41, 81, 30] },
  { date: "2026-11-15", hour: "01H", winners: [26, 18, 63, 53, 1], machines: [21, 88, 77, 46, 60] },

  // --- 30/10/2026 (Vendredi) ---
  { date: "2026-10-30", hour: "23H", winners: [1, 51, 88, 19, 60], machines: [47, 37, 23, 82, 21] },
  { date: "2026-10-30", hour: "22H", winners: [77, 64, 36, 78, 38], machines: [87, 66, 47, 61, 43] },
  { date: "2026-10-30", hour: "21H", winners: [17, 16, 57, 56, 60], machines: [38, 10, 28, 11, 25] },
  { date: "2026-10-30", hour: "18H", winners: [16, 7, 9, 40, 36], machines: [67, 42, 30, 53, 38] },
  { date: "2026-10-30", hour: "16H", winners: [39, 22, 75, 67, 74], machines: [80, 76, 43, 44, 43] },
  { date: "2026-10-30", hour: "13H", winners: [19, 52, 70, 35, 81], machines: [28, 69, 1, 5, 74] },
  { date: "2026-10-30", hour: "10H", winners: [76, 33, 70, 64, 67], machines: [73, 82, 43, 88, 19] },
  { date: "2026-10-30", hour: "08H", winners: [60, 22, 72, 59, 46], machines: [3, 8, 20, 56, 2] },
  { date: "2026-10-30", hour: "07H", winners: [80, 27, 18, 2, 76], machines: [21, 25, 77, 70, 31] },

  // --- 29/10/2026 (Jeudi) ---
  { date: "2026-10-29", hour: "21H", winners: [72, 22, 10, 41, 11], machines: [38, 15, 45, 7, 13] },
  { date: "2026-10-29", hour: "18H", winners: [33, 38, 4, 82, 55], machines: [3, 10, 53, 65, 70] },
  { date: "2026-10-29", hour: "16H", winners: [83, 70, 51, 82, 49], machines: [31, 80, 38, 47, 78] },
  { date: "2026-10-29", hour: "13H", winners: [68, 8, 69, 3, 42], machines: [4, 39, 87, 76, 60] },
  { date: "2026-10-29", hour: "10H", winners: [84, 57, 45, 50, 79], machines: [21, 42, 76, 69, 3] },
  { date: "2026-10-29", hour: "08H", winners: [38, 11, 53, 7, 18], machines: [36, 48, 20, 64, 43] },
  { date: "2026-10-29", hour: "07H", winners: [23, 35, 17, 20, 15], machines: [52, 44, 31, 88, 10] },

  // --- 29/09/2026 (Mardi) ---
  { date: "2026-09-29", hour: "23H", winners: [68, 39, 48, 63, 61], machines: [15, 28, 32, 40, 24] },
  { date: "2026-09-29", hour: "22H", winners: [66, 51, 45, 59, 10], machines: [27, 75, 7, 72, 21] },
  { date: "2026-09-29", hour: "21H", winners: [63, 10, 3, 36, 71], machines: [76, 80, 69, 60, 58] },
  { date: "2026-09-29", hour: "18H", winners: [1, 6, 90, 59, 57], machines: [81, 77, 19, 35, 32] },
  { date: "2026-09-29", hour: "16H", winners: [26, 31, 73, 14, 29], machines: [25, 59, 6, 64, 10] },
  { date: "2026-09-29", hour: "13H", winners: [48, 74, 13, 56, 36], machines: [31, 57, 89, 45, 80] },
  { date: "2026-09-29", hour: "10H", winners: [36, 23, 64, 6, 62], machines: [14, 52, 73, 19, 29] },
  { date: "2026-09-29", hour: "08H", winners: [9, 14, 38, 33, 45], machines: [55, 67, 72, 90, 49] },
  { date: "2026-09-29", hour: "07H", winners: [71, 80, 11, 17, 74], machines: [48, 61, 23, 14, 3] },

  // --- 28/09/2026 (Lundi) ---
  { date: "2026-09-28", hour: "23H", winners: [41, 20, 6, 3, 33], machines: [56, 35, 77, 51, 61] },
  { date: "2026-09-28", hour: "22H", winners: [72, 30, 3, 67, 61], machines: [45, 84, 17, 36, 66] },
  { date: "2026-09-28", hour: "21H", winners: [61, 67, 83, 65, 42], machines: [19, 33, 37, 72, 22] },
  { date: "2026-09-28", hour: "18H", winners: [6, 70, 57, 18, 87], machines: [21, 22, 26, 84, 55] },
  { date: "2026-09-28", hour: "16H", winners: [2, 21, 27, 90, 14], machines: [67, 60, 4, 48, 57] },
  { date: "2026-09-28", hour: "13H", winners: [81, 10, 24, 23, 54], machines: [51, 88, 52, 57, 63] },
  { date: "2026-09-28", hour: "10H", winners: [30, 54, 61, 4, 42], machines: [69, 32, 35, 49, 52] },
  { date: "2026-09-28", hour: "08H", winners: [27, 21, 87, 23, 62], machines: [48, 10, 40, 38, 90] },
  { date: "2026-09-28", hour: "07H", winners: [70, 85, 58, 33, 17], machines: [19, 73, 60, 63, 67] },

  // --- 27/09/2026 (Dimanche) ---
  { date: "2026-09-27", hour: "23H", winners: [33, 26, 9, 29, 59], machines: [44, 75, 52, 39, 5] },
  { date: "2026-09-27", hour: "21H", winners: [77, 43, 24, 75, 3], machines: [36, 10, 39, 37, 38] },
  { date: "2026-09-27", hour: "20H", winners: [12, 90, 13, 45, 18], machines: [84, 32, 27, 78, 7] },
  { date: "2026-09-27", hour: "18H", winners: [68, 63, 47, 53, 36], machines: [12, 20, 88, 14, 4] },
  { date: "2026-09-27", hour: "16H", winners: [75, 15, 55, 62, 20], machines: [52, 39, 68, 83, 90] },
  { date: "2026-09-27", hour: "13H", winners: [15, 22, 32, 68, 56], machines: [57, 19, 78, 12, 24] },
  { date: "2026-09-27", hour: "10H", winners: [70, 51, 86, 53, 39], machines: [7, 83, 24, 55, 18] },
  { date: "2026-09-27", hour: "08H", winners: [58, 42, 29, 78, 52], machines: [13, 39, 67, 88, 1] },
  { date: "2026-09-27", hour: "07H", winners: [58, 11, 29, 80, 10], machines: [32, 39, 47, 72, 62] },
  { date: "2026-09-27", hour: "03H", winners: [86, 76, 26, 6, 67], machines: [74, 36, 79, 62, 80] },
  { date: "2026-09-27", hour: "01H", winners: [77, 59, 69, 28, 65], machines: [82, 74, 43, 12, 38] },

  // --- 26/09/2026 (Samedi) ---
  { date: "2026-09-26", hour: "23H", winners: [74, 21, 49, 88, 81], machines: [75, 39, 38, 44, 48] },
  { date: "2026-09-26", hour: "22H", winners: [19, 25, 37, 21, 72], machines: [70, 3, 48, 74, 75] },
  { date: "2026-09-26", hour: "21H", winners: [14, 13, 70, 15, 40], machines: [31, 41, 51, 63, 67] },
  { date: "2026-09-26", hour: "18H", winners: [33, 80, 74, 65, 22], machines: [23, 50, 30, 61, 38] },
  { date: "2026-09-26", hour: "16H", winners: [79, 62, 82, 20, 6], machines: [35, 87, 64, 63, 42] },
  { date: "2026-09-26", hour: "13H", winners: [63, 70, 32, 30, 21], machines: [72, 25, 90, 29, 60] },
  { date: "2026-09-26", hour: "10H", winners: [18, 59, 40, 5, 83], machines: [24, 38, 43, 29, 8] },
  { date: "2026-09-26", hour: "08H", winners: [25, 68, 3, 50, 30], machines: [12, 41, 63, 19, 32] },
  { date: "2026-09-26", hour: "07H", winners: [73, 77, 42, 27, 45], machines: [67, 4, 17, 84, 3] },
  { date: "2026-09-26", hour: "03H", winners: [34, 10, 25, 39, 32], machines: [5, 67, 82, 57, 27] },
  { date: "2026-09-26", hour: "01H", winners: [84, 54, 11, 68, 89], machines: [40, 82, 69, 55, 76] }
];

/* ==========================================================================
   2. ÉTAT GLOBAL
   ========================================================================== */

let selectedHour = DEFAULT_TARGET_HOUR;

let drawHistory = [];
let archiveHistory = [];

let historyDateFilter = "";
let historyHourFilter = "ALL";

let currentAnalysis = null;
let currentBacktest = null;

let isInitialized = false;

/* ==========================================================================
   3. OUTILS GÉNÉRAUX
   ========================================================================== */

function $(id) {
  return document.getElementById(id);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function todayLocalISO() {
  const now = new Date();
  return [
    now.getFullYear(),
    pad2(now.getMonth() + 1),
    pad2(now.getDate())
  ].join("-");
}

function parseISODate(value) {
  if (typeof value !== "string") return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function isValidDate(value) {
  return parseISODate(value) !== null;
}

function getDayOfWeek(dateString) {
  const date = parseISODate(dateString);
  return date ? date.getUTCDay() : null;
}

function getDayOfMonth(dateString) {
  const date = parseISODate(dateString);
  return date ? date.getUTCDate() : null;
}

function getMonth(dateString) {
  const date = parseISODate(dateString);
  return date ? date.getUTCMonth() + 1 : null;
}

function getHourOrder(hour) {
  const index = ALL_HOURS.indexOf(normalizeHour(hour));
  return index < 0 ? 999 : index;
}

function normalizeHour(hour) {
  if (!hour) return "";

  const value = String(hour)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  const match = value.match(/^(\d{1,2})(?:H|:00)?$/);
  if (!match) return "";

  const number = Number(match[1]);
  if (number < 0 || number > 23) return "";

  return `${pad2(number)}H`;
}

function compareDraws(a, b) {
  const dateCompare = String(a.date).localeCompare(String(b.date));
  if (dateCompare !== 0) return dateCompare;
  return getHourOrder(a.hour) - getHourOrder(b.hour);
}

function uniqueNumbers(numbers) {
  return [...new Set(numbers)];
}

function validateNumberList(numbers, expectedLength) {
  if (!Array.isArray(numbers) || numbers.length !== expectedLength) {
    return false;
  }

  const values = numbers.map(Number);
  if (values.some(n => !Number.isInteger(n) || n < NUMBER_MIN || n > NUMBER_MAX)) {
    return false;
  }

  return uniqueNumbers(values).length === expectedLength;
}

function normalizeNumberList(numbers, expectedLength) {
  if (!Array.isArray(numbers)) return null;

  const values = numbers
    .map(Number)
    .filter(n => Number.isInteger(n) && n >= NUMBER_MIN && n <= NUMBER_MAX);

  if (!validateNumberList(values, expectedLength)) return null;

  return values.sort((a, b) => a - b);
}

function showMessage(message, type = "info") {
  const box = $("messageBox");
  if (box) {
    box.textContent = message;
    box.className = `message-box ${type}`;
    box.style.display = "block";
  } else {
    console.log(`[${type}] ${message}`);
  }
}

function clearMessage() {
  const box = $("messageBox");
  if (box) {
    box.textContent = "";
    box.style.display = "none";
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function safeParseJSON(value, fallback = []) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/* ==========================================================================
   4. NORMALISATION DES DONNÉES
   ========================================================================== */

function normalizeEntry(entry) {
  if (!entry || typeof entry !== "object") return null;

  const date = String(entry.date || "").trim();
  const hour = normalizeHour(entry.hour);

  if (!isValidDate(date) || !ALL_HOURS.includes(hour)) return null;

  const winners = normalizeNumberList(
    entry.winners || entry.numeros || [],
    WINNER_COUNT
  );

  const machines = normalizeNumberList(
    entry.machines || entry.machine || [],
    MACHINE_COUNT
  );

  if (!winners || !machines) return null;

  return {
    date,
    hour,
    winners,
    machines,
    dayOfWeek: getDayOfWeek(date),
    dayOfMonth: getDayOfMonth(date),
    month: getMonth(date),
    updatedAt: entry.updatedAt || entry.updated_at || null
  };
}

function normalizeArchiveEntry(entry) {
  if (!entry || typeof entry !== "object") return null;

  const date = String(entry.date || "").trim();
  if (!isValidDate(date)) return null;

  const numeros = normalizeNumberList(
    entry.numeros || entry.numbers || entry.winners || [],
    ARCHIVE_NUMBER_COUNT
  );

  if (!numeros) return null;

  return {
    date,
    numeros,
    dayOfWeek: getDayOfWeek(date),
    dayOfMonth: getDayOfMonth(date),
    month: getMonth(date)
  };
}

function deduplicateCurrentHistory(entries) {
  const map = new Map();

  safeArray(entries).forEach(raw => {
    const entry = normalizeEntry(raw);
    if (!entry) return;
    map.set(`${entry.date}_${entry.hour}`, entry);
  });

  return [...map.values()].sort(compareDraws);
}

function deduplicateArchiveHistory(entries) {
  const map = new Map();

  safeArray(entries).forEach(raw => {
    const entry = normalizeArchiveEntry(raw);
    if (!entry) return;
    map.set(entry.date, entry);
  });

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/* ==========================================================================
   5. SAUVEGARDE ET CHARGEMENT
   ========================================================================== */

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drawHistory));
    localStorage.setItem(STORAGE_KEY_V14, JSON.stringify(drawHistory));
    return true;
  } catch (error) {
    console.error("Erreur sauvegarde historique :", error);
    showMessage("Impossible de sauvegarder l'historique.", "error");
    return false;
  }
}

function saveArchiveHistory() {
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archiveHistory));
    localStorage.setItem(ARCHIVE_STORAGE_KEY_V14, JSON.stringify(archiveHistory));
    return true;
  } catch (error) {
    console.error("Erreur sauvegarde archives :", error);
    showMessage("Impossible de sauvegarder les archives.", "error");
    return false;
  }
}

function loadHistory() {
  const v14 = safeParseJSON(localStorage.getItem(STORAGE_KEY_V14), null);
  const old = safeParseJSON(localStorage.getItem(STORAGE_KEY), null);

  const source = Array.isArray(v14) && v14.length
    ? v14
    : Array.isArray(old) && old.length
      ? old
      : SEED_HISTORY;

  drawHistory = deduplicateCurrentHistory(source);
  saveHistory();
}

function loadArchiveHistory() {
  const v14 = safeParseJSON(localStorage.getItem(ARCHIVE_STORAGE_KEY_V14), null);
  const old = safeParseJSON(localStorage.getItem(ARCHIVE_STORAGE_KEY), null);

  const source = Array.isArray(v14) && v14.length
    ? v14
    : Array.isArray(old) && old.length
      ? old
      : [];

  archiveHistory = deduplicateArchiveHistory(source);
  saveArchiveHistory();
}

/* ==========================================================================
   6. ORDRE CHRONOLOGIQUE ET ANTI-FUITE
   ========================================================================== */

function getDrawsStrictlyBefore(targetDate, targetHour) {
  const hour = normalizeHour(targetHour);
  const targetOrder = getHourOrder(hour);

  return drawHistory.filter(draw => {
    if (draw.date < targetDate) return true;
    if (draw.date > targetDate) return false;
    return getHourOrder(draw.hour) < targetOrder;
  });
}

function getArchivesStrictlyBefore(targetDate) {
  return archiveHistory.filter(entry => entry.date < targetDate);
}

/* ==========================================================================
   7. STATISTIQUES DESCRIPTIVES
   ========================================================================== */

function createFrequencyTable() {
  const table = {};
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) {
    table[n] = 0;
  }
  return table;
}

function computeFrequency(numbers) {
  const frequency = createFrequencyTable();
  numbers.forEach(value => {
    const n = Number(value);
    if (Number.isInteger(n) && n >= 1 && n <= 90) {
      frequency[n]++;
    }
  });
  return frequency;
}

function computeLastSeen(numbers) {
  const lastSeen = {};
  for (let n = 1; n <= 90; n++) {
    lastSeen[n] = -1;
  }
  numbers.forEach((value, index) => {
    const n = Number(value);
    if (Number.isInteger(n) && n >= 1 && n <= 90) {
      lastSeen[n] = index;
    }
  });
  return lastSeen;
}

function computeGaps(numbers) {
  const lastSeen = computeLastSeen(numbers);
  const total = numbers.length;
  const gaps = {};

  for (let n = 1; n <= 90; n++) {
    gaps[n] = lastSeen[n] === -1 ? total : total - 1 - lastSeen[n];
  }

  return gaps;
}

function computeParity(numbers) {
  let even = 0;
  let odd = 0;
  numbers.forEach(n => {
    if (Number(n) % 2 === 0) even++;
    else odd++;
  });
  return { even, odd };
}

function computeSum(numbers) {
  return numbers.reduce((sum, n) => sum + Number(n), 0);
}

function computeSpan(numbers) {
  if (!numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted[sorted.length - 1] - sorted[0];
}

function computeDecades(numbers) {
  const result = {
    "1-10": 0, "11-20": 0, "21-30": 0, "31-40": 0, "41-50": 0,
    "51-60": 0, "61-70": 0, "71-80": 0, "81-90": 0
  };

  numbers.forEach(value => {
    const n = Number(value);
    if (n < 1 || n > 90) return;
    const start = Math.floor((n - 1) / 10) * 10 + 1;
    const key = `${start}-${start + 9}`;
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      result[key]++;
    }
  });

  return result;
}

function computeConsecutivePairs(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  let count = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === 1) count++;
  }
  return count;
}

function computeDescriptiveStats(draws, field = "winners") {
  const numbers = [];
  safeArray(draws).forEach(draw => {
    if (Array.isArray(draw[field])) {
      numbers.push(...draw[field]);
    }
  });

  const frequency = computeFrequency(numbers);
  const gaps = computeGaps(numbers);
  const parity = computeParity(numbers);

  const ranking = Object.entries(frequency)
    .map(([number, count]) => ({
      number: Number(number),
      count,
      gap: gaps[number]
    }))
    .sort((a, b) => b.count - a.count || a.number - b.number);

  return {
    totalNumbers: numbers.length,
    frequency,
    gaps,
    parity,
    sum: computeSum(numbers),
    span: computeSpan(numbers),
    decades: computeDecades(numbers),
    consecutivePairs: computeConsecutivePairs(numbers),
    ranking,
    hot: ranking.slice(0, 15),
    cold: [...ranking]
      .sort((a, b) => a.count - b.count || b.gap - a.gap)
      .slice(0, 15)
  };
}

/* ==========================================================================
   8. AFFINITÉS CALENDAIRES & ANALYSE PAR HEURE
   ========================================================================== */

function computeCalendarAffinity(targetDate, pastDraws, pastArchives) {
  const dow = getDayOfWeek(targetDate);
  const dom = getDayOfMonth(targetDate);
  const month = getMonth(targetDate);

  const dayNumbers = [];
  const monthDayNumbers = [];
  const monthNumbers = [];
  const yearsSet = new Set();

  pastDraws.forEach(draw => {
    const dt = parseISODate(draw.date);
    if (dt) yearsSet.add(dt.getUTCFullYear());

    if (getDayOfWeek(draw.date) === dow) dayNumbers.push(...draw.winners);
    if (getDayOfMonth(draw.date) === dom) monthDayNumbers.push(...draw.winners);
    if (getMonth(draw.date) === month) monthNumbers.push(...draw.winners);
  });

  const archiveNumbers = [];
  pastArchives.forEach(entry => {
    const dt = parseISODate(entry.date);
    if (dt) yearsSet.add(dt.getUTCFullYear());
    archiveNumbers.push(...entry.numeros);
  });

  return {
    dayOfWeek: computeFrequency(dayNumbers),
    dayOfMonth: computeFrequency(monthDayNumbers),
    month: computeFrequency(monthNumbers),
    archives: computeFrequency(archiveNumbers),
    yearsCount: yearsSet.size
  };
}

function getCalendarScore(number, affinity) {
  return (
    affinity.dayOfWeek[number] * 1.0 +
    affinity.dayOfMonth[number] * 0.8 +
    affinity.month[number] * 0.5 +
    affinity.archives[number] * 0.15
  );
}

function getNumbersFromDraws(draws, field = "winners") {
  const result = [];
  draws.forEach(draw => {
    if (Array.isArray(draw[field])) {
      result.push(...draw[field]);
    }
  });
  return result;
}

function calculateScoreForNumber(
  number,
  stats,
  sameHourStats,
  calendarAffinity,
  recentFrequency,
  totalDraws
) {
  const frequency = stats.frequency[number] || 0;
  const gap = stats.gaps[number] || 0;
  const sameHourFrequency = sameHourStats.frequency[number] || 0;
  const calendarScore = getCalendarScore(number, calendarAffinity);
  const recent = recentFrequency[number] || 0;

  const frequencyScore = totalDraws ? (frequency / totalDraws) * 30 : 0;
  const gapScore = totalDraws ? Math.min(gap / totalDraws, 1) * 12 : 0;
  const hourScore = sameHourFrequency * 2.5;
  const recentPenalty = recent * 0.35;
  const calendarComponent = Math.min(calendarScore, 20) * 0.6;

  const score =
    frequencyScore +
    gapScore +
    hourScore +
    calendarComponent -
    recentPenalty;

  return {
    number,
    score: Number(score.toFixed(4)),
    frequency,
    gap,
    sameHourFrequency,
    calendarScore,
    recent
  };
}

function analyzeForSpecificHour(targetDate, hourLabel) {
  const hour = normalizeHour(hourLabel);

  if (!isValidDate(targetDate)) {
    throw new Error("Date cible invalide.");
  }

  if (!ALL_HOURS.includes(hour)) {
    throw new Error("Heure de tirage invalide.");
  }

  const pastDraws = getDrawsStrictlyBefore(targetDate, hour);
  const pastArchives = getArchivesStrictlyBefore(targetDate);

  const winnerStats = computeDescriptiveStats(pastDraws, "winners");
  const machineStats = computeDescriptiveStats(pastDraws, "machines");

  const sameHourDraws = pastDraws.filter(draw => draw.hour === hour);
  const sameHourWinnerStats = computeDescriptiveStats(sameHourDraws, "winners");
  const sameHourMachineStats = computeDescriptiveStats(sameHourDraws, "machines");

  const recentDraws = pastDraws.slice(-MAX_RECENT_DRAWS);
  const recentWinnerFrequency = computeFrequency(getNumbersFromDraws(recentDraws, "winners"));
  const recentMachineFrequency = computeFrequency(getNumbersFromDraws(recentDraws, "machines"));

  const calendarAffinity = computeCalendarAffinity(targetDate, pastDraws, pastArchives);

  const winnerScores = [];
  const machineScores = [];

  for (let n = 1; n <= 90; n++) {
    winnerScores.push(
      calculateScoreForNumber(
        n,
        winnerStats,
        sameHourWinnerStats,
        calendarAffinity,
        recentWinnerFrequency,
        pastDraws.length
      )
    );

    machineScores.push(
      calculateScoreForNumber(
        n,
        machineStats,
        sameHourMachineStats,
        calendarAffinity,
        recentMachineFrequency,
        pastDraws.length
      )
    );
  }

  winnerScores.sort((a, b) => b.score - a.score || a.number - b.number);
  machineScores.sort((a, b) => b.score - a.score || a.number - b.number);

  return {
    targetDate,
    hour,
    pastDrawCount: pastDraws.length,
    archiveCount: pastArchives.length,
    sameHourCount: sameHourDraws.length,
    yearsCount: calendarAffinity.yearsCount,
    baseWinners: winnerScores.slice(0, 2),
    baseMachines: machineScores.slice(0, 2),
    winners: winnerScores.slice(0, 20),
    machines: machineScores.slice(0, 20),
    winnerStats,
    machineStats,
    calendarAffinity,
    pastDraws,
    pastArchives
  };
}

/* ==========================================================================
   9. MATRICE HYBRIDE & AFFICHAGE
   ========================================================================== */

function generateHybridMatrix(targetDate, hourLabel) {
  const analysis = analyzeForSpecificHour(targetDate, hourLabel);

  const winners = analysis.winners.slice(0, 15);
  const machines = analysis.machines.slice(0, 15);
  const matrix = [];

  for (let i = 0; i < 15; i++) {
    matrix.push({
      rank: i + 1,
      winner: winners[i]?.number ?? null,
      winnerScore: winners[i]?.score ?? null,
      machine: machines[i]?.number ?? null,
      machineScore: machines[i]?.score ?? null
    });
  }

  return {
    ...analysis,
    matrix
  };
}

function renderBalls(container, items, className = "ball") {
  if (!container) return;

  container.innerHTML = "";
  safeArray(items).forEach(item => {
    const number = typeof item === "object" ? item.number : item;
    const ball = document.createElement("span");
    ball.className = className;
    ball.textContent = pad2(number);

    if (typeof item === "object" && item.score !== undefined) {
      ball.title = `Score statistique : ${item.score}`;
    }

    container.appendChild(ball);
  });
}

function renderRanking(container, items) {
  if (!container) return;

  container.innerHTML = "";
  safeArray(items).forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "ranking-row";
    row.innerHTML = `
      <span class="ranking-position">${index + 1}</span>
      <strong>${pad2(item.number)}</strong>
      <span>Score : ${item.score}</span>
      <span>Fréquence : ${item.frequency}</span>
      <span>Retard : ${item.gap}</span>
    `;
    container.appendChild(row);
  });
}

function renderAnalysis(analysis) {
  currentAnalysis = analysis;

  renderBalls(
    $("predictedWinners"),
    analysis.winners.slice(0, 5),
    "ball ball-winner"
  );

  renderBalls(
    $("predictedMachines"),
    analysis.machines.slice(0, 5),
    "ball ball-machine"
  );

  renderRanking(
    $("statsAnalysis"),
    analysis.winners.slice(0, 15)
  );

  const baseW = (analysis.baseWinners || []).map(x => pad2(x.number)).join(" - ");
  const baseM = (analysis.baseMachines || []).map(x => pad2(x.number)).join(" - ");

  const formulaOutput = $("formulaOutput");
  if (formulaOutput) {
    formulaOutput.innerHTML = `
      <div>
        <strong>Analyse du ${escapeHTML(analysis.targetDate)}</strong>
        — ${escapeHTML(analysis.hour)}
      </div>
      <div>
        <strong>Base 2 boules Gagnants :</strong> ${escapeHTML(baseW)}
        • <strong>Base 2 boules Machines :</strong> ${escapeHTML(baseM)}
      </div>
      <div>
        Tirages antérieurs : ${analysis.pastDrawCount}
        • Archives : ${analysis.archiveCount}
        • Même heure (${escapeHTML(analysis.hour)}) : ${analysis.sameHourCount}
        • Années couvertes : ${analysis.yearsCount}
      </div>
      <small>
        Les scores sont des indicateurs statistiques descriptifs,
        pas des probabilités garanties.
      </small>
    `;
  }

  renderHybridMatrix(analysis.matrix || []);
  renderGeneralStatistics(analysis);
}

function renderHybridMatrix(matrix) {
  const container = $("hybridMatrix");
  if (!container) return;

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Rang</th>
          <th>Gagnant</th>
          <th>Score</th>
          <th>Machine</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        ${matrix.map(row => `
          <tr>
            <td>${row.rank}</td>
            <td>${row.winner === null ? "-" : pad2(row.winner)}</td>
            <td>${row.winnerScore ?? "-"}</td>
            <td>${row.machine === null ? "-" : pad2(row.machine)}</td>
            <td>${row.machineScore ?? "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderGeneralStatistics(analysis) {
  const container = $("generalStats");
  if (!container) return;

  const stats = analysis.winnerStats;
  const parity = stats.parity;

  container.innerHTML = `
    <div class="stat-card">
      <strong>Tirages analysés</strong>
      <span>${analysis.pastDrawCount}</span>
    </div>
    <div class="stat-card">
      <strong>Numéros pairs</strong>
      <span>${parity.even}</span>
    </div>
    <div class="stat-card">
      <strong>Numéros impairs</strong>
      <span>${parity.odd}</span>
    </div>
    <div class="stat-card">
      <strong>Somme observée</strong>
      <span>${stats.sum}</span>
    </div>
    <div class="stat-card">
      <strong>Amplitude</strong>
      <span>${stats.span}</span>
    </div>
    <div class="stat-card">
      <strong>Paires consécutives</strong>
      <span>${stats.consecutivePairs}</span>
    </div>
  `;
}

function calculateAnalysis() {
  clearMessage();

  const dateInput = $("targetDate");
  const date = dateInput?.value || todayLocalISO();

  if (!isValidDate(date)) {
    showMessage("Veuillez choisir une date valide.", "error");
    return;
  }

  try {
    const analysis = generateHybridMatrix(date, selectedHour);
    renderAnalysis(analysis);
    showMessage(`Analyse terminée : ${date} à ${selectedHour}.`, "success");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Erreur pendant l'analyse.", "error");
  }
}

/* ==========================================================================
   10. ANALYSE DES HORAIRES (01H À 23H)
   ========================================================================== */

function renderHourButtons() {
  const container = $("hoursGrid");
  if (!container) return;

  const existingButtons = Array.from(container.querySelectorAll(".hour-btn"));
  if (existingButtons.length > 0) {
    const activeBtn = container.querySelector(".hour-btn.active");
    if (activeBtn && activeBtn.dataset.hour) {
      selectedHour = normalizeHour(activeBtn.dataset.hour) || selectedHour;
    }

    existingButtons.forEach(button => {
      const hour = normalizeHour(button.dataset.hour || button.textContent);
      if (!hour) return;
      button.classList.toggle("active", hour === selectedHour);

      if (!button.dataset.bound) {
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
          selectedHour = hour;
          if ($("hourCoeff")) $("hourCoeff").value = selectedHour;
          renderHourButtons();
          calculateAnalysis();
        });
      }
    });
    return;
  }

  container.innerHTML = "";
  ALL_HOURS.forEach(hour => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = hour;
    button.className = hour === selectedHour ? "hour-btn active" : "hour-btn";

    button.addEventListener("click", () => {
      selectedHour = hour;
      if ($("hourCoeff")) $("hourCoeff").value = selectedHour;
      renderHourButtons();
      calculateAnalysis();
    });

    container.appendChild(button);
  });
}

function renderAllHoursSchedule() {
  let container = $("allHoursSchedule");
  if (!container) {
    const anchor = $("statsAnalysis")?.closest(".card") || $("statsAnalysis")?.parentElement;
    if (!anchor) return;

    const section = document.createElement("section");
    section.id = "allHoursScheduleSection";
    section.className = "card";
    section.innerHTML = `
      <h2>🕒 Analyse complète par heure (01H → 23H)</h2>
      <div id="allHoursSchedule" class="all-hours-grid"></div>
    `;
    anchor.insertAdjacentElement("afterend", section);
    container = $("allHoursSchedule");
  }

  const date = $("targetDate")?.value || todayLocalISO();
  container.innerHTML = "";

  ALL_HOURS.forEach(hour => {
    let analysis;
    try {
      analysis = analyzeForSpecificHour(date, hour);
    } catch {
      return;
    }

    const base2W = analysis.baseWinners.map(x => pad2(x.number)).join(" - ");
    const base2M = analysis.baseMachines.map(x => pad2(x.number)).join(" - ");
    const top5W = analysis.winners.slice(0, 5).map(x => pad2(x.number)).join(" - ");
    const top5M = analysis.machines.slice(0, 5).map(x => pad2(x.number)).join(" - ");

    const card = document.createElement("div");
    card.className = "hour-analysis-card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>${hour}</strong>
        <small>${analysis.sameHourCount} réf. ${hour} • ${analysis.pastDrawCount} tirages</small>
      </div>
      <div><strong>Base 2 Gagnants :</strong> ${base2W} • <strong>Base 2 Machines :</strong> ${base2M}</div>
      <div><strong>Top 5 Gagnants :</strong> ${top5W}</div>
      <div><strong>Top 5 Machines :</strong> ${top5M}</div>
    `;
    container.appendChild(card);
  });
}

/* ==========================================================================
   11. HISTORIQUE ACTUEL, AJOUT, SUPPRESSION & FILTRES
   ========================================================================== */

function ensureHistoryFiltersUI() {
  const listContainer = $("historyList");
  if (!listContainer || $("historyFiltersBar")) return;

  const bar = document.createElement("div");
  bar.id = "historyFiltersBar";
  bar.className = "history-filters";
  bar.style.marginBottom = "12px";

  const optionsHTML = ALL_HOURS.map(h => `<option value="${h}">${h}</option>`).join("");

  bar.innerHTML = `
    <div class="date-grid">
      <div class="form-group">
        <label for="historyDateFilter">Filtrer par date</label>
        <input type="date" id="historyDateFilter">
      </div>
      <div class="form-group">
        <label for="historyHourFilter">Filtrer par heure</label>
        <select id="historyHourFilter">
          <option value="ALL">Toutes les heures</option>
          ${optionsHTML}
        </select>
      </div>
    </div>
    <button type="button" id="btnResetHistoryFilters" class="btn-secondary">
      Tout afficher
    </button>
  `;

  listContainer.insertAdjacentElement("beforebegin", bar);

  $("btnResetHistoryFilters")?.addEventListener("click", () => {
    historyDateFilter = "";
    historyHourFilter = "ALL";
    if ($("historyDateFilter")) $("historyDateFilter").value = "";
    if ($("historyHourFilter")) $("historyHourFilter").value = "ALL";
    renderHistory();
  });
}

function renderHistory() {
  ensureHistoryFiltersUI();
  const container = $("historyList");
  if (!container) return;

  let filtered = [...drawHistory];

  if (historyDateFilter) {
    filtered = filtered.filter(draw => draw.date === historyDateFilter);
  }

  if (historyHourFilter !== "ALL") {
    filtered = filtered.filter(draw => draw.hour === historyHourFilter);
  }

  filtered.sort((a, b) => compareDraws(b, a));

  if (!filtered.length) {
    container.innerHTML = "<p class=\"empty-message\">Aucun tirage trouvé.</p>";
    renderAppInformation();
    return;
  }

  container.innerHTML = filtered.map(draw => `
    <div class="history-item">
      <div class="history-header">
        <strong>${escapeHTML(draw.date)}</strong>
        <span>${escapeHTML(draw.hour)}</span>
      </div>

      <div class="history-row">
        <strong>Gagnants :</strong>
        <div class="history-balls">
          ${draw.winners.map(n => `<span class="ball ball-winner history-ball">${pad2(n)}</span>`).join("")}
        </div>
      </div>

      <div class="history-row">
        <strong>Machines :</strong>
        <div class="history-balls">
          ${draw.machines.map(n => `<span class="ball ball-machine history-ball">${pad2(n)}</span>`).join("")}
        </div>
      </div>

      <button
        type="button"
        class="btn-danger-small delete-draw-btn"
        data-date="${escapeHTML(draw.date)}"
        data-hour="${escapeHTML(draw.hour)}"
      >
        Supprimer
      </button>
    </div>
  `).join("");

  container.querySelectorAll(".delete-draw-btn").forEach(button => {
    button.addEventListener("click", () => {
      deleteDraw(button.dataset.date, button.dataset.hour);
    });
  });

  renderAppInformation();
}

function deleteDraw(date, hour) {
  const confirmed = window.confirm(`Supprimer le tirage du ${date} à ${hour} ?`);
  if (!confirmed) return;

  drawHistory = drawHistory.filter(draw => !(draw.date === date && draw.hour === hour));
  saveHistory();
  renderHistory();
  calculateAnalysis();
  showMessage("Tirage supprimé.", "success");
}

function parseInputNumbers(value) {
  return String(value || "")
    .split(/[\s,;|/-]+/)
    .filter(Boolean)
    .map(Number);
}

function handleAddDraw(event) {
  event?.preventDefault();

  const date = $("drawDateInput")?.value || "";
  const hour = normalizeHour($("drawHourInput")?.value || "");
  const winners = parseInputNumbers($("winnersInput")?.value || "");
  const machines = parseInputNumbers($("machinesInput")?.value || "");

  if (!isValidDate(date)) {
    showMessage("Date du tirage invalide.", "error");
    return;
  }

  if (!ALL_HOURS.includes(hour)) {
    showMessage("Heure du tirage invalide.", "error");
    return;
  }

  if (!validateNumberList(winners, WINNER_COUNT)) {
    showMessage("Les gagnants doivent contenir exactement 5 numéros différents entre 1 et 90.", "error");
    return;
  }

  if (!validateNumberList(machines, MACHINE_COUNT)) {
    showMessage("Les machines doivent contenir exactement 5 numéros différents entre 1 et 90.", "error");
    return;
  }

  const entry = normalizeEntry({ date, hour, winners, machines });
  if (!entry) {
    showMessage("Impossible de valider ce tirage.", "error");
    return;
  }

  const existingIndex = drawHistory.findIndex(draw => draw.date === date && draw.hour === hour);
  if (existingIndex >= 0) {
    const replace = window.confirm("Un tirage existe déjà à cette date et cette heure. Le remplacer ?");
    if (!replace) return;
    drawHistory[existingIndex] = entry;
  } else {
    drawHistory.push(entry);
  }

  drawHistory = deduplicateCurrentHistory(drawHistory);
  saveHistory();
  renderHistory();
  calculateAnalysis();

  const form = $("addDrawForm");
  if (form) form.reset();

  showMessage("Tirage ajouté avec succès.", "success");
}

/* ==========================================================================
   12. ARCHIVES, IMPORT / EXPORT JSON & BACKTESTING
   ========================================================================== */

function renderArchiveHistory() {
  const container = $("archiveHistoryList");
  if (!container) return;

  const sorted = [...archiveHistory].sort((a, b) => b.date.localeCompare(a.date));
  if (!sorted.length) {
    container.innerHTML = "<p>Aucune archive importée.</p>";
    renderAppInformation();
    return;
  }

  container.innerHTML = sorted.map(entry => `
    <div class="archive-item">
      <strong>${escapeHTML(entry.date)}</strong>
      <span>${entry.numeros.map(n => pad2(n)).join(" - ")}</span>
    </div>
  `).join("");

  renderAppInformation();
}

function importCurrentHistory(data) {
  const incoming = Array.isArray(data) ? data : safeArray(data?.history || data?.drawHistory);
  const valid = incoming.map(normalizeEntry).filter(Boolean);
  drawHistory = deduplicateCurrentHistory([...drawHistory, ...valid]);
  saveHistory();
  return { imported: valid.length, total: drawHistory.length };
}

function importArchiveHistory(data) {
  const incoming = Array.isArray(data) ? data : safeArray(data?.archives || data?.archiveHistory);
  const valid = incoming.map(normalizeArchiveEntry).filter(Boolean);
  archiveHistory = deduplicateArchiveHistory([...archiveHistory, ...valid]);
  saveArchiveHistory();
  return { imported: valid.length, total: archiveHistory.length };
}

async function handleJSONImport(file, type = "current") {
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (type === "archive") {
      const result = importArchiveHistory(data);
      renderArchiveHistory();
      calculateAnalysis();
      showMessage(`${result.imported} archive(s) valide(s). Total : ${result.total}.`, "success");
    } else {
      const result = importCurrentHistory(data);
      renderHistory();
      calculateAnalysis();
      showMessage(`${result.imported} tirage(s) valide(s). Total : ${result.total}.`, "success");
    }
  } catch (error) {
    console.error(error);
    showMessage("Fichier JSON invalide ou illisible.", "error");
  }
}

function exportJSON(type = "current") {
  const data = type === "archive" ? archiveHistory : drawHistory;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = type === "archive" ? "loto590_archives.json" : "loto590_historique.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function intersectionCount(a, b) {
  const set = new Set(a);
  return b.filter(value => set.has(value)).length;
}

function createRandomCombination(count = 5) {
  const numbers = [];
  while (numbers.length < count) {
    const n = Math.floor(Math.random() * 90) + 1;
    if (!numbers.includes(n)) numbers.push(n);
  }
  return numbers.sort((a, b) => a - b);
}

function theoreticalExpectedHits(topK, drawSize = 5) {
  return (topK * drawSize) / 90;
}

function runBacktest(topK = 15, minHistory = 20, source = "current") {
  const dataset = source === "archive"
    ? [...archiveHistory].sort((a, b) => a.date.localeCompare(b.date))
    : [...drawHistory].sort(compareDraws);

  const results = [];
  if (dataset.length <= minHistory) {
    return {
      error: `Historique insuffisant : ${dataset.length} entrée(s).`,
      results: []
    };
  }

  for (let i = minHistory; i < dataset.length; i++) {
    const target = dataset[i];
    const actualNumbers = source === "archive" ? target.numeros : target.winners;
    const previousNumbers = [];

    for (let j = 0; j < i; j++) {
      previousNumbers.push(...(source === "archive" ? dataset[j].numeros : dataset[j].winners));
    }

    const frequency = computeFrequency(previousNumbers);
    const gaps = computeGaps(previousNumbers);
    const ranked = [];

    for (let n = 1; n <= 90; n++) {
      const score = (frequency[n] || 0) * 2 - (gaps[n] || 0) * 0.05;
      ranked.push({ number: n, score });
    }

    ranked.sort((a, b) => b.score - a.score || a.number - b.number);
    const predicted = ranked.slice(0, Math.min(topK, 90)).map(item => item.number);
    const hits = intersectionCount(predicted, actualNumbers);
    const random = createRandomCombination(Math.min(topK, 90));
    const randomHits = intersectionCount(random, actualNumbers);

    results.push({
      date: target.date,
      predicted,
      actual: actualNumbers,
      hits,
      randomHits
    });
  }

  const totalHits = results.reduce((sum, row) => sum + row.hits, 0);
  const totalRandomHits = results.reduce((sum, row) => sum + row.randomHits, 0);
  const count = results.length;

  return {
    source,
    topK,
    minHistory,
    count,
    results,
    totalHits,
    totalRandomHits,
    averageHits: count ? totalHits / count : 0,
    averageRandomHits: count ? totalRandomHits / count : 0,
    theoreticalAverage: theoreticalExpectedHits(topK, source === "archive" ? 6 : 5)
  };
}

function renderBacktestReport(report) {
  const container = $("backtestReport");
  if (!container) return;

  if (report.error) {
    container.textContent = report.error;
    return;
  }

  currentBacktest = report;
  container.innerHTML = `
    <h3>Résultats du backtesting</h3>
    <div class="backtest-summary">
      <p>Source : ${escapeHTML(report.source)}</p>
      <p>Nombre de tests : ${report.count}</p>
      <p>Top analysé : ${report.topK}</p>
      <p>Moyenne des touches de l'analyse : <strong>${report.averageHits.toFixed(3)}</strong></p>
      <p>Moyenne aléatoire : <strong>${report.averageRandomHits.toFixed(3)}</strong></p>
      <p>Espérance théorique aléatoire : <strong>${report.theoreticalAverage.toFixed(3)}</strong></p>
    </div>
    <p>Une différence observée sur un échantillon limité ne prouve pas que la méthode prédit les prochains tirages.</p>
    <div class="backtest-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Touches analyse</th>
            <th>Touches aléatoires</th>
          </tr>
        </thead>
        <tbody>
          ${report.results.slice(-100).map(row => `
            <tr>
              <td>${escapeHTML(row.date)}</td>
              <td>${row.hits}</td>
              <td>${row.randomHits}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function handleBacktest() {
  const topK = Math.max(1, Math.min(90, Number($("backtestTopK")?.value || 15)));
  const minHistory = Math.max(1, Number($("backtestMinHistory")?.value || 20));
  const source = $("backtestSource")?.value || "current";
  renderBacktestReport(runBacktest(topK, minHistory, source));
}

/* ==========================================================================
   13. OCR, FILTRES, SYNCHRO DATES & INITIALISATION
   ========================================================================== */

function extractDateFromOCR(text) {
  const match = String(text).match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (!match) return null;
  const date = `${match[1]}-${pad2(match[2])}-${pad2(match[3])}`;
  return isValidDate(date) ? date : null;
}

function extractHourFromOCR(text) {
  const match = String(text).toUpperCase().match(/\b(0?[1-9]|1\d|2[0-3])\s*H(?:00)?\b/);
  if (!match) return null;
  const hour = normalizeHour(`${match[1]}H`);
  return ALL_HOURS.includes(hour) ? hour : null;
}

function extractDrawFromOCRText(text) {
  const lines = String(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const date = extractDateFromOCR(text);
  const hour = extractHourFromOCR(text);

  let candidate = null;
  for (const line of lines) {
    const valid = (line.match(/\b\d{1,2}\b/g) || []).map(Number).filter(n => n >= 1 && n <= 90);
    if (valid.length >= 10) {
      candidate = valid.slice(0, 10);
      break;
    }
  }

  if (!candidate) {
    const filtered = (String(text).match(/\b\d{1,2}\b/g) || []).map(Number).filter(n => n >= 1 && n <= 90);
    if (filtered.length >= 10) {
      candidate = filtered.slice(0, 10);
    }
  }

  if (!candidate) {
    return {
      date,
      hour,
      winners: [],
      machines: [],
      warning: "Les dix numéros n'ont pas été identifiés."
    };
  }

  return {
    date,
    hour,
    winners: candidate.slice(0, 5),
    machines: candidate.slice(5, 10),
    warning: "Vérifie les numéros avant de les enregistrer."
  };
}

async function handleOCRFile(file) {
  if (!file) return;
  const status = $("ocrStatus");
  if (status) status.textContent = "Lecture de l'image en cours...";

  if (!window.Tesseract) {
    if (status) status.textContent = "Tesseract.js n'est pas chargé.";
    return;
  }

  try {
    const result = await window.Tesseract.recognize(file, "eng", {
      logger: message => {
        if (status && message.status) {
          const progress = Math.round((message.progress || 0) * 100);
          status.textContent = `${message.status} : ${progress}%`;
        }
      }
    });

    const extracted = extractDrawFromOCRText(result.data.text);
    if ($("drawDateInput") && extracted.date) $("drawDateInput").value = extracted.date;
    if ($("drawHourInput") && extracted.hour) $("drawHourInput").value = extracted.hour;
    if ($("winnersInput")) $("winnersInput").value = extracted.winners.join(" ");
    if ($("machinesInput")) $("machinesInput").value = extracted.machines.join(" ");

    if (status) {
      status.textContent = extracted.warning || "Lecture terminée. Vérifie les informations.";
    }
    showMessage("Lecture OCR terminée. Vérifie les numéros avant l'enregistrement.", "info");
  } catch (error) {
    console.error("OCR :", error);
    if (status) status.textContent = "Erreur pendant la lecture OCR.";
  }
}

function bindHistoryFilters() {
  ensureHistoryFiltersUI();
  const dateFilter = $("historyDateFilter");
  const hourFilter = $("historyHourFilter");

  if (dateFilter && !dateFilter.dataset.bound) {
    dateFilter.dataset.bound = "true";
    dateFilter.addEventListener("change", () => {
      historyDateFilter = dateFilter.value;
      renderHistory();
    });
  }

  if (hourFilter && !hourFilter.dataset.bound) {
    hourFilter.dataset.bound = "true";
    hourFilter.addEventListener("change", () => {
      historyHourFilter = hourFilter.value || "ALL";
      renderHistory();
    });
  }
}

function syncDayInputsFromDate(dateStr, dateCurrent, datePrev) {
  const parsed = parseISODate(dateStr);
  if (!parsed) return;
  const day = parsed.getUTCDate();
  if (dateCurrent) dateCurrent.value = String(day);
  if (datePrev) datePrev.value = String(day > 1 ? day - 1 : 30);
}

function bindDateSync() {
  const targetDate = $("targetDate");
  const dateCurrent = $("dateCurrent");
  const datePrev = $("datePrev");

  if (targetDate) {
    if (!targetDate.value) targetDate.value = todayLocalISO();
    syncDayInputsFromDate(targetDate.value, dateCurrent, datePrev);

    targetDate.addEventListener("change", () => {
      syncDayInputsFromDate(targetDate.value, dateCurrent, datePrev);
      calculateAnalysis();
      if ($("allHoursSchedule")) renderAllHoursSchedule();
    });
  }

  if (dateCurrent && targetDate) {
    dateCurrent.addEventListener("change", () => {
      const day = Math.min(31, Math.max(1, Number(dateCurrent.value) || 1));
      dateCurrent.value = String(day);
      const parts = (targetDate.value || todayLocalISO()).split("-");
      targetDate.value = `${parts[0]}-${parts[1]}-${pad2(day)}`;
      if (datePrev) datePrev.value = String(day > 1 ? day - 1 : 30);
      calculateAnalysis();
      if ($("allHoursSchedule")) renderAllHoursSchedule();
    });
  }

  if (datePrev) {
    datePrev.addEventListener("change", () => {
      const prev = Math.min(31, Math.max(1, Number(datePrev.value) || 1));
      datePrev.value = String(prev);
      calculateAnalysis();
    });
  }
}

function bindHourButtons() {
  renderHourButtons();
}

function bindOCRUpload() {
  const input = $("imageUploadInput");
  if (!input) return;

  input.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) handleOCRFile(file);
  });
}

function bindJSONTools() {
  const currentInput = $("importJSONInput");
  const archiveInput = $("importArchiveJSONInput");

  if (currentInput) {
    currentInput.addEventListener("change", event => {
      handleJSONImport(event.target.files?.[0], "current");
      event.target.value = "";
    });
  }

  if (archiveInput) {
    archiveInput.addEventListener("change", event => {
      handleJSONImport(event.target.files?.[0], "archive");
      event.target.value = "";
    });
  }

  $("btnExportJSON")?.addEventListener("click", () => exportJSON("current"));
  $("btnExportArchiveJSON")?.addEventListener("click", () => exportJSON("archive"));
  $("btnImportJSON")?.addEventListener("click", () => currentInput?.click());
  $("btnImportArchiveJSON")?.addEventListener("click", () => archiveInput?.click());
}

function bindBacktestUI() {
  $("btnRunBacktest")?.addEventListener("click", handleBacktest);
}

function bindMainButtons() {
  $("btnCalculate")?.addEventListener("click", calculateAnalysis);
  $("addDrawForm")?.addEventListener("submit", handleAddDraw);

  if (!$("btnRenderSchedule")) {
    const calcBtn = $("btnCalculate");
    if (calcBtn) {
      const schedBtn = document.createElement("button");
      schedBtn.type = "button";
      schedBtn.id = "btnRenderSchedule";
      schedBtn.className = "btn-secondary";
      schedBtn.style.marginTop = "8px";
      schedBtn.textContent = "🕒 ANALYSER TOUTES LES HEURES (01H → 23H)";
      schedBtn.addEventListener("click", renderAllHoursSchedule);
      calcBtn.insertAdjacentElement("afterend", schedBtn);
    }
  } else {
    $("btnRenderSchedule").addEventListener("click", renderAllHoursSchedule);
  }

  $("btnReset")?.addEventListener("click", () => {
    const confirmed = window.confirm("Réinitialiser la base locale avec SEED_HISTORY ?");
    if (!confirmed) return;

    drawHistory = deduplicateCurrentHistory(SEED_HISTORY);
    saveHistory();
    renderHistory();
    calculateAnalysis();
    showMessage("Historique réinitialisé avec SEED_HISTORY.", "success");
  });
}

function ensureBacktestUI() {
  if ($("backtestReport")) return;
  const anchor = $("statsAnalysis")?.parentElement;
  if (!anchor) return;

  const section = document.createElement("section");
  section.id = "backtestSection";
  section.innerHTML = `
    <h3>Backtesting statistique</h3>

    <label for="backtestTopK">Nombre de numéros analysés</label>
    <input id="backtestTopK" type="number" min="1" max="90" value="15">

    <label for="backtestMinHistory">Historique minimum</label>
    <input id="backtestMinHistory" type="number" min="1" value="20">

    <label for="backtestSource">Source</label>
    <select id="backtestSource">
      <option value="current">Tirages actuels</option>
      <option value="archive">Archives historiques</option>
    </select>

    <button id="btnRunBacktest" type="button">
      Lancer le backtesting
    </button>

    <div id="backtestReport"></div>
  `;
  anchor.after(section);
}

function ensureDataToolsUI() {
  if ($("dataToolsSection")) return;
  const anchor = $("historyList");
  if (!anchor) return;

  const section = document.createElement("section");
  section.id = "dataToolsSection";
  section.innerHTML = `
    <h3>Gestion des données</h3>

    <div>
      <button id="btnExportJSON" type="button">Exporter l'historique</button>
      <button id="btnImportJSON" type="button">Importer l'historique</button>
      <input id="importJSONInput" type="file" accept=".json,application/json" hidden>
    </div>

    <div>
      <button id="btnExportArchiveJSON" type="button">Exporter les archives</button>
      <button id="btnImportArchiveJSON" type="button">Importer les archives</button>
      <input id="importArchiveJSONInput" type="file" accept=".json,application/json" hidden>
    </div>

    <h3>Archives historiques</h3>
    <div id="archiveHistoryList"></div>
  `;
  anchor.after(section);
}

function renderAppInformation() {
  const version = $("appVersion");
  if (version) version.textContent = `Version ${APP_VERSION}`;

  const currentCount = $("currentHistoryCount");
  if (currentCount) currentCount.textContent = String(drawHistory.length);

  const archiveCount = $("archiveHistoryCount");
  if (archiveCount) archiveCount.textContent = String(archiveHistory.length);
}

function initializeApp() {
  if (isInitialized) return;
  isInitialized = true;

  loadHistory();
  loadArchiveHistory();

  ensureBacktestUI();
  ensureDataToolsUI();

  bindDateSync();
  bindHourButtons();
  bindOCRUpload();
  bindHistoryFilters();
  bindJSONTools();
  bindBacktestUI();
  bindMainButtons();

  renderHistory();
  renderArchiveHistory();
  renderAppInformation();

  if ($("targetDate")) {
    calculateAnalysis();
  }

  console.info(`LOTO 5/90 RESEARCH LAB v${APP_VERSION} initialisé.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp, { once: true });
} else {
  initializeApp();
}

window.Loto590 = {
  version: APP_VERSION,
  get history() {
    return [...drawHistory];
  },
  get archives() {
    return [...archiveHistory];
  },
  analyze: analyzeForSpecificHour,
  calculate: calculateAnalysis,
  allHours: renderAllHoursSchedule,
  addDraw(entry) {
    const normalized = normalizeEntry(entry);
    if (!normalized) throw new Error("Tirage invalide.");
    drawHistory = deduplicateCurrentHistory([...drawHistory, normalized]);
    saveHistory();
    renderHistory();
    return normalized;
  },
  addArchive(entry) {
    const normalized = normalizeArchiveEntry(entry);
    if (!normalized) throw new Error("Archive invalide.");
    archiveHistory = deduplicateArchiveHistory([...archiveHistory, normalized]);
    saveArchiveHistory();
    renderArchiveHistory();
    return normalized;
  },
  backtest: runBacktest,
  exportCurrent() {
    return JSON.stringify(drawHistory, null, 2);
  },
  exportArchives() {
    return JSON.stringify(archiveHistory, null, 2);
  },
  stats(draws = drawHistory) {
    return computeDescriptiveStats(draws, "winners");
  }
};
