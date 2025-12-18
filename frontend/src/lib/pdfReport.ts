import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { GeoJSONFeatureCollection, ChangeSummary, Bounds } from "./api";
import { getSatelliteImageBase64 } from "./api";

interface UploadedImage {
  id: string;
  filename: string;
  type: "before" | "after";
  date?: string;          // Actual capture date from satellite
  requestedDate?: string; // User-requested date
  satellite?: boolean;
}

interface ReportData {
  images: UploadedImage[];
  changes: GeoJSONFeatureCollection | null;
  summary: ChangeSummary | null;
  bounds: Bounds | null;
  mapElement?: HTMLElement | null;
}

// Change type labels in Portuguese
const changeTypeLabels: Record<string, string> = {
  construction: "Construção",
  demolition: "Demolição",
  deforestation: "Desmatamento",
  vegetation_growth: "Crescimento de Vegetação",
  vegetation_loss: "Perda de Vegetação",
  soil_movement: "Movimento de Solo",
  debris: "Entulho",
  urban_expansion: "Expansão Urbana",
  water_increase: "Aumento de Água",
  water_decrease: "Redução de Água",
  unknown: "Não Identificado",
};

// Format date to user's locale (pt-BR: dd/mm/yyyy)
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "Data não informada";
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Colors for change types
const changeTypeColors: Record<string, [number, number, number]> = {
  construction: [239, 68, 68],
  demolition: [249, 115, 22],
  deforestation: [220, 38, 38],
  vegetation_growth: [34, 197, 94],
  vegetation_loss: [234, 179, 8],
  soil_movement: [161, 98, 7],
  debris: [107, 114, 128],
  urban_expansion: [139, 92, 246],
  water_increase: [59, 130, 246],
  water_decrease: [6, 182, 212],
  unknown: [156, 163, 175],
};

