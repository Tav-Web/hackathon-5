"""
Serviço de integração com Google Earth Engine.

Fornece funcionalidades para análise de imagens de satélite Sentinel-2,
cálculo de índices espectrais e detecção de mudanças territoriais.
"""

from datetime import date, timedelta
from typing import Any

import ee

from app.config import settings
from app.services.change_classifier import change_classifier


class GeeService:
    """
    Serviço para análise de imagens de satélite via Google Earth Engine.

    Suporta:
    - Busca de imagens Sentinel-2 SR Harmonized
    - Máscara de nuvens usando banda QA60
    - Cálculo de índices espectrais (NDVI, NDBI, BSI, NBR)
    - Extração de séries temporais
    - Comparação de períodos para detecção de mudanças
    - Geração de URLs de tiles para visualização
    """

    # Coleção Sentinel-2 Surface Reflectance Harmonized
    SENTINEL2_COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"

    # Bandas usadas nos cálculos
    BANDS = {
        "blue": "B2",
        "green": "B3",
        "red": "B4",
        "nir": "B8",
        "swir1": "B11",
        "swir2": "B12",
        "qa": "QA60",
    }

    # Parâmetros de visualização
    VIS_PARAMS_RGB = {
        "bands": ["B4", "B3", "B2"],
        "min": 0,
        "max": 3000,
        "gamma": 1.2,
    }

    VIS_PARAMS_FALSE_COLOR = {
        "bands": ["B8", "B4", "B3"],
        "min": 0,
        "max": 4000,
        "gamma": 1.2,
    }

    def __init__(self):
        """Inicializa o serviço (lazy initialization do GEE)."""
        self._initialized = False
        # Lazy initialization - não inicializa aqui, só quando necessário

    def _initialize_ee(self) -> None:
        """
        Inicializa o Google Earth Engine.

        Tenta autenticação via service account se configurado,
        caso contrário usa autenticação interativa/default.

        Suporta 3 métodos de autenticação:
        1. GEE_SERVICE_ACCOUNT_JSON: JSON string direto (para deploy)
        2. GEE_SERVICE_ACCOUNT_KEY: Caminho para arquivo JSON (para dev local)
        3. Autenticação default do GEE
        """
        if self._initialized:
            return

        import json
        import os
        import tempfile

        try:
            # Método 1: JSON string direto (preferido para deploy)
            gee_json = os.getenv("GEE_SERVICE_ACCOUNT_JSON")
            if gee_json:
                try:
                    sa_info = json.loads(gee_json)
                    service_account_email = sa_info.get('client_email')

                    # Cria arquivo temporário com o JSON
                    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                        json.dump(sa_info, f)
                        temp_key_file = f.name

                    credentials = ee.ServiceAccountCredentials(
                        email=service_account_email,
                        key_file=temp_key_file
                    )
                    ee.Initialize(
                        credentials=credentials,
                        project=settings.GEE_PROJECT_ID or None
                    )
                    self._initialized = True
                    return
                except json.JSONDecodeError:
                    print("Aviso: GEE_SERVICE_ACCOUNT_JSON invalido, tentando arquivo...")

            # Método 2: Caminho para arquivo JSON (dev local)
            if settings.GEE_SERVICE_ACCOUNT_KEY:
                key_file = settings.GEE_SERVICE_ACCOUNT_KEY

                # Se for caminho relativo, usa o diretório do backend
                if not os.path.isabs(key_file):
                    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
                    key_file = os.path.join(backend_dir, key_file)

                if os.path.exists(key_file):
                    # Lê o email do service account do arquivo JSON
                    with open(key_file, 'r') as f:
                        sa_info = json.load(f)
                        service_account_email = sa_info.get('client_email')

                    credentials = ee.ServiceAccountCredentials(
                        email=service_account_email,
                        key_file=key_file
                    )
                    ee.Initialize(
                        credentials=credentials,
                        project=settings.GEE_PROJECT_ID or None
                    )
                    self._initialized = True
                    return

            # Método 3: Autenticação default (interativa ou application default)
            ee.Initialize(project=settings.GEE_PROJECT_ID or None)
            self._initialized = True

        except ee.EEException as e:
            # Tenta inicializar sem projeto específico
            try:
                ee.Initialize()
                self._initialized = True
            except ee.EEException:
                raise RuntimeError(f"Falha ao inicializar Earth Engine: {e}")

    def _ensure_initialized(self) -> None:
        """Garante que o EE está inicializado."""
        if not self._initialized:
            self._initialize_ee()

    def _geometry_from_geojson(self, geojson: dict) -> ee.Geometry:
        """
        Converte GeoJSON para ee.Geometry.

        Args:
            geojson: Dicionário GeoJSON com type e coordinates

        Returns:
            ee.Geometry correspondente
        """
        geom_type = geojson.get("type")

        if geom_type == "Point":
            coords = geojson["coordinates"]
            return ee.Geometry.Point(coords)

        elif geom_type == "Polygon":
            coords = geojson["coordinates"]
            return ee.Geometry.Polygon(coords)

        elif geom_type == "MultiPolygon":
            coords = geojson["coordinates"]
            return ee.Geometry.MultiPolygon(coords)

        else:
            raise ValueError(f"Tipo de geometria não suportado: {geom_type}")

    def _create_buffer(self, point: ee.Geometry, radius_meters: int) -> ee.Geometry:
        """
        Cria um buffer circular ao redor de um ponto.

        Args:
            point: ee.Geometry.Point
            radius_meters: Raio em metros

        Returns:
            ee.Geometry.Polygon circular
        """
        return point.buffer(radius_meters)

    def _mask_clouds(self, image: ee.Image) -> ee.Image:
        """
        Remove nuvens e sombras usando banda QA60.

        A banda QA60 do Sentinel-2 contém flags de nuvens:
        - Bit 10: Opaque clouds
        - Bit 11: Cirrus clouds

        Args:
            image: Imagem Sentinel-2

        Returns:
            Imagem com pixels de nuvens mascarados
        """
        qa = image.select("QA60")

        # Bits 10 e 11 são nuvens e cirrus
        cloud_bit_mask = 1 << 10
        cirrus_bit_mask = 1 << 11

        # Ambos os flags devem ser zero (sem nuvens)
        mask = (
            qa.bitwiseAnd(cloud_bit_mask).eq(0)
            .And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
        )

        return image.updateMask(mask)

    def _compute_indices(self, image: ee.Image) -> ee.Image:
        """
        Calcula índices espectrais para detecção de mudanças.

        Índices calculados:
        - NDVI: Normalized Difference Vegetation Index
        - NDBI: Normalized Difference Built-up Index
        - BSI: Bare Soil Index
        - NBR: Normalized Burn Ratio

        Args:
            image: Imagem Sentinel-2 com bandas B2, B4, B8, B11, B12

        Returns:
            Imagem com bandas de índices adicionadas
        """
        b = self.BANDS

        # NDVI = (NIR - Red) / (NIR + Red)
        ndvi = image.normalizedDifference([b["nir"], b["red"]]).rename("NDVI")

        # NDBI = (SWIR1 - NIR) / (SWIR1 + NIR)
        ndbi = image.normalizedDifference([b["swir1"], b["nir"]]).rename("NDBI")

        # BSI = ((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))
        bsi_num = image.select(b["swir1"]).add(image.select(b["red"])) \
            .subtract(image.select(b["nir"]).add(image.select(b["blue"])))
        bsi_den = image.select(b["swir1"]).add(image.select(b["red"])) \
            .add(image.select(b["nir"]).add(image.select(b["blue"])))
        bsi = bsi_num.divide(bsi_den).rename("BSI")

        # NBR = (NIR - SWIR2) / (NIR + SWIR2)
        nbr = image.normalizedDifference([b["nir"], b["swir2"]]).rename("NBR")

        return image.addBands([ndvi, ndbi, bsi, nbr])

    def get_sentinel2_collection(
        self,
        geometry: ee.Geometry,
        start_date: str | date,
        end_date: str | date,
        max_cloud_cover: int = 20,
    ) -> ee.ImageCollection:
        """
        Busca coleção de imagens Sentinel-2 para uma região e período.

        Args:
            geometry: Área de interesse
            start_date: Data inicial (YYYY-MM-DD ou date)
            end_date: Data final (YYYY-MM-DD ou date)
            max_cloud_cover: Percentual máximo de cobertura de nuvens

        Returns:
            ee.ImageCollection filtrada e processada
        """
        self._ensure_initialized()

        # Converte datas se necessário
        if isinstance(start_date, date):
            start_date = start_date.isoformat()
        if isinstance(end_date, date):
            end_date = end_date.isoformat()

        # Busca e filtra coleção
        collection = (
            ee.ImageCollection(self.SENTINEL2_COLLECTION)
            .filterBounds(geometry)
            .filterDate(start_date, end_date)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", max_cloud_cover))
        )

        # Aplica máscara de nuvens e calcula índices
        collection = collection.map(self._mask_clouds).map(self._compute_indices)

        return collection

    def get_images_count(
        self,
        geometry: ee.Geometry,
        start_date: str | date,
        end_date: str | date,
        max_cloud_cover: int = 20,
    ) -> int:
        """
        Conta quantas imagens estão disponíveis para os parâmetros.

        Args:
            geometry: Área de interesse
            start_date: Data inicial
            end_date: Data final
            max_cloud_cover: Percentual máximo de nuvens

        Returns:
            Número de imagens disponíveis
        """
        collection = self.get_sentinel2_collection(
            geometry, start_date, end_date, max_cloud_cover
        )
        return collection.size().getInfo()

    def get_time_series(
        self,
        geometry: ee.Geometry | dict,
        start_date: str | date,
        end_date: str | date,
        max_cloud_cover: int = 20,
        radius_meters: int | None = None,
    ) -> list[dict]:
        """
        Extrai série temporal dos índices espectrais.

        Args:
            geometry: GeoJSON dict ou ee.Geometry
            start_date: Data inicial
            end_date: Data final
            max_cloud_cover: Percentual máximo de nuvens
            radius_meters: Raio em metros (se geometry for Point)

        Returns:
            Lista de dicts com data e valores dos índices
        """
        self._ensure_initialized()

        # Converte geometry se necessário
        if isinstance(geometry, dict):
            geometry = self._geometry_from_geojson(geometry)

        # Aplica buffer se for ponto
        if radius_meters and geometry.type().getInfo() == "Point":
            geometry = self._create_buffer(geometry, radius_meters)

        collection = self.get_sentinel2_collection(
            geometry, start_date, end_date, max_cloud_cover
        )

        # Função para extrair valores médios de cada imagem
        def extract_values(image: ee.Image) -> ee.Feature:
            # Calcula média dos índices na região
            stats = image.select(["NDVI", "NDBI", "BSI", "NBR"]).reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=geometry,
                scale=10,  # Resolução de 10m do Sentinel-2
                maxPixels=1e9,
            )

            # Obtém data da imagem
            img_date = image.date().format("YYYY-MM-dd")

            return ee.Feature(
                None,
                {
                    "date": img_date,
                    "ndvi": stats.get("NDVI"),
                    "ndbi": stats.get("NDBI"),
                    "bsi": stats.get("BSI"),
                    "nbr": stats.get("NBR"),
                },
            )

        # Mapeia sobre a coleção
        features = collection.map(extract_values)
        result = features.getInfo()

        # Converte para lista de dicts
        time_series = []
        if result and "features" in result:
            for feature in result["features"]:
                props = feature.get("properties", {})
                if props.get("ndvi") is not None:
                    time_series.append(
                        {
                            "date": props.get("date"),
                            "ndvi": round(props.get("ndvi", 0), 4),
                            "ndbi": round(props.get("ndbi", 0), 4),
                            "bsi": round(props.get("bsi", 0), 4),
                            "nbr": round(props.get("nbr", 0), 4),
                        }
                    )

        # Ordena por data
        time_series.sort(key=lambda x: x["date"])

        return time_series

    def compare_periods(
        self,
        geometry: ee.Geometry | dict,
        start_date: str | date,
        end_date: str | date,
        max_cloud_cover: int = 20,
        radius_meters: int | None = None,
    ) -> dict[str, Any]:
        """
        Compara índices espectrais entre início e fim do período.

        Divide o período em duas metades e calcula a diferença média
        dos índices entre elas para detectar mudanças.

        Args:
            geometry: GeoJSON dict ou ee.Geometry
            start_date: Data inicial do período
            end_date: Data final do período
            max_cloud_cover: Percentual máximo de nuvens
            radius_meters: Raio em metros (se geometry for Point)

        Returns:
            Dict com índices do início, fim, deltas e classificação
        """
        self._ensure_initialized()

        # Converte geometry se necessário
        if isinstance(geometry, dict):
            ee_geometry = self._geometry_from_geojson(geometry)
        else:
            ee_geometry = geometry

        # Aplica buffer se for ponto
        if radius_meters and ee_geometry.type().getInfo() == "Point":
            ee_geometry = self._create_buffer(ee_geometry, radius_meters)

        # Converte datas
        if isinstance(start_date, str):
            start_date = date.fromisoformat(start_date)
        if isinstance(end_date, str):
            end_date = date.fromisoformat(end_date)

        # Calcula ponto médio do período
        total_days = (end_date - start_date).days
        mid_point = start_date + timedelta(days=total_days // 2)

        # Período 1: início até metade
        # Período 2: metade até fim
        period1_start = start_date.isoformat()
        period1_end = mid_point.isoformat()
        period2_start = mid_point.isoformat()
        period2_end = end_date.isoformat()

        # Busca coleções para cada período
        coll1 = self.get_sentinel2_collection(
            ee_geometry, period1_start, period1_end, max_cloud_cover
        )
        coll2 = self.get_sentinel2_collection(
            ee_geometry, period2_start, period2_end, max_cloud_cover
        )

        # Calcula média composta de cada período
        indices = ["NDVI", "NDBI", "BSI", "NBR"]

        def get_mean_indices(collection: ee.ImageCollection) -> dict:
            """Calcula média dos índices para uma coleção."""
            # Cria composto médio
            composite = collection.select(indices).mean()

            # Extrai valores médios na região
            stats = composite.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=ee_geometry,
                scale=10,
                maxPixels=1e9,
            ).getInfo()

            return {
                "ndvi": round(stats.get("NDVI") or 0, 4),
                "ndbi": round(stats.get("NDBI") or 0, 4),
                "bsi": round(stats.get("BSI") or 0, 4),
                "nbr": round(stats.get("NBR") or 0, 4),
            }

        # Obtém índices de cada período
        indices_start = get_mean_indices(coll1)
        indices_end = get_mean_indices(coll2)

        # Calcula deltas (variações)
        deltas = {
            "ndvi": round(indices_end["ndvi"] - indices_start["ndvi"], 4),
            "ndbi": round(indices_end["ndbi"] - indices_start["ndbi"], 4),
            "bsi": round(indices_end["bsi"] - indices_start["bsi"], 4),
            "nbr": round(indices_end["nbr"] - indices_start["nbr"], 4),
        }

        # Classifica o tipo de mudança
        classification = change_classifier.classify_from_dict(deltas)

        # Conta imagens encontradas
        count1 = coll1.size().getInfo()
        count2 = coll2.size().getInfo()

        return {
            "indices_start": indices_start,
            "indices_end": indices_end,
            "deltas": deltas,
            "classification": {
                "change_type": classification.change_type.value,
                "confidence": classification.confidence,
                "description": classification.description,
                "alert_level": classification.alert_level,
            },
            "images_found": count1 + count2,
            "period1_images": count1,
            "period2_images": count2,
        }

    def get_tile_url(
        self,
        geometry: ee.Geometry | dict,
        target_date: str | date,
        max_cloud_cover: int = 20,
        vis_type: str = "rgb",
        days_buffer: int = 30,
    ) -> str | None:
        """
        Gera URL de tiles para visualização no mapa.

        Args:
            geometry: Área de interesse
            target_date: Data alvo para a imagem
            max_cloud_cover: Percentual máximo de nuvens
            vis_type: Tipo de visualização ("rgb" ou "false_color")
            days_buffer: Dias antes/depois para buscar imagem

        Returns:
            URL do tile layer ou None se não houver imagens
        """
        self._ensure_initialized()

        # Converte geometry se necessário
        if isinstance(geometry, dict):
            geometry = self._geometry_from_geojson(geometry)

        # Converte data
        if isinstance(target_date, str):
            target_date = date.fromisoformat(target_date)

        # Define período de busca
        start = (target_date - timedelta(days=days_buffer)).isoformat()
        end = (target_date + timedelta(days=days_buffer)).isoformat()

        # Busca coleção
        collection = (
            ee.ImageCollection(self.SENTINEL2_COLLECTION)
            .filterBounds(geometry)
            .filterDate(start, end)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", max_cloud_cover))
            .sort("CLOUDY_PIXEL_PERCENTAGE")
        )

        # Verifica se há imagens
        count = collection.size().getInfo()
        if count == 0:
            return None

        # Pega a imagem com menos nuvens e aplica máscara
        image = self._mask_clouds(collection.first())

        # Seleciona parâmetros de visualização
        vis_params = (
            self.VIS_PARAMS_FALSE_COLOR
            if vis_type == "false_color"
            else self.VIS_PARAMS_RGB
        )

        # Gera URL do tile
        map_id = image.getMapId(vis_params)
        return map_id["tile_fetcher"].url_format

    def get_comparison_tiles(
        self,
        geometry: ee.Geometry | dict,
        start_date: str | date,
        end_date: str | date,
        max_cloud_cover: int = 20,
    ) -> dict[str, str | None]:
        """
        Gera URLs de tiles para comparação antes/depois.

        Args:
            geometry: Área de interesse
            start_date: Data inicial (será buscada imagem próxima)
            end_date: Data final (será buscada imagem próxima)
            max_cloud_cover: Percentual máximo de nuvens

        Returns:
            Dict com tile_url_before e tile_url_after
        """
        return {
            "tile_url_before": self.get_tile_url(
                geometry, start_date, max_cloud_cover, "rgb", days_buffer=45
            ),
            "tile_url_after": self.get_tile_url(
                geometry, end_date, max_cloud_cover, "rgb", days_buffer=45
            ),
        }

    async def run_full_analysis(
        self,
        geometry: dict,
        start_date: str | date,
        end_date: str | date,
        cloud_tolerance: int = 20,
        radius_meters: int | None = None,
    ) -> dict[str, Any]:
        """
        Executa análise completa de mudanças.

        Combina todas as funcionalidades em uma única chamada:
        - Comparação de períodos
        - Série temporal
        - Geração de tiles

        Args:
            geometry: GeoJSON da área de interesse
            start_date: Data inicial
            end_date: Data final
            cloud_tolerance: Tolerância de nuvens em %
            radius_meters: Raio em metros (se Point)

        Returns:
            Dict completo com todos os resultados da análise
        """
        self._ensure_initialized()

        # Comparação de períodos (inclui classificação)
        comparison = self.compare_periods(
            geometry=geometry,
            start_date=start_date,
            end_date=end_date,
            max_cloud_cover=cloud_tolerance,
            radius_meters=radius_meters,
        )

        # Série temporal
        time_series = self.get_time_series(
            geometry=geometry,
            start_date=start_date,
            end_date=end_date,
            max_cloud_cover=cloud_tolerance,
            radius_meters=radius_meters,
        )

        # URLs de tiles para visualização
        tiles = self.get_comparison_tiles(
            geometry=geometry,
            start_date=start_date,
            end_date=end_date,
            max_cloud_cover=cloud_tolerance,
        )

        return {
            **comparison,
            "time_series": time_series,
            **tiles,
        }


# Instância singleton para uso global
gee_service = GeeService()
