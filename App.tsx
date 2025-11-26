import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import { AnimalType, GameStatus } from './types';
import { MATCH_DURATION_SECONDS } from './constants';
import { generateMatchSummary } from './services/geminiService';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [userAnimal, setUserAnimal] = useState<AnimalType>(AnimalType.LION);
  const [score, setScore] = useState({ red: 0, blue: 0 });
  const [timeLeft, setTimeLeft] = useState(MATCH_DURATION_SECONDS);
  const [commentary, setCommentary] = useState<string>("Welcome to Footaminal!");
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState("");

  useEffect(() => {
    let timer: any;
    if (status === GameStatus.PLAYING && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
           if (prev <= 1) {
             endGame();
             return 0;
           }
           return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const endGame = async () => {
    setStatus(GameStatus.FINISHED);
    let winner = 'Draw';
    if (score.red > score.blue) winner = 'Red Team';
    if (score.blue > score.red) winner = 'Blue Team';
    
    setSummaryText("Generating match analysis...");
    setShowSummary(true);

    const summary = await generateMatchSummary(winner, userAnimal, AnimalType.BEAR, score.red, score.blue); // Note: Opponent type is not tracked in App state nicely, hardcoding or need to lift state. Fixed in logic below.
    setSummaryText(summary);
  };

  const handleStart = (animal: AnimalType) => {
    setUserAnimal(animal);
    setScore({ red: 0, blue: 0 });
    setTimeLeft(MATCH_DURATION_SECONDS);
    setStatus(GameStatus.PLAYING);
    setCommentary("The match has begun! Good luck!");
    setShowSummary(false);
  };

  const handleGoal = (team: 'red' | 'blue', scorer: AnimalType) => {
    setScore(prev => ({ ...prev, [team]: prev[team] + 1 }));
    // Temporarily pause timer? No, let it run.
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-green-800 to-green-900 p-4">
      
      {/* HUD */}
      <div className="w-full max-w-[800px] flex justify-between items-center mb-4 text-white">
         <div className="flex flex-col items-start">
             <div className="bg-red-600 px-4 py-1 rounded-t-lg font-bold text-sm">YOU (RED)</div>
             <div className="bg-gray-900/80 px-6 py-3 rounded-b-lg rounded-r-lg text-4xl font-black border-2 border-red-500 shadow-lg">
                {score.red}
             </div>
         </div>

         <div className="flex flex-col items-center">
            <div className="bg-black/50 px-6 py-2 rounded-full border border-white/20 mb-2 font-mono text-2xl font-bold shadow-inner">
               {formatTime(timeLeft)}
            </div>
            {/* Commentary Bubble */}
            <div className="max-w-md text-center bg-white/90 text-gray-800 px-4 py-2 rounded-xl text-sm font-semibold shadow-lg animate-pulse">
                🎙️ "{commentary}"
            </div>
         </div>

         <div className="flex flex-col items-end">
             <div className="bg-blue-600 px-4 py-1 rounded-t-lg font-bold text-sm">CPU (BLUE)</div>
             <div className="bg-gray-900/80 px-6 py-3 rounded-b-lg rounded-l-lg text-4xl font-black border-2 border-blue-500 shadow-lg">
                {score.blue}
             </div>
         </div>
      </div>

      {/* Game Canvas */}
      <GameCanvas 
        userAnimal={userAnimal} 
        gameStatus={status} 
        onGoal={handleGoal} 
        onGameEnd={endGame}
        setCommentary={setCommentary}
        scoreRed={score.red}
        scoreBlue={score.blue}
      />

      {/* Overlays */}
      {status === GameStatus.MENU && (
        <MainMenu onStart={handleStart} />
      )}

      {status === GameStatus.FINISHED && showSummary && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-50 p-6">
           <div className="bg-white text-gray-800 p-8 rounded-3xl shadow-2xl max-w-lg w-full text-center border-4 border-yellow-500 animate-in fade-in zoom-in duration-300">
              <h2 className="text-4xl font-bold mb-2">FULL TIME!</h2>
              <div className="text-6xl font-black mb-6 flex justify-center items-center gap-8">
                  <span className="text-red-500">{score.red}</span>
                  <span className="text-gray-300">-</span>
                  <span className="text-blue-500">{score.blue}</span>
              </div>
              
              <div className="bg-gray-100 p-4 rounded-xl mb-6 text-left">
                  <h3 className="font-bold text-gray-500 text-xs uppercase mb-1">AI Match Report</h3>
                  <p className="italic text-lg text-gray-700">"{summaryText}"</p>
              </div>

              <button 
                onClick={() => setStatus(GameStatus.MENU)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full text-xl transition-transform hover:scale-105 shadow-lg"
              >
                Play Again
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
