# Tasks - Detector de Mudanças em Imagens de Satélite

**Hackathon 5 | 2 Desenvolvedores | 3-5 dias**

---

## Legenda

- ⬜ Pendente
- 🔄 Em progresso
- ✅ Concluído
- 🔗 Depende de
- 🚫 Bloqueado

---

# 👤 DEV 1 - BACKEND (Python/FastAPI)

---

## B1. INFRAESTRUTURA E CONFIGURAÇÃO

### B1.1 Completar dependências no requirements.txt
**Status:** ✅ Concluído
**Arquivo:** `backend/requirements.txt`
**Depende de:** Nenhuma

**Requisitos:**
- Adicionar `earthengine-api>=0.1.390` para integração com Google Earth Engine
- Adicionar `google-auth>=2.20.0` para autenticação GCP
- Adicionar `openai>=1.0.0` para cliente OpenRouter (compatível)
- Adicionar `httpx>=0.25.0` para requisições HTTP assíncronas

**Critérios de Aceite:**
- [ ] `pip install -r requirements.txt` executa sem erros
- [ ] Imports `import ee`, `from openai import OpenAI` funcionam

---

### B1.2 Configurar variáveis de ambiente
**Status:** ✅ Concluído
**Arquivo:** `backend/.env`
**Depende de:** Nenhuma

**Requisitos:**
Adicionar as seguintes variáveis ao `.env`:

```env
# Google Earth Engine
GEE_PROJECT_ID=ee-hackathon5
GEE_SERVICE_ACCOUNT_KEY=  # Vazio = usa auth pessoal (ee.Authenticate)

# OpenRouter (LLM)
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=google/gemini-3-flash-preview
```

**Critérios de Aceite:**
- [ ] Variáveis carregadas corretamente pelo pydantic-settings
- [ ] API key do OpenRouter não exposta em logs

---

### B1.3 Atualizar config.py com novas settings
**Status:** ✅ Concluído
**Arquivo:** `backend/app/config.py`
**Depende de:** B1.2

**Requisitos:**
Adicionar à classe `Settings`:

```python
# Google Earth Engine
GEE_PROJECT_ID: str = "ee-hackathon5"
GEE_SERVICE_ACCOUNT_KEY: str = ""  # Path para JSON ou vazio para auth pessoal

# OpenRouter (LLM)
OPENROUTER_API_KEY: str = ""
OPENROUTER_MODEL: str = "google/gemini-3-flash-preview"
```

**Critérios de Aceite:**
- [ ] `from app.config import settings` funciona
- [ ] `settings.GEE_PROJECT_ID` retorna valor correto
- [ ] `settings.OPENROUTER_API_KEY` carrega do `.env`

---

## B2. SERVIÇO GOOGLE EARTH ENGINE

### B2.1 Criar gee_service.py - Classe base e inicialização
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/services/gee_service.py`
**Depende de:** B1.3

**Requisitos Funcionais:**
1. Criar classe `GeeService` como singleton
2. Inicializar Earth Engine no construtor
3. Suportar 2 modos de autenticação:
   - **Service Account:** Se `GEE_SERVICE_ACCOUNT_KEY` tem path para JSON
   - **Pessoal:** Se vazio, assume que usuário rodou `earthengine authenticate`
4. Tratar erros de autenticação com mensagens claras

**Especificação:**

```python
import ee
from app.config import settings

class GeeService:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not GeeService._initialized:
            self._initialize_ee()
            GeeService._initialized = True

    def _initialize_ee(self):
        """
        Inicializa o Earth Engine.

        Fluxo:
        1. Se GEE_SERVICE_ACCOUNT_KEY definido → usa service account
        2. Senão → assume autenticação pessoal já feita

        Raises:
            RuntimeError: Se falhar autenticação
        """
        try:
            if settings.GEE_SERVICE_ACCOUNT_KEY:
                credentials = ee.ServiceAccountCredentials(
                    email=None,  # Extraído do JSON
                    key_file=settings.GEE_SERVICE_ACCOUNT_KEY
                )
                ee.Initialize(credentials, project=settings.GEE_PROJECT_ID)
            else:
                ee.Initialize(project=settings.GEE_PROJECT_ID)
        except Exception as e:
            raise RuntimeError(f"Falha ao inicializar Earth Engine: {e}")

    def is_ready(self) -> bool:
        """Verifica se GEE está inicializado e funcionando."""
        try:
            ee.Number(1).getInfo()
            return True
        except:
            return False
```

**Critérios de Aceite:**
- [ ] `GeeService()` inicializa sem erros (com auth pessoal configurada)
- [ ] `gee_service.is_ready()` retorna `True`
- [ ] Segunda instância retorna mesmo objeto (singleton)
- [ ] Erro claro se autenticação falhar

---

### B2.2 Implementar busca de imagens Sentinel-2
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/services/gee_service.py`
**Depende de:** B2.1

**Requisitos Funcionais:**
1. Buscar coleção `COPERNICUS/S2_SR_HARMONIZED` (Surface Reflectance)
2. Filtrar por:
   - Geometria (área de interesse)
   - Período (start_date a end_date)
   - Cobertura de nuvens máxima
3. Retornar metadados sobre quantidade de imagens encontradas

**Especificação:**

```python
def get_sentinel2_collection(
    self,
    geometry: ee.Geometry,
    start_date: str,  # "YYYY-MM-DD"
    end_date: str,    # "YYYY-MM-DD"
    max_cloud_cover: int = 20
) -> tuple[ee.ImageCollection, int]:
    """
    Busca coleção Sentinel-2 filtrada.

    Args:
        geometry: Área de interesse (Polygon ou Point com buffer)
        start_date: Data inicial no formato "YYYY-MM-DD"
        end_date: Data final no formato "YYYY-MM-DD"
        max_cloud_cover: Percentual máximo de nuvens (0-100)

    Returns:
        Tuple de (ImageCollection filtrada, número de imagens)

    Exemplo:
        geometry = ee.Geometry.Point([-43.17, -22.90]).buffer(1000)
        collection, count = gee.get_sentinel2_collection(
            geometry, "2023-01-01", "2023-12-31", max_cloud_cover=20
        )
    """
    collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(geometry)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud_cover))
    )

    count = collection.size().getInfo()
    return collection, count
```

**Critérios de Aceite:**
- [ ] Retorna ImageCollection válida para área do Rio de Janeiro
- [ ] Count corresponde ao número real de imagens
- [ ] Filtro de nuvens funciona (menos imagens com threshold menor)
- [ ] Período de 2017+ funciona (Sentinel-2 disponível)

---

### B2.3 Implementar máscara de nuvens (QA60)
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/services/gee_service.py`
**Depende de:** B2.1

**Requisitos Funcionais:**
1. Usar banda QA60 do Sentinel-2 para detectar nuvens
2. Bit 10 = nuvens opacas, Bit 11 = cirrus
3. Mascarar pixels com nuvens (tornar transparentes)
4. Preservar metadados da imagem original

**Especificação:**

```python
def _mask_clouds(self, image: ee.Image) -> ee.Image:
    """
    Remove nuvens de imagem Sentinel-2 usando banda QA60.

    A banda QA60 contém flags de qualidade:
    - Bit 10: Nuvens opacas
    - Bit 11: Cirrus

    Pixels com nuvens são mascarados (valor null).

    Args:
        image: Imagem Sentinel-2 com banda QA60

    Returns:
        Imagem com nuvens mascaradas, bandas divididas por 10000
    """
    qa = image.select('QA60')

    # Bits 10 e 11 são nuvens e cirrus
    cloud_bit_mask = 1 << 10  # 1024
    cirrus_bit_mask = 1 << 11  # 2048

    # Máscara onde NÃO há nuvens
    mask = (
        qa.bitwiseAnd(cloud_bit_mask).eq(0)
        .And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
    )

    # Aplica máscara e normaliza valores (SR são 0-10000)
    return (
        image.updateMask(mask)
        .divide(10000)  # Normaliza para 0-1
        .copyProperties(image, ['system:time_start'])
    )
