/**
 * LOTO 5/90 HYBRID ANALYZER - ENGINE v11.2
 * Auteur : Dev.Assamoi
 * Nouveautés :
 * - Découpage OCR multi-heures structuré par sections GAGNANTS / MACHINES
 * - Rejet des blocs incomplets coupés en bord de capture et des dates parasites
 * - Affichage des sélections par rang de score décroissant (sans tri croissant)
 */

const DEFAULT_HISTORY = [
    {
        label: '13H',
        winners: [37, 42, 38, 36, 18],
        machines: [81, 19, 26, 10, 44]
    },
    {
        label: '10H',
        winners: [82, 54, 2, 49, 19],
        machines: [43, 5, 11, 37, 6]
    },
    {
        label: '08H',
        winners: [47, 86, 10, 63, 46],
        machines: [67, 38, 71, 32, 74]
    },
    {
        label: '07H',
        winners: [70, 66, 61, 29, 75],
        machines: [39, 81, 40, 8, 17]
    }
];

let drawHistory = JSON.parse(localStorage.getItem('loto590_history')) || [...DEFAULT_HISTORY];

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const dateCurrInput = document.getElementById('dateCurrent');
    const datePrevInput = document.getElementById('datePrev');

    if (dateCurrInput) dateCurrInput.value = today.getDate();
    if (datePrevInput) datePrevInput.value = yesterday.getDate();

    setupHourButtons();
    setupOCRUpload();
    renderHistory();
    generateHybridPrediction();

    document.getElementById('btnCalculate').addEventListener('click', generateHybridPrediction);
    document.getElementById('btnAddDraw').addEventListener('click', addManualDraw);
    document.getElementById('btnReset').addEventListener('click', resetHistory);
});

// Gestion de la sélection d'heures
function setupHourButtons() {
    const buttons = document.querySelectorAll('.hour-btn');
    const hourInput = document.getElementById('hourCoeff');

    const activeBtn = document.querySelector('.hour-btn.active');
    if (activeBtn && hourInput) {
        hourInput.value = activeBtn.dataset.hour;
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            hourInput.value = btn.dataset.hour;
            generateHybridPrediction();
        });
    });
}

// Normalise un nombre dans l'intervalle [1..90]
function normalizeLoto(num) {
    let n = Math.round(Math.abs(num)) % 90;
    return n === 0 ? 90 : n;
}

// Extrait l'heure numérique d'un libellé (ex: "10H" -> 10)
function extractHourFromLabel(label) {
    if (!label) return null;
    const match = String(label).match(/(\d{1,2})\s*H/i);
    return match ? parseInt(match[1], 10) : null;
}

// Vérifie si un tirage identique existe déjà dans l'historique
function isDuplicateDraw(newDraw) {
    return drawHistory.some(existing =>
        existing.label.toUpperCase() === newDraw.label.toUpperCase() &&
        JSON.stringify(existing.winners) === JSON.stringify(newDraw.winners) &&
        JSON.stringify(existing.machines) === JSON.stringify(newDraw.machines)
    );
}

