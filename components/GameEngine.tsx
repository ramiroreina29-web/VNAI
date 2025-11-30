
import React, { useState, useEffect, useRef } from 'react';
import { VisualNovelData, Scene, Chapter } from '../types';
import { audioSynth } from '../utils/audioSynth';
import { Play, Download, Menu as MenuIcon, Sparkles, ImageOff, Volume2, VolumeX } from 'lucide-react';

interface GameEngineProps {
  data: VisualNovelData;
  onExit: () => void;
  onGenerateNextChapter: () => void;
}

const GameEngine: React.FC<GameEngineProps> = ({ data, onExit, onGenerateNextChapter }) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(data.currentChapterIndex || 0);
  const [currentSceneId, setCurrentSceneId] = useState<string>("");
  
  // Typewriter & Interaction State
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [isChapterEnd, setIsChapterEnd] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const typewriterRef = useRef<any>(null);

  // Initialize scene when chapter changes
  const currentChapter: Chapter | undefined = data.chapters[currentChapterIndex];

  // 1. INITIALIZATION
  useEffect(() => {
    if (currentChapter && currentChapter.scenes.length > 0) {
      setCurrentSceneId(currentChapter.scenes[0].id);
      setIsChapterEnd(false);
    }
  }, [currentChapterIndex, currentChapter]);

  const currentScene: Scene | undefined = currentChapter?.scenes.find(s => s.id === currentSceneId);
  const currentIndex = currentChapter?.scenes.findIndex(s => s.id === currentSceneId) ?? 0;

  // 2. SMART PRELOADING
  useEffect(() => {
    if (!currentChapter) return;
    
    // Preload next 5 scenes assets
    for (let i = 1; i <= 5; i++) {
      const nextScene = currentChapter.scenes[currentIndex + i];
      if (nextScene) {
        if (nextScene.backgroundImageUrl) {
          const img = new Image();
          img.src = nextScene.backgroundImageUrl;
        }
        nextScene.characters.forEach(char => {
          if (char.imageUrl) {
            const img = new Image();
            img.src = char.imageUrl;
          }
        });
      }
    }
  }, [currentIndex, currentChapter]);

  // 3. AUDIO LOGIC (Procedural)
  useEffect(() => {
    if (!currentScene || isMuted) {
      audioSynth.stop();
      return;
    }

    // Start/Update BGM based on scene config (SAFE FALLBACK)
    const audioConf = currentScene.audioConfig || { bgmTheme: { mood: 'mystery', tempo: 'medium', waveType: 'sine' } };
    
    // Only play if browser allows (user interaction happened)
    // We handle the promise catch silently to avoid console spam before interaction
    audioSynth.start().then(() => {
        audioSynth.playTheme(audioConf.bgmTheme.mood, audioConf.bgmTheme.tempo, audioConf.bgmTheme.waveType);
        
        // Trigger SFX if any
        if (audioConf.sfxTrigger && audioConf.sfxTrigger !== 'none') {
            audioSynth.playSFX(audioConf.sfxTrigger);
        }
    }).catch(() => {}); 

    return () => {
      // Cleanup? AudioSynth manages itself mostly, avoiding abrupt stops between scenes unless intentional
    };
  }, [currentScene, isMuted]);

  // 4. TYPEWRITER EFFECT LOGIC
  useEffect(() => {
    if (!currentScene) return;

    // Reset for new scene
    setDisplayedText("");
    setIsTyping(true);
    setBgLoaded(false); 
    
    if (typewriterRef.current) clearInterval(typewriterRef.current);

    let charIndex = 0;
    const fullText = currentScene.dialogueText || "";

    // SFX for typing
    const typeInterval = setInterval(() => {
       if (!isMuted && Math.random() > 0.7) audioSynth.playSFX('typing');
    }, 100);

    typewriterRef.current = setInterval(() => {
      charIndex++;
      setDisplayedText(fullText.substring(0, charIndex));

      if (charIndex >= fullText.length) {
        setIsTyping(false);
        clearInterval(typeInterval);
        if (typewriterRef.current) clearInterval(typewriterRef.current);
      }
    }, 30); 

    return () => {
      clearInterval(typeInterval);
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, [currentSceneId, currentScene]);

  if (!currentChapter || !currentScene) {
     if (isChapterEnd) return null;
     return <div className="text-white p-10 font-mono">Cargando motor narrativo...</div>;
  }

  // 5. INTERACTION HANDLERS
  const handleInteraction = () => {
    // A. Start Audio Context on first interaction (Browser policy)
    if (!isMuted) audioSynth.start();

    // B. If typing, finish immediately
    if (isTyping) {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
      setDisplayedText(currentScene.dialogueText);
      setIsTyping(false);
      return;
    }

    // C. If choices exist, DO NOT advance
    if (currentScene.choices && currentScene.choices.length > 0) {
      return;
    }

    // D. Advance
    handleNextScene();
  };

  const handleNextScene = () => {
    if (currentIndex < currentChapter.scenes.length - 1) {
      const nextScene = currentChapter.scenes[currentIndex + 1];
      setCurrentSceneId(nextScene.id);
    } else {
      setIsChapterEnd(true);
    }
  };

  const handleChoice = (nextId: string) => {
    if (!isMuted) audioSynth.playSFX('sparkle');
    setCurrentSceneId(nextId);
  };

  const handleDownload = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${data.title.replace(/\s+/g, '_')}_SaveData.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    if (!isMuted) audioSynth.stop(); // If turning OFF
    else audioSynth.start(); // If turning ON
  };

  const nextChapterExists = currentChapterIndex < data.chapters.length - 1;

  // --- RENDER ---

  // END SCREEN
  if (isChapterEnd) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div 
            className="absolute inset-0 opacity-40 bg-cover bg-center blur-lg scale-110"
            style={{ backgroundImage: `url(${currentScene?.backgroundImageUrl})` }}
        ></div>

        <div className="z-10 bg-slate-900/95 p-8 md:p-12 rounded-3xl border border-indigo-500/50 shadow-2xl text-center max-w-3xl w-full animate-in zoom-in-95 duration-500">
           <div className="mb-8">
              <span className="text-indigo-400 font-mono text-sm uppercase tracking-widest border border-indigo-500/30 px-3 py-1 rounded-full">
                Fin del Capítulo {currentChapterIndex + 1}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mt-4 mb-2 brand-font">
                {currentChapter.title}
              </h2>
              <div className="w-24 h-1 bg-indigo-500 mx-auto rounded-full"></div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
             {nextChapterExists ? (
                <button 
                  onClick={() => setCurrentChapterIndex(prev => prev + 1)}
                  className="col-span-1 md:col-span-2 py-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold text-xl flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] shadow-[0_0_20px_rgba(34,197,94,0.4)] border border-green-400/50"
                >
                  <Play fill="currentColor" size={28} /> 
                  <div>
                    <div className="text-sm font-normal opacity-90 uppercase tracking-wide">Continuar Historia</div>
                    JUGAR CAPÍTULO {currentChapterIndex + 2}
                  </div>
                </button>
             ) : (
                <button 
                  onClick={onGenerateNextChapter}
                  className="col-span-1 md:col-span-2 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xl flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] shadow-[0_0_30px_rgba(147,51,234,0.5)] border border-purple-400/50 group"
                >
                  <Sparkles className="w-8 h-8 group-hover:animate-spin" />
                  <div>
                    <div className="text-sm font-normal opacity-90 uppercase tracking-wide">Crear Siguiente Parte (IA)</div>
                    GENERAR CAPÍTULO {currentChapterIndex + 2}
                  </div>
                </button>
             )}
           </div>

           <div className="flex gap-4 border-t border-slate-700 pt-6">
              <button onClick={handleDownload} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center gap-2 font-semibold text-slate-300 transition-colors">
                 <Download size={18}/> Guardar Partida (.json)
              </button>
              <button onClick={onExit} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center gap-2 font-semibold text-slate-300 transition-colors">
                 <MenuIcon size={18}/> Menú Principal
              </button>
           </div>
        </div>
      </div>
    );
  }

  // MAIN VISUAL NOVEL UI
  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-black select-none font-sans"
      onClick={handleInteraction} // Main click handler
    >
      
      {/* 1. LAYER: BACKGROUND */}
      <div className="absolute inset-0 bg-slate-900 transition-opacity duration-1000">
        {!bgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-0">
          </div>
        )}
        {currentScene.backgroundImageUrl ? (
          <img 
            src={currentScene.backgroundImageUrl} 
            alt="Background" 
            className={`w-full h-full object-cover transition-opacity duration-700 ${bgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setBgLoaded(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-slate-800 to-black flex items-center justify-center">
             <ImageOff className="w-16 h-16 opacity-50"/>
          </div>
        )}
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* 2. LAYER: CHARACTERS */}
      <div className="absolute inset-0 flex items-end justify-center pointer-events-none z-10 px-4 md:px-20 overflow-hidden">
        {currentScene.characters.map((char, idx) => {
          const isSpeaker = currentScene.speakerName === char.name;
          return (
            <div 
              key={idx + char.id} 
              className={`
                relative transition-all duration-500 flex flex-col items-center justify-end
                ${char.position === 'left' ? 'mr-auto translate-x-0 md:translate-x-10' : ''}
                ${char.position === 'right' ? 'ml-auto -translate-x-0 md:-translate-x-10' : ''}
                ${char.position === 'center' ? 'mx-auto' : ''}
                ${isSpeaker ? 'opacity-100 scale-100 z-20 brightness-110 grayscale-0' : 'opacity-70 scale-95 z-10 brightness-50 grayscale-[0.3]'}
              `}
              style={{ width: '35vh', height: '80vh' }}
            >
              {char.imageUrl && (
                <img 
                  src={char.imageUrl} 
                  alt={char.name}
                  className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 3. LAYER: HUD */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between z-40 pointer-events-none">
         <div className="bg-black/40 text-white px-4 py-2 rounded-full backdrop-blur-md text-xs font-bold border border-white/10 shadow-lg flex items-center gap-2">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             {currentChapter.title}
         </div>
         <div className="flex gap-2 pointer-events-auto">
             <button 
                onClick={toggleMute}
                className="bg-black/40 text-white p-2 rounded hover:bg-slate-800/80 backdrop-blur-md border border-white/10 shadow-lg"
             >
                {isMuted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); onExit(); }} 
               className="bg-black/40 text-white px-4 py-2 rounded hover:bg-red-900/80 backdrop-blur-md text-sm font-bold border border-white/10 shadow-lg"
             >
                SALIR
             </button>
         </div>
      </div>

      {/* 4. LAYER: VN TEXT BOX & CHOICES */}
      <div className="absolute bottom-0 w-full z-50 flex flex-col items-center pb-4 md:pb-8 px-2 md:px-20 lg:px-40">
        
        {/* CHOICES OVERLAY */}
        {!isTyping && currentScene.choices && currentScene.choices.length > 0 && (
          <div className="mb-4 flex flex-col gap-3 w-full max-w-2xl animate-in slide-in-from-bottom-5 fade-in duration-300">
            {currentScene.choices.map((choice, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); handleChoice(choice.nextSceneId); }}
                className="group relative w-full py-4 px-8 bg-slate-900/95 hover:bg-indigo-900/95 border border-indigo-500/50 hover:border-indigo-400 text-indigo-100 font-semibold text-lg rounded-xl shadow-2xl transition-all hover:-translate-y-1 overflow-hidden backdrop-blur-md text-left flex items-center gap-4 cursor-pointer pointer-events-auto"
              >
                <div className="w-6 h-6 rounded-full border-2 border-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                    <div className="w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100"></div>
                </div>
                <span className="relative z-10">{choice.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* NARRATIVE BOX */}
        <div className="w-full max-w-5xl min-h-[160px] md:min-h-[200px] bg-slate-950/90 border-2 border-slate-700/50 rounded-xl p-6 md:p-8 relative shadow-[0_10px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            
            {currentScene.speakerName !== 'Narrador' && (
                <div className="absolute -top-10 left-0">
                    <div className="bg-indigo-700 text-white font-bold text-xl px-8 py-2 rounded-t-lg shadow-lg border-t border-x border-indigo-500/30 tracking-wide min-w-[150px] text-center transform -skew-x-12 origin-bottom-left">
                        <span className="inline-block transform skew-x-12">{currentScene.speakerName}</span>
                    </div>
                </div>
            )}

            <p className={`text-xl md:text-2xl leading-relaxed font-medium drop-shadow-md tracking-wide ${currentScene.speakerName === 'Narrador' ? 'text-indigo-200 italic text-center mt-2' : 'text-slate-100'}`}>
                {displayedText}
                {isTyping && <span className="inline-block w-2 h-6 bg-indigo-400 ml-1 animate-pulse align-middle"></span>}
            </p>
            
            {!isTyping && (!currentScene.choices || currentScene.choices.length === 0) && (
                <div className="absolute bottom-4 right-6 animate-bounce">
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-t-[15px] border-t-indigo-400 border-r-[10px] border-r-transparent opacity-80"></div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default GameEngine;