```

**Critérios de Aceite:**
- [ ] Imagens com nuvens têm pixels mascarados
- [ ] Valores das bandas ficam entre 0 e 1 após normalização
- [ ] Metadado `system:time_start` preservado
- [ ] Funciona com `.map(self._mask_clouds)` na coleção

---

### B2.4 Implementar cálculo de índices espectrais
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/services/gee_service.py`
**Depende de:** B2.1

**Requisitos Funcionais:**
Calcular 4 índices espectrais para cada imagem:

| Índice | Fórmula | Bandas Sentinel-2 | Range | Interpretação |
|--------|---------|-------------------|-------|---------------|
| NDVI | (NIR-RED)/(NIR+RED) | (B8-B4)/(B8+B4) | -1 a 1 | Vegetação (>0.3 = verde) |
| NDBI | (SWIR-NIR)/(SWIR+NIR) | (B11-B8)/(B11+B8) | -1 a 1 | Construção (>0 = urbano) |
| BSI | ((SWIR+RED)-(NIR+BLUE))/((SWIR+RED)+(NIR+BLUE)) | ((B11+B4)-(B8+B2))/((B11+B4)+(B8+B2)) | -1 a 1 | Solo exposto (>0 = solo) |
| NBR | (NIR-SWIR2)/(NIR+SWIR2) | (B8-B12)/(B8+B12) | -1 a 1 | Queimada (queda = fogo) |

**Especificação:**

```python
def compute_indices(self, image: ee.Image) -> ee.Image:
    """
    Calcula índices espectrais e adiciona como novas bandas.

    Bandas Sentinel-2 usadas:
    - B2: Blue (490nm)
    - B4: Red (665nm)
    - B8: NIR (842nm)
    - B11: SWIR1 (1610nm)
    - B12: SWIR2 (2190nm)

    Args:
        image: Imagem Sentinel-2 normalizada (0-1)

    Returns:
        Imagem com bandas adicionais: NDVI, NDBI, BSI, NBR
    """
    # NDVI - Vegetação
    ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')

    # NDBI - Área construída
    ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI')

    # BSI - Solo exposto (Bare Soil Index)
    bsi = image.expression(
        '((SWIR + RED) - (NIR + BLUE)) / ((SWIR + RED) + (NIR + BLUE))',
        {
            'SWIR': image.select('B11'),
            'RED': image.select('B4'),
            'NIR': image.select('B8'),
            'BLUE': image.select('B2')
        }
    ).rename('BSI')

    # NBR - Queimadas (Normalized Burn Ratio)
    nbr = image.normalizedDifference(['B8', 'B12']).rename('NBR')

    return image.addBands([ndvi, ndbi, bsi, nbr])
```

**Critérios de Aceite:**
- [ ] Todos os índices retornam valores entre -1 e 1
- [ ] NDVI alto (>0.5) em áreas verdes conhecidas (ex: Floresta da Tijuca)
- [ ] NDBI alto (>0) em áreas urbanas (ex: Centro do Rio)
- [ ] Imagem resultante tem bandas: B2, B3, B4, B8, B11, B12, NDVI, NDBI, BSI, NBR

---

### B2.5 Implementar extração de série temporal
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/services/gee_service.py`
**Depende de:** B2.4

**Requisitos Funcionais:**
1. Extrair valores médios dos índices para cada data
2. Retornar lista ordenada por data
3. Tratar imagens sem dados (nuvens) retornando null
4. Limitar escala para performance (10m padrão do Sentinel-2)

**Especificação:**

```python
def get_time_series(
    self,
    collection: ee.ImageCollection,
    geometry: ee.Geometry,
    scale: int = 10
) -> list[dict]:
    """
    Extrai série temporal de índices espectrais.

    Para cada imagem na coleção, calcula a média dos índices
    dentro da geometria especificada.

    Args:
        collection: ImageCollection com índices calculados
        geometry: Área para calcular média
        scale: Resolução em metros (default: 10m)

    Returns:
        Lista de dicts ordenada por data:
        [
            {
                "date": "2023-01-15",
                "ndvi": 0.45,
                "ndbi": -0.12,
                "bsi": -0.23,
                "nbr": 0.38
            },
            ...
        ]

        Valores podem ser None se região coberta por nuvens.
    """
    def extract_values(image):
        # Calcula média de cada índice na região
        stats = image.select(['NDVI', 'NDBI', 'BSI', 'NBR']).reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=scale,
            maxPixels=1e9
        )

        # Cria feature com data e valores
        return ee.Feature(None, stats).set(
            'date', image.date().format('YYYY-MM-dd')
        )

    # Mapeia extração e converte para lista Python
    features = collection.map(extract_values)
    feature_list = features.getInfo()['features']

    # Formata resultado
    result = []
    for f in feature_list:
        props = f['properties']
        result.append({
            'date': props.get('date'),
            'ndvi': props.get('NDVI'),
            'ndbi': props.get('NDBI'),
            'bsi': props.get('BSI'),
            'nbr': props.get('NBR'),
        })

    # Ordena por data
    result.sort(key=lambda x: x['date'])
    return result
```

**Critérios de Aceite:**
- [ ] Retorna lista com uma entrada por imagem
- [ ] Datas estão no formato "YYYY-MM-DD"
- [ ] Valores são float ou None
- [ ] Lista ordenada cronologicamente
- [ ] Performance aceitável (<30s para 1 ano de dados)

---

### B2.6 Implementar comparação de períodos
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/services/gee_service.py`
**Depende de:** B2.4, B2.5

**Requisitos Funcionais:**
1. Dividir período em "início" (primeiros 20%) e "fim" (últimos 20%)
2. Calcular mediana de cada índice em cada período
3. Calcular deltas (fim - início)
4. Retornar valores de início, fim e deltas

**Especificação:**

```python
def compare_periods(
    self,
    geometry: ee.Geometry,
    start_date: str,
    end_date: str,
    cloud_tolerance: int = 20
) -> dict:
    """
    Compara índices espectrais entre início e fim do período.

    Divide o período em duas partes e calcula a mediana de cada
    índice em cada parte. Retorna os valores e as diferenças.

    Args:
        geometry: Área de análise
        start_date: Data inicial "YYYY-MM-DD"
        end_date: Data final "YYYY-MM-DD"
        cloud_tolerance: % máximo de nuvens

    Returns:
        {
            "images_found": 45,
            "indices_start": {"ndvi": 0.65, "ndbi": -0.15, "bsi": -0.20, "nbr": 0.55},
            "indices_end": {"ndvi": 0.35, "ndbi": 0.10, "bsi": 0.05, "nbr": 0.30},
            "deltas": {"ndvi": -0.30, "ndbi": 0.25, "bsi": 0.25, "nbr": -0.25}
        }
    """
    # Busca coleção completa
    collection, count = self.get_sentinel2_collection(
        geometry, start_date, end_date, cloud_tolerance
    )

    # Aplica pré-processamento
    processed = collection.map(self._mask_clouds).map(self.compute_indices)

    # Divide período em início (20%) e fim (20%)
    from datetime import datetime, timedelta
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    total_days = (end - start).days
    period_days = max(30, total_days // 5)  # Mínimo 30 dias

    start_end = start + timedelta(days=period_days)
    end_start = end - timedelta(days=period_days)

    # Filtra coleções por período
    start_collection = processed.filterDate(
        start_date,
        start_end.strftime("%Y-%m-%d")
    )
    end_collection = processed.filterDate(
        end_start.strftime("%Y-%m-%d"),
        end_date
    )

    # Calcula mediana de cada período
    start_median = start_collection.median()
    end_median = end_collection.median()

    # Extrai valores médios na geometria
    def get_mean_values(image):
        return image.select(['NDVI', 'NDBI', 'BSI', 'NBR']).reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=10,
            maxPixels=1e9
        ).getInfo()

    start_values = get_mean_values(start_median)
    end_values = get_mean_values(end_median)

    # Calcula deltas
    deltas = {}
    for key in ['NDVI', 'NDBI', 'BSI', 'NBR']:
        s = start_values.get(key) or 0
        e = end_values.get(key) or 0
        deltas[key.lower()] = round(e - s, 4)

    return {
        "images_found": count,
        "indices_start": {k.lower(): round(v, 4) if v else None for k, v in start_values.items()},
        "indices_end": {k.lower(): round(v, 4) if v else None for k, v in end_values.items()},
        "deltas": deltas
    }
```

