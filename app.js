const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const btnScan = document.getElementById('btn-scan');
const btnExport = document.getElementById('btn-export');
const btnClear = document.getElementById('btn-clear');
const statusText = document.getElementById('status');
const balls = document.querySelectorAll('.num-ball');
const historyList = document.getElementById('history-list');

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

// Scan et détection OCR
btnScan.addEventListener('click', async () => {
  statusText.innerText = "Capture de l'image...";
  
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  statusText.innerText = "Analyse OCR en cours...";

  try {
    const { data: { text } } = await Tesseract.recognize(canvas, 'fra');
    
    // Nombres de 1 à 99
    const extractedNumbers = text
      .match(/\b\d{1,2}\b/g)
      ?.map(Number)
      .filter(n => n >= 1 && n <= 99) || [];

    statusText.innerText = "Génération des numéros...";

    const prediction = generatePrediction(extractedNumbers);
    
    balls.forEach((ball, idx) => {
      ball.innerText = prediction[idx] || '-';
    });

    saveToLocalStorage(prediction);
    renderHistory();

    statusText.innerText = "Tirage enregistré !";
  } catch (err) {
    statusText.innerText = "Erreur lors du traitement.";
    console.error(err);
  }
});

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
    content += `${index + 1}. [${item.date}] : ${item.numbers.join(' - ')}\n`;
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
