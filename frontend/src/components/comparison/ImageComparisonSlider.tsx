"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  initialPosition?: number;
  className?: string;
}

export function ImageComparisonSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Antes",
  afterLabel = "Depois",
  initialPosition = 50,
  className,
}: ImageComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSliderPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateSliderPosition(e.clientX);
  }, [updateSliderPosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    updateSliderPosition(e.touches[0].clientX);
  }, [updateSliderPosition]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updateSliderPosition(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      updateSliderPosition(e.touches[0].clientX);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, updateSliderPosition]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden rounded-lg select-none cursor-ew-resize",
        className
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* After Image (Background) */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        <img
          src={afterImage}
          alt={afterLabel}
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Before Image (Clipped) */}
      <div
        className="absolute inset-0 overflow-hidden flex items-center justify-center bg-black"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg transition-transform"
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
      >
        {/* Handle Grip */}
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-10 h-10 rounded-full bg-white shadow-lg",
            "flex items-center justify-center",
            "transition-transform",
            isDragging && "scale-110"
          )}
        >
          <GripVertical className="h-5 w-5 text-gray-600" />
        </div>
      </div>

      {/* Date Labels - Follow slider position */}
      {/* Before label - left side of slider */}
      <div
        className="absolute top-4 z-10 pointer-events-none transition-all duration-75"
        style={{
          left: `${Math.max(5, sliderPosition / 2)}%`,
          transform: "translateX(-50%)",
          opacity: sliderPosition > 10 ? 1 : 0,
        }}
      >
        <div className="px-4 py-2 bg-gray-700/95 backdrop-blur-sm rounded-lg text-white text-sm font-semibold border border-gray-600 shadow-lg">
          {beforeLabel}
        </div>
      </div>
      {/* After label - right side of slider */}
      <div
        className="absolute top-4 z-10 pointer-events-none transition-all duration-75"
        style={{
          left: `${Math.min(95, sliderPosition + (100 - sliderPosition) / 2)}%`,
          transform: "translateX(-50%)",
          opacity: sliderPosition < 90 ? 1 : 0,
        }}
      >
        <div className="px-4 py-2 bg-primary/95 backdrop-blur-sm rounded-lg text-white text-sm font-semibold border border-primary shadow-lg">
          {afterLabel}
        </div>
      </div>
    </div>
  );
}

// Alternative side-by-side comparison component
interface SideBySideComparisonProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export function SideBySideComparison({
  beforeImage,
  afterImage,
  beforeLabel = "Antes",
  afterLabel = "Depois",
  className,
}: SideBySideComparisonProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 h-full", className)}>
      <div className="relative rounded-lg overflow-hidden">
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs font-medium">
          {beforeLabel}
        </div>
      </div>
      <div className="relative rounded-lg overflow-hidden">
        <img
          src={afterImage}
          alt={afterLabel}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs font-medium">
          {afterLabel}
        </div>
      </div>
    </div>
  );
}
