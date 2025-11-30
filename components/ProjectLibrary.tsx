
import React, { useEffect, useState } from 'react';
import { SavedProject, VisualNovelData } from '../types';
import { getProjects, deleteProject } from '../utils/storage';
import { upgradeProjectWithAudio } from '../services/geminiService';
import { Play, Trash2, ArrowLeft, Clock, FileText, Loader2, Cloud, Music } from 'lucide-react';

interface ProjectLibraryProps {
  onLoadProject: (data: VisualNovelData) => void;
  onBack: () => void;
}

const ProjectLibrary: React.FC<ProjectLibraryProps> = ({ onLoadProject, onBack }) => {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProject, setLoadingProject] = useState<string | null>(null);
  const [remasteringId, setRemasteringId] = useState<string | null>(null);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    setLoading(true);
    const data = await getProjects();
    setProjects(data);
    setLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de que quieres eliminar este proyecto de la nube?")) {
      await deleteProject(id);
      loadLibrary();
    }
  };

  const handleRemaster = async (project: SavedProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setRemasteringId(project.id);
    try {
        await upgradeProjectWithAudio(project.data);
        await loadLibrary(); // Refresh to see changes
    } catch (err) {
        console.error("Error remastering:", err);
    } finally {
        setRemasteringId(null);
    }
  };

  const handleProjectClick = (project: SavedProject) => {
    setLoadingProject(project.id);
    // Small delay to allow UI render of loader before heavy data processing if any
    setTimeout(() => {
        onLoadProject(project.data);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center gap-6 mb-12">
          <button onClick={onBack} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold brand-font text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                Biblioteca Supabase
            </h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">
                <Cloud size={14}/> Tus historias guardadas en la nube
            </p>
          </div>
        </header>

        {loading ? (
           <div className="flex justify-center items-center h-64">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
           </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-500">No hay Proyectos</h3>
            <p className="text-slate-400">Genera una nueva novela para verla aquí.</p>
            <button onClick={onBack} className="mt-6 px-6 py-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500">
              Crear Nueva
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              // Check if project needs remastering (missing audioConfig in first scene)
              const needsAudioUpgrade = !project.data.chapters[0]?.scenes[0]?.audioConfig;
              
              return (
              <div 
                key={project.id}
                onClick={() => handleProjectClick(project)}
                className="group relative bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-indigo-500/50 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:-translate-y-1 overflow-hidden"
              >
                {/* Loader overlay */}
                {loadingProject === project.id && (
                    <div className="absolute inset-0 bg-slate-900/80 z-20 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        <span className="ml-2 font-bold text-indigo-400">Cargando...</span>
                    </div>
                )}
                
                {remasteringId === project.id && (
                    <div className="absolute inset-0 bg-indigo-900/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                        <Music className="w-10 h-10 text-pink-400 animate-bounce" />
                        <span className="mt-2 font-bold text-pink-200">Remasterizando Audio...</span>
                    </div>
                )}

                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-all"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="bg-indigo-900/50 text-indigo-300 text-xs px-3 py-1 rounded-full font-mono uppercase tracking-wide border border-indigo-500/20">
                    {project.genre}
                  </div>
                  <button 
                    onClick={(e) => handleDelete(project.id, e)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1 z-20"
                    title="Eliminar Proyecto"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-indigo-300 transition-colors">
                  {project.title}
                </h3>
                
                <div className="flex items-center text-slate-400 text-sm mb-6">
                  <Clock size={14} className="mr-2" />
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>

                <p className="text-slate-400 text-sm line-clamp-3 mb-6 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 italic">
                   "{project.data.summary}"
                </p>

                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 font-bold text-indigo-400 group-hover:text-indigo-300">
                        <Play size={18} fill="currentColor" />
                        CARGAR PROYECTO
                    </div>
                    
                    {needsAudioUpgrade && (
                        <button 
                            onClick={(e) => handleRemaster(project, e)}
                            className="flex items-center justify-center gap-2 py-2 px-4 bg-pink-600/20 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300 text-xs font-bold rounded-lg transition-all animate-pulse hover:animate-none z-10"
                        >
                            <Music size={14} />
                            REMASTERIZAR AUDIO (IA)
                        </button>
                    )}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectLibrary;