**Critérios de Aceite:**
- [ ] Retorna todos os campos especificados
- [ ] Deltas = end - start (negativo significa diminuição)
- [ ] Valores arredondados para 4 casas decimais
- [ ] Funciona para períodos de 6 meses a 5 anos
- [ ] Trata caso de poucas imagens em um período

---

### B2.7 Implementar geração de tile URLs
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/services/gee_service.py`
**Depende de:** B2.1

**Requisitos Funcionais:**
1. Gerar URL de tiles XYZ para visualização no Leaflet
2. Suportar visualização RGB (true color) e índices (falsecolor)
3. URLs devem ser válidas por tempo limitado (segurança)

**Especificação:**

```python
def get_tile_url(
    self,
    geometry: ee.Geometry,
    date: str,
    visualization: str = "rgb"
) -> str | None:
    """
    Gera URL de tiles para visualização no mapa.

    Args:
        geometry: Área para buscar imagem
        date: Data aproximada "YYYY-MM-DD" (busca ±15 dias)
        visualization: "rgb" para true color, "ndvi" para vegetação

    Returns:
        URL no formato: https://earthengine.googleapis.com/v1/.../{z}/{x}/{y}
        ou None se não encontrar imagem

    Exemplo de uso no Leaflet:
        L.tileLayer(url, {maxZoom: 18}).addTo(map)
    """
    from datetime import datetime, timedelta

    # Busca imagem próxima da data
    target = datetime.strptime(date, "%Y-%m-%d")
    start = (target - timedelta(days=15)).strftime("%Y-%m-%d")
    end = (target + timedelta(days=15)).strftime("%Y-%m-%d")

    collection, count = self.get_sentinel2_collection(geometry, start, end)
    if count == 0:
        return None

    # Pega imagem com menos nuvens
    image = collection.sort('CLOUDY_PIXEL_PERCENTAGE').first()
    image = self._mask_clouds(image)

    # Define visualização
    if visualization == "rgb":
        vis_params = {
            'bands': ['B4', 'B3', 'B2'],
            'min': 0,
            'max': 0.3,
            'gamma': 1.2
        }
    elif visualization == "ndvi":
        image = self.compute_indices(image)
        vis_params = {
            'bands': ['NDVI'],
            'min': -0.2,
            'max': 0.8,
            'palette': ['red', 'yellow', 'green', 'darkgreen']
        }
    else:
        vis_params = {
            'bands': ['B4', 'B3', 'B2'],
            'min': 0,
            'max': 0.3
        }

    # Gera URL de tiles
    map_id = image.getMapId(vis_params)
    return map_id['tile_fetcher'].url_format
```

**Critérios de Aceite:**
- [ ] URL retornada é válida e carrega tiles
- [ ] Visualização RGB mostra cores naturais
- [ ] Visualização NDVI mostra gradiente vermelho→verde
- [ ] URL funciona no Leaflet.TileLayer

---

## B3. CLASSIFICADOR DE MUDANÇAS

### B3.1 Criar change_classifier.py
**Status:** ✅ Concluído
**Arquivo:** `backend/app/services/change_classifier.py`
**Depende de:** Nenhuma

**Requisitos Funcionais:**
Classificar mudanças territoriais baseado em regras de variação dos índices:

| Classificação | Regra | Alert Level |
|--------------|-------|-------------|
| NOVA_CONSTRUCAO | ΔNDVI < -0.15 AND ΔNDBI > 0.10 | warning |
| ENTULHO | ΔNDVI < -0.15 AND ΔBSI > 0.15 AND ΔNDBI < 0.10 | critical |
| QUEIMADA | ΔNBR < -0.25 AND ΔNDVI < -0.15 | critical |
| DESMATAMENTO | ΔNDVI < -0.20 | critical |
| REFLORESTAMENTO | ΔNDVI > 0.15 | success |
| EXPANSAO_URBANA | ΔNDVI < -0.15 AND ΔNDBI > 0.05 AND ΔBSI > 0.05 | warning |
| SEM_MUDANCA | Nenhuma regra atingida | info |

**Especificação:**

```python
from dataclasses import dataclass
from enum import Enum

class ChangeType(str, Enum):
    NOVA_CONSTRUCAO = "NOVA_CONSTRUCAO"
    ENTULHO = "ENTULHO"
    QUEIMADA = "QUEIMADA"
    DESMATAMENTO = "DESMATAMENTO"
    REFLORESTAMENTO = "REFLORESTAMENTO"
    EXPANSAO_URBANA = "EXPANSAO_URBANA"
    SEM_MUDANCA = "SEM_MUDANCA"

@dataclass
class ClassificationResult:
    change_type: ChangeType
    confidence: float  # 0.0 a 1.0
    description: str
    alert_level: str  # "critical", "warning", "info", "success"

class ChangeClassifier:
    def classify(
        self,
        delta_ndvi: float,
        delta_ndbi: float,
        delta_bsi: float,
        delta_nbr: float
    ) -> ClassificationResult:
        """
        Classifica tipo de mudança baseado nos deltas.

        Ordem de avaliação importa (mais específico primeiro):
        1. Queimada (NBR é mais específico)
        2. Nova construção
        3. Entulho
        4. Expansão urbana
        5. Desmatamento
        6. Reflorestamento
        7. Sem mudança
        """
        # Implementação das regras...
```

**Critérios de Aceite:**
- [ ] Todas as 7 classificações retornam resultado válido
- [ ] Confidence calculada baseada na magnitude dos deltas
- [ ] Descrições são claras e informativas
- [ ] Regras aplicadas na ordem correta de prioridade

---

## B4. SERVIÇO LLM (OPENROUTER)

### B4.1 Criar llm_service.py - Classe base
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/services/llm_service.py`
**Depende de:** B1.3

**Requisitos Funcionais:**
1. Usar cliente OpenAI apontando para OpenRouter
2. Configurar modelo `google/gemini-3-flash-preview`
3. Implementar retry com backoff para erros de rate limit
4. Tratar timeouts graciosamente

**Especificação:**

```python
from openai import OpenAI
from app.config import settings

class LLMService:
    def __init__(self):
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY,
            default_headers={
                "HTTP-Referer": "https://hackathon5.example.com",
                "X-Title": "Detector de Mudanças Territoriais"
            }
        )
        self.model = settings.OPENROUTER_MODEL

    def _chat(
        self,
        messages: list[dict],
        max_tokens: int = 1000,
        temperature: float = 0.7
    ) -> str:
        """
        Envia mensagens para o modelo e retorna resposta.

        Args:
            messages: Lista de {"role": "system|user|assistant", "content": "..."}
            max_tokens: Limite de tokens na resposta
            temperature: Criatividade (0=determinístico, 1=criativo)

        Returns:
            Texto da resposta do modelo

        Raises:
            LLMError: Se falhar após retries
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature
            )
            return response.choices[0].message.content
        except Exception as e:
            raise LLMError(f"Erro ao chamar LLM: {e}")
```

**Critérios de Aceite:**
- [ ] Conexão com OpenRouter funciona
- [ ] Resposta retornada em menos de 30s
- [ ] Erros tratados com mensagens claras
- [ ] Headers corretos para OpenRouter

