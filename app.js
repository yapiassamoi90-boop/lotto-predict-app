// Initialisation avec tes derniers tirages connus
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

// Initialisation des dates et boutons horaires
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    document.getElementById('dateCurrent').value = today.getDate();
    document.getElementById('datePrev').value = yesterday.getDate();

    // Gestion du clic sur les boutons d'heures
    const hourButtons = document.querySelectorAll('.hour-btn');
    const hourInput = document.getElementById('hourCoeff');

    hourButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            hourButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            hourInput.value = btn.getAttribute('data-hour');
            generateHybridPrediction();
        });
    });

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

// Moteur de calcul hybride avancé avec pondération par récence et voisinage
function generateHybridPrediction() {
    const dCurr = parseFloat(document.getElementById('dateCurrent').value) || 17;
    const dPrev = parseFloat(document.getElementById('datePrev').value) || 16;
    const hour = parseFloat(document.getElementById('hourCoeff').value) || 10;

    // 1. Racine Mathématique : (Date / Veille) * (Heure / 2026)
    const rawCoeff = (dCurr / dPrev) * (hour / 2026);
    const coeffStr = rawCoeff.toFixed(6);
    document.getElementById('formulaOutput').textContent = 
        `(${dCurr}/${dPrev}) × (${hour}/2026) = ${coeffStr}`;

    // Extraction des paires décimales de la racine comme graines de base
    const decimals = coeffStr.split('.')[1] || "123456";
    let seedNumbers = [
        normalizeLoto(parseInt(decimals.substring(0, 2))),
        normalizeLoto(parseInt(decimals.substring(2, 4))),
        normalizeLoto(parseInt(decimals.substring(4, 6)))
    ];

    // Initialisation des scores pour les 90 numéros (index 1 à 90)
    let scores = new Array(91).fill(0);

    // 2. Analyse de l'historique avec Poids par Récence & Filtre de Voisine (±1)
    drawHistory.slice(0, 10).forEach((draw, index) => {
        // Plus le tirage est récent (index 0 = dernier tirage), plus son poids est fort
        let poidsRecence = index === 0 ? 3.0 : (index < 3 ? 2.0 : 1.0);

        // Score sur les gagnants
        draw.winners.forEach(num => {
            scores[num] += 2 * poidsRecence;
        });

        // Score renforcé sur les machines (pivots de transfert)
        draw.machines.forEach(num => {
            scores[num] += 3.5 * poidsRecence;

            // Filtre de voisinage automatique (±1) sur les 3 derniers tirages pour contrer les quasi-ratés
            if (index < 3) {
                let voisinMoins = num === 1 ? 90 : num - 1;
                let voisinPlus = num === 90 ? 1 : num + 1;
                scores[voisinMoins] += 1.5 * poidsRecence;
                scores[voisinPlus] += 1.5 * poidsRecence;
            }
        });
    });

    // Injection des graines mathématiques de la formule dans les scores
    seedNumbers.forEach(seed => {
        scores[seed] += 5.0;
    });

    // 3. Analyse des dizaines froides (Loi d'équilibre)
    const dizaineCounts = Array(9).fill(0);
    drawHistory.slice(0, 5).forEach(draw => {
        draw.winners.forEach(num => {
            const idx = Math.min(8, Math.floor((num - 1) / 10));
            dizaineCounts[idx]++;
        });
    });

    let coldDizaines = [];
    dizaineCounts.forEach((count, idx) => {
        if (count === 0) coldDizaines.push(idx);
    });
    if (coldDizaines.length === 0) {
        const minCount = Math.min(...dizaineCounts);
        dizaineCounts.forEach((c, idx) => { if (c === minCount) coldDizaines.push(idx); });
    }

    // Boost des scores pour les numéros situés dans les dizaines froides
    coldDizaines.forEach(dIdx => {
        for (let i = 1; i <= 10; i++) {
            let numInCold = (dIdx * 10) + i;
            scores[numInCold] += 3.0;
        }
    });

    // 4. Classement global des 90 numéros par score décroissant
    let classement = [];
    for (let i = 1; i <= 90; i++) {
        classement.push({ numero: i, score: scores[i] });
    }
    classement.sort((a, b) => b.score - a.score);

    // Extraction des 5 meilleurs gagnants et des 5 pivots machines suivants
    let finalWinners = classement.slice(0, 5).map(item => item.numero);
    let finalMachines = classement.slice(5, 10).map(item => item.numero);

    // 5. Calcul de l'Indice de Confiance du signal
    const top5Moyenne = classement.slice(0, 5).reduce((acc, item) => acc + item.score, 0) / 5;
    const moyenneGlobale = classement.reduce((acc, item) => acc + item.score, 0) / 90;
    let ratio = moyenneGlobale > 0 ? (top5Moyenne / moyenneGlobale) : 1;
    let indiceConfiance = Math.min(95, Math.max(30, Math.round(ratio * 25)));

    // Affichage des boules
    renderBalls('predictedWinners', finalWinners.sort((a, b) => a - b), 'ball-winner');
    renderBalls('predictedMachines', finalMachines.sort((a, b) => a - b), 'ball-machine');

    // Texte explicatif et badge de confiance
    const coldLabels = coldDizaines.map(d => `${d * 10 + 1}-${(d + 1) * 10}`).join(', ');
    const badgeColor = indiceConfiance >= 60 ? '#16a34a' : '#d97706';
    const badgeText = indiceConfiance >= 60 ? '🟢 Signal Fort (Forte convergence)' : '🟠 Dispersion modérée';

    document.getElementById('statsAnalysis').innerHTML = `
        <div style="margin-bottom: 8px; font-weight: bold; color: ${badgeColor};">
            Indice de convergence : ${indiceConfiance}% — ${badgeText}
        </div>
        <strong>Logique appliquée (${pad(hour)}H) :</strong><br>
        • Dizaines froides ciblées : <b>${coldLabels}</b><br>
        • Poids par récence & Voisins (±1) intégrés dans la matrice.
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
