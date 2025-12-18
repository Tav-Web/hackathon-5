"use client";

import { useState, useEffect } from "react";
import { Satellite, Download, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  downloadSatelliteImages,
  getSatelliteDownloadStatus,
  Bounds,
  SatelliteSource,
  api,
} from "@/lib/api";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DownloadContainer,
  HeaderRow,
  HeaderTitle,
  SectionContainer,
  SectionLabel,
  AreaButton,
  AreaInfo,
  DatesGrid,
  DateSection,
  DateLabel,
  DownloadActionButton,
  FooterNote,
  SourceSelect,
  SourceInfo,
} from "./SatelliteDownloadStyles";

interface SatelliteSourceInfo {
  id: SatelliteSource;
  name: string;
  resolution: string;
  available: boolean;
  description: string;
}

interface SatelliteDownloadProps {
  selectedBounds: Bounds | null;
  onBoundsSelect: () => void;
}

export function SatelliteDownload({ selectedBounds, onBoundsSelect }: SatelliteDownloadProps) {
  const [dateBefore, setDateBefore] = useState("");
  const [dateAfter, setDateAfter] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState("");
  const [selectedSource, setSelectedSource] = useState<SatelliteSource>("earth_engine");
  const [sources, setSources] = useState<SatelliteSourceInfo[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);

  // Carregar fontes disponíveis
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await api.get("/satellite/sources");
        setSources(response.data.sources);
        // Selecionar a primeira fonte disponível
        const availableSource = response.data.sources.find((s: SatelliteSourceInfo) => s.available);
        if (availableSource) {
          setSelectedSource(availableSource.id);
        }
      } catch (error) {
        console.error("Erro ao carregar fontes de satélite:", error);
        // Fallback para Earth Engine
        setSources([
          {
            id: "earth_engine",
            name: "Google Earth Engine",
            resolution: "10m",
            available: true,
            description: "Sentinel-2 via Google Earth Engine (gratuito)",
          },
        ]);
      } finally {
        setLoadingSources(false);
      }
    };
    fetchSources();
  }, []);

  const currentSource = sources.find((s) => s.id === selectedSource);

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
        source: selectedSource,
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

  // Data máxima: hoje
  const today = new Date().toISOString().split("T")[0];

  return (
    <DownloadContainer>
      <HeaderRow>
        <Satellite className="h-5 w-5 text-blue-400" />
        <HeaderTitle>Imagens de Satélite</HeaderTitle>
      </HeaderRow>

      {/* Seleção de fonte de satélite */}
      <SectionContainer>
        <SectionLabel>Fonte de Imagens</SectionLabel>
        <SourceSelect
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value as SatelliteSource)}
          disabled={loadingSources || downloading}
        >
          {sources.map((source) => (
            <option key={source.id} value={source.id} disabled={!source.available}>
              {source.name} ({source.resolution}) {!source.available ? "- Não configurado" : ""}
            </option>
          ))}
        </SourceSelect>
        {currentSource && (
          <SourceInfo>{currentSource.description}</SourceInfo>
        )}
      </SectionContainer>

      {/* Seleção de área */}
      <SectionContainer>
        <SectionLabel>Área de Análise</SectionLabel>
        <AreaButton onClick={onBoundsSelect}>
          <MapPin className="h-4 w-4" />
          {selectedBounds
            ? `${selectedBounds.min_lat.toFixed(4)}, ${selectedBounds.min_lon.toFixed(4)}`
            : "Selecionar no Mapa"}
        </AreaButton>
        {selectedBounds && (
          <AreaInfo>
            Área: {((selectedBounds.max_lon - selectedBounds.min_lon) * 111).toFixed(1)}km x{" "}
            {((selectedBounds.max_lat - selectedBounds.min_lat) * 111).toFixed(1)}km
          </AreaInfo>
        )}
      </SectionContainer>

      {/* Seleção de datas */}
      <DatesGrid>
        <DateSection>
          <DateLabel>Data Antes</DateLabel>
          <DatePicker
            value={dateBefore}
            onChange={setDateBefore}
            placeholder="Selecione a data"
            maxDate={today}
          />
        </DateSection>
        <DateSection>
          <DateLabel>Depois de</DateLabel>
          <DatePicker
            value={dateAfter}
            onChange={setDateAfter}
            placeholder="Selecione a data"
            minDate={dateBefore || undefined}
            maxDate={today}
          />
        </DateSection>
      </DatesGrid>

      {/* Botão de download */}
      <DownloadActionButton
        onClick={handleDownload}
        disabled={downloading || !selectedBounds || !dateBefore || !dateAfter}
        $disabled={downloading || !selectedBounds || !dateBefore || !dateAfter}
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {progress}
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Baixar via {currentSource?.name || "Satélite"}
          </>
        )}
      </DownloadActionButton>

      <FooterNote>
        {currentSource?.description || "Selecione uma fonte de imagens"}
      </FooterNote>
    </DownloadContainer>
  );
}
