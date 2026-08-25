document.addEventListener('DOMContentLoaded', () => {
  // Éléments du DOM
  const drawDateInput = document.getElementById('draw-date');
  const drawTimeSelect = document.getElementById('draw-time');
  const winningNumsInput = document.getElementById('winning-nums');
  const machineNumsInput = document.getElementById('machine-nums');
  const btnSaveDraw = document.getElementById('btn-save-draw');
  const ocrFileInput = document.getElementById('ocr-file-input');

  const predictTargetTimeSelect = document.getElementById('predict-target-time');
  const btnPredict = document.getElementById('btn-predict');
  const statusDiv = document.getElementById('status');
  const numbersContainer = document.getElementById('numbers-container');

  const btnExport = document.getElementById('btn-export');
  const btnClear = document.getElementById('btn-clear');
  const historyList = document.getElementById('history-list');

  // Initialisation de la date du jour par défaut
  drawDateInput.value = new Date().toISOString().split('T')[0];

  // Chargement des données au démarrage
  let draws = JSON.parse(localStorage.getItem('lotto_draws')) || [];
  renderHistory();

  // -------------------------------------------------------------
  // SCAN OCR : Importation et lecture automatique (Heure + Numéros)
  // -------------------------------------------------------------
  ocrFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    updateStatus('📷 Analyse de la capture d\'écran en cours...', '#38bdf8');

    try {
      // Utilisation du français pour détecter des mots comme "08H", "13H", "RÉVEIL", etc.
      const worker = await Tesseract.createWorker('fra');
      
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // 1. Détection automatique de l'heure du tirage
      const detectedTime = parseDrawTime(text);
      if (detectedTime) {
        drawTimeSelect.value = detectedTime;
      }

      // 2. Extraction des numéros valides (entre 1 et 90)
      const parsedNums = parseNumbers(text);

      if (parsedNums.length === 0) {
        updateStatus('⚠️ Aucun numéro valide n\'a pu être lu sur l\'image.', 'orange');
        return;
      }

      // Répartition automatique : 5 premiers = Gagnants, 5 suivants = Machines
      const winningScanned = parsedNums.slice(0, 5);
      const machineScanned = parsedNums.slice(5, 10);

      winningNumsInput.value = winningScanned.map(formatTwoDigits).join(' ');
      machineNumsInput.value = machineScanned.map(formatTwoDigits).join(' ');

      const statusMsg = detectedTime 
        ? `✅ Tirage ${detectedTime} & numéros détectés ! Vérifiez puis sauvegardez.`
        : '✅ Numéros analysés ! Vérifiez l\'horaire puis sauvegardez.';

      updateStatus(statusMsg, '#4ade80');
    } catch (error) {
      console.error(error);
      updateStatus('❌ Erreur lors de la lecture de l\'image.', '#ef4444');
    }
  });

  // 1. Sauvegarder un tirage
  btnSaveDraw.addEventListener('click', () => {
    const date = drawDateInput.value;
    const time = drawTimeSelect.value;
    const winning = parseNumbers(winningNumsInput.value);
    const machine = parseNumbers(machineNumsInput.value);

    if (winning.length === 0) {
      updateStatus('⚠️ Veuillez saisir au moins les numéros gagnants.', 'orange');
      return;
    }

    const newDraw = { id: Date.now(), date, time, winning, machine };
    draws.unshift(newDraw); // Ajout en début de tableau
    localStorage.setItem('lotto_draws', JSON.stringify(draws));

    // Reset des champs
    winningNumsInput.value = '';
    machineNumsInput.value = '';
    ocrFileInput.value = '';
    updateStatus(`✅ Tirage du ${date} (${time}) enregistré.`, '#4ade80');
    renderHistory();
  });

  // 2. Calculer la prédiction des 4 numéros
  btnPredict.addEventListener('click', () => {
    const targetTime = predictTargetTimeSelect.value;

    if (draws.length === 0) {
      updateStatus('⚠️ Aucun tirage enregistré pour effectuer une analyse.', 'orange');
      return;
    }

    updateStatus('🔮 Analyse des tirages et calcul en cours...', '#38bdf8');

    // Filtrer par horaire si possible, sinon utiliser tout l'historique
    const filteredDraws = draws.filter(d => d.time === targetTime);
    const pool = filteredDraws.length > 0 ? filteredDraws : draws;

    const predictions = calculateTop4(pool);
    displayPrediction(predictions);
    updateStatus(`🎯 Prédiction générée pour le tirage de ${targetTime} !`, '#4ade80');
  });

  // 3. Exporter l'historique en fichier .txt
  btnExport.addEventListener('click', () => {
    if (draws.length === 0) {
      alert('Aucun tirage à exporter.');
      return;
    }

    const content = draws.map(d => 
      `Date: ${d.date} | Tirage: ${d.time}\nGagnants: ${d.winning.map(formatTwoDigits).join(' ')}\nMachines: ${d.machine.map(formatTwoDigits).join(' ')}\n-------------------------`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lotto_historique_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
  });

  // 4. Effacer l'historique
  btnClear.addEventListener('click', () => {
    if (confirm('Voulez-vous vraiment tout effacer ?')) {
      draws = [];
      localStorage.removeItem('lotto_draws');
      renderHistory();
      numbersContainer.innerHTML = Array(4).fill('<span class="num-ball">-</span>').join('');
      updateStatus('Historique effacé.', '#94a3b8');
    }
  });

  // --- Fonctions Utilitaires ---

  // Recherche des motifs d'heures spécifiques dans le texte extrait
  function parseDrawTime(rawText) {
    const text = rawText.toUpperCase();
    if (text.includes('08H') || text.includes('DIGITAL') || text.includes('REVEIL')) return '08H';
    if (text.includes('10H') || text.includes('MATINALE')) return '10H';
    if (text.includes('13H') || text.includes('EMERGENCE') || text.includes('ÉMERGENCE')) return '13H';
    if (text.includes('16H') || text.includes('APREM') || text.includes('L\'APREM')) return '16H';
    if (text.includes('18H') || text.includes('SOIR')) return '18H';
    return null;
  }

  // Transformer une chaîne de texte en tableau de chiffres uniques (1 à 90)
  function parseNumbers(str) {
    const matches = str.match(/\b\d{1,2}\b/g) || [];
    const valid = matches
      .map(n => parseInt(n, 10))
      .filter(n => n >= 1 && n <= 90);
    
    // Conserve l'ordre original d'apparition sans supprimer les doublons valides entre Gagnants et Machines
    return valid;
  }

  // Formatage sur 2 chiffres (ex: 8 -> "08")
  function formatTwoDigits(num) {
    return num < 10 ? '0' + num : '' + num;
  }

  // Algorithme d'analyse probabiliste des fréquences + compléments
  function calculateTop4(dataset) {
    const frequency = {};

    dataset.forEach(d => {
      const allNums = [...d.winning, ...d.machine];
      allNums.forEach(num => {
        frequency[num] = (frequency[num] || 0) + 1;
        // Poids complémentaire (ex: 90 - num)
        const comp = 90 - num;
        if (comp > 0) frequency[comp] = (frequency[comp] || 0) + 0.5;
      });
    });

    const sorted = Object.keys(frequency)
      .map(Number)
      .sort((a, b) => frequency[b] - frequency[a]);

    // Extraction des 4 numéros les plus probables
    const result = sorted.slice(0, 4);
    while (result.length < 4) {
      const rand = Math.floor(Math.random() * 90) + 1;
      if (!result.includes(rand)) result.push(rand);
    }

    return result.sort((a, b) => a - b);
  }

  // Afficher la prédiction sous forme de boules
  function displayPrediction(numbers) {
    numbersContainer.innerHTML = numbers
      .map(num => `<span class="num-ball">${formatTwoDigits(num)}</span>`)
      .join('');
  }

  // Afficher la liste de l'historique
  function renderHistory() {
    historyList.innerHTML = '';
    if (draws.length === 0) {
      historyList.innerHTML = '<li style="color: #64748b; font-size: 0.85rem;">Aucun tirage enregistré.</li>';
      return;
    }

    draws.forEach(d => {
      const li = document.createElement('li');
      li.style.cssText = 'border-bottom: 1px solid #334155; padding: 8px 0; font-size: 0.85rem;';
      li.innerHTML = `
        <strong style="color: #38bdf8;">${d.date} (${d.time})</strong><br>
        <span style="color: #facc15;">G: ${d.winning.map(formatTwoDigits).join(' ') || '---'}</span> | 
        <span style="color: #4ade80;">M: ${d.machine.map(formatTwoDigits).join(' ') || '---'}</span>
      `;
      historyList.appendChild(li);
    });
  }

  function updateStatus(msg, color = '#94a3b8') {
    statusDiv.textContent = msg;
    statusDiv.style.color = color;
  }
});
