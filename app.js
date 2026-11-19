// Initialisation avec tes derniers tirages connus
const DEFAULT_HISTORY = [
    { label: "13H", winners: [37, 42, 38, 36, 18], machines: [81, 19, 26, 10, 44] },
    { label: "10H", winners: [82, 54, 2, 49, 19], machines: [43, 5, 11, 37, 6] },
    { label: "08H", winners: [47, 86, 10, 63, 46], machines: [67, 38, 71, 32, 74] },
    { label: "07H", winners: [70, 66, 61, 29, 75], machines: [39, 81, 40, 8, 17] }
];

let drawHistory = JSON.parse(localStorage.getItem('loto590_history')) || DEFAULT_HISTORY;

// Enregistrement du Service Worker pour le mode hors-ligne (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW error:', err));
    });
}

// Initialisation des dates et boutons horaires
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const dateCurrentEl = document.getElementById('dateCurrent');
    const datePrevEl = document.getElementById('datePrev');
    if (dateCurrentEl) dateCurrentEl.value = today.getDate();
    if (datePrevEl) datePrevEl.value = yesterday.getDate();

    // Gestion du clic sur les boutons d'heures
    const hourButtons = document.querySelectorAll('.hour-btn');
    const hourInput = document.getElementById('hourCoeff');

    hourButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            hourButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (hourInput) {
                hourInput.value = btn.getAttribute('data-hour');
            }
            generateHybridPrediction();
        });
    });

    // Gestionnaire pour l'importation de plusieurs images (OCR) - Optionnel
    const imageInput = document.getElementById('imageUploadInput');
    if (imageInput) {
        imageInput.addEventListener('change', handleMultipleImageUpload);
    }

    renderHistory();
    generateHybridPrediction();
});

// Écouteurs d'événements
const btnCalculate = document.getElementById('btnCalculate');
const btnAddDraw = document.getElementById('btnAddDraw');
const btnReset = document.getElementById('btnReset');

if (btnCalculate) btnCalculate.addEventListener('click', generateHybridPrediction);
if (btnAddDraw) btnAddDraw.addEventListener('click', addNewDraw);
if (btnReset) {
    btnReset.addEventListener('click', () => {
        drawHistory = [...DEFAULT_HISTORY];
        saveHistory();
        renderHistory();
        generateHybridPrediction();
    });
}

// Formate un nombre sur 2 chiffres (ex: 3 -> "03")
function pad(n) {
    return n < 10 ? '0' + n : '' + n;
}

// Clamp un nombre entre 1 et 90
function normalizeLoto(num) {
    let val = Math.abs(Math.round(num)) % 90;
    return val === 0 ? 90 : val;
}

// Extrait l'heure (0-23) d'un libellé comme "07H", "13H", "20H"
function extractHourFromLabel(label) {
    if (!label || typeof label !== 'string') return null;
    const match = label.match(/\b([0-2]?[0-9])\s*H\b/i);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    return (h >= 0 && h <= 23) ? h : null;
}