---

### B4.2 Implementar análise automática
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/services/llm_service.py`
**Depende de:** B4.1

**Requisitos Funcionais:**
1. Gerar análise descritiva das mudanças detectadas
2. Contextualizar os valores dos índices
3. Explicar impactos potenciais
4. Usar linguagem acessível (não técnica demais)

**Especificação:**

```python
def analyze_changes(self, analysis_result: dict) -> str:
    """
    Gera análise descritiva das mudanças detectadas.

    Args:
        analysis_result: {
            "classification": "DESMATAMENTO",
            "confidence": 0.85,
            "indices_start": {"ndvi": 0.65, ...},
            "indices_end": {"ndvi": 0.35, ...},
            "deltas": {"ndvi": -0.30, ...},
            "start_date": "2022-01-01",
            "end_date": "2024-01-01",
            "location": {"lat": -22.90, "lng": -43.17}  # Opcional
        }

    Returns:
        Texto de análise com 2-4 parágrafos explicando:
        - O que foi detectado
        - Magnitude da mudança
        - Possíveis causas
        - Impactos potenciais
    """
    system_prompt = """Você é um especialista em análise de mudanças territoriais
    usando imagens de satélite. Analise os dados fornecidos e gere um relatório
    claro e informativo em português brasileiro.

    Diretrizes:
    - Use linguagem acessível, evite jargões técnicos
    - Explique o significado prático dos índices
    - Contextualize a magnitude das mudanças
    - Mencione possíveis causas e impactos
    - Seja objetivo mas informativo (2-4 parágrafos)
    """

    user_prompt = f"""Analise esta mudança territorial detectada:

    Período: {analysis_result['start_date']} a {analysis_result['end_date']}
    Classificação: {analysis_result['classification']}
    Confiança: {analysis_result['confidence']*100:.0f}%

    Índices no início do período:
    - NDVI (vegetação): {analysis_result['indices_start']['ndvi']:.2f}
    - NDBI (construção): {analysis_result['indices_start']['ndbi']:.2f}
    - BSI (solo exposto): {analysis_result['indices_start']['bsi']:.2f}
    - NBR (queimada): {analysis_result['indices_start']['nbr']:.2f}

    Índices no final do período:
    - NDVI: {analysis_result['indices_end']['ndvi']:.2f}
    - NDBI: {analysis_result['indices_end']['ndbi']:.2f}
    - BSI: {analysis_result['indices_end']['bsi']:.2f}
    - NBR: {analysis_result['indices_end']['nbr']:.2f}

    Variações (Δ):
    - ΔNDVI: {analysis_result['deltas']['ndvi']:+.2f}
    - ΔNDBI: {analysis_result['deltas']['ndbi']:+.2f}
    - ΔBSI: {analysis_result['deltas']['bsi']:+.2f}
    - ΔNBR: {analysis_result['deltas']['nbr']:+.2f}

    Gere uma análise explicativa."""

    return self._chat([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ])
```

**Critérios de Aceite:**
- [ ] Análise gerada em português brasileiro
- [ ] Texto tem 2-4 parágrafos
- [ ] Explica o que significa a classificação
- [ ] Menciona possíveis causas/impactos
- [ ] Linguagem acessível para não-especialistas

---

### B4.3 Implementar resposta a perguntas
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/services/llm_service.py`
**Depende de:** B4.1

**Requisitos Funcionais:**
1. Responder perguntas sobre a análise específica
2. Usar contexto da análise para respostas precisas
3. Admitir quando não souber (não inventar dados)
4. Manter histórico da conversa

**Especificação:**

```python
def answer_question(
    self,
    question: str,
    analysis_context: dict,
    conversation_history: list[dict] = None
) -> str:
    """
    Responde pergunta do usuário sobre a análise.

    Args:
        question: Pergunta do usuário
        analysis_context: Dados da análise (mesmo formato de analyze_changes)
        conversation_history: Mensagens anteriores [{"role": "...", "content": "..."}]

    Returns:
        Resposta à pergunta

    Exemplos de perguntas esperadas:
    - "Qual o impacto ambiental dessa mudança?"
    - "O que pode ter causado essa alteração?"
    - "Essa mudança é reversível?"
    - "Quais áreas vizinhas podem ser afetadas?"
    """
    system_prompt = """Você é um assistente especializado em análise territorial.
    Responda perguntas sobre a análise de mudanças fornecida.

    Regras:
    - Baseie suas respostas nos dados fornecidos
    - Se não souber algo, admita claramente
    - Seja conciso mas informativo
    - Use português brasileiro
    - Evite especulações não fundamentadas nos dados
    """

    context_prompt = f"""Contexto da análise:
    Classificação: {analysis_context['classification']}
    Período: {analysis_context['start_date']} a {analysis_context['end_date']}
    Variações: ΔNDVI={analysis_context['deltas']['ndvi']:+.2f},
               ΔNDBI={analysis_context['deltas']['ndbi']:+.2f}
    """

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": context_prompt}
    ]

    # Adiciona histórico se existir
    if conversation_history:
        messages.extend(conversation_history)

    # Adiciona pergunta atual
    messages.append({"role": "user", "content": question})

    return self._chat(messages, max_tokens=500)
```

**Critérios de Aceite:**
- [ ] Responde perguntas de forma contextualizada
- [ ] Usa dados da análise nas respostas
- [ ] Admite quando não sabe algo
- [ ] Mantém coerência com histórico da conversa

---

## B5. SCHEMAS E MODELS

### B5.1 Criar schemas/gee.py
**Status:** ✅ Concluído
**Arquivo:** `backend/app/schemas/gee.py`
**Depende de:** Nenhuma

**Especificação resumida:**
- `GeeAnalysisCreate`: Request para criar análise
- `GeeAnalysisResponse`: Response com todos os dados
- `SpectralIndices`: Valores de NDVI, NDBI, BSI, NBR
- `TimeSeriesPoint`: Ponto da série temporal
- `ClassificationResult`: Resultado da classificação

---

### B5.2 Criar schemas/chat.py
**Status:** ✅ Concluído
**Arquivo:** `backend/app/schemas/chat.py`
**Depende de:** Nenhuma

**Especificação resumida:**
- `ChatRequest`: Pergunta do usuário
- `ChatResponse`: Resposta da IA
- `AutoAnalysisResponse`: Análise automática
- `SuggestedQuestion`: Sugestão de pergunta

---

### B5.3 Criar model gee_analysis.py
**Status:** ✅ Concluído
**Arquivo:** `backend/app/models/gee_analysis.py`
**Depende de:** Nenhuma

**Especificação resumida:**
- Modelo SQLAlchemy `GeeAnalysis`
- Campos para geometria, período, índices, classificação
- Campo JSONB para série temporal
- Timestamps de criação e conclusão

---

## B6. API ENDPOINTS

