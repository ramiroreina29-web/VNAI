
import { supabase } from "../utils/supabaseClient";
import { VisualNovelData, Scene, CharacterConfig, Chapter, CharacterRegistry, AudioConfig, ArtStyle } from "../types";
import { saveProject } from "../utils/storage";

// --- HELPERS ---

const safeTruncate = (text: string, limit: number): string => {
  if (!text) return "";
  if (text.length <= limit) return text;
  return text.substring(0, limit) + "... [Truncado por longitud]";
};

const generatePollinationsImageUrl = (prompt: string, style: ArtStyle, isPortrait: boolean = false, seed?: number): string => {
  const encodedPrompt = encodeURIComponent(getStyledPrompt(prompt, style));
  const width = isPortrait ? 720 : 1280;
  const height = isPortrait ? 1280 : 720;
  const safeSeed = seed || Math.floor(Math.random() * 999999);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=${width}&height=${height}&seed=${safeSeed}&nologo=true`;
};

const getStyledPrompt = (basePrompt: string, style: ArtStyle): string => {
    switch (style) {
        case 'pixel':
            return `${basePrompt}, pixel art, 16-bit style, retro game asset, snes style, sharp edges, pixelated, dithering`;
        case 'realistic':
            return `${basePrompt}, realistic, cinematic lighting, photography, 4k, detailed texture`;
        case 'anime':
        default:
            return `${basePrompt}, anime style, visual novel art, makoto shinkai style, vibrant colors, high quality illustration, 2d masterpiece`;
    }
};

// --- ASSET UPLOAD LOGIC ---

const uploadAssetToSupabase = async (url: string, projectId: string, filename: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch image from Pollinations");
    const blob = await response.blob();
    
    const path = `${projectId}/${filename}.png`;

    const { data, error } = await supabase.storage
      .from('Novelanime')
      .upload(path, blob, {
        upsert: true,
        contentType: 'image/png'
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('Novelanime')
      .getPublicUrl(path);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.warn(`Failed to upload asset ${filename}, using original URL.`, error);
    return url; 
  }
};

// --- TYPES FOR API RESPONSE ---

interface PartialResponse {
  title?: string;
  genre?: string;
  summary: string;
  chapterTitle: string;
  scenes: any[];
}

// --- POLLINATIONS TEXT API ---

async function callPollinationsText(systemPrompt: string, userPrompt: string): Promise<string> {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`Calling Pollinations AI (Attempt ${attempt + 1})...`);
      
      const response = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: 'openai', 
          max_tokens: 3500 // Reduced slightly to save room
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pollinations API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent) throw new Error("Empty response from Pollinations AI");
      return rawContent;

    } catch (error) {
      console.error("Pollinations generation error:", error);
      attempt++;
      if (attempt >= maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error("Failed to generate text after multiple attempts.");
}

async function callPollinationsJSON(systemPrompt: string, userPrompt: string): Promise<PartialResponse> {
    const rawContent = await callPollinationsText(systemPrompt, userPrompt);
    
    // CLEAN JSON
    let cleanContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = cleanContent.indexOf('{');
    const lastBrace = cleanContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
    cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
    }
    
    try {
        return JSON.parse(cleanContent);
    } catch (e) {
        console.error("JSON Parse Error:", cleanContent);
        throw new Error("La IA generó un formato inválido. Reintentando...");
    }
}

// --- PROMPTS ---

const JSON_TEMPLATE = `
{
  "title": "Titulo (Solo en Cap 1)",
  "genre": "Genero",
  "summary": "Resumen actualizado de la situación actual (MAX 500 PALABRAS)",
  "chapterTitle": "Titulo del Capitulo Actual",
  "scenes": [
    {
      "id": "scene_unique_id",
      "type": "story",
      "backgroundPrompt": "visual description of background",
      "speakerName": "Name",
      "dialogueText": "Text (max 130 chars)",
      "audioConfig": {
        "bgmTheme": {
            "mood": "happy",
            "tempo": "medium",
            "waveType": "sine"
        },
        "sfxTrigger": "none"
      },
      "characters": [
        {
          "name": "Name",
          "imagePrompt": "visual description",
          "expression": "happy",
          "position": "center"
        }
      ],
      "choices": [
         { "text": "Opcion A (Ej: Investigar)", "nextSceneId": "scene_xyz" },
         { "text": "Opcion B (Ej: Huir)", "nextSceneId": "scene_abc" }
      ]
    }
  ]
}
`;

const BASE_SYSTEM_PROMPT = `
  Eres un Motor de Novelas Visuales Japonés Profesional y Compositor Retro.
  
  OBJETIVO:
  Crear una historia episódica basada en un ROADMAP (Guía).
  
  FORMATO DE SALIDA (JSON ÚNICAMENTE):
  ${JSON_TEMPLATE}

  REGLAS CRÍTICAS:
  1. **ROADMAP:** Úsalo como GUÍA. No lo copies. Ejecuta los eventos correspondientes al capítulo actual.
  2. **TEXTO:** Max 130 caracteres por escena. Divide diálogos largos.
  3. **RESUMEN (Summary):** Actualízalo para reflejar el estado ACTUAL de la trama. Borra detalles viejos irrelevantes.
  4. **AUDIO:** Genera configuración para el sintetizador Chiptune en cada escena.
  5. **INTERACTIVIDAD (IMPORTANTE):** 
     - Debes incluir AL MENOS 2 o 3 escenas con decisiones (choices) en este capítulo.
     - Si creas una decisión, asegúrate de crear las escenas a las que apuntan los 'nextSceneId'.
     - Las decisiones deben afectar la relación con los personajes o el rumbo de la trama.
`;

// --- ASSET PROCESSING ---

const processScenesWithRegistry = async (
  rawScenes: any[], 
  existingRegistry: CharacterRegistry,
  projectId: string,
  chapterIndex: number,
  artStyle: ArtStyle,
  onStatusUpdate: (status: string) => void
): Promise<{ processedScenes: Scene[], updatedRegistry: CharacterRegistry }> => {
  
  const registry = { ...existingRegistry };
  const processedScenes: Scene[] = [];
  const totalScenes = rawScenes.length;

  for (let i = 0; i < totalScenes; i++) {
    const scene = rawScenes[i];
    
    // Background
    onStatusUpdate(`Arte de Fondo [${i+1}/${totalScenes}]: ${scene.backgroundPrompt.substring(0, 20)}...`);
    const bgPrompt = `${scene.backgroundPrompt}, no characters, visual novel background, detailed`;
    const rawBgUrl = generatePollinationsImageUrl(bgPrompt, artStyle, false, i * 99 + chapterIndex);
    
    // Upload Background
    onStatusUpdate(`Subiendo Fondo a Nube [${i+1}/${totalScenes}]...`);
    const bgFilename = `ch${chapterIndex}_sc${i}_bg_${Date.now()}`;
    const permanentBgUrl = await uploadAssetToSupabase(rawBgUrl, projectId, bgFilename);
    
    // Characters
    const processedChars = [];
    if (scene.characters && Array.isArray(scene.characters)) {
        for (let j = 0; j < scene.characters.length; j++) {
            const char = scene.characters[j];
            
            // Registry Logic - Consistency Check
            let basePrompt = char.imagePrompt;
            if (registry[char.name]) {
                basePrompt = registry[char.name]; 
            } else {
                registry[char.name] = basePrompt; 
            }

            const finalPrompt = `${basePrompt}, ${char.expression} expression, white background, full body shot, visual novel sprite`;
            const charSeed = char.name.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) + Date.now(); // Slight var per scene if needed or fixed? Better vary slightly for expression
            
            onStatusUpdate(`Diseñando a ${char.name} (${char.expression})...`);
            // Use same seed for char base + expression modifier to keep consistency? 
            // Pollinations with Flux varies a lot with seed. Best to keep seed constant per character ID OR let prompts drive it.
            // For now, let's use a dynamic seed to allow expression changes, relying on prompt consistency.
            const rawCharUrl = generatePollinationsImageUrl(finalPrompt, artStyle, true, Math.floor(Math.random()*100000));
            
            // Upload Character
            onStatusUpdate(`Guardando Asset: ${char.name}...`);
            const charFilename = `char_${char.name.replace(/[^a-zA-Z0-9]/g,'')}_${char.expression}_${Date.now()}`;
            const permanentCharUrl = await uploadAssetToSupabase(rawCharUrl, projectId, charFilename);

            processedChars.push({
                id: `${scene.id}-char-${j}`,
                name: char.name,
                imagePrompt: basePrompt,
                expression: char.expression,
                position: char.position,
                imageUrl: permanentCharUrl
            });
        }
    }

    processedScenes.push({
      id: scene.id || `scene_${i}`,
      type: scene.type || 'story',
      backgroundPrompt: scene.backgroundPrompt,
      backgroundImageUrl: permanentBgUrl,
      speakerName: scene.speakerName,
      dialogueText: scene.dialogueText,
      audioConfig: scene.audioConfig || { bgmTheme: { mood: 'mystery', tempo: 'slow', waveType: 'sine' } },
      choices: scene.choices || [],
      characters: processedChars
    });
  }

  return { processedScenes, updatedRegistry: registry };
};

// --- AUDIO UPGRADE LOGIC ---

const determineAudioConfig = (text: string, backgroundPrompt: string): AudioConfig => {
  const t = (text || "").toLowerCase();
  
  // 1. Determine Mood
  let mood: AudioConfig['bgmTheme']['mood'] = 'mystery';
  let tempo: AudioConfig['bgmTheme']['tempo'] = 'medium';
  let wave: AudioConfig['bgmTheme']['waveType'] = 'sine';

  if (t.includes('amor') || t.includes('beso') || t.includes('querer') || t.includes('corazón') || t.includes('linda') || t.includes('guapo')) {
    mood = 'romantic';
    tempo = 'slow';
    wave = 'sine';
  } else if (t.includes('miedo') || t.includes('sangre') || t.includes('grito') || t.includes('correr') || t.includes('matar') || t.includes('huye') || t.includes('peligro')) {
    mood = 'action';
    tempo = 'fast';
    wave = 'sawtooth';
  } else if (t.includes('triste') || t.includes('llorar') || t.includes('adiós') || t.includes('soledad') || t.includes('perdón')) {
    mood = 'sad';
    tempo = 'slow';
    wave = 'triangle';
  } else if (t.includes('jaja') || t.includes('feliz') || t.includes('fiesta') || t.includes('alegre') || t.includes('sonríe')) {
    mood = 'happy';
    tempo = 'fast';
    wave = 'square';
  } else if (t.includes('sombra') || t.includes('extraño') || t.includes('detrás') || t.includes('oscuro') || t.includes('ruido')) {
    mood = 'suspense';
    tempo = 'medium';
    wave = 'sawtooth';
  }

  // 2. Determine SFX
  let sfx: AudioConfig['sfxTrigger'] = undefined;
  if (t.includes('puerta') || t.includes('entrar') || t.includes('salir') || t.includes('golpe')) sfx = 'door_slam';
  else if (t.includes('!??') || t.includes('imposible') || t.includes('qué?!') || t.includes('sorpresa')) sfx = 'shock';
  else if (t.includes('latido') || t.includes('cerca') || t.includes('nervios')) sfx = 'heartbeat';
  else if (t.includes('magia') || t.includes('brillo') || t.includes('luz')) sfx = 'sparkle';
  else if (t.includes('escribe') || t.includes('mensaje')) sfx = 'typing';

  return {
    bgmTheme: { mood, tempo, waveType: wave },
    sfxTrigger: sfx
  };
};

export const upgradeProjectWithAudio = async (project: VisualNovelData): Promise<VisualNovelData> => {
  console.log("Remastering project with Audio...");
  const updatedChapters = project.chapters.map(chapter => ({
    ...chapter,
    scenes: chapter.scenes.map(scene => {
        if (scene.audioConfig) return scene; // Already has audio
        return {
            ...scene,
            audioConfig: determineAudioConfig(scene.dialogueText, scene.backgroundPrompt)
        };
    })
  }));

  const updatedProject = { ...project, chapters: updatedChapters };
  await saveProject(updatedProject);
  return updatedProject;
};

// --- ROADMAP GENERATOR (THE BRAIN) ---

const generateRoadmap = async (title: string, idea: string, genre: string, onStatusUpdate: (msg: string) => void): Promise<string> => {
    onStatusUpdate("Diseñando Roadmap Estructural (Guía)...");
    const prompt = `
        Crea un ROADMAP (Guía Estructural) para una Novela Visual.
        Título: ${title}
        Idea: ${idea}
        Género: ${genre}
        
        IMPORTANTE: 
        - Sé CONCISO (Máximo 2000 caracteres).
        - No escribas el guion completo, solo los puntos clave.
        
        Estructura requerida:
        1. Concepto Central.
        2. Lista de Personajes (Nombre + Arquetipo Visual).
        3. LISTA DE EVENTOS CLAVE (Acto 1, Acto 2, Acto 3).
        4. 3 Finales Resumidos.
    `;
    return await callPollinationsText("Eres un Arquitecto Narrativo experto. Sé breve y estructurado.", prompt);
};

// --- PUBLIC API ---

export const generateInitialStory = async (
    userTitle: string,
    userIdea: string,
    userGenre: string,
    artStyle: ArtStyle,
    onStatusUpdate: (status: string) => void
): Promise<VisualNovelData> => {
  const projectId = crypto.randomUUID(); 

  // 1. Generate Roadmap First
  const roadmap = await generateRoadmap(userTitle, userIdea, userGenre, onStatusUpdate);
  
  // Truncate roadmap for context if somehow huge
  const safeRoadmap = safeTruncate(roadmap, 2500);

  onStatusUpdate("Roadmap Creado. Iniciando Cap. 1...");
  onStatusUpdate("Conectando con Cerebro IA (Pollinations)...");
  
  const userPrompt = `
    Genera el PRÓLOGO + CAPÍTULO 1 de la novela.
    
    ROADMAP (GUÍA):
    ${safeRoadmap}
    
    INSTRUCCIONES:
    1. Basate en el inicio del Roadmap.
    2. Genera 8-10 escenas introductorias.
    3. Define 'audioConfig' (Chiptune).
    4. Termina el capítulo en un punto de interés.
    5. OBLIGATORIO: Incluye al menos 1 o 2 escenas con DECISIONES (choices).
  `;

  const jsonResponse = await callPollinationsJSON(BASE_SYSTEM_PROMPT, userPrompt);
  
  if (!jsonResponse.scenes || !Array.isArray(jsonResponse.scenes)) {
    throw new Error("Error formato AI: falta array scenes");
  }

  // Process assets
  onStatusUpdate("Iniciando Generación de Assets Gráficos...");
  const { processedScenes, updatedRegistry } = await processScenesWithRegistry(jsonResponse.scenes, {}, projectId, 1, artStyle, onStatusUpdate);

  const firstChapter: Chapter = {
    id: crypto.randomUUID(),
    title: jsonResponse.chapterTitle || "Capítulo 1",
    scenes: processedScenes
  };

  return {
    id: projectId,
    createdAt: Date.now(),
    title: jsonResponse.title || userTitle || "Novela Sin Título",
    genre: jsonResponse.genre || userGenre,
    summary: jsonResponse.summary || "Inicio de la historia.",
    roadmap: roadmap, // Save full roadmap locally/db
    artStyle: artStyle,
    chapters: [firstChapter],
    currentChapterIndex: 0,
    characterRegistry: updatedRegistry
  };
};

export const generateNextChapter = async (
  currentData: VisualNovelData, 
  onStatusUpdate: (status: string) => void
): Promise<VisualNovelData> => {
  const nextChapterNum = currentData.chapters.length + 1;
  const projectId = currentData.id;
  
  onStatusUpdate(`Consultando Roadmap para Cap. ${nextChapterNum}...`);
  onStatusUpdate(`Escribiendo Cap. ${nextChapterNum} y Componiendo Música...`);

  // SAFETY: Truncate context to prevent 500 API Error (Max input limit)
  const safeRoadmap = safeTruncate(currentData.roadmap, 3000);
  const safeSummary = safeTruncate(currentData.summary, 1500);

  const userPrompt = `
    Escribe el CAPÍTULO ${nextChapterNum} de la novela "${currentData.title}".
    
    GUION MAESTRO (ROADMAP - GUÍA):
    ${safeRoadmap}
    
    RESUMEN PREVIO: ${safeSummary}
    PERSONAJES: ${Object.keys(currentData.characterRegistry).join(", ")}.
    
    INSTRUCCIONES:
    1. Avanza la trama siguiendo la guía.
    2. Mantén la coherencia visual.
    3. 12-15 escenas con Audio.
    4. Actualiza el 'summary' en el JSON con lo nuevo.
    5. OBLIGATORIO: Debes ofrecer al menos 2 DECISIONES (choices) que afecten la historia.
  `;

  const jsonResponse = await callPollinationsJSON(BASE_SYSTEM_PROMPT, userPrompt);

  if (!jsonResponse.scenes || !Array.isArray(jsonResponse.scenes)) {
     throw new Error("Error formato AI: falta array scenes");
  }

  const { processedScenes, updatedRegistry } = await processScenesWithRegistry(jsonResponse.scenes, currentData.characterRegistry, projectId, nextChapterNum, currentData.artStyle, onStatusUpdate);

  const newChapter: Chapter = {
    id: crypto.randomUUID(),
    title: jsonResponse.chapterTitle || `Capítulo ${nextChapterNum}`,
    scenes: processedScenes
  };

  onStatusUpdate("Guardando nueva estructura en Supabase...");

  return {
    ...currentData,
    summary: jsonResponse.summary || currentData.summary,
    chapters: [...currentData.chapters, newChapter], // Append logic
    currentChapterIndex: nextChapterNum - 1, 
    characterRegistry: updatedRegistry
  };
};