// Moteur de calcul hybride corrigé (Répartition équilibrée 1-90 & Affinité Horaire)
function generateHybridPrediction() {
    const dateCurrVal = document.getElementById('dateCurrent') ? parseFloat(document.getElementById('dateCurrent').value) : NaN;
    const datePrevVal = document.getElementById('datePrev') ? parseFloat(document.getElementById('datePrev').value) : NaN;
    const hourVal = document.getElementById('hourCoeff') ? parseInt(document.getElementById('hourCoeff').value, 10) : NaN;

    const dCurr = !isNaN(dateCurrVal) ? dateCurrVal : new Date().getDate();
    const dPrevRaw = !isNaN(datePrevVal) ? datePrevVal : 1;
    const safeDPrev = dPrevRaw === 0 ? 1 : dPrevRaw;
    const targetHour = !isNaN(hourVal) ? hourVal : 10;

    // 1. Coefficient indicatif du créneau sur la grille 1-90
    const rawCoeff = (dCurr / safeDPrev) * (targetHour * 37.5);
    const coeffStr = rawCoeff.toFixed(4);
    const formulaEl = document.getElementById('formulaOutput');
    if (formulaEl) {
        formulaEl.textContent = `(${dCurr}/${safeDPrev}) × (${targetHour}×37.5) = ${coeffStr}`;
    }

    // Graines légères dérivées du coefficient
    const parts = coeffStr.split('.');
    const intPart = parseInt(parts[0], 10) || 1;
    const decPart = parseInt(parts[1], 10) || 1234;

    const seedNumbers = [
        normalizeLoto(intPart * 7),
        normalizeLoto(decPart % 90),
        normalizeLoto((intPart + decPart) / 3)
    ];

    // Scores séparés pour les gagnants et les pivots/machines (index 1 à 90)
    const winnerScores = new Array(91).fill(0);
    const machineScores = new Array(91).fill(0);

    // 2. Pondération progressive par récence + affinité horaire
    drawHistory.forEach((draw, index) => {
        const recencyWeight = Math.pow(0.86, index) * 3.0;
        const drawHour = extractHourFromLabel(draw.label);
        const hourAffinity = (drawHour !== null && drawHour === targetHour) ? 1.8 : 1.0;
        const totalWeight = recencyWeight * hourAffinity;

        draw.winners.forEach(num => {
            if (num >= 1 && num <= 90) {
                winnerScores[num] += 2.2 * totalWeight;
            }
        });

        draw.machines.forEach(num => {
            if (num >= 1 && num <= 90) {
                machineScores[num] += 2.2 * totalWeight;
                winnerScores[num] += 1.0 * totalWeight;

                const voisinMoins = num === 1 ? 90 : num - 1;
                const voisinPlus = num === 90 ? 1 : num + 1;

                winnerScores[voisinMoins] += 0.5 * totalWeight;
                winnerScores[voisinPlus] += 0.5 * totalWeight;
                machineScores[voisinMoins] += 0.6 * totalWeight;
                machineScores[voisinPlus] += 0.6 * totalWeight;
            }
        });
    });

    // Léger apport des graines du créneau
    seedNumbers.forEach(seed => {
        winnerScores[seed] += 1.5;
        machineScores[seed] += 1.0;
    });

    // 3. Dizaines les moins présentes sur les 5 derniers tirages gagnants (poids modéré)
    const dizaineCounts = Array(9).fill(0);
    drawHistory.slice(0, 5).forEach(draw => {
        draw.winners.forEach(num => {
            if (num >= 1 && num <= 90) {
                const idx = Math.min(8, Math.floor((num - 1) / 10));
                dizaineCounts[idx]++;
            }
        });
    });

    const minCount = Math.min(...dizaineCounts);
    const coldDizaines = [];
    dizaineCounts.forEach((count, idx) => {
        if (count === minCount) coldDizaines.push(idx);
    });

    coldDizaines.forEach(dIdx => {
        for (let i = 1; i <= 10; i++) {
            const numInCold = (dIdx * 10) + i;
            winnerScores[numInCold] += 1.2;
        }
    });

    // 4. Classement des 90 numéros pour la sélection principale (5 numéros)
    const rankedWinners = [];
    for (let i = 1; i <= 90; i++) {
        rankedWinners.push({ numero: i, score: winnerScores[i] });
    }
    rankedWinners.sort((a, b) => b.score - a.score || a.numero - b.numero);
    const finalWinners = rankedWinners.slice(0, 5).map(item => item.numero);

    // Classement pour les pivots/machines (5 numéros distincts de la sélection principale si possible)
    const rankedMachines = [];
    for (let i = 1; i <= 90; i++) {
        rankedMachines.push({ numero: i, score: machineScores[i] });
    }
    rankedMachines.sort((a, b) => b.score - a.score || a.numero - b.numero);

    const finalMachines = [];
    for (const item of rankedMachines) {
        if (!finalWinners.includes(item.numero)) {
            finalMachines.push(item.numero);
        }
        if (finalMachines.length === 5) break;
    }

    // 5. Indice de convergence basé sur l'avance du Top 5 par rapport aux 85 autres numéros
    const top5Sum = rankedWinners.slice(0, 5).reduce((acc, item) => acc + item.score, 0);
    const totalSum = rankedWinners.reduce((acc, item) => acc + item.score, 0);
    const top5Avg = top5Sum / 5;
    const othersAvg = totalSum > top5Sum ? (totalSum - top5Sum) / 85 : 0;

    let indiceConfiance = 20;
    if (othersAvg > 0) {
        const liftRatio = top5Avg / othersAvg;
        indiceConfiance = Math.min(90, Math.max(15, Math.round(((liftRatio - 1) / 4) * 75 + 20)));
    }

    // Affichage des boules
    renderBalls('predictedWinners', [...finalWinners].sort((a, b) => a - b), 'ball-winner');
    renderBalls('predictedMachines', [...finalMachines].sort((a, b) => a - b), 'ball-machine');

    // Texte explicatif et badge de l'Indice de Convergence
    const coldLabels = coldDizaines.map(d => `${d * 10 + 1}-${(d + 1) * 10}`).join(', ');
    const badgeColor = indiceConfiance >= 65 ? '#16a34a' : (indiceConfiance >= 40 ? '#d97706' : '#64748b');
    const badgeText = indiceConfiance >= 65
        ? '🟢 Signal concentré (Forte convergence)'
        : (indiceConfiance >= 40 ? '🟠 Convergence modérée' : '⚪ Dispersion élevée (Signal faible)');

    const statsEl = document.getElementById('statsAnalysis');
    if (statsEl) {
        statsEl.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold; color: ${badgeColor}; padding: 8px; background: rgba(0,0,0,0.03); border-radius: 6px;">
                Indice de convergence : ${indiceConfiance}% — ${badgeText}
            </div>
            <strong>Logique appliquée (${pad(targetHour)}H) :</strong><br>
            • Dizaines les moins présentes (5 derniers tirages) : <b>${coldLabels}</b><br>
            • Affinité horaire (${pad(targetHour)}H), récence progressive et voisins (±1) pondérés sur 1–90.
        `;
    }
}

function renderBalls(containerId, numbers, cssClass) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    numbers.forEach(num => {
        const div = document.createElement('div');
        div.className = `ball ${cssClass}`;
        div.textContent = pad(num);
        container.appendChild(div);
    });
}

// Gestion de l'upload de plusieurs images (conservée au cas où)
async function handleMultipleImageUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const statusDiv = document.getElementById('ocrStatus');
    let addedCount = 0;

    for (let i = 0; i < files.length; i++) {
        if (statusDiv) statusDiv.textContent = `🔍 Analyse de l'image ${i + 1} sur ${files.length}...`;
        try {
            const { data: { text } } = await Tesseract.recognize(files[i], 'eng');
            const draws = parseMultipleDrawsFromText(text);

            draws.forEach(draw => {
                const exists = drawHistory.some(d => d.label === draw.label && d.winners.toString() === draw.winners.toString());
                if (!exists && draw.winners.length === 5 && draw.machines.length === 5) {
                    drawHistory.unshift(draw);
                    addedCount++;
                }
            });
        } catch (err) {
            console.error("Erreur OCR sur l'image", err);
        }
    }

    if (addedCount > 0) {
        if (drawHistory.length > 25) drawHistory = drawHistory.slice(0, 25);
        saveHistory();
        renderHistory();
        generateHybridPrediction();
        if (statusDiv) statusDiv.textContent = `✨ Succès ! ${addedCount} tirage(s) extrait(s) et ajoutés à l'historique !`;
    } else {
        if (statusDiv) statusDiv.textContent = "⚠️ Aucun nouveau tirage valide n'a pu être découpé automatiquement.";
    }
}