### B6.1 Criar endpoints/gee.py
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/api/v1/endpoints/gee.py`
**Depende de:** B5.1, B5.3, B2.6

**Requisitos Funcionais:**

#### POST /api/v1/gee/analyze
Inicia uma nova análise GEE.

**Request:**
```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-43.2, -22.9], [-43.1, -22.9], [-43.1, -22.8], [-43.2, -22.8], [-43.2, -22.9]]]
  },
  "start_date": "2022-01-01",
  "end_date": "2024-01-01",
  "cloud_tolerance": 20
}
```

**Response (202 Accepted):**
```json
{
  "id": 123,
  "status": "pending",
  "progress": 0,
  "message": "Análise iniciada. Use GET /gee/123 para acompanhar."
}
```

**Comportamento:**
1. Valida geometria e datas
2. Cria registro no banco com status "pending"
3. Enfileira task Celery
4. Retorna ID imediatamente

---

#### GET /api/v1/gee/{analysis_id}
Retorna status e resultado da análise.

**Response (200 OK) - Em progresso:**
```json
{
  "id": 123,
  "status": "processing",
  "progress": 45,
  "images_found": 32
}
```

**Response (200 OK) - Concluída:**
```json
{
  "id": 123,
  "status": "completed",
  "progress": 100,
  "images_found": 32,
  "classification": {
    "change_type": "DESMATAMENTO",
    "confidence": 0.85,
    "description": "Redução significativa de cobertura vegetal.",
    "alert_level": "critical"
  },
  "indices_start": {"ndvi": 0.65, "ndbi": -0.15, "bsi": -0.20, "nbr": 0.55},
  "indices_end": {"ndvi": 0.35, "ndbi": 0.10, "bsi": 0.05, "nbr": 0.30},
  "deltas": {"ndvi": -0.30, "ndbi": 0.25, "bsi": 0.25, "nbr": -0.25},
  "time_series": [
    {"date": "2022-01-15", "ndvi": 0.64, "ndbi": -0.14, "bsi": -0.19, "nbr": 0.54},
    {"date": "2022-02-01", "ndvi": 0.62, "ndbi": -0.12, "bsi": -0.18, "nbr": 0.52}
  ],
  "ai_analysis": "A área analisada apresentou redução significativa...",
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:32:45Z"
}
```

---

#### GET /api/v1/gee/{analysis_id}/tiles
Retorna URLs de tiles para visualização.

**Response:**
```json
{
  "tile_url_before": "https://earthengine.googleapis.com/...",
  "tile_url_after": "https://earthengine.googleapis.com/...",
  "tile_url_ndvi_before": "https://earthengine.googleapis.com/...",
  "tile_url_ndvi_after": "https://earthengine.googleapis.com/..."
}
```

**Critérios de Aceite:**
- [ ] POST retorna 202 e ID imediatamente
- [ ] GET retorna progresso atualizado
- [ ] GET com análise concluída retorna todos os dados
- [ ] Tiles URLs são válidas e carregam no Leaflet

---

### B6.2 Criar endpoints/chat.py
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/api/v1/endpoints/chat.py`
**Depende de:** B5.2, B4.2, B4.3

**Requisitos Funcionais:**

#### POST /api/v1/chat/ask
Envia pergunta sobre uma análise.

**Request:**
```json
{
  "analysis_id": 123,
  "question": "Qual o impacto ambiental dessa mudança?"
}
```

**Response:**
```json
{
  "answer": "A redução de 30% na cobertura vegetal detectada pode ter diversos impactos...",
  "sources": ["indices_ndvi", "classification"],
  "analysis_id": 123
}
```

---

#### GET /api/v1/chat/{analysis_id}/auto
Retorna análise automática gerada pela IA.

**Response:**
```json
{
  "analysis_id": 123,
  "summary": "Desmatamento detectado com alta confiança.",
  "detailed_analysis": "A área analisada apresentou redução significativa de 30% no índice de vegetação (NDVI)...",
  "recommendations": [
    "Monitorar área nos próximos meses",
    "Verificar possíveis causas antrópicas",
    "Avaliar necessidade de intervenção"
  ]
}
```

---

#### GET /api/v1/chat/{analysis_id}/suggestions
Retorna sugestões de perguntas.

**Response:**
```json
{
  "analysis_id": 123,
  "suggestions": [
    {"question": "Qual o impacto ambiental dessa mudança?", "category": "impacto"},
    {"question": "O que pode ter causado essa alteração?", "category": "causa"},
    {"question": "Essa mudança é reversível?", "category": "reversibilidade"}
  ]
}
```

**Critérios de Aceite:**
- [ ] POST /ask retorna resposta em <10s
- [ ] GET /auto retorna análise completa
- [ ] GET /suggestions retorna pelo menos 5 sugestões
- [ ] Erros retornam mensagens claras

---

### B6.3 Registrar routers
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/api/v1/router.py`
**Depende de:** B6.1, B6.2

**Requisitos:**
```python
from app.api.v1.endpoints import gee, chat

api_router = APIRouter()
api_router.include_router(gee.router, prefix="/gee", tags=["GEE Analysis"])
api_router.include_router(chat.router, prefix="/chat", tags=["AI Chat"])
```

---

## B7. CELERY TASK

### B7.1 Criar tasks/gee_task.py
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/tasks/gee_task.py`
**Depende de:** B2.6, B3.1, B4.2

**Requisitos Funcionais:**
Pipeline completo de processamento:

```python
@celery_app.task(bind=True, max_retries=3)
def process_gee_analysis(self, analysis_id: int):
    """
    Pipeline de processamento GEE.

    Etapas e progresso:
    1. [10%] Inicializa e valida geometria
    2. [20%] Busca imagens Sentinel-2
    3. [30%] Aplica máscara de nuvens
    4. [50%] Calcula índices espectrais
    5. [60%] Extrai série temporal
    6. [70%] Compara períodos
    7. [80%] Classifica mudança
    8. [90%] Gera análise com IA
    9. [95%] Gera URLs de tiles
    10. [100%] Salva resultado
    """
```

**Comportamento de erro:**
- Retry automático até 3x com backoff exponencial
- Se falhar definitivamente, marca status="failed" com mensagem

**Critérios de Aceite:**
- [ ] Task executa pipeline completo
- [ ] Progresso atualizado no banco a cada etapa
- [ ] Retry funciona para erros temporários
- [ ] Falha definitiva marca status="failed"

---

### B7.2 Registrar task no celery_app.py
**Status:** ⬜ Pendente
**Arquivo:** `backend/app/celery_app.py`
**Depende de:** B7.1

**Requisitos:**
- Importar e registrar task
- Configurar retry settings

---

# 👤 DEV 2 - FRONTEND (Next.js/React)

---

## F1. CONFIGURAÇÃO BASE

### F1.1 Instalar dependências
**Status:** ⬜ Pendente
**Arquivo:** `frontend/package.json`
**Depende de:** Nenhuma

**Requisitos:**
```bash
npm install leaflet-draw recharts date-fns
npm install -D @types/leaflet-draw
```

**Critérios de Aceite:**
- [ ] `npm run build` executa sem erros
- [ ] Imports funcionam em componentes

---

### F1.2 Criar types/gee.ts
**Status:** ⬜ Pendente
**Arquivo:** `frontend/src/types/gee.ts`
**Depende de:** Nenhuma

**Especificação completa:**

```typescript
// Requisição para criar análise
export interface GeeAnalysisRequest {
  geometry: GeoJSON.Geometry;
  radiusMeters?: number;  // Se geometry for Point
  startDate: string;      // "YYYY-MM-DD"
  endDate: string;        // "YYYY-MM-DD"
  cloudTolerance: number; // 0-100
}

// Status da análise
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Índices espectrais
export interface SpectralIndices {
  ndvi: number;
  ndbi: number;
  bsi: number;
  nbr: number;
}

// Ponto da série temporal
export interface TimeSeriesPoint {
  date: string;
  ndvi: number | null;
  ndbi: number | null;
  bsi: number | null;
  nbr: number | null;
}

// Resultado da classificação
export interface ClassificationResult {
  changeType: string;
  confidence: number;
  description: string;
  alertLevel: 'critical' | 'warning' | 'info' | 'success';
}

// Resposta completa da análise
export interface GeeAnalysisResponse {
  id: number;
  status: AnalysisStatus;
  progress: number;
  imagesFound: number;
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

// Chat
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
```

**Critérios de Aceite:**
- [ ] Todos os tipos exportados
- [ ] TypeScript compila sem erros
- [ ] Tipos correspondem ao schema do backend

---

### F1.3 Adicionar funções à api.ts
**Status:** ⬜ Pendente
**Arquivo:** `frontend/src/lib/api.ts`
**Depende de:** F1.2

**Especificação:**

