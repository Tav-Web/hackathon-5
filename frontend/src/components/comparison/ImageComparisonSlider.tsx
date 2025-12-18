"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { GripVertical } from "lucide-react";

// Styled components
import {
  SliderContainer,
  ImageContainer,
  ClippedImageContainer,
  SliderImage,
  SliderHandle,
  HandleGrip,
  GripIcon,
  LabelContainer,
  LabelBadge,
  SideBySideContainer,
  SideBySideImage,
  SideBySideLabel,
  SideBySideImg,
} from "./styles";

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
    <SliderContainer
      ref={containerRef}
      className={className}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* After Image (Background) */}
      <ImageContainer>
        <SliderImage
          src={afterImage}
          alt={afterLabel}
          draggable={false}
        />
      </ImageContainer>

      {/* Before Image (Clipped) */}
      <ClippedImageContainer $position={sliderPosition}>
        <SliderImage
          src={beforeImage}
          alt={beforeLabel}
          draggable={false}
        />
      </ClippedImageContainer>

      {/* Slider Handle */}
      <SliderHandle $position={sliderPosition}>
        {/* Handle Grip */}
        <HandleGrip $isDragging={isDragging}>
          <GripIcon>
            <GripVertical className="h-5 w-5" />
          </GripIcon>
        </HandleGrip>
      </SliderHandle>

      {/* Date Labels - Follow slider position */}
      {/* Before label - left side of slider */}
      <LabelContainer
        $position={sliderPosition}
        $side="before"
        $visible={sliderPosition > 10}
      >
        <LabelBadge $variant="before">{beforeLabel}</LabelBadge>
      </LabelContainer>

      {/* After label - right side of slider */}
      <LabelContainer
        $position={sliderPosition}
        $side="after"
        $visible={sliderPosition < 90}
      >
        <LabelBadge $variant="after">{afterLabel}</LabelBadge>
      </LabelContainer>
    </SliderContainer>
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
    <SideBySideContainer className={className}>
      <SideBySideImage>
        <SideBySideImg src={beforeImage} alt={beforeLabel} />
        <SideBySideLabel>{beforeLabel}</SideBySideLabel>
      </SideBySideImage>
      <SideBySideImage>
        <SideBySideImg src={afterImage} alt={afterLabel} />
        <SideBySideLabel>{afterLabel}</SideBySideLabel>
      </SideBySideImage>
    </SideBySideContainer>
  );
}
