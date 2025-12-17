"use client";

import { useEffect, useState, useRef } from "react";
import type { GeoJSONFeatureCollection } from "@/lib/api";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  changes?: GeoJSONFeatureCollection | null;
  center?: [number, number];
  zoom?: number;
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

export default function MapView({ changes, center = [-23.55, -46.63], zoom = 12 }: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    // Dynamically import Leaflet only on client
    import("leaflet").then((L) => {
      // Clean up existing map if any
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Fix for Leaflet default marker icons
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      // Create map
      const map = L.map(containerRef.current!).setView(center, zoom);
      mapRef.current = map;

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      setMounted(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update center and zoom
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Add GeoJSON layer for changes
  useEffect(() => {
    if (!mapRef.current || !changes || changes.features.length === 0) return;

    import("leaflet").then((L) => {
      const map = mapRef.current!;

      // Remove existing GeoJSON layers
      map.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) {
          map.removeLayer(layer);
        }
      });

      // Add new GeoJSON layer
      const geoJsonLayer = L.geoJSON(changes as GeoJSON.FeatureCollection, {
        style: (feature) => {
          const type = feature?.properties?.type || "unknown";
          return {
            color: changeTypeColors[type] || changeTypeColors.unknown,
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.4,
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          layer.bindPopup(`
            <div style="color: black;">
              <strong>Tipo:</strong> ${props?.type || "Desconhecido"}<br/>
              <strong>Área:</strong> ${props?.area?.toFixed(2) || 0} px²<br/>
              <strong>Confiança:</strong> ${((props?.confidence || 0) * 100).toFixed(1)}%
            </div>
          `);
        },
      }).addTo(map);

      // Fit bounds to GeoJSON
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds);
      }
    });
  }, [changes]);

  return (
    <div className="w-full h-full relative">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: "500px" }}
      />
      {!mounted && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <p className="text-gray-400">Carregando mapa...</p>
        </div>
      )}
    </div>
  );
}
