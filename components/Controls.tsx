import React, { useState } from 'react';
import { AppState, ShapeType, THEMES } from '../types';

interface ControlsProps {
  state: AppState;
  onUpdate: (partial: Partial<AppState>) => void;
}

const SHAPE_ICONS: Record<ShapeType, string> = {
  [ShapeType.SPHERE]: '⚫',
  [ShapeType.HEART]: '❤️',
  [ShapeType.FLOWER]: '🌸',
  [ShapeType.SATURN]: '🪐',
  [ShapeType.BUDDHA]: '🧘',
  [ShapeType.FIREWORKS]: '🎆',
  [ShapeType.JAGANNATH]: '👁️',
  [ShapeType.BOW]: '🏹',
  [ShapeType.TEXT_ABINASH]: '🅰️',
  [ShapeType.TEXT_AS]: '🔤'
};

export const Controls: React.FC<ControlsProps> = ({ state, onUpdate }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`fixed top-4 right-4 z-10 transition-all duration-300 ${collapsed ? 'w-12 h-12' : 'w-80'}`}>
      <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 p-4 shadow-xl text-sm">
        
        {/* Header / Toggle */}
        <div className="flex justify-between items-center mb-4">
          <h1 className={`font-bold text-white tracking-wider ${collapsed ? 'hidden' : 'block'}`}>ZEN FLOW</h1>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            {collapsed ? '⚙️' : '✕'}
          </button>
        </div>

        {!collapsed && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            
            {/* Camera Toggle */}
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
              <span className="text-gray-300 flex items-center gap-2">
                <span>📹</span> Camera Control
              </span>
              <button 
                onClick={() => onUpdate({ useCamera: !state.useCamera })}
                className={`w-12 h-6 rounded-full transition-colors relative ${state.useCamera ? 'bg-green-500' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${state.useCamera ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            {/* Shape Selector */}
            <div>
              <label className="text-gray-400 block mb-2 text-xs uppercase font-semibold">Shape</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.values(ShapeType).map((shape) => (
                  <button
                    key={shape}
                    onClick={() => onUpdate({ shape: shape as ShapeType, color: THEMES[shape as ShapeType] })}
                    className={`p-2 rounded-lg transition-all border flex flex-col items-center justify-center ${
                      state.shape === shape 
                        ? 'bg-white/20 border-white text-white scale-105' 
                        : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl mb-1">{SHAPE_ICONS[shape as ShapeType]}</span>
                    <span className="text-[9px] text-center leading-tight">{shape.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Count</span>
                  <span>{state.particleCount}</span>
                </div>
                <input 
                  type="range" min="1000" max="20000" step="1000"
                  value={state.particleCount}
                  onChange={(e) => onUpdate({ particleCount: parseInt(e.target.value) })}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Size</span>
                  <span>{state.particleSize.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="0.5" max="5.0" step="0.1"
                  value={state.particleSize}
                  onChange={(e) => onUpdate({ particleSize: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>

               <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Chaos</span>
                  <span>{state.noiseStrength.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="0" max="2.0" step="0.1"
                  value={state.noiseStrength}
                  onChange={(e) => onUpdate({ noiseStrength: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>

            {/* Color */}
            <div>
               <label className="text-gray-400 block mb-2 text-xs uppercase font-semibold">Color</label>
               <input 
                 type="color" 
                 value={state.color}
                 onChange={(e) => onUpdate({ color: e.target.value })}
                 className="w-full h-8 rounded cursor-pointer"
               />
            </div>

          </div>
        )}
      </div>
    </div>
  );
};