function parseMultipleDrawsFromText(text) {
    const draws = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let currentLabel = null;
    let collectedNumbers = [];

    lines.forEach(line => {
        const hourMatch = line.match(/\b([0-2]?[0-9])\s*H\b/i);
        if (hourMatch) {
            if (currentLabel && collectedNumbers.length >= 10) {
                draws.push({
                    label: currentLabel,
                    winners: collectedNumbers.slice(0, 5),
                    machines: collectedNumbers.slice(5, 10)
                });
                collectedNumbers = [];
            }
            currentLabel = hourMatch[1].padStart(2, '0') + 'H';
        }

        const nums = line.match(/\b([0-9]{1,2})\b/g);
        if (nums) {
            nums.forEach(n => {
                const val = parseInt(n, 10);
                if (val >= 1 && val <= 90) {
                    if (!(hourMatch && parseInt(hourMatch[1], 10) === val && collectedNumbers.length === 0)) {
                        collectedNumbers.push(val);
                    }
                }
            });
        }
    });

    if (currentLabel && collectedNumbers.length >= 10) {
        draws.push({
            label: currentLabel,
            winners: collectedNumbers.slice(0, 5),
            machines: collectedNumbers.slice(5, 10)
        });
    }

    return draws;
}

// Ajout manuel classique
function parseInputNumbers(str) {
    return str.trim()
        .split(/[\s,;-]+/)
        .map(n => parseInt(n, 10))
        .filter(n => !isNaN(n) && n >= 1 && n <= 90);
}

function addNewDraw() {
    const labelEl = document.getElementById('drawLabel');
    const winnersEl = document.getElementById('inputWinners');
    const machinesEl = document.getElementById('inputMachines');

    const label = (labelEl ? labelEl.value.trim() : '') || "Tirage";
    const winners = parseInputNumbers(winnersEl ? winnersEl.value : '');
    const machines = parseInputNumbers(machinesEl ? machinesEl.value : '');

    if (winners.length !== 5 || machines.length !== 5) {
        alert("Veuillez saisir exactement 5 numéros valides (entre 1 et 90) pour les gagnants et 5 pour les machines.");
        return;
    }

    drawHistory.unshift({ label, winners, machines });
    if (drawHistory.length > 25) drawHistory.pop();

    saveHistory();
    renderHistory();
    generateHybridPrediction();

    if (labelEl) labelEl.value = '';
    if (winnersEl) winnersEl.value = '';
    if (machinesEl) machinesEl.value = '';

    const ocrStatusEl = document.getElementById('ocrStatus');
    if (ocrStatusEl) {
        ocrStatusEl.textContent = '';
    }
}

function saveHistory() {
    localStorage.setItem('loto590_history', JSON.stringify(drawHistory));
}

function renderHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;
    list.innerHTML = '';
    drawHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <strong>${item.label}</strong> — 
            Gagnants : <span style="color:#ea580c;font-weight:bold;">${item.winners.map(pad).join(' - ')}</span> | 
            Machines : <span style="color:#0d9488;font-weight:bold;">${item.machines.map(pad).join(' - ')}</span>
        `;
        list.appendChild(div);
    });
}