```typescript
import { GeeAnalysisRequest, GeeAnalysisResponse, ChatRequest, ChatResponse } from '@/types/gee';

// Inicia análise GEE
export async function startGeeAnalysis(request: GeeAnalysisRequest): Promise<{ id: number }> {
  const response = await api.post('/gee/analyze', {
    geometry: request.geometry,
    radius_meters: request.radiusMeters,
    start_date: request.startDate,
    end_date: request.endDate,
    cloud_tolerance: request.cloudTolerance,
  });
  return response.data;
}

// Busca status/resultado da análise
export async function getGeeAnalysis(id: number): Promise<GeeAnalysisResponse> {
  const response = await api.get(`/gee/${id}`);
  // Converte snake_case para camelCase
  return {
    id: response.data.id,
    status: response.data.status,
    progress: response.data.progress,
    imagesFound: response.data.images_found,
    classification: response.data.classification ? {
      changeType: response.data.classification.change_type,
      confidence: response.data.classification.confidence,
      description: response.data.classification.description,
      alertLevel: response.data.classification.alert_level,
    } : undefined,
    // ... outros campos
  };
}

// Busca tiles para visualização
export async function getGeeAnalysisTiles(id: number): Promise<{
  tileUrlBefore?: string;
  tileUrlAfter?: string;
}> {
  const response = await api.get(`/gee/${id}/tiles`);
  return {
    tileUrlBefore: response.data.tile_url_before,
    tileUrlAfter: response.data.tile_url_after,
  };
}

// Envia pergunta ao chat
export async function askQuestion(request: ChatRequest): Promise<ChatResponse> {
  const response = await api.post('/chat/ask', {
    analysis_id: request.analysisId,
    question: request.question,
  });
  return {
    answer: response.data.answer,
    sources: response.data.sources,
    analysisId: response.data.analysis_id,
  };
}

// Busca análise automática
export async function getAutoAnalysis(analysisId: number): Promise<{
  summary: string;
  detailedAnalysis: string;
  recommendations: string[];
}> {
  const response = await api.get(`/chat/${analysisId}/auto`);
  return {
    summary: response.data.summary,
    detailedAnalysis: response.data.detailed_analysis,
    recommendations: response.data.recommendations,
  };
}

// Busca sugestões de perguntas
export async function getChatSuggestions(analysisId: number): Promise<{
  question: string;
  category: string;
}[]> {
  const response = await api.get(`/chat/${analysisId}/suggestions`);
  return response.data.suggestions;
}
```

**Critérios de Aceite:**
- [ ] Todas as funções exportadas
- [ ] Conversão snake_case → camelCase funciona
- [ ] Tratamento de erros com try/catch
- [ ] TypeScript valida tipos de entrada/saída

---

## F2. SELEÇÃO DE ÁREA

### F2.1 Criar AreaSelector.tsx
**Status:** ⬜ Pendente
**Arquivo:** `frontend/src/components/map/AreaSelector.tsx`
**Depende de:** F1.1

**Requisitos Funcionais:**
1. Modo "Polígono": Desenhar polígono livre no mapa
2. Modo "Ponto + Raio": Clicar para criar círculo
3. Botão para limpar seleção
4. Visualização da área selecionada
5. Callback quando área é selecionada/modificada

**Props:**

```typescript
interface AreaSelectorProps {
  map: L.Map | null;
  mode: 'polygon' | 'point-radius';
  radius: number;  // metros (100-5000)
  selectedArea: GeoJSON.Geometry | null;
  onAreaSelected: (geometry: GeoJSON.Geometry, center: [number, number]) => void;
  onAreaCleared: () => void;
}
```

**Comportamento:**

**Modo Polígono:**
- Usuário clica em "Desenhar" → ativa ferramenta de polígono
- Cada clique adiciona vértice
- Duplo clique ou clicar no primeiro ponto fecha o polígono
- Polígono aparece com borda azul e preenchimento semi-transparente

**Modo Ponto + Raio:**
- Usuário clica no mapa → cria círculo com raio especificado
- Círculo aparece com borda azul e preenchimento semi-transparente
- Slider na UI controla o raio (100m a 5000m)

**Visual:**
```
┌─────────────────────────────────┐
│ Seleção de Área                 │
├─────────────────────────────────┤
│ (●) Polígono  ( ) Ponto + Raio │
├─────────────────────────────────┤
│ Raio: [====●=====] 1000m       │  ← Só aparece no modo ponto+raio
├─────────────────────────────────┤
│ [ Desenhar ]  [ Limpar ]       │
└─────────────────────────────────┘
```

**Critérios de Aceite:**
- [ ] Polígono desenhado retorna GeoJSON.Polygon válido
- [ ] Ponto+raio retorna GeoJSON.Polygon (círculo aproximado)
- [ ] Área selecionada persiste ao mudar de modo
- [ ] Limpar remove área do mapa
- [ ] Funciona em touch (mobile)

---

### F2.2 Integrar AreaSelector no MapView
**Status:** ⬜ Pendente
**Arquivo:** `frontend/src/components/map/MapView.tsx`
**Depende de:** F2.1

**Requisitos:**
1. Adicionar props para seleção de área
2. Renderizar área selecionada como layer
3. Integrar com Leaflet Draw
4. Suportar tiles do GEE como overlay

**Novas Props:**

```typescript
interface MapViewProps {
  // Existentes
  changes?: GeoJSON.FeatureCollection | null;
  center?: [number, number];
  zoom?: number;

  // Novas
  selectionMode?: 'polygon' | 'point-radius' | 'none';
  selectionRadius?: number;
  selectedArea?: GeoJSON.Geometry | null;
  onAreaSelected?: (geometry: GeoJSON.Geometry, center: [number, number]) => void;
  onAreaCleared?: () => void;
  geeOverlayUrl?: string;  // URL de tiles do GEE
}
```

**Critérios de Aceite:**
- [ ] Área selecionada renderiza corretamente
- [ ] Mudança de modo preserva seleção anterior
- [ ] Tiles do GEE aparecem como overlay
- [ ] Não quebra funcionalidade existente

---

## F3. CONTROLES

### F3.1 Criar PeriodSelector.tsx
**Status:** ⬜ Pendente
**Arquivo:** `frontend/src/components/controls/PeriodSelector.tsx`
**Depende de:** F1.1

**Requisitos Funcionais:**
1. Date pickers para data inicial e final
2. Range permitido: 2017-01-01 até hoje
3. Validação: data final >= data inicial
4. Slider para tolerância de nuvens (10-50%)

**Props:**

```typescript
interface PeriodSelectorProps {
  startDate: Date;
  endDate: Date;
  cloudTolerance: number;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onCloudToleranceChange: (value: number) => void;
}
```

**Visual:**

```
┌─────────────────────────────────┐
│ Período de Análise              │
├─────────────────────────────────┤
│ De:    [2022-01-01    📅]      │
│ Até:   [2024-01-01    📅]      │
├─────────────────────────────────┤
│ Tolerância de Nuvens            │
│ [======●========] 20%          │
│ (mais nuvens = mais imagens)   │
└─────────────────────────────────┘
```

**Critérios de Aceite:**
- [ ] Não permite data antes de 2017
- [ ] Não permite data futura
- [ ] Erro visual se data final < inicial
- [ ] Slider atualiza valor em tempo real
- [ ] Formato de data consistente (YYYY-MM-DD)

---

### F3.2 Criar AnalysisControl.tsx
**Status:** ⬜ Pendente
**Arquivo:** `frontend/src/components/controls/AnalysisControl.tsx`
**Depende de:** Nenhuma

**Requisitos Funcionais:**
1. Botão "Analisar" que inicia análise
2. Desabilitado se área não selecionada
3. Progress bar durante processamento
4. Mostra número de imagens encontradas

**Props:**

```typescript
interface AnalysisControlProps {
  canAnalyze: boolean;        // true se área e período selecionados
  isAnalyzing: boolean;       // true se análise em progresso
  progress: number;           // 0-100
  imagesFound: number;        // número de imagens encontradas
  errorMessage?: string;      // mensagem de erro se houver
  onAnalyze: () => void;
  onCancel: () => void;
}
```