// ============================================================
// MOTEUR HYBRIDE (Date + Affinité Horaire + Récence + Dizaines)
// ============================================================
function generateHybridPrediction() {
    const dCurr = parseFloat(document.getElementById('dateCurrent').value) || 1;
    const dPrev = Math.max(1, parseFloat(document.getElementById('datePrev').value) || 1);
    const targetHour = parseFloat(document.getElementById('hourCoeff').value) || 10;

    // 1. Calcul du coefficient mathématique
    const coeff = (dCurr / dPrev) * (targetHour * 37.5);
    const coeffFormatted = coeff.toFixed(4);
    document.getElementById('formulaOutput').textContent =
        `(${dCurr}/${dPrev}) × (${targetHour}×37.5) = ${coeffFormatted}`;

    // Graines issues du coefficient
    const intPart = Math.floor(coeff);
    const decPart = Math.round((coeff - intPart) * 1000);
    const seedNumbers = [
        normalizeLoto(intPart * 7),
        normalizeLoto(decPart % 90),
        normalizeLoto((intPart + decPart) / 3)
    ];

    // 2. Initialisation des scores [1..90]
    const winnerScores = new Array(91).fill(0);
    const machineScores = new Array(91).fill(0);

    seedNumbers.forEach((seed, idx) => {
        const boost = 2.6 - idx * 0.4;
        winnerScores[seed] += boost;
        machineScores[normalizeLoto(seed + 1)] += boost * 0.6;
        machineScores[normalizeLoto(seed - 1)] += boost * 0.6;
    });

    // 3. Analyse statistique pondérée par récence progressive + affinité horaire
    const recentDraws = drawHistory.slice(0, 12);
    recentDraws.forEach((draw, index) => {
        // Décroissance douce de 3.0 jusqu'à ~0.95
        const recencyWeight = 3.0 * Math.pow(0.86, index);
        const drawHour = extractHourFromLabel(draw.label);
        const hourAffinity = (drawHour !== null && drawHour === targetHour) ? 1.8 : 1.0;
        const totalWeight = recencyWeight * hourAffinity;

        (draw.winners || []).forEach((num, pos) => {
            if (num >= 1 && num <= 90) {
                const posBonus = 1 + (4 - pos) * 0.04;
                winnerScores[num] += totalWeight * 1.15 * posBonus;
                // Légère résonance sur les voisins et pivots machines
                machineScores[num] += totalWeight * 0.25;
                machineScores[normalizeLoto(num + 1)] += totalWeight * 0.2;
                machineScores[normalizeLoto(num - 1)] += totalWeight * 0.2;
            }
        });

        (draw.machines || []).forEach((num, pos) => {
            if (num >= 1 && num <= 90) {
                const posBonus = 1 + (4 - pos) * 0.04;
                machineScores[num] += totalWeight * 1.2 * posBonus;
                machineScores[normalizeLoto(num + 1)] += totalWeight * 0.35;
                machineScores[normalizeLoto(num - 1)] += totalWeight * 0.35;
                // Transfert modéré machine -> gagnant
                winnerScores[num] += totalWeight * 0.35;
            }
        });
    });

    // 4. Bonus modéré sur les 2 dizaines les plus froides (5 derniers tirages)
    const decadeCounts = new Array(9).fill(0);
    drawHistory.slice(0, 5).forEach(draw => {
        (draw.winners || []).forEach(num => {
            if (num >= 1 && num <= 90) {
                decadeCounts[Math.floor((num - 1) / 10)]++;
            }
        });
    });

    const coldDecades = decadeCounts
        .map((count, idx) => ({ idx, count }))
        .sort((a, b) => a.count - b.count)
        .slice(0, 2);

    coldDecades.forEach(({ idx }) => {
        const start = idx * 10 + 1;
        const end = (idx + 1) * 10;
        for (let n = start; n <= end; n++) {
            winnerScores[n] += 1.2;
        }
    });

    // 5. Classement par score décroissant (conservation du rang de score)
    const rankedWinners = [];
    const rankedMachines = [];

    for (let n = 1; n <= 90; n++) {
        rankedWinners.push({ numero: n, score: winnerScores[n] });
        rankedMachines.push({ numero: n, score: machineScores[n] });
    }

    rankedWinners.sort((a, b) => b.score - a.score);
    rankedMachines.sort((a, b) => b.score - a.score);

    // Sélection des 5 meilleurs gagnants (ordre de score conservé)
    const finalWinners = rankedWinners.slice(0, 5).map(item => item.numero);

    // Sélection des 5 meilleures machines distinctes des gagnants (ordre de score conservé)
    const finalMachines = [];
    for (let i = 0; i < rankedMachines.length && finalMachines.length < 5; i++) {
        const candidate = rankedMachines[i].numero;
        if (!finalWinners.includes(candidate)) {
            finalMachines.push(candidate);
        }
    }

    // Affichage direct selon le rang de score (du 1er au 5e)
    renderBalls('predictedWinners', finalWinners, 'ball-winner');
    renderBalls('predictedMachines', finalMachines, 'ball-machine');

    // 6. Calcul de l'indice de convergence normalisé
    const top5Sum = rankedWinners.slice(0, 5).reduce((acc, item) => acc + item.score, 0);
    const totalSum = rankedWinners.reduce((acc, item) => acc + item.score, 0);
    const convergenceRatio = totalSum > 0 ? Math.min(99, Math.round((top5Sum / totalSum) * 450)) : 0;

    let badge = '🔴 Dispersion élevée';
    if (convergenceRatio >= 68) badge = '🟢 Signal concentré';
    else if (convergenceRatio >= 48) badge = '🟠 Dispersion modérée';

    const coldLabels = coldDecades
        .map(d => `${String(d.idx * 10 + 1).padStart(2, '0')}-${(d.idx + 1) * 10}`)
        .join(' et ');

    document.getElementById('statsAnalysis').innerHTML = `
        <p><strong>Indice de convergence :</strong> ${convergenceRatio} % — ${badge}</p>
        <p><strong>Dizaines froides ciblées :</strong> ${coldLabels}</p>
        <p><strong>Ordre d'affichage :</strong> Classé du 1<sup>er</sup> au 5<sup>e</sup> rang de score (créneau ${String(targetHour).padStart(2, '0')}H).</p>
    `;
}

