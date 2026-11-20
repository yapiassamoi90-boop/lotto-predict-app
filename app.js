/* ==========================================================================
   LOTO 5/90 RESEARCH LAB — app.js
   VERSION 13.0 — RESEARCH ENGINE
   Dev.Assamoi / H@B

   - Historique actuel : 5 gagnants + 5 machines
   - Archives anciennes : 6 numéros conservés
   - Filtrage chronologique strict
   - Détection des doublons et anomalies
   - Statistiques, fréquences, retards et paires
   - Backtesting déterministe
   - Import / export JSON
   - OCR avec validation avant enregistrement
   ========================================================================== */

"use strict";

const STORAGE_KEY = "loto590_history_v12";
const ARCHIVE_STORAGE_KEY = "loto590_archive_1993_2011_v12";

const DAY_NAMES_FR = [
  "Dimanche", "Lundi", "Mardi", "Mercredi",
  "Jeudi", "Vendredi", "Samedi"
];

const HOURS = [
  "01H", "03H", "07H", "08H", "10H", "13H",
  "16H", "18H", "19H", "20H", "21H", "22H", "23H"
];

/*
  IMPORTANT :
  Conserve ici le tableau SEED_HISTORY de ton ancien app.js.
  Il contient tes tirages initiaux 2026.
  Ne remplace pas tes anciennes données par des données inventées.
*/
const SEED_HISTORY = [];

let drawHistory = [];
let archiveHistory = [];
let selectedHour = "10H";
let currentAnalysis = null;
let historyDateFilter = "";
let historyHourFilter = "ALL";

/* ==========================================================================
   OUTILS DE BASE
   ========================================================================== */

function validNumber(n) {
  const value = Number(n);
  return Number.isInteger(value) && value >= 1 && value <= 90;
}

function normalizeDate(date) {
  if (!date) return "";

  const d = String(date).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().slice(0, 10);
}

function normalizeHour(hour) {
  if (!hour) return "00H";

  const cleaned = String(hour)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  const match = cleaned.match(/^(\d{1,2})H?$/);
  if (!match) return cleaned;

  const paddedHour = match[1].padStart(2, "0");
  return `${paddedHour}H`;
}

function getHourOrder(hour) {
  const normalized = normalizeHour(hour);
  const index = HOURS.indexOf(normalized);
  if (index !== -1) return index;

  const num = parseInt(normalized, 10);
  return Number.isNaN(num) ? 999 : num;
}

function normalizeCurrentEntry(raw) {
  if (!raw || typeof raw !== "object") return null;

  const date = normalizeDate(raw.date);
  const hour = normalizeHour(raw.hour);

  const winners = Array.isArray(raw.winners)
    ? raw.winners.map(Number).filter(validNumber).slice(0, 5)
    : [];

  const machines = Array.isArray(raw.machines)
    ? raw.machines.map(Number).filter(validNumber).slice(0, 5)
    : [];

  if (!date || winners.length !== 5 || machines.length !== 5) {
    return null;
  }

  return {
    date,
    hour,
    winners,
    machines
  };
}

/* Archives : six numéros, sans transformation en cinq numéros. */
function normalizeArchiveEntry(raw) {
  if (!raw || typeof raw !== "object") return null;

  const date = normalizeDate(raw.date);
  const source = Array.isArray(raw.numeros)
    ? raw.numeros
    : Array.isArray(raw.numbers)
      ? raw.numbers
      : [];

  const numeros = source.map(Number).filter(validNumber);

  if (!date || numeros.length !== 6) return null;

  return {
    date,
    numeros
  };
}

function compareEntries(a, b) {
  const dateCompare = a.date.localeCompare(b.date);
  if (dateCompare !== 0) return dateCompare;

  return getHourOrder(a.hour) - getHourOrder(b.hour);
}

function safeParseJSON(value, fallback = []) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drawHistory));
}

function saveArchive() {
  localStorage.setItem(
    ARCHIVE_STORAGE_KEY,
    JSON.stringify(archiveHistory)
  );
}

