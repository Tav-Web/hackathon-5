# Detector de Mudanças em Imagens de Satélite

[![CI](https://github.com/Tav-Web/hackathon-5/actions/workflows/ci.yml/badge.svg)](https://github.com/Tav-Web/hackathon-5/actions/workflows/ci.yml)

Solução de visão computacional para comparar imagens de satélite capturadas em datas diferentes e identificar automaticamente mudanças no território.

## Funcionalidades

- Upload de imagens de satélite (antes/depois)
- Detecção automática de mudanças territoriais usando OpenCV
- Classificação de alterações:
  - Construção de estruturas
  - Desmatamento
  - Crescimento de vegetação
  - Movimentação de solo
  - Surgimento de entulho
  - Expansão urbana
- Resultados georreferenciados (GeoJSON)
- Visualização interativa no mapa com Leaflet
- Timeline Slider para comparar antes/depois
- Processamento assíncrono com Celery

## Stack Tecnológica

### Backend
- **FastAPI** - Framework web assíncrono
- **PostgreSQL + PostGIS** - Banco de dados com suporte geoespacial
- **SQLAlchemy + GeoAlchemy2** - ORM com extensões geográficas
- **OpenCV + scikit-image** - Processamento de imagens
- **Celery + Redis** - Processamento assíncrono de tarefas
- **MinIO** - Armazenamento de objetos (S3-compatible)

### Frontend
- **Next.js 15** - Framework React com SSR
- **React 19** - Biblioteca de UI
- **Leaflet** - Mapas interativos
- **TailwindCSS** - Estilização
- **TypeScript** - Tipagem estática

## Estrutura do Projeto

```
hackathon-5/
├── .github/workflows/      # GitHub Actions CI
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/  # API endpoints
│   │   ├── db/                # Database config
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   ├── tasks/             # Celery tasks
│   │   ├── celery_app.py      # Celery config
│   │   ├── config.py          # Settings
│   │   └── main.py            # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js pages
│   │   ├── components/        # React components
│   │   │   ├── map/           # MapView
│   │   │   ├── upload/        # ImageUpload
│   │   │   ├── results/       # AnalysisPanel
│   │   │   └── timeline/      # TimelineSlider
│   │   ├── lib/               # API client
│   │   └── types/             # TypeScript types
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml         # Full stack
├── docker-compose.infra.yml   # Infrastructure only
└── README.md
```

## Começando

### Pré-requisitos

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose

### Opção 1: Docker Compose (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/Tav-Web/hackathon-5.git
cd hackathon-5

# Copie os arquivos de ambiente
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Inicie todos os serviços
docker-compose up --build
```

Acesse:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/v1/docs
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin123)

### Opção 2: Desenvolvimento Local

#### 1. Inicie a infraestrutura

```bash
docker-compose -f docker-compose.infra.yml up -d
```

#### 2. Backend

```bash
cd backend

# Crie e ative o ambiente virtual
python -m venv .venv

# Linux/Mac:
source .venv/bin/activate

# Windows (PowerShell):
.venv\Scripts\activate

# Instale as dependências
pip install -r requirements.txt

# Copie e configure o .env
cp .env.example .env

# Inicie o servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Celery Worker (em outro terminal)

```bash
cd backend
source .venv/bin/activate  # ou .venv\Scripts\activate no Windows

# Linux/Mac:
celery -A app.celery_app worker --loglevel=info

# Windows:
celery -A app.celery_app worker --loglevel=info --pool=solo
```

#### 4. Frontend

```bash
cd frontend

# Instale as dependências (com flag para resolver conflitos de peer deps)
npm install --legacy-peer-deps

# Copie e configure o .env
cp .env.example .env

# Inicie o servidor de desenvolvimento
npm run dev
```

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/v1/images/upload` | Upload de imagem |
| `GET` | `/api/v1/images` | Listar imagens |
| `GET` | `/api/v1/images/{id}` | Obter imagem |
| `DELETE` | `/api/v1/images/{id}` | Excluir imagem |
| `POST` | `/api/v1/analysis/compare` | Iniciar análise |
| `GET` | `/api/v1/analysis/{id}` | Status da análise |
| `GET` | `/api/v1/analysis/{id}/result` | Resultado completo |
| `GET` | `/api/v1/changes/{analysis_id}` | Mudanças (GeoJSON) |
| `GET` | `/api/v1/changes/{analysis_id}/summary` | Resumo das mudanças |

## Fluxo de Uso

1. Faça upload de duas imagens de satélite (antes e depois)
2. Clique em "Detectar Mudanças"
3. Aguarde o processamento (acompanhe o progresso)
4. Visualize as mudanças detectadas no mapa
5. Use o Timeline Slider para comparar as imagens
6. Clique nas áreas para ver detalhes

## Variáveis de Ambiente

### Backend (.env)

```env
# API
ENVIRONMENT=development
DEBUG=true
API_V1_PREFIX=/api/v1
PROJECT_NAME=Change Detector API

# Database
DATABASE_URL=postgresql://hackathon:hackathon123@localhost:5432/hackathon

# CORS
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_BUCKET=hackathon
MINIO_SECURE=false

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Frontend (.env)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## CI/CD

O projeto utiliza GitHub Actions para integração contínua:

- **Backend**: Verifica imports e dependências com PostgreSQL, Redis e MinIO
- **Frontend**: Lint com ESLint e build de produção

A CI roda automaticamente em:
- Pull requests para `develop` e `main`
- Push para `develop` e `main`

## Branches

- `main` - Produção estável
- `develop` - Integração de features
- `feature/*` - Novas funcionalidades
- `hotfix/*` - Correções urgentes
- `release/*` - Preparação de releases

## Licença

MIT
