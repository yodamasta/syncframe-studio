≈
const API_URL = "https://syncframe-backend.onrender.com/api/generate";

// Variables globales UNIQUEMENT ici
const form = document.getElementById('promptForm');
const briefInput = document.getElementById('brief');
const errorMsg = document.getElementById('errorMsg');
const resultDiv = document.getElementById('result');
const generateBtn = document.getElementById('generateBtn');

const PROMPT_TEMPLATE = `Génère une séquence complète de 6 images ou plans cohérents pour animation IA réaliste (format 16:9), dans une ambiance stylée mais ancrée dans la réalité. Le ou les personnages, objets ou environnements principaux sont à déduire à partir du contexte utilisateur ci-dessous. Le ton doit être immersif, cinématographique, descriptif et inspirant.\n\nContexte : [CONTEXT]\n\nPour chaque image ou plan, fournis :\n1. Une description visuelle très claire (ambiance, éléments, lumière, émotion, couleurs, etc.)\n2. Le cadrage caméra (face, 3/4, dos, plongée, large, macro, etc.)\n3. Un prompt image IA pour générer le plan\n4. Un prompt positif pour BodySync ou LipSync (selon le plan)\n5. Un prompt négatif (défauts à éviter)\n\nStructure la réponse en sections bien séparées pour chaque image ou plan.`;

function copyToClipboard(textId) {
  const text = document.getElementById(textId).innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert("Copié !");
  });
}

function createCard(scene, idx) {
  // scene: { title, description, promptImage, promptPlus, promptMinus }
  const card = document.createElement('div');
  card.className = 'sync-card';
  const plusId = `prompt-plus-${idx}`;
  const minusId = `prompt-minus-${idx}`;
  const imgPromptId = `prompt-image-ai-${idx}`;
  // Patch : génères un prompt image IA si absent ou vide
  if (!scene.promptImage || !scene.promptImage.trim()) {
    scene.promptImage = generateImagePrompt(scene);
  }
  card.innerHTML = `
    <div class="sync-card-title sync-card-title-tight">🟪 Image ${idx+1} : ${scene.title || 'Scène'} </div>
    <div class="sync-card-fields sync-card-fields-tight">
      <div class="sync-description">${scene.description || ''}</div>
    </div>
    <div class="sync-prompt-image-block">
      <div class="sync-prompt-image-label">🎨 Prompt Image IA</div>
      <div class="sync-prompt-row">
        <span class="sync-prompt-image" id="${imgPromptId}">${scene.promptImage || ''}</span>
        <button class="sync-prompt-btn sync-prompt-btn-stack" onclick="copyPrompt('${imgPromptId}')">Copier</button>
      </div>
    </div>
    <div class="sync-prompts-stack">
      <div class="sync-prompt-block">
        <div class="sync-prompt-label plus">🟢 Prompt Kling +</div>
        <div class="sync-prompt-row">
          <span class="sync-prompt-plus" id="${plusId}">${scene.promptPlus ? scene.promptPlus : '<span class=\'sync-prompt-empty\'>Aucun prompt positif généré</span>'}</span>
          <button class="sync-prompt-btn sync-prompt-btn-stack" onclick="copyToClipboard('${plusId}')">Copier</button>
        </div>
      </div>
      <div class="sync-prompt-block">
        <div class="sync-prompt-label minus">🔴 Prompt Kling -</div>
        <div class="sync-prompt-row">
          <span class="sync-prompt-minus" id="${minusId}">${scene.promptMinus || ''}</span>
          <button class="sync-prompt-btn sync-prompt-btn-stack" onclick="copyToClipboard('${minusId}')">Copier</button>
        </div>
      </div>
    </div>
    <div class="sync-sequence-copy-row">
      <button class="sync-sequence-copy-btn" onclick="copySequenceAll(this)">Copier la séquence complète</button>
    </div>
  `;
  return card;
}

