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
  GeoJSONFeatureCollection,
  ChangeSummary,
  Bounds,
} from "@/lib/api";

interface UploadedImage {
  id: string;
  filename: string;
  type: "before" | "after";
  date?: string;
  satellite?: boolean;
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
}

interface AnalysisContextType extends AnalysisState {
  uploadImageFile: (file: File, type: "before" | "after") => Promise<void>;
  removeImage: (type: "before" | "after") => void;
  startDetection: (threshold?: number, minArea?: number) => Promise<void>;
  reset: () => void;
  setSelectedBounds: (bounds: Bounds | null) => void;
  setIsSelectingBounds: (selecting: boolean) => void;
  downloadSatellite: (dateBefore: string, dateAfter: string) => Promise<void>;
  setImageFromSatellite: (id: string, filename: string, type: "before" | "after", date: string) => void;
  analyzeArea: (dateBefore: string, dateAfter: string, threshold?: number, minArea?: number) => Promise<void>;
}

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
          { id: result.id, filename: result.filename, type },
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

  const downloadSatellite = useCallback(
    async (dateBefore: string, dateAfter: string) => {
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
        });

        setState((prev) => ({ ...prev, progress: 10 }));

        // Polling para verificar status
        let attempts = 0;
        const maxAttempts = 120;

        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
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
                    satellite: true,
                  },
                  {
                    id: status.after_id!,
                    filename: `sentinel2_${status.after_date}_after.tif`,
                    type: "after",
                    date: status.after_date,
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
    async (threshold = 0.3, minArea = 100) => {
      const beforeImage = state.images.find((img) => img.type === "before");
      const afterImage = state.images.find((img) => img.type === "after");

      if (!beforeImage || !afterImage) {
        throw new Error("Selecione ambas as imagens (antes e depois)");
      }

      setState((prev) => ({ ...prev, status: "analyzing", progress: 0, error: null }));

      try {
        // Iniciar análise
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
    async (dateBefore: string, dateAfter: string, threshold = 0.3, minArea = 100) => {
      if (!state.selectedBounds) {
        throw new Error("Selecione uma área no mapa primeiro");
      }

      // Etapa 1: Baixar imagens de satélite
      setState((prev) => ({
        ...prev,
        status: "downloading",
        progress: 0,
        error: null,
        changes: null,
        summary: null,
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
        });

        setState((prev) => ({ ...prev, progress: 5 }));

        // Polling para verificar status do download
        let attempts = 0;
        const maxDownloadAttempts = 120;

        while (attempts < maxDownloadAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const downloadStatus = await getSatelliteDownloadStatus(task.task_id);

          // Atualizar progresso (0-40% para download)
          const downloadProgress = downloadStatus.status === "downloading" ? 20 : 5;
          setState((prev) => ({ ...prev, progress: downloadProgress }));

          if (downloadStatus.status === "completed") {
            if (downloadStatus.before_id && downloadStatus.after_id) {
              beforeImageId = downloadStatus.before_id;
              afterImageId = downloadStatus.after_id;

              setState((prev) => ({
                ...prev,
                progress: 40,
                images: [
                  {
                    id: downloadStatus.before_id!,
                    filename: `sentinel2_${downloadStatus.before_date}_before.tif`,
                    type: "before",
                    date: downloadStatus.before_date,
                    satellite: true,
                  },
                  {
                    id: downloadStatus.after_id!,
                    filename: `sentinel2_${downloadStatus.after_date}_after.tif`,
                    type: "after",
                    date: downloadStatus.after_date,
                    satellite: true,
                  },
                ],
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

        // Etapa 2: Executar análise de mudanças
        setState((prev) => ({ ...prev, status: "analyzing", progress: 45 }));

        const analysis = await startAnalysis({
          image_before_id: beforeImageId,
          image_after_id: afterImageId,
          threshold,
          min_area: minArea,
        });

        setState((prev) => ({ ...prev, analysisId: analysis.id, progress: 50 }));

        // Polling para verificar status da análise
        let analysisAttempts = 0;
        const maxAnalysisAttempts = 60;

        while (analysisAttempts < maxAnalysisAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const analysisStatus = await getAnalysisStatus(analysis.id);

          // Atualizar progresso (50-90% para análise)
          const analysisProgress = 50 + Math.floor(analysisStatus.progress * 0.4);
          setState((prev) => ({ ...prev, progress: analysisProgress }));

          if (analysisStatus.status === "completed") {
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

          if (analysisStatus.status === "failed") {
            throw new Error(analysisStatus.message || "Análise falhou");
          }

          analysisAttempts++;
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
    [state.selectedBounds]
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
        downloadSatellite,
        setImageFromSatellite,
        analyzeArea,
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
