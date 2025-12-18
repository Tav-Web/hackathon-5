"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  uploadImage,
  startAnalysis,
  getAnalysisStatus,
  getChanges,
  getChangesSummary,
  downloadSatelliteImages,
  getSatelliteDownloadStatus,
  analyzeSatelliteImages,
  GeoJSONFeatureCollection,
  ChangeSummary,
  Bounds,
  SatelliteChange,
  SatelliteSource,
} from "@/lib/api";

interface UploadedImage {
  id: string;
  filename: string;
  type: "before" | "after";
  date?: string;          // Actual capture date from satellite
  requestedDate?: string; // User-requested date
  satellite?: boolean;
  source?: SatelliteSource; // Which source this image came from
}

// Images stored by source for comparison feature
interface SourceImages {
  before?: UploadedImage;
  after?: UploadedImage;
  status: "idle" | "loading" | "loaded" | "error";
  error?: string;
}

interface AnalysisState {
  images: UploadedImage[];
  analysisId: string | null;
  status: "idle" | "uploading" | "downloading" | "analyzing" | "completed" | "error";
  progress: number;
  changes: GeoJSONFeatureCollection | null;
  summary: ChangeSummary | null;
  error: string | null;
  selectedBounds: Bounds | null;
  isSelectingBounds: boolean;
  selectedChangeType: string | null;
  // Multi-source comparison
  imagesBySource: Record<SatelliteSource, SourceImages>;
  activeComparisonSource: SatelliteSource;
  lastAnalysisDates: { before: string; after: string } | null;
}

interface AnalysisContextType extends AnalysisState {
  uploadImageFile: (file: File, type: "before" | "after") => Promise<void>;
  removeImage: (type: "before" | "after") => void;
  startDetection: (threshold?: number, minArea?: number) => Promise<void>;
  reset: () => void;
  setSelectedBounds: (bounds: Bounds | null) => void;
  setIsSelectingBounds: (selecting: boolean) => void;
  setSelectedChangeType: (type: string | null) => void;
  downloadSatellite: (dateBefore: string, dateAfter: string, source?: SatelliteSource) => Promise<void>;
  setImageFromSatellite: (id: string, filename: string, type: "before" | "after", date: string) => void;
  analyzeArea: (dateBefore: string, dateAfter: string, source?: SatelliteSource, threshold?: number, minArea?: number) => Promise<void>;
  // Multi-source comparison
  loadSourceImages: (source: SatelliteSource) => Promise<void>;
  setActiveComparisonSource: (source: SatelliteSource) => void;
  getImagesForSource: (source: SatelliteSource) => { before: UploadedImage | null; after: UploadedImage | null };
}

const initialSourceImages: SourceImages = { status: "idle" };

