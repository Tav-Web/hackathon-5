"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ImageUpload } from "@/components/upload/ImageUpload";
import { AnalysisPanel } from "@/components/results/AnalysisPanel";
import { SatellitePanel } from "@/components/satellite/SatellitePanel";
import { useAnalysis } from "@/context/AnalysisContext";

// Carregar mapa dinamicamente (SSR disabled para Leaflet)
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <p className="text-gray-400">Carregando mapa...</p>
    </div>
  ),
});

type Tab = "satellite" | "upload";

export default function Home() {
  const { changes, selectedBounds, isSelectingBounds, setSelectedBounds, setIsSelectingBounds } =
    useAnalysis();
  const [activeTab, setActiveTab] = useState<Tab>("satellite");

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            Detector de Mudanças em Imagens de Satélite
          </h1>
          <span className="text-sm text-gray-400">TAV Hack 2025</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-96 bg-gray-900 border-r border-gray-800 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveTab("satellite")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "satellite"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Satélite
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "upload"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Upload Manual
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {activeTab === "satellite" ? <SatellitePanel /> : <ImageUpload />}
              <AnalysisPanel />
            </div>
          </div>
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          <MapView
            changes={changes}
            isSelectingBounds={isSelectingBounds}
            selectedBounds={selectedBounds}
            onBoundsSelected={(bounds) => {
              setSelectedBounds(bounds);
              setIsSelectingBounds(false);
            }}
          />

          {/* Instrução de seleção */}
          {isSelectingBounds && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-[1000]">
              Clique e arraste para selecionar a área de análise
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