// ============================================================
// MODULE OCR MULTI-HEURES STRUCTURÉ (GAGNANTS / MACHINES)
// ============================================================
function setupOCRUpload() {
    const fileInput = document.getElementById('imageUploadInput');
    const statusDiv = document.getElementById('ocrStatus');
    if (!fileInput) return;

    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        let totalAdded = 0;
        let totalSkipped = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            statusDiv.textContent = `Analyse de l'image ${i + 1}/${files.length} en cours...`;

            try {
                const { data: { text } } = await Tesseract.recognize(file, 'fra', {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const pct = Math.round((m.progress || 0) * 100);
                            statusDiv.textContent = `Image ${i + 1}/${files.length} : lecture OCR (${pct}%)...`;
                        }
                    }
                });

                const extractedDraws = parseMultipleDrawsFromText(text);

                // On insère du plus ancien au plus récent dans l'image pour conserver l'ordre chronologique en tête
                for (let j = extractedDraws.length - 1; j >= 0; j--) {
                    const draw = extractedDraws[j];
                    if (!isDuplicateDraw(draw)) {
                        drawHistory.unshift(draw);
                        totalAdded++;
                    } else {
                        totalSkipped++;
                    }
                }
            } catch (err) {
                console.error('Erreur OCR:', err);
                statusDiv.textContent = `Erreur lors de la lecture de l'image ${i + 1}.`;
            }
        }

        if (totalAdded > 0) {
            saveAndRefresh();
            statusDiv.textContent = `✅ ${totalAdded} tirage(s) ajouté(s)${totalSkipped > 0 ? ` (${totalSkipped} doublon(s) ignoré(s))` : ''}.`;
        } else if (totalSkipped > 0) {
            statusDiv.textContent = `ℹ️ Tirages déjà présents dans l'historique (${totalSkipped} doublon(s)).`;
        } else {
            statusDiv.textContent = `⚠️ Aucun bloc complet (Heure + 5 Gagnants + 5 Machines) détecté.`;
        }

        fileInput.value = '';
    });
}

/**
 * Découpe proprement un texte OCR multi-heures en isolant :
 * 1. L'en-tête horaire (ex: "08H - TIRAGE Nº . - SOLEIL" -> "08H")
 * 2. La sous-section GAGNANTS (5 numéros de 1 à 90)
 * 3. La sous-section MACHINES (5 numéros de 1 à 90)
 * Ignore les en-têtes/dates parasites et les blocs incomplets coupés en bord d'écran.
 */
