"use client";

import { useState } from "react";
import { HomeView } from "@/views/Home";
import { EarthIntro } from "@/components/intro/EarthIntro";

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  return (
    <>
      {showIntro && <EarthIntro onComplete={handleIntroComplete} />}
      {!showIntro && <HomeView />}
    </>
  );
}
