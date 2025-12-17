# Detector de Mudanças em Imagens de Satélite

Solução de visão computacional para comparar imagens de satélite capturadas em datas diferentes e identificar automaticamente mudanças no território.

## Funcionalidades

- Upload de imagens de satélite (antes/depois)
- Detecção automática de mudanças territoriais
- Identificação de alterações como:
  - Surgimento de entulho
  - Movimentação de solo
  - Construção de estruturas
  - Desmatamento
  - Expansão urbana
- Resultados georreferenciados (GeoJSON)
- Visualização interativa no mapa
- Timeline para explorar impacto ao longo do tempo

## Stack Tecnológica

### Backend
- FastAPI
- OpenCV
- Rasterio (GeoTIFF)
- GeoPandas/Shapely
- scikit-image

### Frontend
- Next.js 15
- Leaflet/MapLibre
- TailwindCSS
- shadcn/ui

## Estrutura do Projeto

```
hackathon-5/
├── backend/          # API FastAPI
├── frontend/         # Interface Next.js
├── docker-compose.yml
└── README.md
```

## Começando

### Pré-requisitos

- Python 3.11+
- Node.js 20+
- Docker (opcional)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker

```bash
docker-compose up --build
```

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/images/upload` | Upload de imagem |
| GET | `/api/v1/images/{id}` | Obter imagem |
| POST | `/api/v1/analysis/compare` | Comparar duas imagens |
| GET | `/api/v1/analysis/{id}` | Status da análise |
| GET | `/api/v1/changes/{analysis_id}` | Obter mudanças (GeoJSON) |

## Branches

- `main` - Produção estável
- `develop` - Integração de features
- `feature/*` - Novas funcionalidades
- `hotfix/*` - Correções urgentes
- `release/*` - Preparação de releases

## Licença

MIT
