"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ImageUpload, type UploadedImage } from "@/components/upload/ImageUpload";
import { AnalysisPanel } from "@/components/results/AnalysisPanel";
import { TimelineSlider } from "@/components/timeline/TimelineSlider";
import type { GeoJSONFeatureCollection } from "@/lib/api";

// Load map dynamically (SSR disabled for Leaflet)
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <p className="text-gray-400">Carregando mapa...</p>
    </div>
  ),
});

export default function Home() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [changes, setChanges] = useState<GeoJSONFeatureCollection | null>(null);

  const beforeImage = images.find((img) => img.type === "before");
  const afterImage = images.find((img) => img.type === "after");

  const handleImagesChange = (newImages: UploadedImage[]) => {
    setImages(newImages);
    // Clear previous analysis when images change
    setChanges(null);
  };

  const handleAnalysisComplete = (result: GeoJSONFeatureCollection) => {
    setChanges(result);
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-950">
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
            <ImageUpload onImagesChange={handleImagesChange} />

            <TimelineSlider
              beforeImage={beforeImage?.filename}
              afterImage={afterImage?.filename}
              beforeLabel="Antes"
              afterLabel="Depois"
            />

            <AnalysisPanel
              beforeImageId={beforeImage?.id}
              afterImageId={afterImage?.id}
              onAnalysisComplete={handleAnalysisComplete}
            />
          </div>
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          <MapView changes={changes} />

          {/* Legend overlay */}
          {changes && changes.features.length > 0 && (
            <div className="absolute bottom-4 right-4 bg-gray-900/90 rounded-lg p-3 text-sm">
              <p className="text-gray-300 font-medium mb-2">Legenda</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span className="text-gray-400">Construção</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-600" />
                  <span className="text-gray-400">Desmatamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span className="text-gray-400">Vegetação</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-500" />
                  <span className="text-gray-400">Entulho</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span className="text-gray-400">Desconhecido</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
