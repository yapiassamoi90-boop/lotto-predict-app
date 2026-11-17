// Initialisation avec tes derniers tirages connus (21h, 22h, 23h)
const DEFAULT_HISTORY = [
    { label: "23H", winners: [3, 20, 13, 50, 25], machines: [30, 86, 51, 46, 26] },
    { label: "22H", winners: [20, 30, 13, 87, 59], machines: [22, 90, 35, 80, 3] },
    { label: "21H", winners: [60, 16, 51, 48, 41], machines: [71, 24, 4, 5, 57] }
];

let drawHistory = JSON.parse(localStorage.getItem('loto590_history')) || DEFAULT_HISTORY;

// Enregistrement du Service Worker pour le mode hors-ligne (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW error:', err));
    });
}

// Initialisation des dates du jour automatiquement
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    document.getElementById('dateCurrent').value = today.getDate();
    document.getElementById('datePrev').value = yesterday.getDate();

    renderHistory();
    generateHybridPrediction();
});

// Écouteurs d'événements
document.getElementById('btnCalculate').addEventListener('click', generateHybridPrediction);
document.getElementById('btnAddDraw').addEventListener('click', addNewDraw);
document.getElementById('btnReset').addEventListener('click', () => {
    drawHistory = [...DEFAULT_HISTORY];
    saveHistory();
    renderHistory();
    generateHybridPrediction();
});

// Formate un nombre sur 2 chiffres (ex: 3 -> "03")
function pad(n) {
    return n < 10 ? '0' + n : '' + n;
}

// Clamp un nombre entre 1 et 90
function normalizeLoto(num) {
    let val = Math.abs(Math.round(num)) % 90;
    return val === 0 ? 90 : val;
}

