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

export interface SatelliteDownloadRequest {
  bounds: Bounds;
  date_before: string;
  date_after: string;
  date_range_days?: number;
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

// Satellite Analysis Response (from /satellite/analyze)
export interface SatelliteAnalysisResponse {
  id: string;
  status: string;
  total_changes: number;
  total_area_changed: number;
  changes: GeoJSONFeature[];
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