**Visual - Estados:**

```
Estado: Idle (pode analisar)
┌─────────────────────────────────┐
│ [    🔍 Analisar Região     ]  │
└─────────────────────────────────┘

Estado: Idle (não pode analisar)
┌─────────────────────────────────┐
│ [    Selecione uma área     ]  │  ← Desabilitado, texto diferente
└─────────────────────────────────┘

Estado: Processando
┌─────────────────────────────────┐
│ Analisando... 45%              │
│ [████████░░░░░░░░░░░░]        │
│ 32 imagens encontradas         │
│ [ Cancelar ]                   │
└─────────────────────────────────┘

Estado: Erro
┌─────────────────────────────────┐
│ ❌ Erro na análise             │
│ Timeout ao conectar com GEE    │
│ [ Tentar Novamente ]           │
└─────────────────────────────────┘
```

**Critérios de Aceite:**
- [ ] Botão desabilitado quando `canAnalyze=false`
- [ ] Progress bar anima suavemente
- [ ] Cancelar para o polling (não cancela backend)
- [ ] Erro mostra mensagem e botão de retry

---

## F4. VISUALIZAÇÃO

### F4.1 Criar TimeSeriesChart.tsx
**Status:** ⬜ Pendente
**Arquivo:** `frontend/src/components/charts/TimeSeriesChart.tsx`
**Depende de:** F1.1

**Requisitos Funcionais:**
1. Gráfico de linha com Recharts
2. Suporte a múltiplos índices simultaneamente
3. Tooltips com valores ao passar mouse
4. Toggle para mostrar/esconder cada índice
5. Responsivo

**Props:**

```typescript
interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  visibleIndices: ('ndvi' | 'ndbi' | 'bsi' | 'nbr')[];
  onToggleIndex: (index: string) => void;
  height?: number;  // default 250
}
```

**Visual:**

```
┌─────────────────────────────────────────┐
│ Série Temporal                          │
│ [●] NDVI  [●] NDBI  [○] BSI  [○] NBR   │  ← Toggles
├─────────────────────────────────────────┤
│  1.0 ┤                                  │
│  0.5 ┤    ╱╲      ╱╲                   │
│  0.0 ┼───╱──╲────╱──╲───────────────   │
│ -0.5 ┤                   ╲╱            │
│ -1.0 ┤                                  │
│      └──────────────────────────────    │
│       Jan   Mar   Mai   Jul   Set   Nov │
└─────────────────────────────────────────┘
```

**Cores:**
- NDVI: `#22c55e` (verde)
- NDBI: `#f97316` (laranja)
- BSI: `#a16207` (marrom)
- NBR: `#3b82f6` (azul)

**Critérios de Aceite:**
- [ ] Gráfico renderiza com dados válidos
- [ ] Toggle mostra/esconde linhas
- [ ] Tooltip mostra data e valores
- [ ] Responsivo (funciona em telas pequenas)
- [ ] Valores null não quebram o gráfico

---

### F4.2 Criar MetricsPanel.tsx
**Status:** ⬜ Pendente
**Arquivo:** `frontend/src/components/results/MetricsPanel.tsx`
**Depende de:** Nenhuma

**Requisitos Funcionais:**
1. Cards para cada delta de índice
2. Setas indicando direção da mudança
3. Cores por severidade
4. Card de classificação com badge

**Props:**

```typescript
interface MetricsPanelProps {
  deltas: SpectralIndices;
  classification: ClassificationResult;
}
```

**Visual:**

```
┌─────────────────────────────────────────┐
│ Variações Detectadas                    │
├─────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐                 │
│ │ ΔNDVI   │ │ ΔNDBI   │                 │
│ │ -0.30 ↓ │ │ +0.25 ↑ │                 │
│ │ 🔴      │ │ 🟡      │                 │
│ └─────────┘ └─────────┘                 │
│ ┌─────────┐ ┌─────────┐                 │
│ │ ΔBSI    │ │ ΔNBR    │                 │
│ │ +0.25 ↑ │ │ -0.25 ↓ │                 │
│ │ 🟡      │ │ 🔴      │                 │
│ └─────────┘ └─────────┘                 │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 🚨 DESMATAMENTO                     │ │
│ │ Confiança: 85%                      │ │
│ │ Redução significativa de vegetação  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Regras de cor:**
- NDVI negativo (perda vegetação): vermelho
- NDVI positivo (ganho vegetação): verde
- NDBI positivo (urbanização): amarelo
- BSI positivo (solo exposto): amarelo
- NBR negativo (queimada): vermelho

**Badge de classificação:**
- `critical`: vermelho
- `warning`: amarelo
- `info`: azul
- `success`: verde

**Critérios de Aceite:**
- [ ] Todos os 4 deltas exibidos
- [ ] Setas corretas (↑ positivo, ↓ negativo)
- [ ] Cores corretas por severidade
- [ ] Badge de classificação com cor certa

---

## F5. CHAT IA

### F5.1 Criar AIChatPanel.tsx
**Status:** ⬜ Pendente
**Arquivo:** `frontend/src/components/chat/AIChatPanel.tsx`
**Depende de:** F1.3

**Requisitos Funcionais:**
1. Exibe análise automática no topo
2. Input para perguntas
3. Histórico de mensagens
4. Sugestões de perguntas clicáveis
5. Loading state durante resposta

**Props:**

```typescript
interface AIChatPanelProps {
  analysisId: number;
  autoAnalysis?: string;  // Análise automática gerada
  onClose?: () => void;
}
```

**State interno:**

```typescript
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [inputValue, setInputValue] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [suggestions, setSuggestions] = useState<{question: string; category: string}[]>([]);
```

**Visual:**

```
┌─────────────────────────────────────────┐
│ 🤖 Assistente de Análise          [X]  │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 📊 Análise Automática              │ │
│ │                                     │ │
│ │ A área analisada apresentou        │ │
│ │ redução significativa de 30% no    │ │
│ │ índice de vegetação (NDVI)...      │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 💬 Perguntas sugeridas:                │
│ • Qual o impacto ambiental?           │  ← Clicável
│ • O que causou essa alteração?        │
│ • Essa mudança é reversível?          │
├─────────────────────────────────────────┤
│ 👤 Qual o impacto ambiental?          │
│ ─────────────────────────────────────   │
│ 🤖 A redução de vegetação pode        │
│    causar erosão do solo, perda de    │
│    biodiversidade e alterações no     │
│    microclima local...                 │
├─────────────────────────────────────────┤
│ [Digite sua pergunta...          ] [➤] │
└─────────────────────────────────────────┘
```

**Comportamento:**
1. Ao montar, busca `getAutoAnalysis(analysisId)` e `getChatSuggestions(analysisId)`
2. Clique em sugestão preenche input e envia
3. Enter ou clique no botão envia pergunta
4. Enquanto aguarda resposta, mostra "Pensando..."
5. Scroll automático para última mensagem

**Critérios de Aceite:**
- [ ] Análise automática exibida no topo
- [ ] Sugestões são clicáveis
- [ ] Mensagens aparecem em ordem cronológica
- [ ] Loading state durante requisição
- [ ] Scroll automático funciona
- [ ] Funciona em mobile

---

## F6. INTEGRAÇÃO

### F6.1 Refatorar page.tsx - Layout
**Status:** ⬜ Pendente
**Arquivo:** `frontend/src/app/page.tsx`
**Depende de:** F2.2, F3.1, F3.2, F4.1, F4.2, F5.1

**Requisitos Funcionais:**
1. Novo layout responsivo
2. Sidebar com controles
3. Mapa principal
4. Área de gráficos colapsível
5. Painel de chat lateral

**Layout Desktop:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🛰️ Detector de Mudanças em Imagens de Satélite                 │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  SIDEBAR     │              MAPA PRINCIPAL                      │
│  (320px)     │                                                  │
│              │  ┌────────────────────────────────────────────┐  │
│ AreaSelector │  │                                            │  │
│              │  │                                            │  │
│ PeriodSelect │  │         Leaflet Map                        │  │
│              │  │         + Área selecionada                 │  │
│ AnalysisCtrl │  │         + Tiles GEE                        │  │
│              │  │                                            │  │
│ MetricsPanel │  │                                            │  │
│ (qd pronto)  │  └────────────────────────────────────────────┘  │
│              ├──────────────────────────────────────────────────┤
│              │  GRÁFICOS (colapsível)           [▼ Expandir]   │
│              │  ┌──────────────────────────────────────────┐   │
│              │  │         TimeSeriesChart                   │   │
│              │  └──────────────────────────────────────────┘   │
├──────────────┴──────────────────────────────────────────────────┤
│                    AIChatPanel (expandível)                     │
└─────────────────────────────────────────────────────────────────┘
```