function generateImagePrompt(scene) {
  // Patch rapide : transforme le titre/description FR en prompt anglais fluide
  // (Pour une vraie prod, utiliser GPT ou Gemini en EN)
  let base = scene.title ? scene.title : 'a beautiful scene';
  let desc = scene.description ? scene.description : '';
  return `Cinematic close-up of ${base}. ${desc}`.replace(/\n/g, ' ');
}

function copySequenceAll(btn) {
  // On remonte au bloc .sync-card
  const card = btn.closest('.sync-card');
  if (!card) return;
  const title = card.querySelector('.sync-card-title').innerText.trim();
  const desc = card.querySelector('.sync-description').innerText.trim();
  const plus = card.querySelector('.sync-prompt-plus').innerText.trim();
  const minus = card.querySelector('.sync-prompt-minus').innerText.trim();
  const fullText = `${title}\n\n${desc ? desc + '\n\n' : ''}Prompt Kling Positif :\n${plus}\n\nPrompt Kling Négatif :\n${minus}`;
  navigator.clipboard.writeText(fullText).then(() => {
    alert('Séquence complète copiée !');
  });
}

function renderResults(scenes) {
  const result = document.getElementById('result');
  result.innerHTML = '';
  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
    result.innerHTML = '<div style="color:#ff4d6d;text-align:center;margin-top:32px;">Aucune scène générée.<br>Vérifie la connexion au serveur IA.</div>';
    return;
  }
  scenes.forEach((scene, idx) => {
    result.appendChild(createCard(scene, idx));
  });
}

// Fonction copier pour Prompt Image IA
function copyPrompt(id) {
  const text = document.getElementById(id).innerText;
  navigator.clipboard.writeText(text);
}

// --- Loader Orbit gestion ---
function showLoaderOrbit(show) {
  const loader = document.getElementById('loader-orbit');
  if (loader) loader.classList.toggle('active', !!show);
}
// Démo : afficher le loader pendant la génération
const genBtn = document.querySelector('.sync-main button, .sync-main .sync-btn');
if (genBtn) {
  genBtn.addEventListener('click', () => {
    showLoaderOrbit(true);
    setTimeout(() => showLoaderOrbit(false), 1800); // simule chargement
  });
}
// --- Scroll to top gestion ---
const scrollBtn = document.getElementById('scrollTopBtn');
if (scrollBtn) {
  window.addEventListener('scroll', () => {
    scrollBtn.style.display = window.scrollY > 200 ? 'flex' : 'none';
  });
  scrollBtn.onclick = () => window.scrollTo({top:0,behavior:'smooth'});
}

// --- FORM HANDLING ---
form.onsubmit = async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';
  resultDiv.innerHTML = '';
  const brief = briefInput.value.trim();
  if (!brief) {
    errorMsg.textContent = 'Merci de décrire la scène à générer.';
    return;
  }
  form.querySelector('button').disabled = true;
  form.querySelector('button').textContent = 'Génération...';
  try {
    // --- API CALL (adapt as needed) ---
    const fullPrompt = PROMPT_TEMPLATE.replace('[CONTEXT]', brief);
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt })
    });
    if (!res.ok) throw new Error('Erreur serveur');
    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      errorMsg.textContent = 'Erreur de parsing de la réponse API.';
      console.error('Réponse brute:', await res.text());
      throw parseErr;
    }
    console.log('Réponse API:', data);
    // data.scenes = [{ title, description, promptPlus, promptMinus }]
    renderResults(data.scenes || []);
  } catch (err) {
    errorMsg.textContent = 'Erreur lors de la génération : ' + (err.message || err);
    console.error('Erreur front:', err);
  }
  form.querySelector('button').disabled = false;
  form.querySelector('button').textContent = '✨ Générer';
};

briefInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

// --- INIT: CLEAR RESULT ON LOAD ---
document.getElementById('result').innerHTML = '';
