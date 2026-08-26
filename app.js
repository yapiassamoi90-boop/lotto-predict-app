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

  // Conteneurs de résultats
  const winningContainer = document.getElementById('winning-container');
  const machineContainer = document.getElementById('machine-container');

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
      const worker = await Tesseract.createWorker('fra');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // 1. Détection de la TOUTE PREMIÈRE heure lisible sur l'image
      const detectedTime = parseDrawTime(text);
      if (detectedTime) {
        drawTimeSelect.value = detectedTime;
      }

      // 2. Extraction des numéros valides (1 à 90)
      const parsedNums = parseNumbers(text);

      if (parsedNums.length === 0) {
        updateStatus('⚠️ Aucun numéro valide n\'a pu être lu sur l\'image.', 'orange');
        return;
      }

      // 3. Limitation aux 10 premiers numéros (5 Gagnants + 5 Machines)
      const firstDrawNums = parsedNums.slice(0, 10);
      const winningScanned = firstDrawNums.slice(0, 5);
      const machineScanned = firstDrawNums.slice(5, 10);

      winningNumsInput.value = winningScanned.map(formatTwoDigits).join(' ');
      machineNumsInput.value = machineScanned.map(formatTwoDigits).join(' ');

      const statusMsg = detectedTime 
        ? `✅ Tirage ${detectedTime} & numéros détectés !`
        : '✅ Numéros analysés ! Vérifiez l\'horaire puis sauvegardez.';

      updateStatus(statusMsg, '#4ade80');
    } catch (error) {
      console.error(error);
      updateStatus('❌ Erreur lors de la lecture de l\'image.', '#ef4444');
    }
  });

  // -------------------------------------------------------------
  // 1. SAUVEGARDER UN TIRAGE
  // -------------------------------------------------------------
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
    draws.unshift(newDraw);
    localStorage.setItem('lotto_draws', JSON.stringify(draws));

    winningNumsInput.value = '';
    machineNumsInput.value = '';
    ocrFileInput.value = '';
    updateStatus(`✅ Tirage du ${date} (${time}) enregistré.`, '#4ade80');
    renderHistory();
  });

  // -------------------------------------------------------------
  // 2. CALCULER LA PRÉDICTION SÉPARÉE (GAGNANT ET MACHINE)
  // -------------------------------------------------------------
  btnPredict.addEventListener('click', () => {
    const targetTime = predictTargetTimeSelect.value;

    if (draws.length === 0) {
      updateStatus('⚠️ Aucun tirage enregistré dans l\'historique.', 'orange');
      return;
    }

    // Filtrage des tirages enregistrés pour l'horaire sélectionné
    const filteredDraws = draws.filter(d => d.time === targetTime);

    if (filteredDraws.length === 0) {
      updateStatus(`⚠️ Aucun historique disponible pour l'horaire ${targetTime}.`, 'orange');
      return;
    }

    // Calcul des prédictions pour 5 Gagnants et 5 Machines
    const predWinning = calculateGroupPrediction(filteredDraws, 'winning');
    const predMachine = calculateGroupPrediction(filteredDraws, 'machine');

    // Affichage des deux résultats
    displayPredictionGroup(winningContainer, predWinning, '#facc15');
    displayPredictionGroup(machineContainer, predMachine, '#4ade80');

    updateStatus(`🎯 Prédiction générée pour ${targetTime} (${filteredDraws.length} tirage(s) analysé(s))`, '#4ade80');
  });

  // Fonction de calcul statistique pour un groupe donné (winning ou machine)
  function calculateGroupPrediction(drawList, key) {
    const freqMap = {};
    for (let i = 1; i <= 90; i++) freqMap[i] = 0;

    drawList.forEach(draw => {
      const nums = draw[key] || [];
      nums.forEach(num => {
        if (freqMap[num] !== undefined) freqMap[num]++;
      });
    });

    // Tri des 90 numéros par fréquence décroissante
    const sortedNums = Object.keys(freqMap)
      .map(Number)
      .sort((a, b) => freqMap[b] - freqMap[a]);

    // Sélection de 5 numéros distincts (3 plus chauds, 1 moyen, 1 froid)
    const prediction = [];
    const pickUnique = (index) => {
      let targetIndex = index;
      while (prediction.includes(sortedNums[targetIndex]) && targetIndex < sortedNums.length) {
        targetIndex++;
      }
      if (sortedNums[targetIndex] !== undefined) {
        prediction.push(sortedNums[targetIndex]);
      }
    };

    pickUnique(0); // 1er chaud
    pickUnique(1); // 2e chaud
    pickUnique(2); // 3e chaud
    pickUnique(Math.floor(sortedNums.length / 2)); // Moyen
    pickUnique(sortedNums.length - 1); // Froid

    return prediction;
  }

  // -------------------------------------------------------------
  // FONCTIONS UTILITAIRES & AFFICHAGE
  // -------------------------------------------------------------

  function parseNumbers(text) {
    const matches = text.match(/\b([1-9]|[1-8][0-9]|90)\b/g);
    return matches ? Array.from(new Set(matches.map(Number))) : [];
  }

  function parseDrawTime(text) {
    const match = text.toUpperCase().match(/\b(07H|08H|10H|13H|16H|18H)\b/);
    return match ? match[0] : null;
  }

  function formatTwoDigits(num) {
    return String(num).padStart(2, '0');
  }

  function displayPredictionGroup(container, numbers, textColor) {
    container.innerHTML = '';
    numbers.forEach(num => {
      const ball = document.createElement('span');
      ball.className = 'num-ball';
      ball.style.color = textColor;
      ball.textContent = formatTwoDigits(num);
      container.appendChild(ball);
    });
  }

  function updateStatus(msg, color) {
    statusDiv.textContent = msg;
    statusDiv.style.color = color;
  }

  function deleteDraw(id) {
    draws = draws.filter(d => d.id !== id);
    localStorage.setItem('lotto_draws', JSON.stringify(draws));
    renderHistory();
    updateStatus('🗑️ Tirage supprimé.', '#ef4444');
  }

  function renderHistory() {
    historyList.innerHTML = '';
    draws.forEach(draw => {
      const li = document.createElement('li');
      li.style.cssText = 'padding: 8px 0; border-bottom: 1px solid #334155; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;';
      
      const winningStr = draw.winning.map(formatTwoDigits).join(' ');
      const machineStr = draw.machine.length > 0 ? draw.machine.map(formatTwoDigits).join(' ') : '-';

      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = `
        <div style="color: #94a3b8; font-weight: bold;">${draw.date} (${draw.time})</div>
        <div style="color: #facc15;">Gagnants : ${winningStr}</div>
        <div style="color: #4ade80;">Machines : ${machineStr}</div>
      `;

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕';
      deleteBtn.style.cssText = 'background: transparent; color: #ef4444; border: none; font-size: 1.1rem; cursor: pointer; padding: 0 8px;';
      deleteBtn.addEventListener('click', () => deleteDraw(draw.id));

      li.appendChild(contentDiv);
      li.appendChild(deleteBtn);
      historyList.appendChild(li);
    });
  }

  // Exporter l'historique au format .txt
  btnExport.addEventListener('click', () => {
    if (draws.length === 0) {
      updateStatus('⚠️ Aucun tirage à exporter.', 'orange');
      return;
    }
    let content = "HISTORIQUE DES TIRAGES LOTO\n\n";
    draws.forEach(d => {
      content += `${d.date} | ${d.time} | Gagnants: ${d.winning.map(formatTwoDigits).join(' ')} | Machines: ${d.machine.map(formatTwoDigits).join(' ')}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lotto_draws_${drawDateInput.value}.txt`;
    a.click();
  });

  // Effacer tout l'historique
  btnClear.addEventListener('click', () => {
    if (confirm("Voulez-vous supprimer tout l'historique des tirages ?")) {
      draws = [];
      localStorage.removeItem('lotto_draws');
      renderHistory();
      updateStatus('🗑️ Historique réinitialisé.', '#ef4444');
    }
  });
});
