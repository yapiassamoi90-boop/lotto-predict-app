/* ==========================================================================
   LOTO 5/90 ANALYZER PRO — app.js (v11.3 — Dev.Assamoi / H@B)
   ========================================================================== */

const STORAGE_KEY = 'loto590_history_v11';
const HOURS_LIST = ['07H', '08H', '10H', '13H', '16H', '18H', '21H', '22H', '23H'];
const DAY_NAMES_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/* --------------------------------------------------------------------------
   1. BASE HISTORIQUE INITIALE (SEED_HISTORY)
   -------------------------------------------------------------------------- */
const SEED_HISTORY = [
  // --- 19/11/2026 (Jeudi) ---
  { date: '2026-11-19', hour: '13H', winners: [77, 84, 27, 38, 82], machines: [52, 61, 49, 19, 14] },
  { date: '2026-11-19', hour: '10H', winners: [90, 51, 74, 48, 13], machines: [82, 25, 83, 52, 59] },
  { date: '2026-11-19', hour: '08H', winners: [17, 26, 87, 21, 68], machines: [2, 1, 7, 73, 74] },
  { date: '2026-11-19', hour: '07H', winners: [42, 58, 74, 19, 30], machines: [81, 24, 27, 21, 39] },

  // --- 18/11/2026 (Mercredi) ---
  { date: '2026-11-18', hour: '23H', winners: [7, 81, 82, 85, 40], machines: [42, 31, 19, 26, 79] },
  { date: '2026-11-18', hour: '22H', winners: [17, 3, 72, 34, 85], machines: [14, 73, 62, 41, 22] },
  { date: '2026-11-18', hour: '21H', winners: [41, 42, 48, 72, 38], machines: [47, 56, 18, 22, 20] },
  { date: '2026-11-18', hour: '18H', winners: [78, 13, 25, 90, 44], machines: [77, 23, 9, 7, 80] },
  { date: '2026-11-18', hour: '16H', winners: [85, 73, 34, 16, 47], machines: [22, 13, 14, 36, 64] },
  { date: '2026-11-18', hour: '13H', winners: [37, 42, 38, 36, 18], machines: [81, 19, 26, 10, 44] },
  { date: '2026-11-18', hour: '10H', winners: [82, 54, 2, 49, 19], machines: [43, 5, 11, 37, 6] },
  { date: '2026-11-18', hour: '08H', winners: [47, 86, 10, 63, 46], machines: [67, 38, 71, 32, 74] },
  { date: '2026-11-18', hour: '07H', winners: [70, 66, 61, 29, 75], machines: [39, 81, 40, 8, 17] },

  // --- 17/11/2026 (Mardi) ---
  { date: '2026-11-17', hour: '23H', winners: [69, 88, 52, 1, 35], machines: [39, 8, 64, 22, 71] },
  { date: '2026-11-17', hour: '22H', winners: [56, 78, 75, 14, 4], machines: [67, 89, 6, 87, 18] },
  { date: '2026-11-17', hour: '21H', winners: [77, 56, 29, 49, 10], machines: [21, 81, 43, 54, 28] },
  { date: '2026-11-17', hour: '18H', winners: [65, 36, 87, 19, 73], machines: [86, 7, 9, 76, 32] },
  { date: '2026-11-17', hour: '16H', winners: [65, 23, 40, 41, 50], machines: [26, 59, 13, 22, 7] },
  { date: '2026-11-17', hour: '13H', winners: [50, 21, 59, 85, 25], machines: [3, 35, 5, 27, 28] },
  { date: '2026-11-17', hour: '10H', winners: [9, 13, 21, 29, 38], machines: [58, 78, 57, 44, 70] },
  { date: '2026-11-17', hour: '08H', winners: [73, 63, 49, 70, 16], machines: [28, 37, 50, 82, 10] },
  { date: '2026-11-17', hour: '07H', winners: [20, 15, 88, 81, 80], machines: [25, 41, 82, 58, 56] },

  // --- 16/11/2026 (Lundi) ---
  { date: '2026-11-16', hour: '23H', winners: [3, 20, 13, 50, 25], machines: [30, 86, 51, 46, 26] },
  { date: '2026-11-16', hour: '22H', winners: [20, 30, 13, 87, 59], machines: [22, 90, 35, 80, 3] },
  { date: '2026-11-16', hour: '21H', winners: [60, 15, 51, 48, 41], machines: [71, 24, 4, 5, 57] },
  { date: '2026-11-16', hour: '18H', winners: [68, 3, 58, 6, 38], machines: [15, 21, 13, 84, 69] },
  { date: '2026-11-16', hour: '16H', winners: [76, 29, 60, 19, 67], machines: [24, 81, 10, 18, 49] },
  { date: '2026-11-16', hour: '13H', winners: [65, 79, 88, 87, 45], machines: [2, 29, 59, 28, 46] },
  { date: '2026-11-16', hour: '10H', winners: [24, 65, 54, 63, 45], machines: [51, 8, 20, 28, 59] },
  { date: '2026-11-16', hour: '08H', winners: [48, 38, 21, 5, 68], machines: [36, 57, 73, 59, 78] },
  { date: '2026-11-16', hour: '07H', winners: [19, 54, 37, 39, 20], machines: [64, 10, 38, 82, 62] },

  // --- 15/11/2026 (Dimanche) ---
  { date: '2026-11-15', hour: '23H', winners: [15, 56, 39, 76, 21], machines: [59, 65, 68, 25, 26] },
  { date: '2026-11-15', hour: '22H', winners: [60, 83, 33, 63, 89], machines: [11, 22, 78, 44, 75] },
  { date: '2026-11-15', hour: '21H', winners: [65, 48, 77, 15, 14], machines: [36, 79, 21, 82, 30] },
  { date: '2026-11-15', hour: '20H', winners: [71, 52, 14, 37, 3], machines: [33, 70, 12, 47, 8] },
  { date: '2026-11-15', hour: '18H', winners: [81, 85, 58, 51, 71], machines: [43, 50, 38, 18, 66] },
  { date: '2026-11-15', hour: '16H', winners: [76, 64, 63, 48, 16], machines: [36, 30, 3, 34, 37] },
  { date: '2026-11-15', hour: '13H', winners: [29, 11, 28, 35, 43], machines: [38, 54, 37, 75, 59] },
  { date: '2026-11-15', hour: '10H', winners: [64, 33, 16, 22, 71], machines: [37, 90, 11, 35, 2] },
  { date: '2026-11-15', hour: '08H', winners: [79, 62, 10, 81, 88], machines: [83, 34, 75, 76, 16] },
  { date: '2026-11-15', hour: '07H', winners: [58, 83, 78, 49, 79], machines: [13, 74, 71, 39, 31] },
  { date: '2026-11-15', hour: '03H', winners: [60, 35, 50, 33, 53], machines: [79, 52, 41, 81, 30] },
  { date: '2026-11-15', hour: '01H', winners: [26, 18, 63, 53, 1], machines: [21, 88, 77, 46, 60] },

  // --- 30/10/2026 (Vendredi) ---
  { date: '2026-10-30', hour: '23H', winners: [1, 51, 88, 19, 60], machines: [47, 37, 23, 82, 21] },
  { date: '2026-10-30', hour: '22H', winners: [77, 64, 36, 78, 38], machines: [87, 66, 47, 61, 43] },
  { date: '2026-10-30', hour: '21H', winners: [17, 16, 57, 56, 60], machines: [38, 10, 28, 11, 25] },
  { date: '2026-10-30', hour: '18H', winners: [16, 7, 9, 40, 36], machines: [67, 42, 30, 53, 38] },
  { date: '2026-10-30', hour: '16H', winners: [39, 22, 75, 67, 74], machines: [80, 76, 43, 44, 43] },
  { date: '2026-10-30', hour: '13H', winners: [19, 52, 70, 35, 81], machines: [28, 69, 1, 5, 74] },
  { date: '2026-10-30', hour: '10H', winners: [76, 33, 70, 64, 67], machines: [73, 82, 43, 88, 19] },
  { date: '2026-10-30', hour: '08H', winners: [60, 22, 72, 59, 46], machines: [3, 8, 20, 56, 2] },
  { date: '2026-10-30', hour: '07H', winners: [80, 27, 18, 2, 76], machines: [21, 25, 77, 70, 31] },

  // --- 29/10/2026 (Jeudi) ---
  { date: '2026-10-29', hour: '21H', winners: [72, 22, 10, 41, 11], machines: [38, 15, 45, 7, 13] },
  { date: '2026-10-29', hour: '18H', winners: [33, 38, 4, 82, 55], machines: [3, 10, 53, 65, 70] },
  { date: '2026-10-29', hour: '16H', winners: [83, 70, 51, 82, 49], machines: [31, 80, 38, 47, 78] },
  { date: '2026-10-29', hour: '13H', winners: [68, 8, 69, 3, 42], machines: [4, 39, 87, 76, 60] },
  { date: '2026-10-29', hour: '10H', winners: [84, 57, 45, 50, 79], machines: [21, 42, 76, 69, 3] },
  { date: '2026-10-29', hour: '08H', winners: [38, 11, 53, 7, 18], machines: [36, 48, 20, 64, 43] },
  { date: '2026-10-29', hour: '07H', winners: [23, 35, 17, 20, 15], machines: [52, 44, 31, 88, 10] },

  // --- 29/09/2026 (Mardi) ---
  { date: '2026-09-29', hour: '23H', winners: [68, 39, 48, 63, 61], machines: [15, 28, 32, 40, 24] },
  { date: '2026-09-29', hour: '22H', winners: [66, 51, 45, 59, 10], machines: [27, 75, 7, 72, 21] },
  { date: '2026-09-29', hour: '21H', winners: [63, 10, 3, 36, 71], machines: [76, 80, 69, 60, 58] },
  { date: '2026-09-29', hour: '18H', winners: [1, 6, 90, 59, 57], machines: [81, 77, 19, 35, 32] },
  { date: '2026-09-29', hour: '16H', winners: [26, 31, 73, 14, 29], machines: [25, 59, 6, 64, 10] },
  { date: '2026-09-29', hour: '13H', winners: [48, 74, 13, 56, 36], machines: [31, 57, 89, 45, 80] },
  { date: '2026-09-29', hour: '10H', winners: [36, 23, 64, 6, 62], machines: [14, 52, 73, 19, 29] },
  { date: '2026-09-29', hour: '08H', winners: [9, 14, 38, 33, 45], machines: [55, 67, 72, 90, 49] },
  { date: '2026-09-29', hour: '07H', winners: [71, 80, 11, 17, 74], machines: [48, 61, 23, 14, 3] },

  // --- 28/09/2026 (Lundi) ---
  { date: '2026-09-28', hour: '23H', winners: [41, 20, 6, 3, 33], machines: [56, 35, 77, 51, 61] },
  { date: '2026-09-28', hour: '22H', winners: [72, 30, 3, 67, 61], machines: [45, 84, 17, 36, 66] },
  { date: '2026-09-28', hour: '21H', winners: [61, 67, 83, 65, 42], machines: [19, 33, 37, 72, 22] },
  { date: '2026-09-28', hour: '18H', winners: [6, 70, 57, 18, 87], machines: [21, 22, 26, 84, 55] },
  { date: '2026-09-28', hour: '16H', winners: [2, 21, 27, 90, 14], machines: [67, 60, 4, 48, 57] },
  { date: '2026-09-28', hour: '13H', winners: [81, 10, 24, 23, 54], machines: [51, 88, 52, 57, 63] },
  { date: '2026-09-28', hour: '10H', winners: [30, 54, 61, 4, 42], machines: [69, 32, 35, 49, 52] },
  { date: '2026-09-28', hour: '08H', winners: [27, 21, 87, 23, 62], machines: [48, 10, 40, 38, 90] },
  { date: '2026-09-28', hour: '07H', winners: [70, 85, 58, 33, 17], machines: [19, 73, 60, 63, 67] },

  // --- 27/09/2026 (Dimanche) ---
  { date: '2026-09-27', hour: '23H', winners: [33, 26, 9, 29, 59], machines: [44, 75, 52, 39, 5] },
  { date: '2026-09-27', hour: '21H', winners: [77, 43, 24, 75, 3], machines: [36, 10, 39, 37, 38] },
  { date: '2026-09-27', hour: '20H', winners: [12, 90, 13, 45, 18], machines: [84, 32, 27, 78, 7] },
  { date: '2026-09-27', hour: '18H', winners: [68, 63, 47, 53, 36], machines: [12, 20, 88, 14, 4] },
  { date: '2026-09-27', hour: '16H', winners: [75, 15, 55, 62, 20], machines: [52, 39, 68, 83, 90] },
  { date: '2026-09-27', hour: '13H', winners: [15, 22, 32, 68, 56], machines: [57, 19, 78, 12, 24] },
  { date: '2026-09-27', hour: '10H', winners: [70, 51, 86, 53, 39], machines: [7, 83, 24, 55, 18] },
  { date: '2026-09-27', hour: '08H', winners: [58, 42, 29, 78, 52], machines: [13, 39, 67, 88, 1] },
  { date: '2026-09-27', hour: '07H', winners: [58, 11, 29, 80, 10], machines: [32, 39, 47, 72, 62] },
  { date: '2026-09-27', hour: '03H', winners: [86, 76, 26, 6, 67], machines: [74, 36, 79, 62, 80] },
  { date: '2026-09-27', hour: '01H', winners: [77, 59, 69, 28, 65], machines: [82, 74, 43, 12, 38] },

  // --- 26/09/2026 (Samedi) ---
  { date: '2026-09-26', hour: '23H', winners: [74, 21, 49, 88, 81], machines: [75, 39, 38, 44, 48] },
  { date: '2026-09-26', hour: '22H', winners: [19, 25, 37, 21, 72], machines: [70, 3, 48, 74, 75] },
  { date: '2026-09-26', hour: '21H', winners: [14, 13, 70, 15, 40], machines: [31, 41, 51, 63, 67] },
  { date: '2026-09-26', hour: '18H', winners: [33, 80, 74, 65, 22], machines: [23, 50, 30, 61, 38] },
  { date: '2026-09-26', hour: '16H', winners: [79, 62, 82, 20, 6], machines: [35, 87, 64, 63, 42] },
  { date: '2026-09-26', hour: '13H', winners: [63, 70, 32, 30, 21], machines: [72, 25, 90, 29, 60] },
  { date: '2026-09-26', hour: '10H', winners: [18, 59, 40, 5, 83], machines: [24, 38, 43, 29, 8] },
  { date: '2026-09-26', hour: '08H', winners: [25, 68, 3, 50, 30], machines: [12, 41, 63, 19, 32] },
  { date: '2026-09-26', hour: '07H', winners: [73, 77, 42, 27, 45], machines: [67, 4, 17, 84, 3] },
  { date: '2026-09-26', hour: '03H', winners: [34, 10, 25, 39, 32], machines: [5, 67, 82, 57, 27] },
  { date: '2026-09-26', hour: '01H', winners: [84, 54, 11, 68, 89], machines: [40, 82, 69, 55, 76] }
];

