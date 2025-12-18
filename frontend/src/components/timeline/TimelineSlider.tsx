"use client";

import { useState } from "react";
import { Clock, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import {
  TimelineEmptyContainer,
  TimelineHeader,
  TimelineHeaderText,
  TimelineEmptyText,
  TimelineContentContainer,
  TimelineHeaderRow,
  TimelineHeaderLeft,
  TimelineHeaderTitle,
  TimelinePercentage,
  LabelsRow,
  TimelineLabel,
  SliderWrapper,
  SliderInput,
  ControlsRow,
  ControlButton,
  PlayButton,
  LegendRow,
  LegendItem,
  LegendColor,
  LegendText,
  LegendDivider,
} from "./styles";

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
      <TimelineEmptyContainer>
        <TimelineHeader>
          <Clock className="h-4 w-4" />
          <TimelineHeaderText>Timeline</TimelineHeaderText>
        </TimelineHeader>
        <TimelineEmptyText>
          Faça upload das imagens para usar o slider de comparação
        </TimelineEmptyText>
      </TimelineEmptyContainer>
    );
  }

  return (
    <TimelineContentContainer>
      <TimelineHeaderRow>
        <TimelineHeaderLeft>
          <Clock className="h-4 w-4" />
          <TimelineHeaderTitle>Comparar Imagens</TimelineHeaderTitle>
        </TimelineHeaderLeft>
        <TimelinePercentage>{position}%</TimelinePercentage>
      </TimelineHeaderRow>

      {/* Labels */}
      <LabelsRow>
        <TimelineLabel $active={position < 30} $color="#60a5fa">
          {beforeLabel}
        </TimelineLabel>
        <TimelineLabel $active={position > 70} $color="#22c55e">
          {afterLabel}
        </TimelineLabel>
      </LabelsRow>

      {/* Slider */}
      <SliderWrapper>
        <SliderInput
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={handleSliderChange}
          $position={position}
        />
      </SliderWrapper>

      {/* Controls */}
      <ControlsRow>
        <ControlButton onClick={goToStart} title="Ir para Antes">
          <ChevronLeft className="h-4 w-4" />
        </ControlButton>
        <PlayButton onClick={handlePlayPause} title={isPlaying ? "Pausar" : "Reproduzir"}>
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </PlayButton>
        <ControlButton onClick={goToEnd} title="Ir para Depois">
          <ChevronRight className="h-4 w-4" />
        </ControlButton>
      </ControlsRow>

      {/* Visual indicator */}
      <LegendRow>
        <LegendItem>
          <LegendColor $color="#3b82f6" />
          <LegendText>{beforeLabel}</LegendText>
        </LegendItem>
        <LegendDivider />
        <LegendItem>
          <LegendColor $color="#22c55e" />
          <LegendText>{afterLabel}</LegendText>
        </LegendItem>
      </LegendRow>
    </TimelineContentContainer>
  );
}
