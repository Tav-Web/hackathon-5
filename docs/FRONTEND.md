# Documentação do Frontend

## Visão Geral

O frontend é uma aplicação **Next.js 15** com **React 19** e **TypeScript**, focada em detecção de mudanças em imagens de satélite com visualização interativa em mapas.

---

## Estrutura do Projeto

```
frontend/
├── src/
│   ├── app/                 # App Router do Next.js
│   │   ├── layout.tsx       # Layout principal
│   │   ├── page.tsx         # Página principal
│   │   └── globals.css      # Estilos globais e tema
│   ├── components/          # Componentes React (26 arquivos)
│   │   ├── ui/              # Componentes de UI base
│   │   ├── map/             # Mapa interativo
│   │   ├── satellite/       # Painel de satélite
│   │   ├── results/         # Resultados da análise
│   │   ├── chat/            # Chat com IA
│   │   ├── charts/          # Gráficos
│   │   ├── comparison/      # Comparação de imagens
│   │   ├── timeline/        # Timeline temporal
│   │   ├── upload/          # Upload de imagens
│   │   └── providers/       # Context providers
│   ├── context/             # React Context (estado global)
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilitários e API
│   └── types/               # Definições TypeScript
├── public/                  # Assets estáticos
├── tailwind.config.ts       # Configuração Tailwind
├── next.config.ts           # Configuração Next.js
└── package.json             # Dependências
```

---

## Tecnologias e Versões

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Next.js | 15.1.0 | Framework React |
| React | 19.0.0 | Biblioteca UI |
| TypeScript | 5.0.0 | Tipagem estática |
| Tailwind CSS | 3.4.0 | Estilização |
| Radix UI | Vários | Componentes acessíveis |
| Leaflet | 1.9.4 | Mapas interativos |
| Recharts | 3.6.0 | Gráficos |
| Axios | 1.7.0 | Cliente HTTP |
| Lucide React | 0.460.0 | Ícones |
| Sonner | 1.7.4 | Toast notifications |

---

## Sistema de Estilização

### Tema Dark Mode

O tema é definido em `src/app/globals.css` usando variáveis CSS com Tailwind.

#### Paleta de Cores

```css
:root {
  /* Cores principais */
  --background: 0 0% 4%;        /* Fundo escuro */
  --foreground: 0 0% 93%;       /* Texto claro */
  --primary: 142 76% 36%;       /* Verde (#5a8a3a) */

  /* Cards e superfícies */
  --card: 0 0% 7%;
  --popover: 0 0% 7%;
  --muted: 0 0% 15%;

  /* Estados */
  --destructive: 0 84% 60%;     /* Vermelho */
  --accent: 0 0% 15%;
}
```

#### Cores dos Índices Espectrais

```css
--ndvi: #22c55e;   /* Verde - Vegetação */
--ndbi: #f97316;   /* Laranja - Área construída */
--bsi: #a16207;    /* Marrom - Solo exposto */
--nbr: #3b82f6;    /* Azul - Queimadas */
```

### Configuração Tailwind

```typescript
// tailwind.config.ts
{
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        // ... outras cores
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "message-in": "messageIn 0.3s ease-out"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
}
```

### Utilitário de Classes

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Componentes

### Componentes UI Base (`/components/ui/`)

Componentes reutilizáveis baseados em Radix UI:

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| Button | `button.tsx` | Botão com variantes (default, outline, ghost) |
| Card | `card.tsx` | Container com header, content, footer |
| Input | `input.tsx` | Campo de texto |
| Textarea | `textarea.tsx` | Campo multilinha |
| Badge | `badge.tsx` | Etiquetas |
| Progress | `progress.tsx` | Barra de progresso |
| Slider | `slider.tsx` | Controle deslizante |
| Tabs | `tabs.tsx` | Navegação em abas |
| Tooltip | `tooltip.tsx` | Dicas de contexto |
| Sheet | `sheet.tsx` | Painel lateral |
| Skeleton | `skeleton.tsx` | Loading placeholder |
| Scroll Area | `scroll-area.tsx` | Área com scroll customizado |
| Separator | `separator.tsx` | Divisor visual |
| Sonner | `sonner.tsx` | Toast notifications |

#### Exemplo: Button com Variantes

