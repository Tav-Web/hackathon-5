"use client";

import { MorphingIntro } from "./MorphingIntro";

interface EarthIntroProps {
  onComplete: () => void;
}

export function EarthIntro({ onComplete }: EarthIntroProps) {
  return <MorphingIntro onComplete={onComplete} />;
}
