const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const btnScan = document.getElementById('btn-scan');
const btnExport = document.getElementById('btn-export');
const btnClear = document.getElementById('btn-clear');
const statusText = document.getElementById('status');
const balls = document.querySelectorAll('.num-ball');
const historyList = document.getElementById('history-list');

// Nouveaux éléments (Importation & Saisie manuelle)
const fileInput = document.getElementById('file-input');
const manualInput = document.getElementById('manual-input');
const btnManual = document.getElementById('btn-manual');

// Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log("Service Worker enregistré"))
    .catch(err => console.error("Erreur SW:", err));
}

// Démarrer la caméra
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    video.srcObject = stream;
  } catch (err) {
    statusText.innerText = "Erreur : Accès caméra refusé.";
  }
}

// Fonction centrale pour traiter une liste de nombres extraits et lancer la prédiction
function handleExtractedNumbers(extractedNumbers) {
  if (!extractedNumbers || extractedNumbers.length === 0) {
    statusText.innerText = "Aucun numéro valide trouvé (1-99).";
    return;
  }

  statusText.innerText = "Génération des numéros...";

  const prediction = generatePrediction(extractedNumbers);
  
  balls.forEach((ball, idx) => {
    ball.innerText = String(prediction[idx]).padStart(2, '0') || '-';
  });

  saveToLocalStorage(prediction);
  renderHistory();

  statusText.innerText = "Tirage enregistré avec succès !";
}

// Fonction générique OCR (caméra ou fichier image)
async function processImageSource(imageSource) {
  try {
    const { data: { text } } = await Tesseract.recognize(imageSource, 'fra');
    
    // Nombres de 1 à 99
    const extractedNumbers = text
      .match(/\b\d{1,2}\b/g)
      ?.map(Number)
      .filter(n => n >= 1 && n <= 99) || [];

    handleExtractedNumbers(extractedNumbers);
  } catch (err) {
    statusText.innerText = "Erreur lors du traitement OCR.";
    console.error(err);
  }
}

// 1. Action : Scan via Caméra
btnScan.addEventListener('click', async () => {
  statusText.innerText = "Capture de l'image...";
  
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  statusText.innerText = "Analyse OCR en cours...";
  await processImageSource(canvas);
});

// 2. Action : Importation d'une image depuis la galerie
if (fileInput) {
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    statusText.innerText = "Lecture du fichier...";
    const imageUrl = URL.createObjectURL(file);

    statusText.innerText = "Analyse OCR du fichier en cours...";
    await processImageSource(imageUrl);
    
    URL.revokeObjectURL(imageUrl);
    fileInput.value = ''; 
  });
}

// 3. Action : Saisie manuelle directe
if (btnManual && manualInput) {
  btnManual.addEventListener('click', () => {
    const text = manualInput.value.trim();
    if (!text) {
      alert("Veuillez entrer des numéros !");
      return;
    }

    const extractedNumbers = text
      .match(/\b\d{1,2}\b/g)
      ?.map(Number)
      .filter(n => n >= 1 && n <= 99) || [];

    handleExtractedNumbers(extractedNumbers);
    manualInput.value = ''; // Vider le champ après validation
  });
}

// Générer 4 numéros (1 à 99)
function generatePrediction(numbers) {
  const selected = new Set();

  if (numbers.length >= 4) {
    const freqMap = {};
    numbers.forEach(n => freqMap[n] = (freqMap[n] || 0) + 1);
    const sorted = Object.keys(freqMap).sort((a, b) => freqMap[b] - freqMap[a]);
    sorted.slice(0, 4).forEach(n => selected.add(Number(n)));
  }

  while (selected.size < 4) {
    const randomNum = Math.floor(Math.random() * 99) + 1;
    selected.add(randomNum);
  }

  return Array.from(selected);
}

// Sauvegarde dans le navigateur
function saveToLocalStorage(prediction) {
  const history = JSON.parse(localStorage.getItem('lotto_history') || '[]');
  const newEntry = {
    date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    numbers: prediction
  };
  history.unshift(newEntry);
  localStorage.setItem('lotto_history', JSON.stringify(history.slice(0, 20))); // Conserve 20 tirages
}

// Affichage de l'historique
function renderHistory() {
  const history = JSON.parse(localStorage.getItem('lotto_history') || '[]');
  if (!historyList) return;
  
  if (history.length === 0) {
    historyList.innerHTML = '<li style="color:#64748b; font-size:0.85rem;">Aucun tirage enregistré.</li>';
    return;
  }

  historyList.innerHTML = history.map(item => `
    <li class="history-item">
      <span>${item.date}</span>
      <strong>${item.numbers.map(n => String(n).padStart(2, '0')).join(' - ')}</strong>
    </li>
  `).join('');
}

// Exportation de l'historique au format .txt
btnExport.addEventListener('click', () => {
  const history = JSON.parse(localStorage.getItem('lotto_history') || '[]');
  if (history.length === 0) {
    alert("Aucun historique à exporter !");
    return;
  }

  let content = "=== HISTORIQUE DES TIRAGES LOTTO ===\n\n";
  history.forEach((item, index) => {
    content += `${index + 1}. [${item.date}] : ${item.numbers.map(n => String(n).padStart(2, '0')).join(' - ')}\n`;
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lotto-historique-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

// Effacer l'historique
btnClear.addEventListener('click', () => {
  if (confirm("Voulez-vous vraiment effacer tout l'historique ?")) {
    localStorage.removeItem('lotto_history');
    renderHistory();
  }
});

initCamera();
renderHistory();