```typescript
// components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### Componentes de Feature

#### MapView (`/components/map/MapView.tsx`)

Mapa interativo com Leaflet:

- Basemap: ESRI World Imagery (satélite)
- Visualização de GeoJSON com cores por tipo de mudança
- Modo de seleção de área (retângulo)
- Carregamento dinâmico (SSR desabilitado)

```typescript
// Cores por tipo de mudança
const getFeatureColor = (changeType: string) => {
  switch (changeType) {
    case "vegetation_loss": return "#ef4444";    // Vermelho
    case "vegetation_gain": return "#22c55e";    // Verde
    case "urban_expansion": return "#f97316";    // Laranja
    case "water_change": return "#3b82f6";       // Azul
    default: return "#a855f7";                   // Roxo
  }
};
```

#### SatellitePanel (`/components/satellite/SatellitePanel.tsx`)

Painel de controle para análise de satélite:

- Seleção de fonte (Earth Engine, Sentinel, Planet)
- Seletor de datas (antes/depois)
- Calculadora de área e resolução
- Acompanhamento de progresso
- Exibição de resultados

#### AnalysisPanel (`/components/results/AnalysisPanel.tsx`)

Exibição de resultados da análise:

- Contador de mudanças totais
- Métricas de área afetada
- Breakdown por tipo de mudança
- Geração de relatório PDF

#### MetricsCards (`/components/results/MetricsCards.tsx`)

Cards de índices espectrais:

- NDVI (Vegetação)
- NDBI (Área construída)
- BSI (Solo exposto)
- NBR (Queimadas)
- Indicadores de direção de mudança
- Alertas de classificação

#### AIChatPanel (`/components/chat/AIChatPanel.tsx`)

Interface de chat com IA:

- Análise automática gerada
- Perguntas sugeridas
- Histórico de mensagens
- Chat em tempo real

#### TimeSeriesChart (`/components/charts/TimeSeriesChart.tsx`)

Gráfico de séries temporais:

- Visualização de múltiplos índices
- Toggle de visibilidade por índice
- Tooltips customizados
- Formatação de datas

#### ImageComparisonSlider (`/components/comparison/ImageComparisonSlider.tsx`)

Comparador de imagens antes/depois com slider interativo.

---

## Gerenciamento de Estado

### AnalysisContext (`/src/context/AnalysisContext.tsx`)

Context principal da aplicação:

```typescript
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
```

#### Funções Disponíveis

| Função | Descrição |
|--------|-----------|
| `uploadImageFile()` | Upload de imagens antes/depois |
| `startDetection()` | Iniciar análise com polling |
| `downloadSatellite()` | Download de imagens de satélite |
| `analyzeArea()` | Workflow completo (download + análise) |
| `setSelectedBounds()` | Atualizar seleção no mapa |
| `setIsSelectingBounds()` | Toggle modo de seleção |

#### Uso

```typescript
const {
  status,
  progress,
  summary,
  analyzeArea
} = useAnalysis();
```

---

## Integração com API

### Cliente HTTP (`/src/lib/api.ts`)

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
});
```

### Endpoints Principais

#### Imagens
- `POST /images/upload` - Upload de imagem
- `GET /images` - Listar imagens
- `GET /images/{id}` - Metadata da imagem
- `DELETE /images/{id}` - Deletar imagem

#### Análise
- `POST /analysis/compare` - Iniciar detecção
- `GET /analysis/{id}` - Status da análise
- `GET /analysis/{id}/result` - Resultados
- `GET /changes/{id}` - GeoJSON de mudanças
- `GET /changes/{id}/summary` - Estatísticas

#### Satélite
- `POST /satellite/download` - Download de imagens
- `GET /satellite/download/{taskId}` - Status do download
- `POST /satellite/analyze` - Análise síncrona

#### Google Earth Engine
- `POST /gee/analyze` - Iniciar análise GEE
- `GET /gee/{id}` - Status/resultados GEE
- `GET /gee/{id}/tiles` - URLs de tiles

#### Chat/IA
- `GET /chat/{id}/auto-analysis` - Análise automática
- `GET /chat/{id}/suggestions` - Perguntas sugeridas
- `POST /chat/ask` - Enviar pergunta

---

## Custom Hooks

### useGeeAnalysis (`/src/hooks/useGeeAnalysis.ts`)

Hook para análise Google Earth Engine com polling automático.

### useKeyboardShortcuts (`/src/hooks/useKeyboardShortcuts.ts`)

Atalhos de teclado globais:

| Atalho | Ação |
|--------|------|
| `Escape` | Fechar overlays |
| `Ctrl/Cmd + K` | Toggle chat |
| `Ctrl/Cmd + Enter` | Executar análise |
| `Ctrl/Cmd + M` | Toggle modo de visualização |

---

## Tipos TypeScript

### Tipos Principais (`/src/types/index.ts`)

```typescript
interface UploadedImage {
  id: string;
  filename: string;
  type: "before" | "after";
  uploadedAt: Date;
  previewUrl?: string;
}

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface ChangeSummary {
  totalChanges: number;
  totalArea: number;
  changesByType: Record<string, number>;
}

interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}
```

### Tipos GEE (`/src/types/gee.ts`)

```typescript
interface GeeAnalysisResult {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  indices: SpectralIndices;
  tileUrls: TileUrls;
}

interface SpectralIndices {
  ndvi: IndexDelta;
  ndbi: IndexDelta;
  bsi: IndexDelta;
  nbr: IndexDelta;
}
```

---

## Geração de PDF (`/src/lib/pdfReport.ts`)

Relatório PDF com:

- Comparação lado a lado de imagens
- Snapshot do mapa
- Tabela de estatísticas por tipo de mudança
- Formatação profissional com header/footer

---

## Fluxos de Trabalho

### 1. Modo Satélite

```
Selecionar área no mapa
    ↓
Escolher datas (antes/depois)
    ↓
analyzeArea() → Download + Análise
    ↓
Exibir resultados no painel
    ↓
Gerar relatório PDF (opcional)
```

### 2. Modo Upload

```
Upload imagem "antes"
    ↓
Upload imagem "depois"
    ↓
startDetection() → Polling de status
    ↓
Exibir mudanças no mapa
    ↓
Interagir com chat IA
```

---

## Variáveis de Ambiente

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## Scripts NPM

```bash
npm run dev      # Desenvolvimento (localhost:3000)
npm run build    # Build de produção
npm run start    # Iniciar produção
npm run lint     # Verificar código
```