const initialState: AnalysisState = {
  images: [],
  analysisId: null,
  status: "idle",
  progress: 0,
  changes: null,
  summary: null,
  error: null,
  selectedBounds: null,
  isSelectingBounds: false,
  selectedChangeType: null,
  // Multi-source comparison
  imagesBySource: {
    earth_engine: { ...initialSourceImages },
    sentinel: { ...initialSourceImages },
    planet: { ...initialSourceImages },
  },
  activeComparisonSource: "earth_engine",
  lastAnalysisDates: null,
};

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AnalysisState>(initialState);

  const uploadImageFile = useCallback(async (file: File, type: "before" | "after") => {
    setState((prev) => ({ ...prev, status: "uploading", error: null }));
    try {
      const result = await uploadImage(file);
      setState((prev) => ({
        ...prev,
        status: "idle",
        images: [
          ...prev.images.filter((img) => img.type !== type),
          { id: String(result.id), filename: result.filename, type },
        ],
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : "Erro ao fazer upload",
      }));
      throw err;
    }
  }, []);

  const setImageFromSatellite = useCallback(
    (id: string, filename: string, type: "before" | "after", date: string) => {
      setState((prev) => ({
        ...prev,
        images: [
          ...prev.images.filter((img) => img.type !== type),
          { id, filename, type, date, satellite: true },
        ],
      }));
    },
    []
  );

  const removeImage = useCallback((type: "before" | "after") => {
    setState((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.type !== type),
    }));
  }, []);

  const setSelectedBounds = useCallback((bounds: Bounds | null) => {
    setState((prev) => ({ ...prev, selectedBounds: bounds }));
  }, []);

  const setIsSelectingBounds = useCallback((selecting: boolean) => {
    setState((prev) => ({ ...prev, isSelectingBounds: selecting }));
  }, []);

  const setSelectedChangeType = useCallback((type: string | null) => {
    setState((prev) => ({ ...prev, selectedChangeType: type }));
  }, []);

  const downloadSatellite = useCallback(
    async (dateBefore: string, dateAfter: string, source: SatelliteSource = "sentinel") => {
      if (!state.selectedBounds) {
        throw new Error("Selecione uma área no mapa primeiro");
      }

      setState((prev) => ({ ...prev, status: "downloading", progress: 0, error: null }));

      try {
        // Iniciar download
        const task = await downloadSatelliteImages({
          bounds: state.selectedBounds,
          date_before: dateBefore,
          date_after: dateAfter,
          date_range_days: 30,
          source,
        });

        setState((prev) => ({ ...prev, progress: 10 }));

        // Polling para verificar status
        let attempts = 0;
        const maxAttempts = 300; // 300 * 200ms = 60s timeout

        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 200)); // Poll every 200ms
          const status = await getSatelliteDownloadStatus(task.task_id);

          setState((prev) => ({
            ...prev,
            progress: status.status === "downloading" ? 50 : prev.progress,
          }));

          if (status.status === "completed") {
            if (status.before_id && status.after_id) {
              setState((prev) => ({
                ...prev,
                status: "idle",
                progress: 100,
                images: [
                  {
                    id: status.before_id!,
                    filename: `sentinel2_${status.before_date}_before.tif`,
                    type: "before",
                    date: status.before_date,
                    requestedDate: dateBefore,
                    satellite: true,
                  },
                  {
                    id: status.after_id!,
                    filename: `sentinel2_${status.after_date}_after.tif`,
                    type: "after",
                    date: status.after_date,
                    requestedDate: dateAfter,
                    satellite: true,
                  },
                ],
              }));
            }
            return;
          }

          if (status.status === "failed") {
            throw new Error(status.message || "Falha no download");
          }

          attempts++;
        }

        throw new Error("Timeout: download demorou muito");
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Erro no download",
        }));
        throw err;
      }
    },
    [state.selectedBounds]
  );

  const startDetection = useCallback(
    async (threshold = 0.15, minArea = 100) => {
      const beforeImage = state.images.find((img) => img.type === "before");
      const afterImage = state.images.find((img) => img.type === "after");

      if (!beforeImage || !afterImage) {
        throw new Error("Selecione ambas as imagens (antes e depois)");
      }

      setState((prev) => ({ ...prev, status: "analyzing", progress: 0, error: null }));

      try {
        // Check if images are from satellite (synchronous analysis)
        const isSatellite = beforeImage.satellite || afterImage.satellite;

        if (isSatellite) {
          // Use synchronous satellite analysis
          setState((prev) => ({ ...prev, progress: 30 }));

          const result = await analyzeSatelliteImages({
            image_before_id: beforeImage.id,
            image_after_id: afterImage.id,
            threshold,
            min_area: minArea,
          });

          // Convert changes array to GeoJSON FeatureCollection
          // Backend returns type, area, confidence at root level, need to map to properties
          const changesGeoJSON: GeoJSONFeatureCollection = {
            type: "FeatureCollection",
            features: result.changes.map((change: SatelliteChange) => ({
              type: "Feature" as const,
              id: change.id || String(Math.random()),
              properties: {
                type: change.type || "unknown",
                area: change.area || 0,
                confidence: change.confidence || 0,
                is_georeferenced: change.is_georeferenced,
                spectral: change.spectral,
              },
              geometry: change.geometry || { type: "Polygon", coordinates: [] },
            })),
          };

          // Create summary from results
          const summary: ChangeSummary = {
            analysis_id: 0,
            total_changes: result.total_changes,
            total_area: result.total_area_changed,
            by_type: {},
          };

          // Count by type - type is at root level in backend response
          result.changes.forEach((change: SatelliteChange) => {
            const type = change.type || "unknown";
            summary.by_type[type] = (summary.by_type[type] || 0) + 1;
          });

          setState((prev) => ({
            ...prev,
            analysisId: result.id,
            status: "completed",
            progress: 100,
            changes: changesGeoJSON,
            summary,
          }));
          return;
        }

        // Non-satellite: use async analysis with polling
        const analysis = await startAnalysis({
          image_before_id: beforeImage.id,
          image_after_id: afterImage.id,
          threshold,
          min_area: minArea,
        });

        setState((prev) => ({ ...prev, analysisId: analysis.id, progress: 10 }));

        // Polling para verificar status
        let attempts = 0;
        const maxAttempts = 60;

        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const statusResult = await getAnalysisStatus(analysis.id);

          setState((prev) => ({ ...prev, progress: statusResult.progress }));

          if (statusResult.status === "completed") {
            // Buscar resultados
            const [changesResult, summaryResult] = await Promise.all([
              getChanges(analysis.id),
              getChangesSummary(analysis.id),
            ]);

            setState((prev) => ({
              ...prev,
              status: "completed",
              progress: 100,
              changes: changesResult,
              summary: summaryResult,
            }));
            return;
          }

          if (statusResult.status === "failed") {
            throw new Error(statusResult.message || "Análise falhou");
          }

          attempts++;
        }

        throw new Error("Timeout: análise demorou muito");
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Erro na análise",
        }));
        throw err;
      }
    },
    [state.images]
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // Função unificada: baixa imagens de satélite e executa análise
  const analyzeArea = useCallback(
    async (dateBefore: string, dateAfter: string, source: SatelliteSource = "sentinel", threshold = 0.3, minArea = 100) => {
      if (!state.selectedBounds) {
        throw new Error("Selecione uma área no mapa primeiro");
      }

      // Etapa 1: Baixar imagens de satélite
      // Reset all sources to idle when starting new analysis (new dates)
      setState((prev) => ({
        ...prev,
        status: "downloading",
        progress: 0,
        error: null,
        changes: null,
        summary: null,
        // Reset imagesBySource for all sources so they reload with new dates
        imagesBySource: {
          earth_engine: { status: "idle" as const },
          sentinel: { status: "idle" as const },
          planet: { status: "idle" as const },
        },
      }));

      let beforeImageId: string | undefined;
      let afterImageId: string | undefined;

      try {
        // Iniciar download
        const task = await downloadSatelliteImages({
          bounds: state.selectedBounds,
          date_before: dateBefore,
          date_after: dateAfter,
          date_range_days: 30,
          source,
        });

        setState((prev) => ({ ...prev, progress: 5 }));

        // Polling para verificar status do download
        let attempts = 0;
        const maxDownloadAttempts = 300; // 300 * 200ms = 60s timeout

        while (attempts < maxDownloadAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 200)); // Poll every 200ms
          const downloadStatus = await getSatelliteDownloadStatus(task.task_id);

          // Atualizar progresso (0-40% para download)
          const downloadProgress = downloadStatus.status === "downloading" ? 20 : 5;
          setState((prev) => ({ ...prev, progress: downloadProgress }));

          if (downloadStatus.status === "completed") {
            if (downloadStatus.before_id && downloadStatus.after_id) {
              beforeImageId = downloadStatus.before_id;
              afterImageId = downloadStatus.after_id;

              const beforeImg: UploadedImage = {
                id: downloadStatus.before_id!,
                filename: `${source}_${downloadStatus.before_date}_before.tif`,
                type: "before",
                date: downloadStatus.before_date,
                requestedDate: dateBefore,
                satellite: true,
                source,
              };
              const afterImg: UploadedImage = {
                id: downloadStatus.after_id!,
                filename: `${source}_${downloadStatus.after_date}_after.tif`,
                type: "after",
                date: downloadStatus.after_date,
                requestedDate: dateAfter,
                satellite: true,
                source,
              };

              setState((prev) => ({
                ...prev,
                progress: 40,
                images: [beforeImg, afterImg],
                // Store by source for comparison feature
                imagesBySource: {
                  ...prev.imagesBySource,
                  [source]: {
                    before: beforeImg,
                    after: afterImg,
                    status: "loaded" as const,
                  },
                },
                activeComparisonSource: source,
                lastAnalysisDates: { before: dateBefore, after: dateAfter },
              }));
            }
            break;
          }

          if (downloadStatus.status === "failed") {
            throw new Error(downloadStatus.message || "Falha no download das imagens");
          }

          attempts++;
        }

        if (!beforeImageId || !afterImageId) {
          throw new Error("Não foi possível obter as imagens de satélite");
        }

        // Etapa 2: Executar análise de mudanças (síncrona para imagens de satélite)
        setState((prev) => ({ ...prev, status: "analyzing", progress: 45 }));

        const result = await analyzeSatelliteImages({
          image_before_id: beforeImageId,
          image_after_id: afterImageId,
          threshold,
          min_area: minArea,
        });

        setState((prev) => ({ ...prev, progress: 80 }));

        // Convert changes array to GeoJSON FeatureCollection
        // Backend returns type, area, confidence at root level, need to map to properties
        const changesGeoJSON: GeoJSONFeatureCollection = {
          type: "FeatureCollection",
          features: result.changes.map((change: SatelliteChange) => ({
            type: "Feature" as const,
            id: change.id || String(Math.random()),
            properties: {
              type: change.type || "unknown",
              area: change.area || 0,
              confidence: change.confidence || 0,
              is_georeferenced: change.is_georeferenced,
              spectral: change.spectral,
            },
            geometry: change.geometry || { type: "Polygon", coordinates: [] },
          })),
        };

        // Create summary from results
        const summary: ChangeSummary = {
          analysis_id: 0,
          total_changes: result.total_changes,
          total_area: result.total_area_changed,
          by_type: {},
        };

        // Count by type - type is at root level in backend response
        result.changes.forEach((change: SatelliteChange) => {
          const type = change.type || "unknown";
          summary.by_type[type] = (summary.by_type[type] || 0) + 1;
        });

        setState((prev) => ({
          ...prev,
          analysisId: result.id,
          status: "completed",
          progress: 100,
          changes: changesGeoJSON,
          summary,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Erro na análise",
        }));
        throw err;
      }
    },
    [state.selectedBounds]
  );

  // Lazy load images from a specific source (for comparison feature)
  const loadSourceImages = useCallback(
    async (source: SatelliteSource) => {
      // Check if already loaded or currently loading (allow retry on error)
      const currentStatus = state.imagesBySource[source].status;
      if (currentStatus === "loaded" || currentStatus === "loading") {
        return;
      }

      // Need bounds and dates from previous analysis
      if (!state.selectedBounds || !state.lastAnalysisDates) {
        throw new Error("Faça uma análise primeiro para comparar fontes");
      }

      const { before: dateBefore, after: dateAfter } = state.lastAnalysisDates;

      // Set loading state for this source
      setState((prev) => ({
        ...prev,
        imagesBySource: {
          ...prev.imagesBySource,
          [source]: { status: "loading" as const },
        },
      }));

      try {
        // Start download for this source
        const task = await downloadSatelliteImages({
          bounds: state.selectedBounds,
          date_before: dateBefore,
          date_after: dateAfter,
          date_range_days: 30,
          source,
        });

        // Polling for download status
        let attempts = 0;
        const maxAttempts = 300;

        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          const downloadStatus = await getSatelliteDownloadStatus(task.task_id);

          if (downloadStatus.status === "completed") {
            if (downloadStatus.before_id && downloadStatus.after_id) {
              const beforeImg: UploadedImage = {
                id: downloadStatus.before_id,
                filename: `${source}_${downloadStatus.before_date}_before.tif`,
                type: "before",
                date: downloadStatus.before_date,
                requestedDate: dateBefore,
                satellite: true,
                source,
              };
              const afterImg: UploadedImage = {
                id: downloadStatus.after_id,
                filename: `${source}_${downloadStatus.after_date}_after.tif`,
                type: "after",
                date: downloadStatus.after_date,
                requestedDate: dateAfter,
                satellite: true,
                source,
              };

              setState((prev) => ({
                ...prev,
                imagesBySource: {
                  ...prev.imagesBySource,
                  [source]: {
                    before: beforeImg,
                    after: afterImg,
                    status: "loaded" as const,
                  },
                },
              }));
              return;
            }
          }

          if (downloadStatus.status === "failed") {
            throw new Error(downloadStatus.message || `Falha ao carregar imagens de ${source}`);
          }

          attempts++;
        }

        throw new Error("Timeout: download demorou muito");
      } catch (err) {
        setState((prev) => ({
          ...prev,
          imagesBySource: {
            ...prev.imagesBySource,
            [source]: {
              status: "error" as const,
              error: err instanceof Error ? err.message : "Erro ao carregar",
            },
          },
        }));
        throw err;
      }
    },
    [state.selectedBounds, state.lastAnalysisDates, state.imagesBySource]
  );

  const setActiveComparisonSource = useCallback((source: SatelliteSource) => {
    setState((prev) => ({ ...prev, activeComparisonSource: source }));
  }, []);

  const getImagesForSource = useCallback(
    (source: SatelliteSource) => {
      const sourceData = state.imagesBySource[source];
      return {
        before: sourceData?.before || null,
        after: sourceData?.after || null,
      };
    },
    [state.imagesBySource]
  );

  return (
    <AnalysisContext.Provider
      value={{
        ...state,
        uploadImageFile,
        removeImage,
        startDetection,
        reset,
        setSelectedBounds,
        setIsSelectingBounds,
        setSelectedChangeType,
        downloadSatellite,
        setImageFromSatellite,
        analyzeArea,
        loadSourceImages,
        setActiveComparisonSource,
        getImagesForSource,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
