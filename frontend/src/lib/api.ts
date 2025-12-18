import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
});

// Types
export interface ImageData {
  id: number;
  name: string;
  original_filename: string;
  width: number;
  height: number;
  file_size: number;
  bounds: Record<string, number> | null;
  center_lat: number | null;
  center_lon: number | null;
  crs: string | null;
  status: string;
  created_at: string;
}

export interface ImageListItem {
  id: number;
  name: string;
  original_filename: string;
  status: string;
  created_at: string;
}

export interface AnalysisData {
  id: number;
  image_before_id: number;
  image_after_id: number;
  status: "pending" | "processing" | "completed" | "failed";
  threshold: number;
  min_area: number;
  created_at: string;
  completed_at: string | null;
  total_changes: number;
  total_area_changed: number;
}

export interface AnalysisStatus {
  id: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string | null;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
  metadata?: Record<string, unknown>;
}

export interface GeoJSONFeature {
  type: "Feature";
  id: string;
  properties: {
    type: string;
    area: number;
    confidence: number;
  };
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

export interface ChangeSummary {
  analysis_id: number;
  total_changes: number;
  total_area: number;
  by_type: Record<string, number>;
}

// Satellite API Types
export interface Bounds {
  min_lon: number;
  min_lat: number;
  max_lon: number;
  max_lat: number;
}

export type SatelliteSource = "earth_engine" | "sentinel";

export interface SatelliteDownloadRequest {
  bounds: Bounds;
  date_before: string;
  date_after: string;
  date_range_days?: number;
  source?: SatelliteSource;
}

export interface SatelliteDownloadStatus {
  task_id: string;
  status: "pending" | "downloading" | "completed" | "failed";
  message?: string;
  before_id?: string;
  after_id?: string;
  before_date?: string;
  after_date?: string;
}

// API Functions
export async function uploadImage(file: File): Promise<{ id: number; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/images/upload", formData);
  return response.data;
}

export async function getImage(imageId: number): Promise<ImageData> {
  const response = await api.get(`/images/${imageId}`);
  return response.data;
}

export async function getImages(): Promise<ImageListItem[]> {
  const response = await api.get("/images");
  return response.data;
}

export async function deleteImage(imageId: number): Promise<void> {
  await api.delete(`/images/${imageId}`);
}

export async function compareImages(
  imageBeforeId: number,
  imageAfterId: number,
  threshold = 0.3,
  minArea = 100
): Promise<AnalysisData> {
  const response = await api.post("/analysis/compare", {
    image_before_id: imageBeforeId,
    image_after_id: imageAfterId,
    threshold,
    min_area: minArea,
  });
  return response.data;
}

export async function getAnalysisStatus(analysisId: string | number): Promise<AnalysisStatus> {
  const response = await api.get(`/analysis/${analysisId}`);
  return response.data;
}

export async function getAnalysisResult(analysisId: number): Promise<{
  id: number;
  status: string;
  total_changes: number;
  total_area_changed: number;
  results_geojson: GeoJSONFeatureCollection | null;
}> {
  const response = await api.get(`/analysis/${analysisId}/result`);
  return response.data;
}

export async function getChanges(analysisId: string | number): Promise<GeoJSONFeatureCollection> {
  const response = await api.get(`/changes/${analysisId}`);
  return response.data;
}

export async function getChangesSummary(analysisId: string | number): Promise<ChangeSummary> {
  const response = await api.get(`/changes/${analysisId}/summary`);
  return response.data;
}

// Satellite API Functions
export async function downloadSatelliteImages(
  data: SatelliteDownloadRequest
): Promise<SatelliteDownloadStatus> {
  const response = await api.post("/satellite/download", data);
  return response.data;
}

export async function getSatelliteDownloadStatus(taskId: string): Promise<SatelliteDownloadStatus> {
  const response = await api.get(`/satellite/download/${taskId}`);
  return response.data;
}

// Alias for startAnalysis (used by context)
export interface AnalysisRequest {
  image_before_id: string;
  image_after_id: string;
  threshold?: number;
  min_area?: number;
}

export interface AnalysisResponse {
  id: string;
  image_before_id: string;
  image_after_id: string;
  status: string;
  created_at: string;
  completed_at?: string;
  total_changes: number;
  total_area_changed: number;
}

// Satellite Change (raw response from backend)
export interface SatelliteChange {
  id: string;
  type: string;
  area: number;
  area_pixels: number;
  centroid: [number, number];
  confidence: number;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  is_georeferenced: boolean;
  spectral?: {
    ndvi_before: number;
    ndvi_after: number;
    ndvi_change: number;
    ndwi_change: number;
    ndbi_change?: number;
  };
}

// Satellite Analysis Response (from /satellite/analyze)
export interface SatelliteAnalysisResponse {
  id: string;
  status: string;
  total_changes: number;
  total_area_changed: number;
  changes: SatelliteChange[];
}

// Satellite analysis (synchronous - returns results immediately)
export async function analyzeSatelliteImages(data: AnalysisRequest): Promise<SatelliteAnalysisResponse> {
  const response = await api.post("/satellite/analyze", {
    image_before_id: data.image_before_id,
    image_after_id: data.image_after_id,
    threshold: data.threshold || 0.15,
    min_area: data.min_area || 100,
  });
  return response.data;
}

export async function startAnalysis(data: AnalysisRequest): Promise<AnalysisResponse> {
  // Use satellite endpoint for string IDs (UUIDs from satellite download)
  const satResponse = await analyzeSatelliteImages(data);

  // Map satellite response to expected AnalysisResponse format
  return {
    id: satResponse.id,
    image_before_id: data.image_before_id,
    image_after_id: data.image_after_id,
    status: satResponse.status,
    created_at: new Date().toISOString(),
    total_changes: satResponse.total_changes,
    total_area_changed: satResponse.total_area_changed,
  };
}

// Get satellite image preview URL
export function getSatelliteImagePreviewUrl(imageId: string): string {
  return `${API_URL}/satellite/image/${imageId}/preview`;
}

// Fetch satellite image as base64 for PDF
export async function getSatelliteImageBase64(imageId: string): Promise<string> {
  const response = await api.get(`/satellite/image/${imageId}/preview`, {
    responseType: "arraybuffer",
  });
  const base64 = btoa(
    new Uint8Array(response.data).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ""
    )
  );
  return `data:image/png;base64,${base64}`;
}