/* --------------------------------------------------------------------------
   2. ÉTAT GLOBAL & UTILITAIRES DATE / JOUR
   -------------------------------------------------------------------------- */
let selectedHour = '07H';
let drawHistory = [];

function parseISODate(dateStr) {
  const parts = (dateStr || '').split('-').map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  }
  return new Date(Date.UTC(2026, 10, 19));
}

function getDayOfWeek(dateStr) {
  return parseISODate(dateStr).getUTCDay(); // 0 = Dimanche ... 6 = Samedi
}

function formatFRDate(dateStr) {
  const parts = (dateStr || '').split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr || '19/11/2026';
}

function normalizeEntry(raw) {
  const dateStr = raw.date || '2026-11-19';
  const hourStr = String(raw.hour || '07H').toUpperCase().padStart(3, '0');
  const winners = (raw.winners || []).map(Number).filter(n => n >= 1 && n <= 90).slice(0, 5);
  const machines = (raw.machines || []).map(Number).filter(n => n >= 1 && n <= 90).slice(0, 5);
  return {
    id: `${dateStr}_${hourStr}`,
    date: dateStr,
    dayOfWeek: typeof raw.dayOfWeek === 'number' ? raw.dayOfWeek : getDayOfWeek(dateStr),
    hour: hourStr,
    winners,
    machines
  };
}

