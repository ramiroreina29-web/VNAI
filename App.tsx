
import React, { useState } from 'react';
import MarketAnalyzer from './components/MarketAnalyzer';
import MainMenu from './components/MainMenu';
import GameEngine from './components/GameEngine';
import ProjectLibrary from './components/ProjectLibrary';
import { AppState, VisualNovelData } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LIBRARY);
  const [gameData, setGameData] = useState<VisualNovelData | null>(null);
  const [generationMode, setGenerationMode] = useState<'initial' | 'next_chapter'>('initial');

  const handleAnalysisComplete = (data: VisualNovelData) => {
    // If it was next_chapter mode, gameData was updated inside the component logic via saveProject
    // but here we ensure the app state has the latest data
    setGameData(data);
    setAppState(AppState.MENU);
  };

  const handleStartGame = (chapterIndex?: number) => {
    if (gameData && chapterIndex !== undefined) {
        // Allow starting from a specific chapter if selected in menu
        setGameData({
            ...gameData,
            currentChapterIndex: chapterIndex
        });
    }
    setAppState(AppState.GAMEPLAY);
  };

  const handleReturnToMenu = () => {
    setAppState(AppState.MENU);
  };

  const handleGoToLibrary = () => {
    setAppState(AppState.LIBRARY);
  };

  const handleLoadProject = (data: VisualNovelData) => {
    setGameData(data);
    setAppState(AppState.MENU);
  };

  const handleAnalyzeNew = () => {
    setGameData(null);
    setGenerationMode('initial');
    setAppState(AppState.ANALYSIS);
  };

  const handleGenerateNextChapter = () => {
    if (gameData) {
      setGenerationMode('next_chapter');
      setAppState(AppState.ANALYSIS);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 text-white">
      {appState === AppState.ANALYSIS && (
        <MarketAnalyzer 
          mode={generationMode}
          existingData={gameData || undefined}
          onComplete={handleAnalysisComplete} 
          onGoToLibrary={handleGoToLibrary}
        />
      )}

      {appState === AppState.LIBRARY && (
        <ProjectLibrary 
          onLoadProject={handleLoadProject}
          onBack={handleAnalyzeNew}
        />
      )}

      {appState === AppState.MENU && gameData && (
        <MainMenu 
          data={gameData} 
          onStart={handleStartGame} 
          onAnalyzeNew={handleGoToLibrary}
        />
      )}

      {appState === AppState.GAMEPLAY && gameData && (
        <GameEngine 
          data={gameData} 
          onExit={handleReturnToMenu} 
          onGenerateNextChapter={handleGenerateNextChapter}
        />
      )}
    </div>
  );
};

export default App;
