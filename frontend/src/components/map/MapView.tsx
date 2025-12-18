"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Search, X, MapPin, Loader2 } from "lucide-react";
import type { GeoJSONFeatureCollection, Bounds } from "@/lib/api";
import "leaflet/dist/leaflet.css";

// Styled components
import {
  MapContainer,
  LeafletContainer,
  SearchContainer,
  SearchInnerContainer,
  SearchInputWrapper,
  SearchInput,
  SearchIconWrapper,
  ClearButton,
  SearchResultsDropdown,
  SearchResultItem,
  ResultIcon,
  ResultContent,
  ResultName,
  ResultMeta,
  ResultBadge,
  ResultDetail,
  NoResultsMessage,
  NoResultsText,
  SearchHint,
  ClickOutsideOverlay,
  LoadingOverlay,
  LoadingCard,
  LoadingSpinner,
  LoadingText,
  LegendContainer,
  LegendCard,
  LegendTitle,
  LegendItems,
  LegendItem,
  LegendCheckbox,
  LegendColor,
  LegendLabel,
} from "./styles";

// Geocoding result type from Photon API (Komoot)
interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lon, lat]
    type: string;
  };
  type: string;
  properties: {
    osm_id: number;
    osm_type: string;
    osm_key: string;
    osm_value: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    locality?: string;
    county?: string;
    state?: string;
    country?: string;
    extent?: [number, number, number, number]; // [minLon, maxLat, maxLon, minLat]
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
  type: string;
}

interface MapViewProps {
  changes?: GeoJSONFeatureCollection | null;
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  isSelectingBounds?: boolean;
  selectedBounds?: Bounds | null;
  onBoundsSelected?: (bounds: Bounds) => void;
  isLoading?: boolean;
  selectedChangeType?: string | null;
}

// Cores por tipo de mudança
const changeTypeColors: Record<string, string> = {
  construction: "#ef4444", // vermelho
  demolition: "#f97316", // laranja
  deforestation: "#dc2626", // vermelho escuro
  vegetation_growth: "#22c55e", // verde
  vegetation_loss: "#dc2626", // vermelho escuro
  soil_movement: "#a16207", // marrom
  debris: "#6b7280", // cinza
  urban_expansion: "#8b5cf6", // roxo
  water_change: "#3b82f6", // azul
  unknown: "#3b82f6", // azul
};

// Labels traduzidos para legenda
const changeTypeLabels: Record<string, string> = {
  vegetation_growth: "Crescimento de Vegetação",
  vegetation_loss: "Perda de Vegetação",
  deforestation: "Desmatamento",
  urban_expansion: "Expansão Urbana",
  construction: "Construção",
  demolition: "Demolição",
  soil_movement: "Movimentação de Solo",
  water_change: "Alteração Hídrica",
  debris: "Entulho",
  unknown: "Não Classificado",
};