**Layout Mobile:**

```
┌─────────────────────┐
│ 🛰️ Detector      ☰ │  ← Hamburger menu
├─────────────────────┤
│                     │
│   MAPA (100vh)      │
│                     │
├─────────────────────┤
│ [Controles] [Chat]  │  ← Bottom tabs
└─────────────────────┘
```

**Critérios de Aceite:**
- [ ] Layout funciona em desktop (>1024px)
- [ ] Layout funciona em tablet (768-1024px)
- [ ] Layout funciona em mobile (<768px)
- [ ] Transições suaves entre estados

---

### F6.2 Adicionar estados e lógica
**Status:** ⬜ Pendente
**Arquivo:** `frontend/src/app/page.tsx`
**Depende de:** F6.1

**State completo:**

```typescript
// Seleção de área
const [selectionMode, setSelectionMode] = useState<'polygon' | 'point-radius'>('polygon');
const [selectedArea, setSelectedArea] = useState<GeoJSON.Geometry | null>(null);
const [selectionRadius, setSelectionRadius] = useState(1000);
const [areaCenter, setAreaCenter] = useState<[number, number] | null>(null);

// Período
const [startDate, setStartDate] = useState<Date>(new Date('2022-01-01'));
const [endDate, setEndDate] = useState<Date>(new Date());
const [cloudTolerance, setCloudTolerance] = useState(20);

// Análise
const [analysisId, setAnalysisId] = useState<number | null>(null);
const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
const [analysisProgress, setAnalysisProgress] = useState(0);
const [analysisResult, setAnalysisResult] = useState<GeeAnalysisResponse | null>(null);
const [analysisError, setAnalysisError] = useState<string | null>(null);

// UI
const [isChartsExpanded, setIsChartsExpanded] = useState(true);
const [isChatOpen, setIsChatOpen] = useState(false);
const [isSidebarOpen, setIsSidebarOpen] = useState(true);  // Mobile

// Derivados
const canAnalyze = selectedArea !== null && startDate < endDate;
const isAnalyzing = analysisStatus === 'pending' || analysisStatus === 'processing';
```

**Handlers principais:**

```typescript
// Inicia análise
const handleAnalyze = async () => {
  if (!selectedArea) return;

  setAnalysisStatus('pending');
  setAnalysisProgress(0);
  setAnalysisError(null);

  try {
    const { id } = await startGeeAnalysis({
      geometry: selectedArea,
      radiusMeters: selectionMode === 'point-radius' ? selectionRadius : undefined,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      cloudTolerance,
    });

    setAnalysisId(id);
    // Inicia polling
  } catch (error) {
    setAnalysisStatus('failed');
    setAnalysisError(error.message);
  }
};

// Cancela (para polling, não cancela backend)
const handleCancel = () => {
  setAnalysisStatus('idle');
  setAnalysisId(null);
};
```

**Critérios de Aceite:**
- [ ] Estado inicial correto
- [ ] Mudanças de estado refletem na UI
- [ ] handleAnalyze funciona corretamente
- [ ] handleCancel para o polling

---

### F6.3 Implementar polling de status
**Status:** ⬜ Pendente
**Arquivo:** `frontend/src/app/page.tsx`
**Depende de:** F6.2, F1.3

**Requisitos:**
1. Polling a cada 2 segundos enquanto status != 'completed' e != 'failed'
2. Atualiza progress e imagesFound
3. Quando completed, busca resultado completo
4. Para polling se componente desmontar

**Implementação:**

```typescript
useEffect(() => {
  if (!analysisId || analysisStatus === 'completed' || analysisStatus === 'failed') {
    return;
  }

  const pollInterval = setInterval(async () => {
    try {
      const result = await getGeeAnalysis(analysisId);

      setAnalysisProgress(result.progress);
      setAnalysisStatus(result.status);

      if (result.status === 'completed') {
        setAnalysisResult(result);
        setIsChatOpen(true);  // Abre chat automaticamente
        clearInterval(pollInterval);
      } else if (result.status === 'failed') {
        setAnalysisError(result.errorMessage || 'Erro desconhecido');
        clearInterval(pollInterval);
      }
    } catch (error) {
      console.error('Erro no polling:', error);
    }
  }, 2000);

  return () => clearInterval(pollInterval);
}, [analysisId, analysisStatus]);
```

**Critérios de Aceite:**
- [ ] Polling inicia quando análise é criada
- [ ] Progress atualiza a cada poll
- [ ] Polling para quando completed/failed
- [ ] Cleanup no unmount
- [ ] Erro de rede não quebra o polling

---

# CRONOGRAMA

## Dia 1

| Dev 1 (Backend) | Dev 2 (Frontend) |
|-----------------|------------------|
| ✅ B1.1, B1.2, B1.3 | F1.1 Dependências |
| ✅ B3.1 Classificador | F1.2 Types |
| ✅ B5.1, B5.2, B5.3 Schemas | F3.2 AnalysisControl |
| B2.1 GEE Init | F4.2 MetricsPanel |
| B2.2 Sentinel-2 | |
| B2.3 Cloud Mask | |

## Dia 2

| Dev 1 (Backend) | Dev 2 (Frontend) |
|-----------------|------------------|
| B2.4 Índices | F2.1 AreaSelector |
| B2.5 Série temporal | F2.2 MapView integração |
| B2.6 Comparação | F3.1 PeriodSelector |
| B2.7 Tiles | F1.3 api.ts |
| B4.1 LLM Init | |

## Dia 3

| Dev 1 (Backend) | Dev 2 (Frontend) |
|-----------------|------------------|
| B4.2, B4.3 LLM | F4.1 TimeSeriesChart |
| B6.1 Endpoints GEE | F5.1 AIChatPanel |
| B6.2 Endpoints Chat | |
| B6.3 Routers | |

## Dia 4

| Dev 1 (Backend) | Dev 2 (Frontend) |
|-----------------|------------------|
| B7.1, B7.2 Celery | F6.1 Layout |
| Testes integração | F6.2 Estados |
| Debug | F6.3 Polling |

## Dia 5

| Dev 1 (Backend) | Dev 2 (Frontend) |
|-----------------|------------------|
| Polish + docs | Polish + responsivo |
| Deploy | Deploy |

---

# PONTO DE SINCRONIZAÇÃO

**⚠️ BLOQUEIOS:**

1. **Frontend F1.3** depende de **Backend B6.3** para testar API real
   - Workaround: Mock de API no frontend até backend pronto

2. **Frontend F5.1** depende de **Backend B6.2** para chat funcionar
   - Workaround: UI pode ser desenvolvida com dados mock

3. **Testes E2E** só possíveis quando ambos completarem dia 3

---

# COMANDOS

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
celery -A app.celery_app worker --loglevel=info

# Frontend
cd frontend
npm install
npm run dev

# Infra
docker-compose -f docker-compose.infra.yml up -d

# GEE Auth (primeira vez)
earthengine authenticate
```