// =====================================================
// GEE (Google Earth Engine) Analysis API
// =====================================================

import type {
  GeeAnalysisRequest,
  GeeAnalysisResponse,
  GeeAnalysisTiles,
  AutoAnalysisResponse,
  ChatSuggestionsResponse,
  ChatResponse,
} from "@/types/gee";

// Start a new GEE analysis
export async function startGeeAnalysis(
  request: GeeAnalysisRequest
): Promise<{ id: number; status: string; message: string }> {
  const response = await api.post("/gee/analyze", {
    geometry: request.geometry,
    start_date: request.startDate,
    end_date: request.endDate,
    cloud_tolerance: request.cloudTolerance ?? 20,
  });
  return response.data;
}

// Get GEE analysis status and result
export async function getGeeAnalysis(id: number): Promise<GeeAnalysisResponse> {
  const response = await api.get(`/gee/${id}`);
  const data = response.data;

  // Map snake_case to camelCase
  return {
    id: data.id,
    status: data.status,
    progress: data.progress ?? 0,
    imagesFound: data.images_found,
    classification: data.classification
      ? {
          changeType: data.classification.change_type,
          confidence: data.classification.confidence,
          description: data.classification.description,
          alertLevel: data.classification.alert_level,
        }
      : undefined,
    indicesStart: data.indices_start
      ? {
          ndvi: data.indices_start.ndvi,
          ndbi: data.indices_start.ndbi,
          bsi: data.indices_start.bsi,
          nbr: data.indices_start.nbr,
        }
      : undefined,
    indicesEnd: data.indices_end
      ? {
          ndvi: data.indices_end.ndvi,
          ndbi: data.indices_end.ndbi,
          bsi: data.indices_end.bsi,
          nbr: data.indices_end.nbr,
        }
      : undefined,
    deltas: data.deltas
      ? {
          ndvi: data.deltas.ndvi,
          ndbi: data.deltas.ndbi,
          bsi: data.deltas.bsi,
          nbr: data.deltas.nbr,
        }
      : undefined,
    timeSeries: data.time_series?.map((point: Record<string, unknown>) => ({
      date: point.date,
      ndvi: point.ndvi,
      ndbi: point.ndbi,
      bsi: point.bsi,
      nbr: point.nbr,
    })),
    tileUrlBefore: data.tile_url_before,
    tileUrlAfter: data.tile_url_after,
    aiAnalysis: data.ai_analysis,
    createdAt: data.created_at,
    completedAt: data.completed_at,
    errorMessage: data.error_message,
  };
}

