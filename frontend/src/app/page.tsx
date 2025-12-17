"use client";

import dynamic from "next/dynamic";
import { ImageUpload } from "@/components/upload/ImageUpload";
import { AnalysisPanel } from "@/components/results/AnalysisPanel";

// Carregar mapa dinamicamente (SSR disabled para Leaflet)
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <p className="text-gray-400">Carregando mapa...</p>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            Detector de Mudanças em Imagens de Satélite
          </h1>
          <span className="text-sm text-gray-400">Hackathon 5</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-80 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto">
          <div className="space-y-6">
            <ImageUpload />
            <AnalysisPanel />
          </div>
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          <MapView />
        </div>
      </div>
    </main>
  );
}
