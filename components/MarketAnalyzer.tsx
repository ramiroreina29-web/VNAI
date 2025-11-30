
import React, { useState, useEffect, useRef } from 'react';
import { generateInitialStory, generateNextChapter } from '../services/geminiService';
import { VisualNovelData, ArtStyle } from '../types';
import { saveProject } from '../utils/storage';
import { Loader2, Sparkles, Library, AlertCircle, CloudLightning, Image as ImageIcon, FileText, CheckCircle2, Palette, PenTool } from 'lucide-react';

interface MarketAnalyzerProps {
  mode: 'initial' | 'next_chapter';
  existingData?: VisualNovelData;
  onComplete: (data: VisualNovelData) => void;
  onGoToLibrary: () => void;
}

const MarketAnalyzer: React.FC<MarketAnalyzerProps> = ({ mode, existingData, onComplete, onGoToLibrary }) => {
  // Input State
  const [userTitle, setUserTitle] = useState('');
  const [userIdea, setUserIdea] = useState('');
  const [userGenre, setUserGenre] = useState('Misterio Romance');
  const [artStyle, setArtStyle] = useState<ArtStyle>('anime');
  const [showInputForm, setShowInputForm] = useState(mode === 'initial');

  // Generation State
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [stepHistory, setStepHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'next_chapter' && existingData) {
      setShowInputForm(false);
      handleAnalyze();
    }
  }, [mode]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [stepHistory]);

  const handleStartGeneration = () => {
    if (!userIdea.trim()) {
        setError("Por favor, escribe una idea para la historia.");
        return;
    }
    setShowInputForm(false);
    handleAnalyze();
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    setCurrentStep("Inicializando motores de IA...");
    setStepHistory([]);
    setError(null);

    try {
      let newData: VisualNovelData;
      
      const updateCallback = (msg: string) => {
        setCurrentStep(msg);
        setStepHistory(prev => [...prev.slice(-4), msg]); 
      };

      if (mode === 'next_chapter' && existingData) {
        newData = await generateNextChapter(existingData, updateCallback);
      } else {
        // Pass user inputs
        newData = await generateInitialStory(userTitle, userIdea, userGenre, artStyle, updateCallback);
      }
      
      updateCallback("Sincronizando base de datos Supabase...");
      await saveProject(newData);
      
      updateCallback("¡Proyecto Completado!");
      setTimeout(() => {
        onComplete(newData);
      }, 800);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error desconocido. Verifica tu conexión.");
      setIsLoading(false);
      if (mode === 'initial') setShowInputForm(true); // Allow retry edit
    }
  };

  const getStepIcon = (text: string) => {
    if (text.includes("Fondo") || text.includes("Diseñando")) return <ImageIcon className="w-5 h-5 text-pink-400 animate-bounce" />;
    if (text.includes("Escribiendo") || text.includes("Guion") || text.includes("Roadmap")) return <FileText className="w-5 h-5 text-cyan-400 animate-pulse" />;
    if (text.includes("Supabase") || text.includes("Nube")) return <CloudLightning className="w-5 h-5 text-yellow-400" />;
    return <Sparkles className="w-5 h-5 text-indigo-400" />;
  };

  // --- FORM RENDER ---
  if (showInputForm) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none"></div>
            
            <div className="z-10 w-full max-w-lg bg-slate-900/90 border border-indigo-500/30 p-8 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 brand-font mb-2">
                        CREAR NUEVA NOVELA
                    </h1>
                    <p className="text-slate-400 text-sm">Define tu mundo y deja que la IA haga el resto.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-indigo-300 uppercase mb-1">Título de la Novela (Opcional)</label>
                        <input 
                            type="text" 
                            value={userTitle}
                            onChange={(e) => setUserTitle(e.target.value)}
                            placeholder="Ej: Ecos del Ciberespacio"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-indigo-300 uppercase mb-1">Idea / Trama Principal</label>
                        <textarea 
                            value={userIdea}
                            onChange={(e) => setUserIdea(e.target.value)}
                            placeholder="Ej: Una detective robot se enamora del sospechoso principal en una ciudad futurista..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white h-24 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        />
                    </div>
                    
                    <div>
                         <label className="block text-xs font-bold text-indigo-300 uppercase mb-3">Estilo Artístico</label>
                         <div className="grid grid-cols-2 gap-3">
                             <button 
                                onClick={() => setArtStyle('anime')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${artStyle === 'anime' ? 'bg-pink-600/20 border-pink-500 text-pink-200 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                             >
                                <PenTool className="mb-2 w-6 h-6" />
                                <span className="font-bold text-sm">Anime / Manga</span>
                             </button>
                             <button 
                                onClick={() => setArtStyle('pixel')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${artStyle === 'pixel' ? 'bg-cyan-600/20 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                             >
                                <Palette className="mb-2 w-6 h-6" />
                                <span className="font-bold text-sm">Pixel Art Retro</span>
                             </button>
                         </div>
                    </div>

                    {error && (
                        <p className="text-red-400 text-xs text-center font-bold bg-red-900/20 p-2 rounded">{error}</p>
                    )}

                    <button
                        onClick={handleStartGeneration}
                        className="w-full py-4 mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                    >
                        <Sparkles className="w-5 h-5 text-yellow-300" />
                        GENERAR ROADMAP & CAPÍTULO 1
                    </button>
                    
                    <button onClick={onGoToLibrary} className="w-full text-slate-500 text-sm hover:text-white py-2">
                        Cancelar y volver a Biblioteca
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- LOADING RENDER ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none"></div>

      <div className="w-full max-w-2xl p-1 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl relative overflow-hidden animate-in fade-in duration-500">
           <div className="bg-slate-900 rounded-xl p-8 flex flex-col items-center">
              
              <div className="mb-8 relative">
                 <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 animate-pulse"></div>
                 <div className="relative z-10 w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border border-slate-600">
                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                 </div>
              </div>

              <h3 className="text-2xl font-bold text-white tracking-wide mb-2 brand-font">
                {mode === 'next_chapter' ? 'PRODUCIENDO SIGUIENTE EPISODIO' : 'CREANDO UNIVERSO NARRATIVO'}
              </h3>
              
              {/* Active Step Card */}
              <div className="w-full bg-slate-800/80 rounded-xl p-4 border border-indigo-500/30 mb-6 shadow-inner flex items-center gap-4">
                 <div className="p-3 bg-indigo-900/50 rounded-lg">
                    {getStepIcon(currentStep)}
                 </div>
                 <div className="text-left flex-1">
                    <p className="text-xs text-indigo-300 uppercase font-bold tracking-wider mb-1">PROCESO ACTUAL</p>
                    <p className="text-lg text-white font-mono leading-tight">{currentStep}</p>
                 </div>
              </div>

              {/* History Log */}
              <div className="w-full h-32 overflow-hidden relative border-t border-slate-800 pt-4">
                 <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-slate-900 to-transparent z-10"></div>
                 <div className="flex flex-col gap-2 opacity-70">
                    {stepHistory.map((step, idx) => (
                       <div key={idx} className="flex items-center gap-2 text-sm text-slate-400 animate-in slide-in-from-bottom-2">
                          <CheckCircle2 size={12} className="text-green-500" />
                          <span>{step}</span>
                       </div>
                    ))}
                    <div ref={historyEndRef} />
                 </div>
              </div>
           </div>
        </div>
    </div>
  );
};

export default MarketAnalyzer;