// Get GEE analysis tiles
export async function getGeeAnalysisTiles(id: number): Promise<GeeAnalysisTiles> {
  const response = await api.get(`/gee/${id}/tiles`);
  const data = response.data;

  return {
    tileUrlBefore: data.tile_url_before,
    tileUrlAfter: data.tile_url_after,
    tileUrlNdviBefore: data.tile_url_ndvi_before,
    tileUrlNdviAfter: data.tile_url_ndvi_after,
  };
}

// List GEE analyses
export async function listGeeAnalyses(
  status?: string,
  limit = 10,
  offset = 0
): Promise<{ items: GeeAnalysisResponse[]; total: number }> {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());

  const response = await api.get(`/gee?${params.toString()}`);
  return response.data;
}

// Delete GEE analysis
export async function deleteGeeAnalysis(id: number): Promise<void> {
  await api.delete(`/gee/${id}`);
}

// =====================================================
// Chat / AI Analysis API
// =====================================================

export type AnalysisType = "auto" | "gee" | "satellite";

// Get auto-generated AI analysis
export async function getAutoAnalysis(
  analysisId: number,
  analysisType: AnalysisType = "auto"
): Promise<AutoAnalysisResponse> {
  const response = await api.get(`/chat/${analysisId}/auto-analysis`, {
    params: { analysis_type: analysisType },
  });
  const data = response.data;

  return {
    analysisId: data.analysis_id,
    summary: data.summary,
    detailedAnalysis: data.detailed_analysis,
    recommendations: data.recommendations,
  };
}

// Get chat suggestions for an analysis
export async function getChatSuggestions(
  analysisId: number,
  analysisType: AnalysisType = "auto"
): Promise<ChatSuggestionsResponse> {
  const response = await api.get(`/chat/${analysisId}/suggestions`, {
    params: { analysis_type: analysisType },
  });
  const data = response.data;

  return {
    analysisId: data.analysis_id,
    suggestions: data.suggestions,
  };
}

// Ask a question about an analysis
export async function askQuestion(
  analysisId: number,
  question: string,
  analysisType: AnalysisType = "auto"
): Promise<ChatResponse> {
  const response = await api.post("/chat/ask", {
    analysis_id: analysisId,
    question,
    analysis_type: analysisType,
  });
  const data = response.data;

  return {
    answer: data.answer,
    sources: data.sources,
    analysisId: data.analysis_id,
  };
}

// Regenerate AI analysis
export async function regenerateAnalysis(
  analysisId: number,
  analysisType: AnalysisType = "auto"
): Promise<{ message: string }> {
  const response = await api.post(`/chat/${analysisId}/regenerate-analysis`, null, {
    params: { analysis_type: analysisType },
  });
  return response.data;
}
