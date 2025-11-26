import React from 'react';
import { AnimalType } from '../types';
import { ANIMALS } from '../constants';

interface MainMenuProps {
  onStart: (selectedAnimal: AnimalType) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart }) => {
  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4">
      <div className="bg-white text-gray-800 p-8 rounded-3xl shadow-2xl max-w-2xl w-full text-center border-4 border-yellow-400">
        <h1 className="text-5xl font-bold mb-2 text-green-600 tracking-tighter">Footaminal</h1>
        <p className="text-gray-500 mb-8 text-xl">The Ultimate Animal Soccer League</p>
        
        <h2 className="text-2xl font-bold mb-6">Choose Your Captain</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {ANIMALS.map((animal) => (
            <button
              key={animal.type}
              onClick={() => onStart(animal.type)}
              className="group relative flex flex-col items-center p-4 bg-gray-100 rounded-xl hover:bg-green-100 hover:scale-105 transition-all duration-200 border-2 border-transparent hover:border-green-400"
            >
              <span className="text-6xl mb-2 drop-shadow-md group-hover:animate-bounce">{animal.type}</span>
              <span className="font-bold text-lg">{animal.name}</span>
              <div className="text-xs text-gray-500 mt-2 space-y-1">
                <div className="flex items-center gap-1 justify-center">
                  <span>Speed</span>
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(animal.speed / 8) * 100}%` }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-1 justify-center">
                  <span>Power</span>
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${(animal.kick / 15) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-400">
          Controls: Arrow Keys to Move, SPACE to Kick
        </p>
      </div>
    </div>
  );
};

export default MainMenu;
