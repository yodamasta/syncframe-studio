// ==================== VARIABLES GLOBALES ====================
const API_URL = "https://syncframe-backend.onrender.com/api/generate";

const form = document.getElementById('promptForm');
const briefInput = document.getElementById('brief');
const errorMsg = document.getElementById('errorMsg');
const resultDiv = document.getElementById('result');
const generateBtn = document.getElementById('generateBtn');

const PROMPT_TEMPLATE = `Génère une séquence complète de 6 images ou plans cohérents pour animation IA réaliste (format 16:9), dans une ambiance stylée mais ancrée dans la réalité. Le ou les personnages, objets ou environnements principaux sont à déduire à partir du contexte utilisateur ci-dessous. Le ton doit être immersif, cinématographique, descriptif et inspirant.

Contexte : [CONTEXT]

Pour chaque image ou plan, fournis :
1. Une description visuelle très claire (ambiance, éléments, lumière, émotion, couleurs, etc.)
2. Le cadrage caméra (face, 3/4, dos, plongée, large, macro, etc.)
3. Un prompt image IA pour générer le plan
4. Un prompt positif pour BodySync ou LipSync (selon le plan)
5. Un prompt négatif (défauts à éviter)

Structure la réponse en sections bien séparées pour chaque image ou plan.`;

// ==================== FONCTIONS ====================

function copyToClipboard(textId) {
  const text = document.getElementById(textId).innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-' + textId);
    btn.innerText = "✅ Copié !";
    setTimeout(() => { btn.innerText = "Copier"; }, 1400);
  });
}

function showLoaderOrbit(show) {
  document.getElementById('loader-orbit').classList.toggle('active', !!show);
}

const scrollBtn = document.getElementById('scrollTopBtn');
window.addEventListener('scroll', () => {
  if (scrollBtn) {
    scrollBtn.style.display = window.scrollY > 200 ? 'flex' : 'none';
  }
});
if (scrollBtn) {
  scrollBtn.onclick = () => window.scrollTo({top:0,behavior:'smooth'});
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.innerText = "";
    resultDiv.innerHTML = "";
    generateBtn.disabled = true;
    showLoaderOrbit(true);

    const userContext = briefInput.value.trim();
    if (!userContext) {
      errorMsg.innerText = "Merci de décrire brièvement votre scène ou intention.";
      generateBtn.disabled = false;
      showLoaderOrbit(false);
      return;
    }

    const prompt = PROMPT_TEMPLATE.replace('[CONTEXT]', userContext);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error("Erreur serveur : " + response.status);
      }

      const data = await response.json();
      console.log("🧠 Données reçues du backend :", data);
      const resultText = data.text || data.result || "";
      if (!resultText) {
        throw new Error("Réponse inattendue du serveur (vide).");
      }

      resultDiv.innerHTML = formatResult(resultText);

    } catch (err) {
      errorMsg.innerText = "Erreur : " + err.message;
    } finally {
      generateBtn.disabled = false;
      showLoaderOrbit(false);
    }
  });
}

function formatResult(resultText) {
  if (!resultText || typeof resultText !== "string") {
    return "<p class='sync-error'>Erreur de format dans la réponse générée.</p>";
  }

  const sections = resultText.split(/\n(?=Image|Plan|#)/g);
  return sections.map((section, idx) => `
    <div class="sync-prompt-image-block">
      <div class="sync-prompt-image-label">Plan ${idx + 1}</div>
      <pre class="sync-prompt-image" id="section${idx}">${section.trim()}</pre>
      <button class="sync-prompt-btn" id="btn-section${idx}" onclick="copyToClipboard('section${idx}')">Copier</button>
    </div>
  `).join('');
}
