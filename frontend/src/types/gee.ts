// GEE Analysis Types

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type AlertLevel = 'critical' | 'warning' | 'info' | 'success';

export type ChangeType =
  | 'NOVA_CONSTRUCAO'
  | 'ENTULHO'
  | 'QUEIMADA'
  | 'DESMATAMENTO'
  | 'REFLORESTAMENTO'
  | 'EXPANSAO_URBANA'
  | 'SEM_MUDANCA';

export interface SpectralIndices {
  ndvi: number | null;
  ndbi: number | null;
  bsi: number | null;
  nbr: number | null;
}

export interface TimeSeriesPoint {
  date: string;
  ndvi: number | null;
  ndbi: number | null;
  bsi: number | null;
  nbr: number | null;
}

export interface ClassificationResult {
  changeType: ChangeType;
  confidence: number;
  description: string;
  alertLevel: AlertLevel;
}

export interface GeeAnalysisRequest {
  geometry: GeoJSON.Geometry;
  startDate: string;
  endDate: string;
  cloudTolerance?: number;
}

export interface GeeAnalysisResponse {
  id: number;
  status: AnalysisStatus;
  progress: number;
  imagesFound?: number;
  classification?: ClassificationResult;
  indicesStart?: SpectralIndices;
  indicesEnd?: SpectralIndices;
  deltas?: SpectralIndices;
  timeSeries?: TimeSeriesPoint[];
  tileUrlBefore?: string;
  tileUrlAfter?: string;
  aiAnalysis?: string;
  createdAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface GeeAnalysisTiles {
  tileUrlBefore?: string;
  tileUrlAfter?: string;
  tileUrlNdviBefore?: string;
  tileUrlNdviAfter?: string;
}

// Chat Types

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  analysisId: number;
  question: string;
}

export interface ChatResponse {
  answer: string;
  sources: string[];
  analysisId: number;
}

export interface AutoAnalysisResponse {
  analysisId: number;
  summary: string;
  detailedAnalysis: string;
  recommendations: string[];
}

export interface SuggestedQuestion {
  question: string;
  category: string;
}

export interface ChatSuggestionsResponse {
  analysisId: number;
  suggestions: SuggestedQuestion[];
}

// Helper functions for display

export const changeTypeLabels: Record<ChangeType, string> = {
  NOVA_CONSTRUCAO: 'Nova Construção',
  ENTULHO: 'Entulho/Depósito',
  QUEIMADA: 'Queimada',
  DESMATAMENTO: 'Desmatamento',
  REFLORESTAMENTO: 'Reflorestamento',
  EXPANSAO_URBANA: 'Expansão Urbana',
  SEM_MUDANCA: 'Sem Mudança Significativa',
};

export const alertLevelColors: Record<AlertLevel, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export const indexColors = {
  ndvi: '#22c55e',
  ndbi: '#f97316',
  bsi: '#a16207',
  nbr: '#3b82f6',
} as const;

export const indexLabels = {
  ndvi: 'NDVI (Vegetação)',
  ndbi: 'NDBI (Construção)',
  bsi: 'BSI (Solo Exposto)',
  nbr: 'NBR (Queimada)',
} as const;