function deduplicateAndSort(entries) {
  const map = new Map();
  entries.forEach(item => {
    const norm = normalizeEntry(item);
    map.set(norm.id, norm);
  });
  return Array.from(map.values()).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.hour.localeCompare(a.hour);
  });
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(saved) && saved.length > 0) {
      drawHistory = deduplicateAndSort([...SEED_HISTORY, ...saved]);
    } else {
      drawHistory = deduplicateAndSort(SEED_HISTORY);
    }
  } catch (e) {
    drawHistory = deduplicateAndSort(SEED_HISTORY);
  }
  saveHistory();
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drawHistory));
  } catch (e) {
    console.warn('Stockage local indisponible :', e);
  }
}

/* --------------------------------------------------------------------------
   3. INITIALISATION UI & ÉVÉNEMENTS
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  initDateInputs();
  renderHourButtons();
  renderHistory();
  generateHybridMatrix();

  const genBtn = document.getElementById('generateBtn');
  if (genBtn) genBtn.addEventListener('click', generateHybridMatrix);

  const addForm = document.getElementById('addDrawForm');
  if (addForm) addForm.addEventListener('submit', handleAddDraw);

  const resetBtn = document.getElementById('resetSeedBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      drawHistory = deduplicateAndSort(SEED_HISTORY);
      saveHistory();
      renderHistory();
      generateHybridMatrix();
    });
  }
});

function initDateInputs() {
  const dayCurrInput = document.getElementById('dayCurrent');
  const dayPrevInput = document.getElementById('dayPrev');
  const targetDateInput = document.getElementById('targetDate');

  const currVal = dayCurrInput && dayCurrInput.value ? Number(dayCurrInput.value) : 19;
  const prevVal = dayPrevInput && dayPrevInput.value ? Number(dayPrevInput.value) : 18;

  if (dayCurrInput && !dayCurrInput.value) dayCurrInput.value = currVal;
  if (dayPrevInput && !dayPrevInput.value) dayPrevInput.value = prevVal;

  if (targetDateInput && !targetDateInput.value) {
    const paddedDay = String(Math.min(Math.max(currVal, 1), 30)).padStart(2, '0');
    targetDateInput.value = `2026-11-${paddedDay}`;
  }
}

function renderHourButtons() {
  const container = document.getElementById('hourButtons');
  if (!container) return;

  const extraHours = ['01H', '03H', '20H'];
  const allHours = [...new Set([...HOURS_LIST, ...extraHours])];

  container.innerHTML = allHours.map(h => {
    const activeClass = h === selectedHour ? 'active' : '';
    return `<button type="button" class="hour-btn ${activeClass}" data-hour="${h}">${h}</button>`;
  }).join('');

  container.querySelectorAll('.hour-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedHour = btn.dataset.hour;
      container.querySelectorAll('.hour-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      generateHybridMatrix();
    });
  });
}

/* --------------------------------------------------------------------------
   4. MOTEUR HYBRIDE JOUR + DATE + HEURE
   -------------------------------------------------------------------------- */
