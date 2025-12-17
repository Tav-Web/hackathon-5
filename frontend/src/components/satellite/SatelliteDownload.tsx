"use client";

import { useState } from "react";
import { Satellite, Download, Loader2, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  downloadSatelliteImages,
  getSatelliteDownloadStatus,
  Bounds,
} from "@/lib/api";
import { useAnalysis } from "@/context/AnalysisContext";

interface SatelliteDownloadProps {
  selectedBounds: Bounds | null;
  onBoundsSelect: () => void;
}

export function SatelliteDownload({ selectedBounds, onBoundsSelect }: SatelliteDownloadProps) {
  const { uploadImageFile } = useAnalysis();
  const [dateBefore, setDateBefore] = useState("");
  const [dateAfter, setDateAfter] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleDownload = async () => {
    if (!selectedBounds) {
      toast.error("Selecione uma área no mapa primeiro");
      return;
    }

    if (!dateBefore || !dateAfter) {
      toast.error("Selecione as datas antes e depois");
      return;
    }

    setDownloading(true);
    setProgress("Iniciando download...");

    try {
      // Iniciar download
      const task = await downloadSatelliteImages({
        bounds: selectedBounds,
        date_before: dateBefore,
        date_after: dateAfter,
        date_range_days: 30,
      });

      // Polling para verificar status
      let attempts = 0;
      const maxAttempts = 120; // 2 minutos

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const status = await getSatelliteDownloadStatus(task.task_id);

        setProgress(status.message || "Baixando imagens...");

        if (status.status === "completed") {
          // Registrar imagens no contexto
          if (status.before_id && status.after_id) {
            // Simular upload para o contexto (as imagens já estão no servidor)
            toast.success(
              `Imagens baixadas: ${status.before_date} e ${status.after_date}`
            );

            // Atualizar o contexto com as imagens baixadas
            // Por enquanto, vamos apenas notificar - a integração completa
            // requer ajustes no contexto para aceitar IDs existentes
          }
          break;
        }

        if (status.status === "failed") {
          throw new Error(status.message || "Falha no download");
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("Timeout: download demorou muito");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no download");
    } finally {
      setDownloading(false);
      setProgress("");
    }
  };

  // Data padrão: 1 ano atrás e hoje
  const today = new Date().toISOString().split("T")[0];
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Satellite className="h-5 w-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">Imagens de Satélite</h2>
      </div>

      {/* Seleção de área */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Área de Análise</label>
        <button
          onClick={onBoundsSelect}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors border border-gray-700"
        >
          <MapPin className="h-4 w-4" />
          {selectedBounds
            ? `${selectedBounds.min_lat.toFixed(4)}, ${selectedBounds.min_lon.toFixed(4)}`
            : "Selecionar no Mapa"}
        </button>
        {selectedBounds && (
          <p className="text-xs text-gray-500">
            Área: {((selectedBounds.max_lon - selectedBounds.min_lon) * 111).toFixed(1)}km x{" "}
            {((selectedBounds.max_lat - selectedBounds.min_lat) * 111).toFixed(1)}km
          </p>
        )}
      </div>

      {/* Seleção de datas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400">Data Antes</label>
          <div className="relative">
            <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateBefore}
              onChange={(e) => setDateBefore(e.target.value)}
              max={today}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-8 pr-2 text-sm text-white"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400">Data Depois</label>
          <div className="relative">
            <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateAfter}
              onChange={(e) => setDateAfter(e.target.value)}
              max={today}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-8 pr-2 text-sm text-white"
            />
          </div>
        </div>
      </div>

      {/* Botão de download */}
      <button
        onClick={handleDownload}
        disabled={downloading || !selectedBounds || !dateBefore || !dateAfter}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {progress}
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Baixar Sentinel-2
          </>
        )}
      </button>

      <p className="text-xs text-gray-500">
        Imagens do Copernicus Sentinel-2 via Google Earth Engine
      </p>
    </div>
  );
}
