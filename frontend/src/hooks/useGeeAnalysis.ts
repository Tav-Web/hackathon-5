"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  startGeeAnalysis,
  getGeeAnalysis,
  getGeeAnalysisTiles,
} from "@/lib/api";
import type {
  GeeAnalysisRequest,
  GeeAnalysisResponse,
  GeeAnalysisTiles,
  AnalysisStatus,
} from "@/types/gee";

interface UseGeeAnalysisOptions {
  pollingInterval?: number;
  onComplete?: (result: GeeAnalysisResponse) => void;
  onError?: (error: string) => void;
}

interface UseGeeAnalysisReturn {
  // State
  analysisId: number | null;
  status: AnalysisStatus | "idle";
  progress: number;
  result: GeeAnalysisResponse | null;
  tiles: GeeAnalysisTiles | null;
  error: string | null;
  isLoading: boolean;

  // Actions
  startAnalysis: (request: GeeAnalysisRequest) => Promise<void>;
  cancelAnalysis: () => void;
  reset: () => void;
  fetchTiles: () => Promise<void>;
}

export function useGeeAnalysis(
  options: UseGeeAnalysisOptions = {}
): UseGeeAnalysisReturn {
  const { pollingInterval = 2000, onComplete, onError } = options;

  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [status, setStatus] = useState<AnalysisStatus | "idle">("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GeeAnalysisResponse | null>(null);
  const [tiles, setTiles] = useState<GeeAnalysisTiles | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef(false);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Start polling when analysis is pending or processing
  useEffect(() => {
    if (!analysisId || status === "completed" || status === "failed" || status === "idle") {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const pollStatus = async () => {
      if (abortRef.current) return;

      try {
        const data = await getGeeAnalysis(analysisId);

        if (abortRef.current) return;

        setStatus(data.status);
        setProgress(data.progress);

        if (data.status === "completed") {
          setResult(data);
          setIsLoading(false);
          onComplete?.(data);

          // Fetch tiles after completion
          try {
            const tilesData = await getGeeAnalysisTiles(analysisId);
            setTiles(tilesData);
          } catch {
            // Tiles are optional, don't fail if they're not available
          }
        } else if (data.status === "failed") {
          setError(data.errorMessage || "Análise falhou");
          setIsLoading(false);
          onError?.(data.errorMessage || "Análise falhou");
        }
      } catch (err) {
        console.error("Error polling analysis:", err);
        // Don't stop polling on transient errors
      }
    };

    // Initial poll
    pollStatus();

    // Set up interval polling
    pollingRef.current = setInterval(pollStatus, pollingInterval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [analysisId, status, pollingInterval, onComplete, onError]);

  const startAnalysis = useCallback(async (request: GeeAnalysisRequest) => {
    abortRef.current = false;
    setIsLoading(true);
    setError(null);
    setStatus("pending");
    setProgress(0);
    setResult(null);
    setTiles(null);

    try {
      const response = await startGeeAnalysis(request);

      if (abortRef.current) return;

      setAnalysisId(response.id);
    } catch (err) {
      if (abortRef.current) return;

      const errorMessage = err instanceof Error ? err.message : "Erro ao iniciar análise";
      setError(errorMessage);
      setStatus("failed");
      setIsLoading(false);
      onError?.(errorMessage);
    }
  }, [onError]);

  const cancelAnalysis = useCallback(() => {
    abortRef.current = true;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setStatus("idle");
    setIsLoading(false);
    setProgress(0);
  }, []);

  const reset = useCallback(() => {
    cancelAnalysis();
    setAnalysisId(null);
    setResult(null);
    setTiles(null);
    setError(null);
  }, [cancelAnalysis]);

  const fetchTiles = useCallback(async () => {
    if (!analysisId) return;

    try {
      const tilesData = await getGeeAnalysisTiles(analysisId);
      setTiles(tilesData);
    } catch (err) {
      console.error("Error fetching tiles:", err);
    }
  }, [analysisId]);

  return {
    analysisId,
    status,
    progress,
    result,
    tiles,
    error,
    isLoading,
    startAnalysis,
    cancelAnalysis,
    reset,
    fetchTiles,
  };
}
