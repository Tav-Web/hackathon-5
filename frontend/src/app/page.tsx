"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { HomeView } from "@/views/Home";

// Dynamic import with ssr: false to prevent hydration mismatch
const EarthIntro = dynamic(
  () => import("@/components/intro/EarthIntro").then((mod) => mod.EarthIntro),
  { ssr: false }
);

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Only render intro after client mount to avoid hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  // Server renders nothing, client renders after mount
  if (!isMounted) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "radial-gradient(ellipse at center, #0a0a1a 0%, #000005 100%)",
          zIndex: 9999,
        }}
      />
    );
  }

  return (
    <>
      {showIntro && <EarthIntro onComplete={handleIntroComplete} />}
      {!showIntro && <HomeView />}
    </>
  );
}
