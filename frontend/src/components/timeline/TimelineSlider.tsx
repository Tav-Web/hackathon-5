"use client";

import { useState } from "react";
import { Clock, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

interface TimelineSliderProps {
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  onChange?: (position: number) => void;
}

export function TimelineSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Antes",
  afterLabel = "Depois",
  onChange,
}: TimelineSliderProps) {
  const [position, setPosition] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = Number(e.target.value);
    setPosition(newPosition);
    onChange?.(newPosition);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    let currentPos = position;
    let direction = 1;

    const interval = setInterval(() => {
      currentPos += direction * 2;
      if (currentPos >= 100) {
        direction = -1;
        currentPos = 100;
      } else if (currentPos <= 0) {
        direction = 1;
        currentPos = 0;
      }
      setPosition(currentPos);
      onChange?.(currentPos);
    }, 50);

    setTimeout(() => {
      clearInterval(interval);
      setIsPlaying(false);
    }, 5000);
  };

  const goToStart = () => {
    setPosition(0);
    onChange?.(0);
  };

  const goToEnd = () => {
    setPosition(100);
    onChange?.(100);
  };

  if (!beforeImage && !afterImage) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="h-4 w-4" />
          <span className="text-sm">Timeline</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Faça upload das imagens para usar o slider de comparação
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-300">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Comparar Imagens</span>
        </div>
        <span className="text-xs text-gray-500">{position}%</span>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-400">
        <span className={position < 30 ? "text-blue-400" : ""}>{beforeLabel}</span>
        <span className={position > 70 ? "text-green-400" : ""}>{afterLabel}</span>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${position}%, #22c55e ${position}%, #22c55e 100%)`,
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={goToStart}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Ir para Antes"
        >
          <ChevronLeft className="h-4 w-4 text-gray-400" />
        </button>
        <button
          onClick={handlePlayPause}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          title={isPlaying ? "Pausar" : "Reproduzir"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-white" />
          ) : (
            <Play className="h-4 w-4 text-white" />
          )}
        </button>
        <button
          onClick={goToEnd}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Ir para Depois"
        >
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Visual indicator */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-gray-400">{beforeLabel}</span>
        </div>
        <div className="flex-1 h-px bg-gray-700" />
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-gray-400">{afterLabel}</span>
        </div>
      </div>
    </div>
  );
}
