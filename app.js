document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('imageInput');
  const scanBtn = document.getElementById('scanBtn');
  const imagePreview = document.getElementById('imagePreview');
  const statusDiv = document.getElementById('status');
  const detectedNumbersDiv = document.getElementById('detectedNumbers');
  const predictionsDiv = document.getElementById('predictions');

  let selectedFile = null;

  // Aperçu de l'image sélectionnée
  imageInput.addEventListener('change', (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        imagePreview.src = event.target.result;
        imagePreview.style.display = 'block';
      };
      reader.readAsDataURL(selectedFile);
    }
  });

  // Action du bouton de scan OCR
  scanBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      alert('Veuillez d\'abord sélectionner ou prendre une photo.');
      return;
    }

    statusDiv.textContent = 'Traitement OCR en cours...';
    detectedNumbersDiv.textContent = '...';
    predictionsDiv.textContent = '...';

    try {
      // Exécution de Tesseract OCR avec restriction numérique
      const worker = await Tesseract.createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789 ',
      });

      const { data: { text } } = await worker.recognize(selectedFile);
      await worker.terminate();

      // Extraction et nettoyage des numéros (1 à 90)
      const rawNumbers = text.match(/\b\d{1,2}\b/g) || [];
      const validNumbers = [...new Set(rawNumbers.map(n => parseInt(n, 10)))]
        .filter(n => n >= 1 && n <= 90);

      if (validNumbers.length === 0) {
        statusDiv.textContent = 'Aucun numéro valide trouvé.';
        detectedNumbersDiv.textContent = 'Aucun';
        return;
      }

      statusDiv.textContent = 'Analyse terminée avec succès !';
      detectedNumbersDiv.textContent = validNumbers.join(' - ');

      // Calcul des prédictions (ex: compléments, inversion, ou tirage probabiliste)
      const predictions = generatePredictions(validNumbers);
      predictionsDiv.textContent = predictions.join(' - ');

    } catch (error) {
      console.error(error);
      statusDiv.textContent = 'Erreur lors de la lecture de l\'image.';
    }
  });

  // Logique de calcul des prédictions à partir des numéros scannés
  function generatePredictions(numbers) {
    const predicted = numbers.map(num => {
      // Exemple d'algorithme : Inversion des chiffres ou complément à 90
      let inverted = parseInt(num.toString().split('').reverse().join(''), 10);
      if (inverted > 90 || inverted === 0) {
        inverted = 90 - num;
      }
      return inverted;
    });

    // Filtre les doublons et limite le résultat
    return [...new Set(predicted)].slice(0, 5);
  }
});