function generateHybridMatrix() {
  const dayCurr = Math.max(1, Number(document.getElementById('dayCurrent')?.value || 19));
  const dayPrev = Math.max(1, Number(document.getElementById('dayPrev')?.value || 18));
  const targetDate = document.getElementById('targetDate')?.value || `2026-11-${String(dayCurr).padStart(2, '0')}`;
  const targetDayOfWeek = getDayOfWeek(targetDate);
  const targetDayName = DAY_NAMES_FR[targetDayOfWeek];
  const hourNum = parseInt(selectedHour.replace('H', ''), 10) || 7;

  const dateRatio = dayCurr / dayPrev;
  const formulaValue = dateRatio * (hourNum * 37.5);

  const formulaEl = document.getElementById('formulaDisplay');
  if (formulaEl) {
    formulaEl.textContent = `(${dayCurr}/${dayPrev}) × (${hourNum}×37.5) = ${formulaValue.toFixed(4)}`;
  }

  // Filtrage contextuel dans l'historique
  const sameDayHourDraws = drawHistory.filter(d => d.dayOfWeek === targetDayOfWeek && d.hour === selectedHour);
  const sameDayDraws = drawHistory.filter(d => d.dayOfWeek === targetDayOfWeek);
  const sameHourDraws = drawHistory.filter(d => d.hour === selectedHour);
  const recentDraws = drawHistory.slice(0, 12);

  // Fréquences globales des gagnants pour repérer les dizaines froides
  const winnerFreq = Array(91).fill(0);
  drawHistory.forEach(d => d.winners.forEach(n => { winnerFreq[n] += 1; }));

  const coldDecades = [
    { label: '1-10', min: 1, max: 10 },
    { label: '11-20', min: 11, max: 20 },
    { label: '21-30', min: 21, max: 30 },
    { label: '31-40', min: 31, max: 40 },
    { label: '41-50', min: 41, max: 50 },
    { label: '51-60', min: 51, max: 60 },
    { label: '61-70', min: 61, max: 70 },
    { label: '71-80', min: 71, max: 80 },
    { label: '81-90', min: 81, max: 90 }
  ].map(dec => {
    let sum = 0;
    for (let n = dec.min; n <= dec.max; n++) sum += winnerFreq[n];
    return { ...dec, sum };
  }).sort((a, b) => a.sum - b.sum);

  const targetedDecades = coldDecades.slice(0, 2);
  const coldSet = new Set();
  targetedDecades.forEach(dec => {
    for (let n = dec.min; n <= dec.max; n++) coldSet.add(n);
  });

  // Calcul des scores par numéro (1 à 90)
  const candidates = [];
  for (let n = 1; n <= 90; n++) {
    let winnerScore = 0;
    let machineScore = 0;

    // 1. Même jour de la semaine + même heure (poids fort)
    sameDayHourDraws.forEach(d => {
      if (d.winners.includes(n)) winnerScore += 2.6;
      if (d.machines.includes(n)) machineScore += 2.4;
    });

    // 2. Même jour de la semaine (toutes heures)
    sameDayDraws.forEach(d => {
      if (d.winners.includes(n)) winnerScore += 1.1;
      if (d.machines.includes(n)) machineScore += 1.0;
    });

    // 3. Même créneau horaire (tous jours)
    sameHourDraws.forEach(d => {
      if (d.winners.includes(n)) winnerScore += 1.5;
      if (d.machines.includes(n)) machineScore += 1.4;
    });

    // 4. Récence (12 derniers tirages) + voisins ±1
    recentDraws.forEach((d, idx) => {
      const recencyWeight = (12 - idx) / 12;
      if (d.winners.includes(n)) winnerScore += 1.2 * recencyWeight;
      if (d.machines.includes(n)) machineScore += 1.1 * recencyWeight;

      const hasNeighborW = d.winners.some(w => Math.abs(w - n) === 1);
      const hasNeighborM = d.machines.some(m => Math.abs(m - n) === 1);
      if (hasNeighborW) winnerScore += 0.45 * recencyWeight;
      if (hasNeighborM) machineScore += 0.45 * recencyWeight;
    });

    // 5. Dizaines froides
    if (coldSet.has(n)) {
      winnerScore += 0.85;
      machineScore += 0.65;
    }

    // 6. Modulateur léger lié au ratio de date et à l'heure
    const dateMod = ((n * dayCurr) % (dayPrev + 5)) / 10;
    winnerScore += dateMod * Math.min(dateRatio, 1.5);
    machineScore += ((n + hourNum) % 7) * 0.1;

    candidates.push({ num: n, winnerScore, machineScore });
  }

  const topWinners = [...candidates]
    .sort((a, b) => b.winnerScore - a.winnerScore || a.num - b.num)
    .slice(0, 5)
    .map(item => item.num);

  const topMachines = [...candidates]
    .filter(item => !topWinners.includes(item.num))
    .sort((a, b) => b.machineScore - a.machineScore || a.num - b.num)
    .slice(0, 5)
    .map(item => item.num);

  renderBalls('mainSelection', topWinners, 'ball-winner');
  renderBalls('pivotSelection', topMachines, 'ball-machine');

  const convergenceIndex = Math.min(
    95,
    Math.round(62 + sameDayHourDraws.length * 6 + sameDayDraws.length * 1.2 + sameHourDraws.length * 1.5)
  );

  const analysisEl = document.getElementById('statsAnalysis');
  if (analysisEl) {
    analysisEl.innerHTML = `
      <div><strong>Indice de convergence : ${convergenceIndex} %</strong> — 🟢 Signal concentré (${targetDayName} ${formatFRDate(targetDate)})</div>
      <div><strong>Contexte historique :</strong> ${sameDayHourDraws.length} tirage(s) ${targetDayName} ${selectedHour} • ${sameDayDraws.length} tirage(s) ${targetDayName} • ${sameHourDraws.length} tirage(s) ${selectedHour} (sur ${drawHistory.length} tirages).</div>
      <div><strong>Dizaines froides ciblées :</strong> ${targetedDecades[0]?.label || '21-30'} et ${targetedDecades[1]?.label || '61-70'}</div>
      <div><strong>Ordre d'affichage :</strong> Classé du 1<sup>er</sup> au 5<sup>e</sup> rang de score (créneau ${selectedHour}).</div>
    `;
  }
}

