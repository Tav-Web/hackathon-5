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

export async function getAnalysisStatus(analysisId: number): Promise<AnalysisStatus> {
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

export async function getChanges(analysisId: number): Promise<GeoJSONFeatureCollection> {
  const response = await api.get(`/changes/${analysisId}`);
  return response.data;
}

export async function getChangesSummary(analysisId: number): Promise<ChangeSummary> {
  const response = await api.get(`/changes/${analysisId}/summary`);
  return response.data;
}