/* ==========================================================================
   CHARGEMENT ET DOUBLONS
   ========================================================================== */

function detectDuplicates(entries) {
  const groups = new Map();

  entries.forEach((entry, index) => {
    const key = `${entry.date}_${entry.hour || "ARCHIVE"}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ entry, index });
  });

  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({
      key,
      count: items.length,
      items
    }));
}

function loadHistory() {
  const stored = safeParseJSON(
    localStorage.getItem(STORAGE_KEY)
  );

  const source = stored.length ? stored : SEED_HISTORY;

  drawHistory = source
    .map(normalizeCurrentEntry)
    .filter(Boolean)
    .sort(compareEntries);

  saveHistory();

  archiveHistory = safeParseJSON(
    localStorage.getItem(ARCHIVE_STORAGE_KEY)
  )
    .map(normalizeArchiveEntry)
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  saveArchive();

  renderHistory();
  renderDataWarnings();
}

/* ==========================================================================
   FILTRAGE CHRONOLOGIQUE STRICT
   ========================================================================== */

function getDrawsStrictlyBefore(entries, targetDate, targetHour) {
  const date = normalizeDate(targetDate);
  const hour = normalizeHour(targetHour);

  if (!date) return [];

  const targetOrder = getHourOrder(hour);

  return entries.filter(entry => {
    const entryDate = normalizeDate(entry.date);
    if (!entryDate) return false;

    if (entryDate !== date) {
      return entryDate < date;
    }

    return getHourOrder(entry.hour) < targetOrder;
  });
}

/* ==========================================================================
   STATISTIQUES
   ========================================================================== */

function getAllNumbers(draws, field = "winners") {
  return draws.flatMap(draw => Array.isArray(draw[field]) ? draw[field] : []);
}

function calculateFrequencies(draws, field = "winners") {
  const frequencies = Array(91).fill(0);

  draws.forEach(draw => {
    const values = draw[field] || [];

    values.forEach(n => {
      if (validNumber(n)) frequencies[n]++;
    });
  });

  return frequencies;
}

function calculateGaps(draws, field = "winners") {
  const result = {};

  for (let n = 1; n <= 90; n++) {
    let gap = draws.length;
    let found = false;

    for (let i = draws.length - 1; i >= 0; i--) {
      if ((draws[i][field] || []).includes(n)) {
        gap = draws.length - 1 - i;
        found = true;
        break;
      }
    }

    result[n] = found ? gap : draws.length;
  }

  return result;
}

function calculatePairs(draws, field = "winners") {
  const pairs = {};

  draws.forEach(draw => {
    const values = [...new Set(draw[field] || [])].sort((a, b) => a - b);

    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        const key = `${values[i]}-${values[j]}`;
        pairs[key] = (pairs[key] || 0) + 1;
      }
    }
  });

  return Object.entries(pairs)
    .map(([pair, count]) => ({ pair, count }))
    .sort((a, b) => b.count - a.count);
}

function calculateStats(draws) {
  const winners = calculateFrequencies(draws, "winners");
  const machines = calculateFrequencies(draws, "machines");
  const gaps = calculateGaps(draws, "winners");

  const totalNumbers = getAllNumbers(draws, "winners");

  const sumValues = draws.map(draw =>
    (draw.winners || []).reduce((a, b) => a + b, 0)
  );

  const oddCount = totalNumbers.filter(n => n % 2 !== 0).length;
  const evenCount = totalNumbers.length - oddCount;

  const ranked = Array.from({ length: 90 }, (_, i) => ({
    number: i + 1,
    frequency: winners[i + 1],
    gap: gaps[i + 1]
  }));

  const hot = [...ranked].sort(
    (a, b) => b.frequency - a.frequency || a.number - b.number
  );

  const overdue = [...ranked].sort(
    (a, b) => b.gap - a.gap || a.number - b.number
  );

  return {
    drawsCount: draws.length,
    winners,
    machines,
    gaps,
    hot,
    overdue,
    pairs: calculatePairs(draws),
    oddCount,
    evenCount,
    averageSum: sumValues.length
      ? sumValues.reduce((a, b) => a + b, 0) / sumValues.length
      : 0
  };
}

/* ==========================================================================
   ANALYSE ET GÉNÉRATION DES PROPOSITIONS
   ========================================================================== */

function getDayOfWeek(date) {
  return new Date(`${date}T12:00:00`).getDay();
}

function scoreCandidates(draws, targetDate, targetHour) {
  const stats = calculateStats(draws);
  const day = getDayOfWeek(targetDate);
  const hour = normalizeHour(targetHour);

  const sameDay = draws.filter(
    d => getDayOfWeek(d.date) === day
  );

  const sameHour = draws.filter(
    d => normalizeHour(d.hour) === hour
  );

  const recent = draws.slice(-12);

  const dayFreq = calculateFrequencies(sameDay);
  const hourFreq = calculateFrequencies(sameHour);
  const recentFreq = calculateFrequencies(recent);

  const scores = [];

  for (let n = 1; n <= 90; n++) {
    const frequency = stats.winners[n];
    const gap = stats.gaps[n];

    const score =
      frequency * 2.0 +
      Math.min(gap, 25) * 0.25 +
      dayFreq[n] * 1.2 +
      hourFreq[n] * 1.5 +
      recentFreq[n] * 0.8;

    scores.push({ number: n, score, frequency, gap });
  }

  return scores.sort(
    (a, b) => b.score - a.score || a.number - b.number
  );
}

function generateHybridMatrix() {
  const targetDate =
    document.getElementById("targetDate")?.value ||
    new Date().toISOString().slice(0, 10);

  const dateCurrent =
    document.getElementById("dateCurrent")?.value || targetDate;

  const datePrev =
    document.getElementById("datePrev")?.value || "";

  const hour = selectedHour;

  const pastDraws = getDrawsStrictlyBefore(
    drawHistory,
    targetDate,
    hour
  );

  if (pastDraws.length < 3) {
    showMessage(
      "Historique insuffisant avant cette date pour produire une analyse fiable.",
      "warning"
    );
    return;
  }

  const ranking = scoreCandidates(pastDraws, targetDate, hour);

  const winners = ranking.slice(0, 5).map(x => x.number);

  const machines = ranking
    .filter(x => !winners.includes(x.number))
    .slice(0, 5)
    .map(x => x.number);

  currentAnalysis = {
    targetDate,
    dateCurrent,
    datePrev,
    hour,
    historyUsed: pastDraws.length,
    winners,
    machines,
    ranking
  };

  displayNumbers("predictedWinners", winners, "winner");
  displayNumbers("predictedMachines", machines, "machine");

  displayStats(pastDraws);
  displayFormula(currentAnalysis);

  return currentAnalysis;
}

function displayNumbers(id, numbers, role = "winner") {
  const element = document.getElementById(id);
  if (!element) return;

  element.innerHTML = "";

  if (!Array.isArray(numbers) || !numbers.length) {
    element.innerHTML = `<p class="empty-message">Aucun numéro disponible.</p>`;
    return;
  }

  const variantClass = role === "machine" ? "ball-machine" : "ball-winner";

  numbers.forEach(n => {
    const ball = document.createElement("span");
    ball.className = `ball ${variantClass}`;
    ball.textContent = String(n).padStart(2, "0");
    element.appendChild(ball);
  });
}

function displayFormula(result) {
  const element = document.getElementById("formulaOutput");
  if (!element) return;

  element.textContent =
    `Analyse basée sur ${result.historyUsed} tirages antérieurs au ` +
    `${result.targetDate} à ${result.hour}.`;
}

function displayStats(draws) {
  const element = document.getElementById("statsAnalysis");
  if (!element) return;

  const stats = calculateStats(draws);

  const top = stats.hot.slice(0, 10);
  const late = stats.overdue.slice(0, 10);
  const pairs = stats.pairs.slice(0, 10);

  element.innerHTML = `
    <h3>Statistiques descriptives</h3>
    <p>Tirages analysés : <strong>${stats.drawsCount}</strong></p>
    <p>Moyenne des sommes : <strong>${stats.averageSum.toFixed(2)}</strong></p>
    <p>Numéros impairs : ${stats.oddCount}</p>
    <p>Numéros pairs : ${stats.evenCount}</p>

    <h4>Fréquences les plus élevées</h4>
    <p>${top.map(x => `${x.number} (${x.frequency})`).join(" · ")}</p>

    <h4>Retards les plus élevés</h4>
    <p>${late.map(x => `${x.number} (${x.gap})`).join(" · ")}</p>

    <h4>Paires fréquentes</h4>
    <p>${pairs.map(x => `${x.pair} (${x.count})`).join(" · ")}</p>
  `;
}

/* ==========================================================================
   BACKTESTING DÉTERMINISTE
   ========================================================================== */

function seededRandom(seed) {
  let value = seed >>> 0;

  return function () {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function hashString(value) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function runBacktest(topK = 15, minHistory = 20) {
  const dataset = [...drawHistory].sort(compareEntries);

  if (dataset.length <= minHistory) {
    showMessage("Pas assez de tirages pour le backtesting.", "warning");
    return null;
  }

  let modelHits = 0;
  let randomHits = 0;
  let tests = 0;

  for (let i = minHistory; i < dataset.length; i++) {
    const target = dataset[i];
    const past = dataset.slice(0, i);

    const ranking = scoreCandidates(past, target.date, target.hour);
    const selected = ranking.slice(0, topK).map(x => x.number);

    const actual = new Set(target.winners);

    selected.forEach(n => {
      if (actual.has(n)) modelHits++;
    });

    const seed = hashString(`${target.date}_${target.hour}_${i}`);
    const random = seededRandom(seed);

    const pool = Array.from({ length: 90 }, (_, j) => j + 1);

    for (let j = pool.length - 1; j > 0; j--) {
      const k = Math.floor(random() * (j + 1));
      [pool[j], pool[k]] = [pool[k], pool[j]];
    }

    pool.slice(0, topK).forEach(n => {
      if (actual.has(n)) randomHits++;
    });

    tests++;
  }

  const modelAverage = modelHits / tests;
  const randomAverage = randomHits / tests;
  const theoreticalAverage = topK * 5 / 90;

  const result = {
    tests,
    topK,
    modelAverage,
    randomAverage,
    theoreticalAverage,
    modelHits,
    randomHits
  };

  renderBacktest(result);
  return result;
}

function ensureBacktestUI() {
  if (document.getElementById("backtestPanel")) return;

  const target =
    document.getElementById("statsAnalysis") ||
    document.getElementById("historyList");

  if (!target) return;

  const panel = document.createElement("section");
  panel.id = "backtestPanel";
  panel.className = "research-panel";

  panel.innerHTML = `
    <h3>Backtesting historique</h3>
    <p>Comparaison du modèle avec une sélection aléatoire reproductible.</p>
    <button type="button" id="btnRunBacktest">
      Lancer le backtesting
    </button>
    <div id="backtestResults"></div>
  `;

  target.insertAdjacentElement("afterend", panel);

  document.getElementById("btnRunBacktest")
    ?.addEventListener("click", () => runBacktest(15, 20));
}

function renderBacktest(result) {
  const element = document.getElementById("backtestResults");
  if (!element) return;

  element.innerHTML = `
    <p>Tests effectués : <strong>${result.tests}</strong></p>
    <p>Moyenne du modèle : <strong>${result.modelAverage.toFixed(3)}</strong></p>
    <p>Moyenne aléatoire : <strong>${result.randomAverage.toFixed(3)}</strong></p>
    <p>Espérance théorique : <strong>${result.theoreticalAverage.toFixed(3)}</strong></p>
    <p>Total des correspondances modèle : ${result.modelHits}</p>
    <p>Total des correspondances aléatoires : ${result.randomHits}</p>
    <small>Résultat descriptif sur les tirages passés. Aucune garantie de gain futur.</small>
  `;
}

/* ==========================================================================
   GESTION DES ANOMALIES
   ========================================================================== */

function renderDataWarnings() {
  const duplicates = detectDuplicates(drawHistory);
  const archiveDuplicates = detectDuplicates(archiveHistory);

  let element = document.getElementById("dataWarnings");

  if (!element) {
    element = document.createElement("div");
    element.id = "dataWarnings";

    const history = document.getElementById("historyList");
    if (history) history.insertAdjacentElement("beforebegin", element);
  }

  if (!element) return;

  const repeatedNumbers = drawHistory.filter(draw => {
    const all = [...draw.winners, ...draw.machines];
    return new Set(all).size !== all.length;
  });

  element.innerHTML = `
    <h3>Contrôle de qualité des données</h3>
    <p>Doublons date/heure : ${duplicates.length}</p>
    <p>Doublons dans les archives : ${archiveDuplicates.length}</p>
    <p>Tirages avec numéros répétés : ${repeatedNumbers.length}</p>
    <small>Les anomalies sont signalées, jamais corrigées ou supprimées automatiquement.</small>
  `;
}

/* ==========================================================================
   IMPORT / EXPORT JSON
   ========================================================================== */

function ensureDataTools() {
  if (document.getElementById("dataTools")) return;

  const container = document.createElement("section");
  container.id = "dataTools";
  container.className = "research-panel";

  container.innerHTML = `
    <h3>Gestion des données</h3>

    <button type="button" id="exportCurrent">
      Exporter tirages actuels
    </button>

    <button type="button" id="exportArchive">
      Exporter archives
    </button>

    <label for="importCurrentFile">Importer tirages actuels JSON</label>
    <input type="file" id="importCurrentFile" accept=".json,application/json">

    <label for="importArchiveFile">Importer archives à 6 numéros JSON</label>
    <input type="file" id="importArchiveFile" accept=".json,application/json">
  `;

  const history = document.getElementById("historyList");

  if (history) history.insertAdjacentElement("beforebegin", container);

  document.getElementById("exportCurrent")
    ?.addEventListener("click", () => downloadJSON(
      drawHistory,
      "loto590-tirages-actuels.json"
    ));

  document.getElementById("exportArchive")
    ?.addEventListener("click", () => downloadJSON(
      archiveHistory,
      "loto590-archives-six-numeros.json"
    ));

  document.getElementById("importCurrentFile")
    ?.addEventListener("change", event => {
      importJSONFile(event.target.files[0], "current");
      event.target.value = "";
    });

  document.getElementById("importArchiveFile")
    ?.addEventListener("change", event => {
      importJSONFile(event.target.files[0], "archive");
      event.target.value = "";
    });
}

function downloadJSON(data, filename) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

async function importJSONFile(file, type) {
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      throw new Error("Le fichier doit contenir un tableau JSON.");
    }

    if (type === "current") {
      const imported = parsed
        .map(normalizeCurrentEntry)
        .filter(Boolean);

      if (!imported.length) {
        throw new Error("Aucun tirage actuel valide trouvé.");
      }

      drawHistory = [
        ...drawHistory,
        ...imported
      ].sort(compareEntries);

      saveHistory();
    } else {
      const imported = parsed
        .map(normalizeArchiveEntry)
        .filter(Boolean);

      if (!imported.length) {
        throw new Error("Aucune archive valide à six numéros trouvée.");
      }

      archiveHistory = [
        ...archiveHistory,
        ...imported
      ].sort((a, b) => a.date.localeCompare(b.date));

      saveArchive();
    }

    renderHistory();
    renderDataWarnings();

    showMessage(
      `${type === "current" ? "Tirages" : "Archives"} importés : ${parsed.length} lignes lues.`,
      "success"
    );
  } catch (error) {
    showMessage(`Import impossible : ${error.message}`, "error");
  }
}

/* ==========================================================================
   AJOUT MANUEL ET SUPPRESSION D'UN TIRAGE
   ========================================================================== */

function addManualDraw(event) {
  event.preventDefault();

  const date = document.getElementById("drawDateInput")?.value;
  const hour = document.getElementById("drawHourInput")?.value;

  const winnersText = document.getElementById("winnersInput")?.value || "";
  const machinesText = document.getElementById("machinesInput")?.value || "";

  const winners = (winnersText.match(/\b\d{1,2}\b/g) || [])
    .map(Number);

  const machines = (machinesText.match(/\b\d{1,2}\b/g) || [])
    .map(Number);

  const entry = normalizeCurrentEntry({
    date,
    hour,
    winners,
    machines
  });

  if (!entry) {
    showMessage(
      "Vérifie la date et saisis exactement 5 gagnants et 5 machines entre 1 et 90.",
      "error"
    );
    return;
  }

  const existing = drawHistory.filter(
    d => d.date === entry.date && d.hour === entry.hour
  );

  if (existing.length) {
    const proceed = confirm(
      "Un tirage existe déjà pour cette date et cette heure. Ajouter quand même ?"
    );

    if (!proceed) return;
  }

  drawHistory.push(entry);
  drawHistory.sort(compareEntries);

  saveHistory();
  renderHistory();
  renderDataWarnings();

  event.target.reset();

  showMessage("Tirage ajouté avec succès.", "success");
}

function deleteDraw(date, hour) {
  const confirmed = confirm(
    `Supprimer le tirage du ${date} à ${hour} ?`
  );

  if (!confirmed) return;

  const index = drawHistory.findIndex(
    item => item.date === date && item.hour === hour
  );

  if (index === -1) return;

  drawHistory.splice(index, 1);

  saveHistory();
  renderHistory();
  renderDataWarnings();

  showMessage(`Tirage du ${date} (${hour}) supprimé.`, "success");
}

/* ==========================================================================
   AFFICHAGE HISTORIQUE, FILTRES ET MINI-BOULES
   ========================================================================== */

function renderHistoryBalls(numbers, role = "winner") {
  const variantClass = role === "machine" ? "ball-machine" : "ball-winner";

  return (numbers || [])
    .map(n => {
      const formatted = String(n).padStart(2, "0");
      return `<span class="ball history-ball ${variantClass}">${formatted}</span>`;
    })
    .join("");
}

function ensureHistoryFiltersUI(container) {
  if (document.getElementById("historyFilters")) return;

  const filtersDiv = document.createElement("div");
  filtersDiv.id = "historyFilters";
  filtersDiv.className = "history-filters";

  const hourOptions = HOURS.map(
    h => `<option value="${h}">${h}</option>`
  ).join("");

  filtersDiv.innerHTML = `
    <div class="input-group">
      <label for="filterHistoryDate">Filtrer par date</label>
      <input type="date" id="filterHistoryDate">
    </div>

    <div class="input-group">
      <label for="filterHistoryHour">Filtrer par heure</label>
      <select id="filterHistoryHour">
        <option value="ALL">Toutes les heures</option>
        ${hourOptions}
      </select>
    </div>

    <button type="button" id="btnClearHistoryFilters" class="btn-secondary">
      Réinitialiser les filtres
    </button>
  `;

  container.prepend(filtersDiv);

  document.getElementById("filterHistoryDate")?.addEventListener("input", event => {
    historyDateFilter = event.target.value || "";
    renderHistory();
  });

  document.getElementById("filterHistoryHour")?.addEventListener("change", event => {
    historyHourFilter = event.target.value || "ALL";
    renderHistory();
  });

  document.getElementById("btnClearHistoryFilters")?.addEventListener("click", () => {
    historyDateFilter = "";
    historyHourFilter = "ALL";

    const dateInput = document.getElementById("filterHistoryDate");
    const hourSelect = document.getElementById("filterHistoryHour");

    if (dateInput) dateInput.value = "";
    if (hourSelect) hourSelect.value = "ALL";

    renderHistory();
  });
}

function getFilteredHistory() {
  return [...drawHistory]
    .filter(draw => {
      const matchesDate = !historyDateFilter || draw.date === historyDateFilter;
      const matchesHour =
        historyHourFilter === "ALL" ||
        normalizeHour(draw.hour) === normalizeHour(historyHourFilter);

      return matchesDate && matchesHour;
    })
    .sort((a, b) => compareEntries(b, a));
}

function renderHistory() {
  const element = document.getElementById("historyList");
  if (!element) return;

  ensureHistoryFiltersUI(element);

  let listContainer = document.getElementById("historyItemsContainer");
  if (!listContainer) {
    listContainer = document.createElement("div");
    listContainer.id = "historyItemsContainer";
    element.appendChild(listContainer);
  }

  const filtered = getFilteredHistory();

  if (!drawHistory.length) {
    listContainer.innerHTML = `<p class="empty-message">Aucun tirage enregistré.</p>`;
    return;
  }

  if (!filtered.length) {
    listContainer.innerHTML = `<p class="empty-message">Aucun tirage ne correspond aux filtres sélectionnés.</p>`;
    return;
  }

  listContainer.innerHTML = `
    <h3>Historique des tirages (${filtered.length} / ${drawHistory.length})</h3>
    ${filtered.map(draw => `
      <div class="history-item">
        <div class="history-badge">
          <strong>${draw.hour}</strong>
          <div class="history-date">${draw.date}</div>
        </div>

        <div class="history-nums">
          <div class="history-row">
            <span>Gagnants :</span>
            <div class="history-balls">
              ${renderHistoryBalls(draw.winners, "winner")}
            </div>
          </div>

          <div class="history-row">
            <span>Machines :</span>
            <div class="history-balls">
              ${renderHistoryBalls(draw.machines, "machine")}
            </div>
          </div>
        </div>

        <button
          type="button"
          class="btn-danger-small"
          data-delete-date="${draw.date}"
          data-delete-hour="${draw.hour}"
          aria-label="Supprimer le tirage du ${draw.date} à ${draw.hour}"
        >
          Supprimer
        </button>
      </div>
    `).join("")}
  `;

  if (!listContainer.dataset.deleteBound) {
    listContainer.addEventListener("click", event => {
      const btn = event.target.closest("[data-delete-date]");
      if (!btn) return;

      deleteDraw(btn.dataset.deleteDate, btn.dataset.deleteHour);
    });

    listContainer.dataset.deleteBound = "true";
  }
}

/* ==========================================================================
   MESSAGES
   ========================================================================== */

function showMessage(message, type = "info") {
  let box = document.getElementById("messageBox");

  if (!box) {
    box = document.createElement("div");
    box.id = "messageBox";
    document.body.prepend(box);
  }

  box.textContent = message;
  box.dataset.type = type;
}

/* ==========================================================================
   SÉLECTION DES HEURES
   ========================================================================== */

function bindHourButtons() {
  const grid = document.getElementById("hoursGrid");
  if (!grid) return;

  const activeBtn = grid.querySelector("button.active");
  if (activeBtn) {
    const activeText = activeBtn.dataset.hour || activeBtn.textContent;
    const activeMatch = activeText.match(/\d{1,2}\s*H/i);
    if (activeMatch) {
      selectedHour = normalizeHour(activeMatch[0]);
    }
  }

  grid.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    const text = button.dataset.hour || button.textContent;
    const match = text.match(/\d{1,2}\s*H/i);

    if (!match) return;

    selectedHour = normalizeHour(match[0]);

    grid.querySelectorAll("button").forEach(btn => {
      btn.classList.toggle("active", btn === button);
      btn.setAttribute(
        "aria-pressed",
        btn === button ? "true" : "false"
      );
    });

    const coeff = document.getElementById("hourCoeff");
    if (coeff) coeff.value = selectedHour;
  });
}

/* ==========================================================================
   SYNCHRONISATION DES DATES
   ========================================================================== */

function syncDayInput(targetDateValue, currentInput) {
  if (!currentInput || !targetDateValue) return;

  const dayMatch = String(targetDateValue).match(/(\d{2})$/);
  if (dayMatch) {
    currentInput.value = Number(dayMatch[1]);
  }
}

function bindDateSync() {
  const target = document.getElementById("targetDate");
  const current = document.getElementById("dateCurrent");

  if (!target || !current) return;

  target.addEventListener("change", () => {
    syncDayInput(target.value, current);
  });
}

/* ==========================================================================
   OCR — RECONNAISSANCE AVEC VALIDATION
   ========================================================================== */

function bindOCRUpload() {
  const input = document.getElementById("imageUploadInput");
  if (!input) return;

  input.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    const status = document.getElementById("ocrStatus");

    try {
      if (typeof Tesseract === "undefined") {
        throw new Error("La bibliothèque OCR Tesseract n'est pas chargée.");
      }

      if (status) status.textContent = "Lecture de l'image en cours...";

      const result = await Tesseract.recognize(file, "fra");
      const text = result.data.text || "";

      const numbers = (text.match(/\b(?:[1-9]|[1-8][0-9]|90)\b/g) || [])
        .map(Number);

      const dateMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
      const hourMatch = text.match(
        /\b(?:01|03|07|08|10|13|16|18|19|20|21|22|23)\s*H\b/i
      );

      if (dateMatch) {
        const dateInput = document.getElementById("drawDateInput");
        if (dateInput) dateInput.value = dateMatch[0];
      }

      if (hourMatch) {
        const hourInput = document.getElementById("drawHourInput");
        if (hourInput) hourInput.value = normalizeHour(hourMatch[0]);
      }

      const winnersInput = document.getElementById("winnersInput");
      const machinesInput = document.getElementById("machinesInput");

      if (numbers.length >= 10) {
        if (winnersInput) winnersInput.value = numbers.slice(0, 5).join(" ");
        if (machinesInput) machinesInput.value = numbers.slice(5, 10).join(" ");
      }

      if (status) {
        status.textContent =
          "Lecture terminée. Vérifie les numéros avant de valider le tirage.";
      }
    } catch (error) {
      if (status) status.textContent = error.message;
      showMessage(error.message, "error");
    } finally {
      input.value = "";
    }
  });
}

/* ==========================================================================
   RÉINITIALISATION
   ========================================================================== */

function bindReset() {
  const button = document.getElementById("btnReset");
  if (!button) return;

  button.addEventListener("click", () => {
    const confirmed = confirm(
      "Réinitialiser les données enregistrées sur cet appareil ?"
    );

    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ARCHIVE_STORAGE_KEY);

    drawHistory = SEED_HISTORY
      .map(normalizeCurrentEntry)
      .filter(Boolean)
      .sort(compareEntries);

    archiveHistory = [];

    saveHistory();
    saveArchive();

    renderHistory();
    renderDataWarnings();

    showMessage("Données locales réinitialisées.", "success");
  });
}

/* ==========================================================================
   INITIALISATION
   ========================================================================== */

function initializeApp() {
  loadHistory();

  bindDateSync();
  bindHourButtons();
  bindOCRUpload();
  bindReset();

  ensureBacktestUI();
  ensureDataTools();

  const calculateButton = document.getElementById("btnCalculate");

  calculateButton?.addEventListener("click", event => {
    event.preventDefault();
    generateHybridMatrix();
  });

  const form = document.getElementById("addDrawForm");

  form?.addEventListener("submit", addManualDraw);

  const targetDate = document.getElementById("targetDate");

  if (targetDate && !targetDate.value) {
    targetDate.value = new Date().toISOString().slice(0, 10);
  }

  const currentDate = document.getElementById("dateCurrent");

  if (currentDate && !currentDate.value && targetDate?.value) {
    syncDayInput(targetDate.value, currentDate);
  }

  const hourElement = document.getElementById("hourCoeff");

  if (hourElement) hourElement.value = selectedHour;

  renderHistory();
  renderDataWarnings();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