export async function generatePDFReport(data: ReportData): Promise<void> {
  const { images, changes, summary, bounds, mapElement } = data;

  // Create PDF in A4 format
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (yPosition + neededHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header
  pdf.setFillColor(30, 41, 59); // slate-800
  pdf.rect(0, 0, pageWidth, 40, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("Relatório de Detecção de Mudanças", margin, 18);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Sistema de Análise de Imagens de Satélite", margin, 26);

  const dateStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  pdf.text(`Gerado em: ${dateStr}`, margin, 34);

  yPosition = 50;

  // Section: Analysis Info
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Informações da Análise", margin, yPosition);
  yPosition += 8;

  pdf.setDrawColor(59, 130, 246);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Images info
  const beforeImage = images.find((img) => img.type === "before");
  const afterImage = images.find((img) => img.type === "after");

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  if (beforeImage) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Imagem Antes:", margin, yPosition);
    pdf.setFont("helvetica", "normal");
    if (beforeImage.satellite && beforeImage.requestedDate) {
      pdf.text(`Solicitado: ${formatDate(beforeImage.requestedDate)} | Capturado: ${formatDate(beforeImage.date)}`, margin + 35, yPosition);
    } else {
      pdf.text(`${formatDate(beforeImage.date)} - ${beforeImage.satellite ? "Satélite Sentinel-2" : "Upload Manual"}`, margin + 35, yPosition);
    }
    yPosition += 6;
  }

  if (afterImage) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Imagem Depois:", margin, yPosition);
    pdf.setFont("helvetica", "normal");
    if (afterImage.satellite && afterImage.requestedDate) {
      pdf.text(`Solicitado: ${formatDate(afterImage.requestedDate)} | Capturado: ${formatDate(afterImage.date)}`, margin + 35, yPosition);
    } else {
      pdf.text(`${formatDate(afterImage.date)} - ${afterImage.satellite ? "Satélite Sentinel-2" : "Upload Manual"}`, margin + 35, yPosition);
    }
    yPosition += 6;
  }

  // Bounds info
  if (bounds) {
    yPosition += 4;
    pdf.setFont("helvetica", "bold");
    pdf.text("Área Analisada:", margin, yPosition);
    pdf.setFont("helvetica", "normal");
    yPosition += 6;
    pdf.text(`Latitude: ${bounds.min_lat.toFixed(6)}° a ${bounds.max_lat.toFixed(6)}°`, margin + 5, yPosition);
    yPosition += 5;
    pdf.text(`Longitude: ${bounds.min_lon.toFixed(6)}° a ${bounds.max_lon.toFixed(6)}°`, margin + 5, yPosition);
    yPosition += 10;
  }

  // Section: Satellite Images Comparison (Side by Side)
  if (beforeImage?.satellite && afterImage?.satellite) {
    checkPageBreak(120);

    // Section title with professional styling
    pdf.setFillColor(30, 64, 175);
    pdf.rect(margin, yPosition, 3, 12, "F");
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 41, 59);
    pdf.text("Análise Comparativa de Imagens", margin + 6, yPosition + 9);
    yPosition += 18;

    try {
      // Fetch both satellite images
      const [beforeImgBase64, afterImgBase64] = await Promise.all([
        getSatelliteImageBase64(beforeImage.id),
        getSatelliteImageBase64(afterImage.id),
      ]);

      // Calculate image dimensions for side-by-side layout
      const gap = 6; // Gap between images
      const singleImgWidth = (pageWidth - 2 * margin - gap) / 2;
      let singleImgHeight = 60; // Default height

      // If bounds available, calculate correct aspect ratio
      if (bounds) {
        const widthKm = Math.abs(bounds.max_lon - bounds.min_lon) * 111;
        const heightKm = Math.abs(bounds.max_lat - bounds.min_lat) * 111;
        const aspectRatio = widthKm / heightKm;
        singleImgHeight = singleImgWidth / aspectRatio;
        // Limit max height
        singleImgHeight = Math.min(singleImgHeight, 80);
      }

      // Left position for BEFORE, Right position for AFTER
      const leftX = margin;
      const rightX = margin + singleImgWidth + gap;

      // Draw header boxes for labels
      const labelHeight = 10;

      // BEFORE header box (orange/amber theme)
      pdf.setFillColor(254, 243, 199); // amber-100
      pdf.roundedRect(leftX, yPosition, singleImgWidth, labelHeight, 2, 2, "F");
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(180, 83, 9); // amber-700
      pdf.text("ANTES", leftX + singleImgWidth / 2, yPosition + 7, { align: "center" });

      // AFTER header box (green theme)
      pdf.setFillColor(220, 252, 231); // green-100
      pdf.roundedRect(rightX, yPosition, singleImgWidth, labelHeight, 2, 2, "F");
      pdf.setTextColor(21, 128, 61); // green-700
      pdf.text("DEPOIS", rightX + singleImgWidth / 2, yPosition + 7, { align: "center" });

      yPosition += labelHeight + 2;

      // Draw date labels (both requested and actual capture dates)
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");

      // Before dates
      pdf.setTextColor(107, 114, 128);
      pdf.text("Solicitado: ", leftX + 2, yPosition + 3);
      pdf.setTextColor(51, 65, 85);
      pdf.text(formatDate(beforeImage.requestedDate), leftX + 22, yPosition + 3);

      pdf.setTextColor(107, 114, 128);
      pdf.text("Capturado: ", leftX + 2, yPosition + 8);
      pdf.setTextColor(59, 130, 246);
      pdf.text(formatDate(beforeImage.date), leftX + 22, yPosition + 8);

      // After dates
      pdf.setTextColor(107, 114, 128);
      pdf.text("Solicitado: ", rightX + 2, yPosition + 3);
      pdf.setTextColor(51, 65, 85);
      pdf.text(formatDate(afterImage.requestedDate), rightX + 22, yPosition + 3);

      pdf.setTextColor(107, 114, 128);
      pdf.text("Capturado: ", rightX + 2, yPosition + 3 + 5);
      pdf.setTextColor(59, 130, 246);
      pdf.text(formatDate(afterImage.date), rightX + 22, yPosition + 3 + 5);

      yPosition += 14;

      // Draw images with borders
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.5);

      // Before image with amber border
      pdf.setDrawColor(180, 83, 9);
      pdf.addImage(beforeImgBase64, "PNG", leftX, yPosition, singleImgWidth, singleImgHeight, undefined, "FAST");
      pdf.rect(leftX, yPosition, singleImgWidth, singleImgHeight);

      // After image with green border
      pdf.setDrawColor(21, 128, 61);
      pdf.addImage(afterImgBase64, "PNG", rightX, yPosition, singleImgWidth, singleImgHeight, undefined, "FAST");
      pdf.rect(rightX, yPosition, singleImgWidth, singleImgHeight);

      yPosition += singleImgHeight + 5;

      // Comparison arrow indicator in center
      pdf.setFillColor(59, 130, 246);
      const arrowY = yPosition - singleImgHeight / 2 - 5;
      const arrowX = margin + singleImgWidth + gap / 2;
      pdf.circle(arrowX, arrowY, 4, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("→", arrowX - 1.5, arrowY + 1.5);

      // Legend and source info
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.setFont("helvetica", "italic");
      pdf.text("Fonte: Sentinel-2 MSI (Copernicus Data Space) - Resolução: 10m/pixel", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 12;

    } catch (err) {
      console.error("Error fetching satellite images:", err);
      pdf.setFontSize(10);
      pdf.setTextColor(156, 163, 175);
      pdf.text("(Imagens de satélite não disponíveis para visualização)", margin, yPosition);
      yPosition += 10;
    }
  }

  // Capture map image if element provided
  if (mapElement) {
    checkPageBreak(90);

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Mapa da Área Analisada", margin, yPosition);
    yPosition += 8;

    pdf.setDrawColor(59, 130, 246);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    try {
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const maxImgHeight = 80;

      pdf.addImage(
        imgData,
        "JPEG",
        margin,
        yPosition,
        imgWidth,
        Math.min(imgHeight, maxImgHeight)
      );
      yPosition += Math.min(imgHeight, maxImgHeight) + 10;
    } catch (err) {
      console.error("Error capturing map:", err);
      pdf.setFontSize(10);
      pdf.setTextColor(156, 163, 175);
      pdf.text("(Mapa não disponível para captura)", margin, yPosition);
      yPosition += 10;
    }
  }

  // Section: Summary
  checkPageBreak(50);

  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Resumo das Mudanças Detectadas", margin, yPosition);
  yPosition += 8;

  pdf.setDrawColor(59, 130, 246);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  if (summary) {
    // Summary boxes
    const boxWidth = (pageWidth - 2 * margin - 10) / 2;
    const boxHeight = 25;

    // Total changes box
    pdf.setFillColor(240, 249, 255);
    pdf.roundedRect(margin, yPosition, boxWidth, boxHeight, 3, 3, "F");
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 64, 175);
    pdf.text(String(summary.total_changes), margin + boxWidth / 2, yPosition + 12, { align: "center" });
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105);
    pdf.text("Mudanças Detectadas", margin + boxWidth / 2, yPosition + 20, { align: "center" });

    // Total area box
    pdf.setFillColor(240, 253, 244);
    pdf.roundedRect(margin + boxWidth + 10, yPosition, boxWidth, boxHeight, 3, 3, "F");
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(22, 101, 52);
    const areaText = summary.total_area > 1000
      ? `${(summary.total_area / 1000).toFixed(1)}k m²`
      : `${summary.total_area.toFixed(0)} m²`;
    pdf.text(areaText, margin + boxWidth + 10 + boxWidth / 2, yPosition + 12, { align: "center" });
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105);
    pdf.text("Área Total Afetada", margin + boxWidth + 10 + boxWidth / 2, yPosition + 20, { align: "center" });

    yPosition += boxHeight + 10;

    // Changes by type
    if (Object.keys(summary.by_type).length > 0) {
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text("Mudanças por Tipo:", margin, yPosition);
      yPosition += 8;

      Object.entries(summary.by_type).forEach(([type, count]) => {
        checkPageBreak(10);
        const label = changeTypeLabels[type] || type;
        const color = changeTypeColors[type] || changeTypeColors.unknown;

        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.circle(margin + 3, yPosition - 1.5, 2, "F");

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(51, 65, 85);
        pdf.text(`${label}: ${count} ocorrência${count > 1 ? "s" : ""}`, margin + 8, yPosition);
        yPosition += 6;
      });
    }
  } else {
    pdf.setFontSize(10);
    pdf.setTextColor(156, 163, 175);
    pdf.text("Nenhuma mudança detectada na área analisada.", margin, yPosition);
    yPosition += 10;
  }

  // Section: Change Details
  if (changes && changes.features.length > 0) {
    checkPageBreak(30);
    yPosition += 5;

    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Detalhamento das Mudanças", margin, yPosition);
    yPosition += 8;

    pdf.setDrawColor(59, 130, 246);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Table header
    const colWidths = [10, 45, 35, 35, 35];
    const tableX = margin;

    pdf.setFillColor(241, 245, 249);
    pdf.rect(tableX, yPosition, pageWidth - 2 * margin, 8, "F");

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);

    let xPos = tableX + 2;
    pdf.text("#", xPos, yPosition + 5.5);
    xPos += colWidths[0];
    pdf.text("Tipo", xPos, yPosition + 5.5);
    xPos += colWidths[1];
    pdf.text("Área (m²)", xPos, yPosition + 5.5);
    xPos += colWidths[2];
    pdf.text("Confiança", xPos, yPosition + 5.5);
    xPos += colWidths[3];
    pdf.text("Coordenadas", xPos, yPosition + 5.5);

    yPosition += 10;

    // Table rows
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);

    changes.features.slice(0, 30).forEach((feature, index) => {
      checkPageBreak(8);

      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(tableX, yPosition - 2, pageWidth - 2 * margin, 7, "F");
      }

      const props = feature.properties;
      const type = props?.type || "unknown";
      const label = changeTypeLabels[type] || type;
      const area = props?.area || 0;
      const confidence = (props?.confidence || 0) * 100;

      // Get centroid from geometry
      let coordText = "-";
      if (feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates[0]) {
        const coords = feature.geometry.coordinates[0] as number[][];
        if (coords.length > 0) {
          const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
          const avgLon = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
          coordText = `${avgLat.toFixed(4)}, ${avgLon.toFixed(4)}`;
        }
      }

      pdf.setTextColor(51, 65, 85);
      xPos = tableX + 2;
      pdf.text(String(index + 1), xPos, yPosition + 3);
      xPos += colWidths[0];

      const color = changeTypeColors[type] || changeTypeColors.unknown;
      pdf.setTextColor(color[0], color[1], color[2]);
      pdf.text(label, xPos, yPosition + 3);

      pdf.setTextColor(51, 65, 85);
      xPos += colWidths[1];
      pdf.text(area.toFixed(1), xPos, yPosition + 3);
      xPos += colWidths[2];
      pdf.text(`${confidence.toFixed(0)}%`, xPos, yPosition + 3);
      xPos += colWidths[3];
      pdf.text(coordText, xPos, yPosition + 3);

      yPosition += 7;
    });

    if (changes.features.length > 30) {
      yPosition += 5;
      pdf.setFontSize(9);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`... e mais ${changes.features.length - 30} mudanças não listadas`, margin, yPosition);
    }
  }

  // Footer
  const footerY = pageHeight - 10;
  pdf.setFontSize(8);
  pdf.setTextColor(156, 163, 175);
  pdf.text(
    "Relatório gerado automaticamente pelo Sistema de Detecção de Mudanças em Imagens de Satélite",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  // Save PDF
  const filename = `relatorio_mudancas_${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(filename);
}
