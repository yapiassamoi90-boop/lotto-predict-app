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

    // Gestionnaire pour l'importation de plusieurs images (OCR) - Optionnel
    const imageInput = document.getElementById('imageUploadInput');
    if (imageInput) {
        imageInput.addEventListener('change', handleMultipleImageUpload);
    }

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

// Moteur de calcul hybride corrigé (Répartition équilibrée 1-90 & Affinité Horaire)
function generateHybridPrediction() {
    const dCurr = parseFloat(document.getElementById('dateCurrent').value) || 18;
    const dPrev = parseFloat(document.getElementById('datePrev').value) || 17;
    const targetHour = parseFloat(document.getElementById('hourCoeff').value) || 10;

    // 1. Formule mathématique corrigée pour balayer toute la plage 1-90 (évite de bloquer sur les petits chiffres)
    const rawCoeff = (dCurr / dPrev) * (targetHour * 37.5);
    const coeffStr = rawCoeff.toFixed(4);
    document.getElementById('formulaOutput').textContent = 
        `(${dCurr}/${dPrev}) × (${targetHour}×37.5) = ${coeffStr}`;

    // Extraction de graines réparties sur toute la grille 1-90
    const parts = coeffStr.split('.');
    const intPart = parseInt(parts[0]) || 1;
    const decPart = parseInt(parts[1]) || 1234;

    let seedNumbers = [
        normalizeLoto(intPart * 7),
        normalizeLoto(decPart % 90),
        normalizeLoto((intPart + decPart) / 3)
    ];

    // Initialisation des scores pour les 90 numéros (index 1 à 90)
    let scores = new Array(91).fill(0);

    // 2. Analyse de l'historique avec pondération par Récence ET Affinité Horaire
    drawHistory.forEach((draw, index) => {
        let poidsRecence = index === 0 ? 3.0 : (index < 3 ? 2.0 : 1.0);
        
        // Bonus d'affinité si le tirage historique correspond à la même heure ciblée
        let drawHourNum = parseInt(draw.label) || 0;
        let bonusHoraire = (drawHourNum === targetHour) ? 2.5 : 1.0;

        let totalWeight = poidsRecence * bonusHoraire;

        draw.winners.forEach(num => {
            scores[num] += 2.0 * totalWeight;
        });

        draw.machines.forEach(num => {
            scores[num] += 3.0 * totalWeight;

            // Prise en compte des voisins immédiats (±1)
            let voisinMoins = num === 1 ? 90 : num - 1;
            let voisinPlus = num === 90 ? 1 : num + 1;
            scores[voisinMoins] += 1.0 * totalWeight;
            scores[voisinPlus] += 1.0 * totalWeight;
        });
    });

    seedNumbers.forEach(seed => {
        scores[seed] += 6.0;
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

    coldDizaines.forEach(dIdx => {
        for (let i = 1; i <= 10; i++) {
            let numInCold = (dIdx * 10) + i;
            scores[numInCold] += 4.0; // Poids renforcé pour les zones froides
        }
    });

    // 4. Classement global des 90 numéros par score décroissant
    let classement = [];
    for (let i = 1; i <= 90; i++) {
        classement.push({ numero: i, score: scores[i] });
    }
    classement.sort((a, b) => b.score - a.score);

    let finalWinners = classement.slice(0, 5).map(item => item.numero);
    let finalMachines = classement.slice(5, 10).map(item => item.numero);

    // 5. Calcul de l'Indice de Convergence
    const top5Moyenne = classement.slice(0, 5).reduce((acc, item) => acc + item.score, 0) / 5;
    const moyenneGlobale = classement.reduce((acc, item) => acc + item.score, 0) / 90;
    let ratio = moyenneGlobale > 0 ? (top5Moyenne / moyenneGlobale) : 1;
    let indiceConfiance = Math.min(95, Math.max(35, Math.round(ratio * 22)));

    // Affichage des boules
    renderBalls('predictedWinners', finalWinners.sort((a, b) => a - b), 'ball-winner');
    renderBalls('predictedMachines', finalMachines.sort((a, b) => a - b), 'ball-machine');

    // Texte explicatif et badge de l'Indice de Convergence
    const coldLabels = coldDizaines.map(d => `${d * 10 + 1}-${(d + 1) * 10}`).join(', ');
    const badgeColor = indiceConfiance >= 60 ? '#16a34a' : '#d97706';
    const badgeText = indiceConfiance >= 60 ? '🟢 Signal Fort (Forte convergence)' : '🟠 Dispersion modérée';

    document.getElementById('statsAnalysis').innerHTML = `
        <div style="margin-bottom: 8px; font-weight: bold; color: ${badgeColor}; padding: 8px; background: rgba(0,0,0,0.03); border-radius: 6px;">
            Indice de convergence : ${indiceConfiance}% — ${badgeText}
        </div>
        <strong>Logique appliquée (${pad(targetHour)}H) :</strong><br>
        • Dizaines froides ciblées : <b>${coldLabels}</b><br>
        • Affinité horaire & Récence pondérées dans la matrice.
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

// Gestion de l'upload de plusieurs images (conservée au cas où)
async function handleMultipleImageUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const statusDiv = document.getElementById('ocrStatus');
    let addedCount = 0;

    for (let i = 0; i < files.length; i++) {
        statusDiv.textContent = `🔍 Analyse de l'image ${i + 1} sur ${files.length}...`;
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
        statusDiv.textContent = `✨ Succès ! ${addedCount} tirage(s) extrait(s) et ajoutés à l'historique !`;
    } else {
        statusDiv.textContent = "⚠️ Aucun nouveau tirage valide n'a pu être découpé automatiquement.";
    }
}

function parseMultipleDrawsFromText(text) {
    let draws = [];
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
                let val = parseInt(n, 10);
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
    const label = document.getElementById('drawLabel').value.trim() || "Tirage";
    const winners = parseInputNumbers(document.getElementById('inputWinners').value);
    const machines = parseInputNumbers(document.getElementById('inputMachines').value);

    if (winners.length !== 5 || machines.length !== 5) {
        alert("Veuillez saisir exactement 5 numéros valides (entre 1 et 90) pour les gagnants et 5 pour les machines.");
        return;
    }

    drawHistory.unshift({ label, winners, machines });
    if (drawHistory.length > 25) drawHistory.pop();

    saveHistory();
    renderHistory();
    generateHybridPrediction();

    document.getElementById('drawLabel').value = '';
    document.getElementById('inputWinners').value = '';
    document.getElementById('inputMachines').value = '';
    if(document.getElementById('ocrStatus')) {
        document.getElementById('ocrStatus').textContent = '';
    }
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
