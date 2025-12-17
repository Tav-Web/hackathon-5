"use client";

import { useEffect, useRef } from "react";
import type { GeoJSONFeatureCollection, Bounds } from "@/lib/api";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  changes?: GeoJSONFeatureCollection | null;
  center?: [number, number];
  zoom?: number;
  isSelectingBounds?: boolean;
  selectedBounds?: Bounds | null;
  onBoundsSelected?: (bounds: Bounds) => void;
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

export default function MapView({
  changes,
  center = [-15.5721297, -56.0574885],
  zoom = 20,
  isSelectingBounds = false,
  selectedBounds,
  onBoundsSelected,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionRectRef = useRef<L.Rectangle | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    // Se o mapa já foi inicializado, apenas atualizar a view
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
      return;
    }

    // Importar Leaflet dinamicamente
    const initMap = async () => {
      const leaflet = await import("leaflet");
      const L = leaflet.default;
      leafletRef.current = L;

      // Corrigir ícones do Leaflet
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      // Verificar se o container já tem um mapa
      if (containerRef.current && !mapRef.current) {
        const map = L.map(containerRef.current).setView(center, zoom);

        // Adicionar tile layer de satélite do ESRI para melhor visualização
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "Tiles &copy; Esri",
          }
        ).addTo(map);

        // Adicionar layer de rótulos
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "",
          }
        ).addTo(map);

        mapRef.current = map;
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Atualizar view quando center/zoom mudar
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Gerenciar seleção de bounds
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;

    const map = mapRef.current;
    const L = leafletRef.current;

    if (isSelectingBounds) {
      // Habilitar modo de seleção
      map.dragging.disable();
      map.getContainer().style.cursor = "crosshair";

      let startLatLng: L.LatLng | null = null;
      let tempRect: L.Rectangle | null = null;

      const onMouseDown = (e: L.LeafletMouseEvent) => {
        startLatLng = e.latlng;
        if (tempRect) {
          map.removeLayer(tempRect);
        }
      };

      const onMouseMove = (e: L.LeafletMouseEvent) => {
        if (!startLatLng) return;

        const bounds = L.latLngBounds(startLatLng, e.latlng);

        if (tempRect) {
          tempRect.setBounds(bounds);
        } else {
          tempRect = L.rectangle(bounds, {
            color: "#3b82f6",
            weight: 2,
            fillOpacity: 0.2,
          }).addTo(map);
        }
      };

      const onMouseUp = (e: L.LeafletMouseEvent) => {
        if (!startLatLng) return;

        const bounds = L.latLngBounds(startLatLng, e.latlng);
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        if (onBoundsSelected) {
          onBoundsSelected({
            min_lon: sw.lng,
            min_lat: sw.lat,
            max_lon: ne.lng,
            max_lat: ne.lat,
          });
        }

        // Atualizar o retângulo de seleção permanente
        if (selectionRectRef.current) {
          map.removeLayer(selectionRectRef.current);
        }
        selectionRectRef.current = L.rectangle(bounds, {
          color: "#22c55e",
          weight: 2,
          fillOpacity: 0.1,
          dashArray: "5, 5",
        }).addTo(map);

        // Limpar
        if (tempRect) {
          map.removeLayer(tempRect);
          tempRect = null;
        }
        startLatLng = null;

        // Restaurar mapa
        map.dragging.enable();
        map.getContainer().style.cursor = "";
      };

      map.on("mousedown", onMouseDown);
      map.on("mousemove", onMouseMove);
      map.on("mouseup", onMouseUp);

      return () => {
        map.off("mousedown", onMouseDown);
        map.off("mousemove", onMouseMove);
        map.off("mouseup", onMouseUp);
        map.dragging.enable();
        map.getContainer().style.cursor = "";
        if (tempRect) {
          map.removeLayer(tempRect);
        }
      };
    } else {
      map.dragging.enable();
      map.getContainer().style.cursor = "";
    }
  }, [isSelectingBounds, onBoundsSelected]);

  // Mostrar bounds selecionados
  useEffect(() => {
    if (!mapRef.current || !selectedBounds || !leafletRef.current) return;

    const L = leafletRef.current;
    const map = mapRef.current;

    // Remover retângulo anterior
    if (selectionRectRef.current) {
      map.removeLayer(selectionRectRef.current);
    }

    // Criar novo retângulo
    const bounds = L.latLngBounds(
      [selectedBounds.min_lat, selectedBounds.min_lon],
      [selectedBounds.max_lat, selectedBounds.max_lon]
    );

    selectionRectRef.current = L.rectangle(bounds, {
      color: "#22c55e",
      weight: 2,
      fillOpacity: 0.1,
      dashArray: "5, 5",
    }).addTo(map);

    // Centralizar no bounds
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [selectedBounds]);

  // Atualizar GeoJSON quando changes mudar
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;

    const L = leafletRef.current;
    const map = mapRef.current;

    // Remover layer anterior
    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }

    if (!changes || changes.features.length === 0) return;

    geoJsonLayerRef.current = L.geoJSON(changes, {
      style: (feature?: GeoJSON.Feature) => {
        const type = feature?.properties?.type || "unknown";
        return {
          color: changeTypeColors[type] || changeTypeColors.unknown,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4,
        };
      },
      onEachFeature: (feature: GeoJSON.Feature, layer: L.Layer) => {
        const props = feature.properties;
        const areaUnit = props?.is_georeferenced ? "m²" : "px²";
        (layer as L.GeoJSON).bindPopup(`
          <div style="color: black;">
            <strong>Tipo:</strong> ${props?.type || "Desconhecido"}<br/>
            <strong>Área:</strong> ${
              props?.area?.toFixed(2) || 0
            } ${areaUnit}<br/>
            <strong>Confiança:</strong> ${(
              (props?.confidence || 0) * 100
            ).toFixed(1)}%
          </div>
        `);
      },
    }).addTo(map);

    // Ajustar view para mostrar todas as mudanças
    if (geoJsonLayerRef.current) {
      const bounds = geoJsonLayerRef.current.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [changes]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: "500px" }}
    />
  );
}
