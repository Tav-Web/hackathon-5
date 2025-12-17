"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { GeoJSONFeatureCollection } from "@/lib/api";
import "leaflet/dist/leaflet.css";

// Fix for Leaflet default marker icons
import L from "leaflet";

// Corrigir ícones do Leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapViewProps {
  changes?: GeoJSONFeatureCollection | null;
  center?: [number, number];
  zoom?: number;
}

// Componente para atualizar o centro do mapa
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

// Cores por tipo de mudança
const changeTypeColors: Record<string, string> = {
  construction: "#ef4444", // vermelho
  demolition: "#f97316", // laranja
  deforestation: "#dc2626", // vermelho escuro
  vegetation_growth: "#22c55e", // verde
  soil_movement: "#a16207", // marrom
  debris: "#6b7280", // cinza
  urban_expansion: "#8b5cf6", // roxo
  unknown: "#3b82f6", // azul
};

function getFeatureStyle(feature: GeoJSON.Feature) {
  const type = feature.properties?.type || "unknown";
  return {
    color: changeTypeColors[type] || changeTypeColors.unknown,
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.4,
  };
}

export default function MapView({ changes, center = [-23.55, -46.63], zoom = 12 }: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <p className="text-gray-400">Carregando mapa...</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full"
      style={{ minHeight: "500px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} zoom={zoom} />

      {changes && changes.features.length > 0 && (
        <GeoJSON
          key={JSON.stringify(changes)}
          data={changes as GeoJSON.FeatureCollection}
          style={getFeatureStyle}
          onEachFeature={(feature, layer) => {
            const props = feature.properties;
            layer.bindPopup(`
              <div style="color: black;">
                <strong>Tipo:</strong> ${props?.type || "Desconhecido"}<br/>
                <strong>Área:</strong> ${props?.area?.toFixed(2) || 0} px²<br/>
                <strong>Confiança:</strong> ${((props?.confidence || 0) * 100).toFixed(1)}%
              </div>
            `);
          }}
        />
      )}
    </MapContainer>
  );
}