// Moteur de calcul hybride
function generateHybridPrediction() {
    const dCurr = parseFloat(document.getElementById('dateCurrent').value) || 17;
    const dPrev = parseFloat(document.getElementById('datePrev').value) || 16;
    const hour = parseFloat(document.getElementById('hourCoeff').value) || 13;

    // 1. Racine Mathématique : (Date / Veille) * (Heure / 2026)
    const rawCoeff = (dCurr / dPrev) * (hour / 2026);
    const coeffStr = rawCoeff.toFixed(6);
    document.getElementById('formulaOutput').textContent = 
        `(${dCurr}/${dPrev}) × (${hour}/2026) = ${coeffStr}`;

    // Extraction des paires décimales de la racine
    const decimals = coeffStr.split('.')[1] || "123456";
    let seedNumbers = [
        normalizeLoto(parseInt(decimals.substring(0, 2))),
        normalizeLoto(parseInt(decimals.substring(2, 4))),
        normalizeLoto(parseInt(decimals.substring(4, 6)))
    ];

    // 2. Analyse statistique sur les 3 derniers tirages (Dizaines en retard)
    const recentDraws = drawHistory.slice(0, 3);
    const dizaineCounts = Array(9).fill(0); // 0->1-10, 1->11-20 ... 8->81-90
    let lastMachines = recentDraws.length > 0 ? recentDraws[0].machines : [30, 51, 26];
    let lastWinners = recentDraws.length > 0 ? recentDraws[0].winners : [3, 20, 25];

    recentDraws.forEach(draw => {
        draw.winners.forEach(num => {
            const idx = Math.min(8, Math.floor((num - 1) / 10));
            dizaineCounts[idx]++;
        });
    });

    // Repérer les dizaines les moins sorties (retardataires)
    let coldDizaines = [];
    dizaineCounts.forEach((count, idx) => {
        if (count === 0) coldDizaines.push(idx);
    });
    if (coldDizaines.length === 0) {
        const minCount = Math.min(...dizaineCounts);
        dizaineCounts.forEach((c, idx) => { if (c === minCount) coldDizaines.push(idx); });
    }

    // 3. Construction de la grille Gagnants (Hybride : Formule + Voisinage + Dizaine froide)
    let finalWinners = new Set();

    // Base issue de la formule
    finalWinners.add(seedNumbers[0]);

    // Voisinage (+/- 1 ou +/- 2) d'un numéro fort du dernier tirage
    const pivotWinner = lastWinners[Math.floor(dCurr % lastWinners.length)];
    finalWinners.add(normalizeLoto(pivotWinner + (hour % 2 === 0 ? 1 : -1)));

    // Transfert direct depuis les machines du tirage précédent
    const transferMachine = lastMachines[hour % lastMachines.length];
    finalWinners.add(transferMachine);

    // Injection dans les dizaines froides (loi d'équilibre)
    coldDizaines.slice(0, 2).forEach((dIdx, i) => {
        const baseInDizaine = (dIdx * 10) + ((dCurr + i * 3) % 9) + 1;
        finalWinners.add(normalizeLoto(baseInDizaine));
    });

    // Compléter jusqu'à 5 numéros uniques si besoin
    let fallbackStep = 7;
    while (finalWinners.size < 5) {
        finalWinners.add(normalizeLoto(seedNumbers[1] + fallbackStep));
        fallbackStep += 11;
    }

    // 4. Construction des Machines associées (Voisins des pivots)
    let finalMachines = new Set();
    finalWinners.forEach(w => {
        if (finalMachines.size < 5) {
            let candidate = normalizeLoto(w + (w % 2 === 0 ? 2 : -2));
            if (!finalWinners.has(candidate)) {
                finalMachines.add(candidate);
            }
        }
    });
    let mStep = 4;
    while (finalMachines.size < 5) {
        let cand = normalizeLoto(seedNumbers[2] + mStep);
        if (!finalWinners.has(cand)) finalMachines.add(cand);
        mStep += 9;
    }

    // Affichage des boules
    renderBalls('predictedWinners', Array.from(finalWinners).sort((a, b) => a - b), 'ball-winner');
    renderBalls('predictedMachines', Array.from(finalMachines).sort((a, b) => a - b), 'ball-machine');

    // Texte explicatif de la logique appliquée
    const coldLabels = coldDizaines.map(d => `${d * 10 + 1}-${(d + 1) * 10}`).join(', ');
    document.getElementById('statsAnalysis').innerHTML = `
        <strong>Logique appliquée :</strong><br>
        • Dizaines en retard ciblées : <b>${coldLabels}</b><br>
        • Pivot de transfert machine : <b>${pad(transferMachine)}</b><br>
        • Voisinage actif autour de : <b>${pad(pivotWinner)}</b>
    `;
}

function renderBalls(containerId, numbers, cssClass) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    numbers.forEach(num => {
        const div = document.createElement('div');
        div.className = `ball ${cssClass}`;
        div.textContent = pad(num);
        container.appendChild(div);
    });
}

// Ajout manuel rapide d'un résultat
function parseInputNumbers(str) {
    return str.trim()
        .split(/[\s,;-]+/)
        .map(n => parseInt(n, 10))
        .filter(n => !isNaN(n) && n >= 1 && n <= 90);
}

function addNewDraw() {
    const label = document.getElementById('drawLabel').value.trim() || "Tirage";
    const winners = parseInputNumbers(document.getElementById('inputWinners').value);
    const machines = parseInputNumbers(document.getElementById('inputMachines').value);

    if (winners.length !== 5 || machines.length !== 5) {
        alert("Veuillez saisir exactement 5 numéros valides (entre 1 et 90) pour les gagnants et 5 pour les machines.");
        return;
    }

    drawHistory.unshift({ label, winners, machines });
    if (drawHistory.length > 15) drawHistory.pop();

    saveHistory();
    renderHistory();
    generateHybridPrediction();

    document.getElementById('drawLabel').value = '';
    document.getElementById('inputWinners').value = '';
    document.getElementById('inputMachines').value = '';
}

function saveHistory() {
    localStorage.setItem('loto590_history', JSON.stringify(drawHistory));
}

function renderHistory() {
    const list = document.getElementById('historyList');
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
