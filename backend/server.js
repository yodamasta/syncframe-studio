import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

app.use(cors());
app.use(express.json());

// --- PROMPT SYSTEME OPTIMISE POUR GEMINI ---
const PROMPT_TEMPLATE = `Pour chaque image ou plan, tu dois OBLIGATOIREMENT fournir :
1. Une description visuelle très claire (ambiance, éléments, lumière, émotion, couleurs, etc.)
2. Le cadrage caméra (face, 3/4, dos, plongée, large, macro, etc.)
3. Un prompt positif (Prompt Positif) pour BodySync ou LipSync (selon le plan) — ce prompt doit TOUJOURS être présent et pertinent
4. Un prompt négatif (Prompt Négatif) — ce prompt doit TOUJOURS être présent et pertinent

Structure la réponse en sections bien séparées pour chaque image ou plan, avec les titres EXACTS suivants pour chaque champ (en français) :

**Image N : Titre**
Description Visuelle: ...
Cadrage Caméra: ...
Prompt Positif: ...
Prompt Négatif: ...

NE JAMAIS oublier le Prompt Positif ni le Prompt Négatif.
`;

// --- PARSEUR MARKDOWN GEMINI → scenes[] ---
function parseScenesFromMarkdown(text) {
  // Découpe sur "**Plan N ...**" OU "**Image N ...**"
  const sceneBlocks = text.split(/\*\*(?:Plan|Image)\s*\d+\s*:?[^\n]*\*\*/g).slice(1);
  const planRegex = /\*\*(?:Plan|Image)\s*(\d+)\s*:?\s*([^\n*]*)\*\*/g;
  const planTitles = [];
  let match;
  while ((match = planRegex.exec(text)) !== null) {
    planTitles.push(match[2].trim() || `Plan ${match[1]}`);
  }
  const fieldsRegex = {
    description: /(?:Description Visuelle|Description visuelle):\**\s*([\s\S]*?)(?:\n\d\.|\n2\.|\n\*\*|$)/i,
    cadrage: /(?:Cadrage Caméra|Cadrage caméra):\**\s*([\s\S]*?)(?:\n\d\.|\n3\.|\n\*\*|$)/i,
    prompt: /Prompt (?:Image IA|image IA):\**\s*([\s\S]*?)(?:\n\d\.|\n4\.|\n\*\*|$)/i,
    promptPlus: /Prompt (?:Positif|positif)[^:]*:\**\s*([\s\S]*?)(?:\n\d\.|\n5\.|\n\*\*|$)/i,
    promptMinus: /Prompt (?:Négatif|négatif):\**\s*([\s\S]*?)(?:\n|$)/i
  };
  return sceneBlocks.map((block, i) => ({
    title: planTitles[i] || `Plan ${i+1}`,
    description: (block.match(fieldsRegex.description)?.[1] || "").trim(),
    cadrage: (block.match(fieldsRegex.cadrage)?.[1] || "").trim(),
    prompt: (block.match(fieldsRegex.prompt)?.[1] || "").trim(),
    promptPlus: (block.match(fieldsRegex.promptPlus)?.[1] || "").trim(),
    promptMinus: (block.match(fieldsRegex.promptMinus)?.[1] || "").trim()
  }));
}

app.post("/api/generate", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt manquant." });
  try {
    const body = {
      contents: [{ parts: [{ text: PROMPT_TEMPLATE + '\n' + prompt }] }]
    };
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: "Erreur Gemini", details: errText });
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const scenes = parseScenesFromMarkdown(text);
    res.json({ scenes, text, raw: data });
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur", details: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend Gemini lancé sur http://localhost:${PORT}`);
});
