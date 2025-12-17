export interface UploadedImage {
  id: string;
  filename: string;
  type: "before" | "after";
}

export interface AnalysisResult {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalChanges: number;
  totalArea: number;
  byType: Record<ChangeType, number>;
}

export type ChangeType =
  | "construction"
  | "demolition"
  | "deforestation"
  | "vegetation_growth"
  | "soil_movement"
  | "debris"
  | "urban_expansion"
  | "unknown";

export interface Change {
  id: string;
  type: ChangeType;
  area: number;
  confidence: number;
  centroid: [number, number];
  geometry: GeoJSONGeometry;
}

export interface GeoJSONGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface GeoJSONFeature {
  type: "Feature";
  id: string;
  properties: {
    type: ChangeType;
    area: number;
    confidence: number;
  };
  geometry: GeoJSONGeometry;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
  metadata?: {
    analysis_id: string;
    total_changes: number;
    image_before_id: string;
    image_after_id: string;
  };
}
