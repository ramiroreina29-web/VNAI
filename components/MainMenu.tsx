
import React from 'react';
import { VisualNovelData } from '../types';
import { Play, BookOpen, Settings, Info, Grid } from 'lucide-react';

interface MainMenuProps {
  data: VisualNovelData;
  onStart: (chapterIndex?: number) => void;
  onAnalyzeNew: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ data, onStart, onAnalyzeNew }) => {
  const [viewChapters, setViewChapters] = React.useState(false);
  
  // Use current chapter bg or fallback
  const currentChap = data.chapters[data.currentChapterIndex || 0];
  const bgImage = currentChap?.scenes[0]?.backgroundImageUrl || `https://picsum.photos/seed/${data.title}/1920/1080`;

  return (
    <div className="relative w-full h-screen bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
      
      {/* Dynamic Background with Preload hint */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 blur-[2px] scale-105 transition-all duration-1000"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      <div className="z-10 text-center max-w-5xl px-6 w-full animate-in fade-in zoom-in duration-1000">
        
        {!viewChapters ? (
            <>
                <div className="inline-block mb-4 px-4 py-1 bg-indigo-500/40 border border-indigo-400/50 text-indigo-100 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-md">
                   {data.genre} • {data.artStyle === 'pixel' ? 'Pixel Art' : 'Anime'}
                </div>

                <h1 className="text-5xl md:text-8xl font-black text-white mb-2 brand-font tracking-tighter drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] leading-tight">
                  {data.title}
                </h1>
                <p className="text-xl md:text-2xl text-indigo-100 font-light italic mb-8 drop-shadow-md max-w-2xl mx-auto line-clamp-2">
                  {data.summary}
                </p>

                <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
                  <button 
                    onClick={() => onStart()}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-bold text-lg transition-all hover:scale-105 shadow-[0_0_20px_rgba(236,72,153,0.4)] border border-pink-400"
                  >
                    <Play fill="currentColor" /> 
                    {data.currentChapterIndex > 0 ? "CONTINUAR" : "COMENZAR"}
                  </button>
                  
                  <button 
                    onClick={() => setViewChapters(true)}
                    className="flex items-center justify-center gap-3 w-full py-3 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all border border-indigo-500/50 backdrop-blur-sm"
                  >
                    <Grid size={20} /> CAPÍTULOS ({data.chapters.length})
                  </button>
                </div>
            </>
        ) : (
            // CHAPTER SELECT VIEW
            <div className="w-full max-h-[80vh] bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 border border-slate-700 shadow-2xl overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white brand-font">SELECCIONAR CAPÍTULO</h2>
                    <button onClick={() => setViewChapters(false)} className="text-slate-400 hover:text-white">Cerrar</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.chapters.map((chap, idx) => (
                        <div 
                            key={chap.id}
                            onClick={() => onStart(idx)}
                            className={`group relative h-40 rounded-xl overflow-hidden border cursor-pointer transition-all hover:scale-[1.02] ${idx === data.currentChapterIndex ? 'border-pink-500 ring-2 ring-pink-500/50' : 'border-slate-600 hover:border-indigo-400'}`}
                        >
                            <div 
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                style={{ backgroundImage: `url(${chap.scenes[0]?.backgroundImageUrl})` }}
                            >
                                <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors"></div>
                            </div>
                            <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4">
                                <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">Capítulo {idx + 1}</span>
                                <h3 className="text-lg font-bold text-white leading-tight">{chap.title}</h3>
                                {idx === data.currentChapterIndex && (
                                    <span className="mt-2 text-[10px] bg-pink-600 px-2 py-0.5 rounded text-white font-bold">ACTUAL</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>

      <div className="absolute bottom-8 text-gray-400 text-sm z-20">
        <button onClick={onAnalyzeNew} className="hover:text-white hover:underline transition-colors shadow-black drop-shadow-lg">
           &larr; Volver a la Biblioteca
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