function parseMultipleDrawsFromText(text) {
    if (!text) return [];

    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const blocks = [];
    let currentBlock = null;
    let currentSection = null; // 'winners' | 'machines' | null

    const finalizeBlock = (block) => {
        if (!block) return;

        // Cas idéal : 5 gagnants explicites + 5 machines explicites
        if (block.winners.length >= 5 && block.machines.length >= 5) {
            blocks.push({
                label: block.label,
                winners: block.winners.slice(0, 5),
                machines: block.machines.slice(0, 5)
            });
            return;
        }

        // Repli sécurisé si les mots-clés GAGNANTS/MACHINES ont été partiellement effacés par l'OCR
        // mais que le bloc horaire contient exactement 10 numéros valides dans l'ordre
        if (block.fallbackNumbers.length >= 10) {
            blocks.push({
                label: block.label,
                winners: block.fallbackNumbers.slice(0, 5),
                machines: block.fallbackNumbers.slice(5, 10)
            });
        }
    };

    for (const rawLine of lines) {
        const upperLine = rawLine.toUpperCase();

        // Ignorer les lignes de dates (ex: "Résultats du 18/11/2026") ou d'heure système ("12:44")
        if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(upperLine) || /R[ÉE]SULTATS\s+DU/.test(upperLine)) {
            continue;
        }

        // Détection d'un nouveau créneau horaire (ex: "07H", "08H", "10H", "13H"...)
        // Évite de confondre "PREMIÈRE HEURE" avec une heure chiffrée
        const hourMatch = upperLine.match(/(?:^|\b)([0-2]?\d)\s*H(?:\b|\s|-)/);
        if (hourMatch) {
            const hourVal = parseInt(hourMatch[1], 10);
            if (hourVal >= 0 && hourVal <= 23) {
                finalizeBlock(currentBlock);
                currentBlock = {
                    label: `${String(hourVal).padStart(2, '0')}H`,
                    winners: [],
                    machines: [],
                    fallbackNumbers: []
                };
                currentSection = null;
                continue;
            }
        }

        // Tant qu'aucun créneau horaire n'a été ouvert, on ignore les numéros coupés en haut d'écran
        if (!currentBlock) {
            continue;
        }

        // Détection explicite des balises GAGNANTS et MACHINES (avec tolérance OCR)
        if (/GAGNANT/.test(upperLine)) {
            currentSection = 'winners';
            continue;
        }
        if (/MACHINE/.test(upperLine)) {
            currentSection = 'machines';
            continue;
        }

        // Ignorer les lignes de fin de page / pub / navigation
        if (/^(HIER|AUJOURD|INSTALLER|CHATTYGO|R[ÉE]SULTATS\s+COTE)/.test(upperLine)) {
            finalizeBlock(currentBlock);
            currentBlock = null;
            currentSection = null;
            continue;
        }

        // Extraction des numéros valides [1..90] sur la ligne (en excluant les heures "12:44")
        const cleanedLine = rawLine.replace(/\b\d{1,2}:\d{2}\b/g, ' ');
        const matches = cleanedLine.match(/\b\d{1,2}\b/g);
        if (!matches) continue;

        const nums = matches
            .map(n => parseInt(n, 10))
            .filter(n => n >= 1 && n <= 90);

        if (nums.length === 0) continue;

        nums.forEach(n => {
            if (currentBlock.fallbackNumbers.length < 10) {
                currentBlock.fallbackNumbers.push(n);
            }
            if (currentSection === 'winners' && currentBlock.winners.length < 5) {
                currentBlock.winners.push(n);
            } else if (currentSection === 'machines' && currentBlock.machines.length < 5) {
                currentBlock.machines.push(n);
            }
        });
    }

    // Finaliser le dernier bloc lu
    finalizeBlock(currentBlock);

    return blocks;
}

// ============================================================
// SAISIE MANUELLE, RENDU DES BOULES & HISTORIQUE
// ============================================================
function addManualDraw() {
    const label = (document.getElementById('drawLabel').value || '').trim().toUpperCase() || 'TIRAGE';
    const winners = parseNumberInput(document.getElementById('inputWinners').value);
    const machines = parseNumberInput(document.getElementById('inputMachines').value);

    if (winners.length !== 5 || machines.length !== 5) {
        alert('Veuillez saisir exactement 5 numéros Gagnants et 5 numéros Machines (entre 1 et 90).');
        return;
    }

    const newDraw = { label, winners, machines };
    if (isDuplicateDraw(newDraw)) {
        alert('Ce tirage existe déjà dans l’historique.');
        return;
    }

    drawHistory.unshift(newDraw);
    saveAndRefresh();

    document.getElementById('drawLabel').value = '';
    document.getElementById('inputWinners').value = '';
    document.getElementById('inputMachines').value = '';
}

function parseNumberInput(str) {
    const matches = (str || '').match(/\d+/g);
    if (!matches) return [];
    return matches
        .map(n => parseInt(n, 10))
        .filter(n => n >= 1 && n <= 90)
        .slice(0, 5);
}

function renderBalls(containerId, numbers, className) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = numbers
        .map(n => `<span class="ball ${className}">${String(n).padStart(2, '0')}</span>`)
        .join('');
}

function renderHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;

    list.innerHTML = drawHistory.map(draw => `
        <div class="history-item">
            <div class="history-badge">${draw.label}</div>
            <div class="history-nums">
                <div><strong>Gagnants :</strong> ${draw.winners.map(n => String(n).padStart(2, '0')).join(' - ')}</div>
                <div><strong>Machines :</strong> ${draw.machines.map(n => String(n).padStart(2, '0')).join(' - ')}</div>
            </div>
        </div>
    `).join('');
}

function saveAndRefresh() {
    localStorage.setItem('loto590_history', JSON.stringify(drawHistory));
    renderHistory();
    generateHybridPrediction();
}

function resetHistory() {
    if (confirm('Réinitialiser l’historique par défaut ?')) {
        drawHistory = [...DEFAULT_HISTORY];
        saveAndRefresh();
    }
}