export default function MapView({
  changes,
  center = [-15.68857, -56.0339319],
  zoom = 15,
  minZoom = 3,
  maxZoom = 18,
  isSelectingBounds = false,
  selectedBounds,
  onBoundsSelected,
  isLoading = false,
  selectedChangeType = null,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionRectRef = useRef<L.Rectangle | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(Object.keys(changeTypeColors)));
  const [mapReady, setMapReady] = useState(false);

  // Location search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PhotonFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Geocoding search function using Photon API (Komoot) - fast and free
  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Photon API - prioritize Brazil with bias coordinates (center of Brazil)
      // Note: lang only supports: default, en, de, fr (not pt)
      const response = await fetch(
        `https://photon.komoot.io/api/?` +
        `q=${encodeURIComponent(query)}&` +
        `limit=7&` +
        `lat=-14.235&lon=-51.925` // Brazil center bias
      );

      if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);

      const data: PhotonResponse = await response.json();

      // Sort results: Brazil first, then by relevance
      const sortedResults = data.features.sort((a, b) => {
        const aIsBrazil = a.properties.country === "Brazil" || a.properties.country === "Brasil";
        const bIsBrazil = b.properties.country === "Brazil" || b.properties.country === "Brasil";
        if (aIsBrazil && !bIsBrazil) return -1;
        if (!aIsBrazil && bIsBrazil) return 1;
        return 0;
      });

      setSearchResults(sortedResults);
    } catch (error) {
      console.error("Geocoding error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    setShowResults(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocation(value);
      }, 300); // Faster debounce - Photon is quick
    } else {
      setSearchResults([]);
    }
  }, [searchLocation]);

  // Handle location selection
  const handleSelectLocation = useCallback((result: PhotonFeature) => {
    const [lon, lat] = result.geometry.coordinates;

    if (mapRef.current) {
      // If has extent (bounding box), fit to it
      if (result.properties.extent) {
        const [minLon, maxLat, maxLon, minLat] = result.properties.extent;
        const bounds = leafletRef.current.latLngBounds(
          [minLat, minLon],
          [maxLat, maxLon]
        );
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } else {
        // Otherwise, just center on the point with appropriate zoom
        const zoomLevel = getZoomForType(result);
        mapRef.current.setView([lat, lon], zoomLevel);
      }
    }

    // Format display name for input
    const shortName = formatLocationName(result);
    setSearchQuery(shortName);
    setShowResults(false);
    setSearchResults([]);
  }, []);

  // Get appropriate zoom level based on location type
  const getZoomForType = (result: PhotonFeature): number => {
    const { osm_key, osm_value } = result.properties;
    if (osm_key === "place") {
      if (osm_value === "country") return 5;
      if (osm_value === "state") return 7;
      if (osm_value === "city" || osm_value === "town") return 12;
      if (osm_value === "village" || osm_value === "suburb") return 14;
      if (osm_value === "neighbourhood") return 15;
    }
    if (osm_key === "highway" || osm_key === "building") return 17;
    if (osm_key === "boundary" && osm_value === "postal_code") return 14;
    return 15;
  };

  // Format location name for display
  const formatLocationName = (result: PhotonFeature): string => {
    const p = result.properties;
    const parts: string[] = [];

    // Build name from most specific to least specific
    if (p.name) parts.push(p.name);
    if (p.street) {
      const streetPart = p.housenumber ? `${p.street}, ${p.housenumber}` : p.street;
      if (!parts.includes(streetPart)) parts.push(streetPart);
    }
    if (p.district && !parts.includes(p.district)) parts.push(p.district);
    if (p.city && !parts.includes(p.city)) parts.push(p.city);
    if (p.state && !parts.includes(p.state)) parts.push(p.state);

    return parts.slice(0, 3).join(", ") || p.name || "Local desconhecido";
  };

  // Get location type label in Portuguese
  const getLocationType = (result: PhotonFeature): string => {
    const { osm_key, osm_value, postcode } = result.properties;

    // CEP / Postal code
    if (postcode && (osm_key === "boundary" || osm_value === "postal_code")) return "CEP";
    if (osm_key === "place") {
      if (osm_value === "city" || osm_value === "town") return "Cidade";
      if (osm_value === "village") return "Vila";
      if (osm_value === "state") return "Estado";
      if (osm_value === "country") return "País";
      if (osm_value === "suburb" || osm_value === "neighbourhood") return "Bairro";
      if (osm_value === "locality") return "Localidade";
    }
    if (osm_key === "highway") return "Rua";
    if (osm_key === "building") return "Edifício";
    if (osm_key === "amenity") return "Local";
    if (osm_key === "natural") return "Natural";
    if (osm_key === "landuse") return "Área";
    return "Local";
  };

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    searchInputRef.current?.focus();
  }, []);

  // Get unique change types from current changes
  const detectedTypes = changes?.features
    ? [...new Set(changes.features.map(f => f.properties?.type || "unknown"))]
    : [];

  // Toggle visibility of a change type
  const toggleChangeType = (type: string) => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

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
        const map = L.map(containerRef.current, {
          minZoom,
          maxZoom,
          zoomControl: true,
        }).setView(center, Math.min(zoom, maxZoom));

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
        setMapReady(true);
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, []);

  // Não atualizar view automaticamente - deixar o usuário controlar o mapa
  // A view inicial é definida no initMap

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

  // Mostrar bounds selecionados (sem forçar centralização)
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;

    const L = leafletRef.current;
    const map = mapRef.current;

    // Remover retângulo anterior
    if (selectionRectRef.current) {
      map.removeLayer(selectionRectRef.current);
      selectionRectRef.current = null;
    }

    // Se não há bounds selecionados, apenas limpar
    if (!selectedBounds) return;

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

    // NÃO centralizar automaticamente - deixar o usuário mover o mapa livremente
  }, [selectedBounds, mapReady]);

  // Atualizar GeoJSON quando changes ou visibleTypes mudar
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

    // Filter features by visible types and selectedChangeType
    const filteredChanges = {
      ...changes,
      features: changes.features.filter(f => {
        const type = f.properties?.type || "unknown";
        const isVisible = visibleTypes.has(type);
        const isSelected = !selectedChangeType || type === selectedChangeType;
        return isVisible && isSelected;
      }),
    };

    if (filteredChanges.features.length === 0) return;

    geoJsonLayerRef.current = L.geoJSON(filteredChanges, {
      style: (feature?: GeoJSON.Feature) => {
        const type = feature?.properties?.type || "unknown";
        const isHighlighted = selectedChangeType === type;
        return {
          color: changeTypeColors[type] || changeTypeColors.unknown,
          weight: isHighlighted ? 3 : 2,
          opacity: isHighlighted ? 1 : 0.8,
          fillOpacity: isHighlighted ? 0.6 : 0.4,
        };
      },
      onEachFeature: (feature: GeoJSON.Feature, layer: L.Layer) => {
        const props = feature.properties;
        const areaUnit = props?.is_georeferenced ? "m²" : "px²";
        const typeLabel = changeTypeLabels[props?.type] || props?.type || "Desconhecido";
        (layer as L.GeoJSON).bindPopup(`
          <div style="color: black;">
            <strong>Tipo:</strong> ${typeLabel}<br/>
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
  }, [changes, visibleTypes, selectedChangeType, mapReady]);

  return (
    <MapContainer>
      {/* Mapa */}
      <LeafletContainer ref={containerRef} data-map-container />

      {/* Search Input - Positioned to not cover zoom controls */}
      <SearchContainer>
        <SearchInnerContainer>
          <SearchInputWrapper elevation={0}>
            <SearchIconWrapper>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </SearchIconWrapper>
            <SearchInput
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="Buscar cidade, bairro, CEP..."
            />
            {searchQuery && (
              <ClearButton onClick={clearSearch} size="small">
                <X className="h-4 w-4" />
              </ClearButton>
            )}
          </SearchInputWrapper>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <SearchResultsDropdown elevation={0}>
              {searchResults.map((result, index) => (
                <SearchResultItem
                  key={`${result.properties.osm_id}-${index}`}
                  onClick={() => handleSelectLocation(result)}
                >
                  <ResultIcon>
                    <MapPin className="h-4 w-4" />
                  </ResultIcon>
                  <ResultContent>
                    <ResultName variant="body2">
                      {formatLocationName(result)}
                    </ResultName>
                    <ResultMeta>
                      <ResultBadge>{getLocationType(result)}</ResultBadge>
                      {result.properties.postcode && (
                        <ResultDetail variant="caption">
                          CEP: {result.properties.postcode}
                        </ResultDetail>
                      )}
                      {result.properties.country && (
                        <ResultDetail variant="caption" sx={{ color: "#52525b" }}>
                          {result.properties.country}
                        </ResultDetail>
                      )}
                    </ResultMeta>
                  </ResultContent>
                </SearchResultItem>
              ))}
            </SearchResultsDropdown>
          )}

          {/* No results message */}
          {showResults && searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
            <NoResultsMessage elevation={0}>
              <NoResultsText>Nenhum resultado encontrado</NoResultsText>
            </NoResultsMessage>
          )}
        </SearchInnerContainer>

        {/* Search hint */}
        {!searchQuery && (
          <SearchHint>Ex: São Paulo, 01310-100, Copacabana</SearchHint>
        )}
      </SearchContainer>

      {/* Click outside to close results */}
      {showResults && <ClickOutsideOverlay onClick={() => setShowResults(false)} />}

      {/* Loading Overlay */}
      {isLoading && (
        <LoadingOverlay>
          <LoadingCard elevation={0}>
            <LoadingSpinner />
            <LoadingText>Processando análise...</LoadingText>
          </LoadingCard>
        </LoadingOverlay>
      )}

      {/* Legenda - só mostra quando há mudanças detectadas */}
      {detectedTypes.length > 0 && (
        <LegendContainer>
          <LegendCard elevation={0}>
            <LegendTitle>Tipos de Mudança</LegendTitle>
            <LegendItems>
              {detectedTypes.map((type) => (
                <LegendItem key={type} onClick={() => toggleChangeType(type)}>
                  <LegendCheckbox
                    checked={visibleTypes.has(type)}
                    onChange={() => toggleChangeType(type)}
                  />
                  <LegendColor
                    $color={changeTypeColors[type]}
                    $visible={visibleTypes.has(type)}
                  />
                  <LegendLabel $visible={visibleTypes.has(type)}>
                    {changeTypeLabels[type] || type}
                  </LegendLabel>
                </LegendItem>
              ))}
            </LegendItems>
          </LegendCard>
        </LegendContainer>
      )}
    </MapContainer>
  );
}