function renderBalls(containerId, nums, ballClass) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = nums
    .map(n => `<span class="ball ${ballClass}">${String(n).padStart(2, '0')}</span>`)
    .join('');
}

/* --------------------------------------------------------------------------
   5. AJOUT D'UN RÉSULTAT OFFICIEL & AFFICHAGE HISTORIQUE (BOULES COLORÉES)
   -------------------------------------------------------------------------- */
function handleAddDraw(e) {
  e.preventDefault();
  const dateVal = document.getElementById('drawDateInput')?.value || document.getElementById('targetDate')?.value || '2026-11-19';
  const hourVal = (document.getElementById('drawHourInput')?.value || selectedHour || '07H').toUpperCase();
  const winnersRaw = document.getElementById('winnersInput')?.value || '';
  const machinesRaw = document.getElementById('machinesInput')?.value || '';

  const parseFive = str =>
    str
      .split(/[\s,\-;/]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !Number.isNaN(n) && n >= 1 && n <= 90)
      .slice(0, 5);

  const winners = parseFive(winnersRaw);
  const machines = parseFive(machinesRaw);

  if (winners.length < 5 || machines.length < 5) {
    alert('Entre bien 5 numéros Gagnants et 5 numéros Machines (entre 01 et 90).');
    return;
  }

  const newEntry = normalizeEntry({ date: dateVal, hour: hourVal, winners, machines });
  drawHistory = deduplicateAndSort([newEntry, ...drawHistory]);
  saveHistory();
  renderHistory();
  generateHybridMatrix();

  e.target.reset();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;

  list.innerHTML = drawHistory
    .map(draw => {
      const dayName = DAY_NAMES_FR[draw.dayOfWeek] || '';
      const dateFR = formatFRDate(draw.date);

      const winnerBalls = (draw.winners || [])
        .map(n => `<span class="ball ball-winner history-ball">${String(n).padStart(2, '0')}</span>`)
        .join('');

      const machineBalls = (draw.machines || [])
        .map(n => `<span class="ball ball-machine history-ball">${String(n).padStart(2, '0')}</span>`)
        .join('');

      return `
        <div class="history-item">
          <div class="history-badge">
            <div><strong>${draw.hour}</strong></div>
            <div class="history-date">${dayName} ${dateFR}</div>
          </div>
          <div class="history-nums">
            <div class="history-row">
              <strong>Gagnants :</strong>
              <div class="history-balls">${winnerBalls}</div>
            </div>
            <div class="history-row">
              <strong>Machines :</strong>
              <div class="history-balls">${machineBalls}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}
