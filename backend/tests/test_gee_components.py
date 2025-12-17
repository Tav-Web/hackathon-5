"""
Testes básicos para os componentes de análise GEE.
"""

import pytest
from datetime import date


class TestChangeClassifier:
    """Testes para o classificador de mudanças."""

    def test_import(self):
        """Verifica se o classificador pode ser importado."""
        from app.services.change_classifier import change_classifier, ChangeType
        assert change_classifier is not None
        assert ChangeType is not None

    def test_classify_queimada(self):
        """Testa classificação de queimada."""
        from app.services.change_classifier import change_classifier, ChangeType

        result = change_classifier.classify(
            delta_ndvi=-0.20,
            delta_ndbi=0.05,
            delta_bsi=0.10,
            delta_nbr=-0.30,
        )

        assert result.change_type == ChangeType.QUEIMADA
        assert result.alert_level == "critical"
        assert result.confidence > 0

    def test_classify_nova_construcao(self):
        """Testa classificação de nova construção."""
        from app.services.change_classifier import change_classifier, ChangeType

        result = change_classifier.classify(
            delta_ndvi=-0.20,
            delta_ndbi=0.15,
            delta_bsi=0.05,
            delta_nbr=-0.05,
        )

        assert result.change_type == ChangeType.NOVA_CONSTRUCAO
        assert result.alert_level == "warning"

    def test_classify_desmatamento(self):
        """Testa classificação de desmatamento."""
        from app.services.change_classifier import change_classifier, ChangeType

        result = change_classifier.classify(
            delta_ndvi=-0.25,
            delta_ndbi=0.02,
            delta_bsi=0.05,
            delta_nbr=-0.10,
        )

        assert result.change_type == ChangeType.DESMATAMENTO
        assert result.alert_level == "critical"

    def test_classify_reflorestamento(self):
        """Testa classificação de reflorestamento."""
        from app.services.change_classifier import change_classifier, ChangeType

        result = change_classifier.classify(
            delta_ndvi=0.25,
            delta_ndbi=-0.05,
            delta_bsi=-0.10,
            delta_nbr=0.05,
        )

        assert result.change_type == ChangeType.REFLORESTAMENTO
        assert result.alert_level == "success"

    def test_classify_sem_mudanca(self):
        """Testa classificação sem mudança significativa."""
        from app.services.change_classifier import change_classifier, ChangeType

        result = change_classifier.classify(
            delta_ndvi=0.02,
            delta_ndbi=0.01,
            delta_bsi=0.01,
            delta_nbr=0.01,
        )

        assert result.change_type == ChangeType.SEM_MUDANCA
        assert result.alert_level == "info"

    def test_classify_from_dict(self):
        """Testa classificação via dicionário."""
        from app.services.change_classifier import change_classifier

        deltas = {
            "ndvi": -0.25,
            "ndbi": 0.15,
            "bsi": 0.10,
            "nbr": -0.05,
        }

        result = change_classifier.classify_from_dict(deltas)
        assert result is not None
        assert result.confidence >= 0


class TestSchemas:
    """Testes para os schemas Pydantic."""

    def test_gee_analysis_create(self):
        """Testa criação de schema de análise."""
        from app.schemas.gee import GeeAnalysisCreate

        data = GeeAnalysisCreate(
            geometry={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
            cloud_tolerance=20,
        )

        assert data.geometry["type"] == "Polygon"
        assert data.start_date == date(2023, 1, 1)
        assert data.cloud_tolerance == 20

    def test_gee_analysis_create_point(self):
        """Testa criação com geometria Point."""
        from app.schemas.gee import GeeAnalysisCreate

        data = GeeAnalysisCreate(
            geometry={"type": "Point", "coordinates": [-43.0, -22.0]},
            radius_meters=500,
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
        )

        assert data.geometry["type"] == "Point"
        assert data.radius_meters == 500

    def test_gee_analysis_create_validation(self):
        """Testa validação de dados."""
        from app.schemas.gee import GeeAnalysisCreate
        from pydantic import ValidationError

        # Geometria inválida
        with pytest.raises(ValidationError):
            GeeAnalysisCreate(
                geometry={"type": "InvalidType", "coordinates": []},
                start_date=date(2023, 1, 1),
                end_date=date(2023, 12, 31),
            )

    def test_chat_request(self):
        """Testa schema de requisição de chat."""
        from app.schemas.chat import ChatRequest

        data = ChatRequest(
            analysis_id=1,
            question="Qual o impacto ambiental?",
        )

        assert data.analysis_id == 1
        assert len(data.question) > 3

    def test_spectral_indices(self):
        """Testa schema de índices espectrais."""
        from app.schemas.gee import SpectralIndices

        indices = SpectralIndices(
            ndvi=0.5,
            ndbi=-0.2,
            bsi=0.1,
            nbr=0.3,
        )

        assert indices.ndvi == 0.5
        assert indices.ndbi == -0.2


class TestModels:
    """Testes para os modelos SQLAlchemy."""

    def test_gee_analysis_model(self):
        """Testa modelo GeeAnalysis."""
        from app.models.gee_analysis import GeeAnalysis

        # Verifica atributos do modelo
        assert hasattr(GeeAnalysis, "id")
        assert hasattr(GeeAnalysis, "geometry")
        assert hasattr(GeeAnalysis, "status")
        assert hasattr(GeeAnalysis, "classification")
        assert hasattr(GeeAnalysis, "ndvi_start")
        assert hasattr(GeeAnalysis, "time_series")
        assert hasattr(GeeAnalysis, "ai_analysis")

    def test_gee_analysis_to_response(self):
        """Testa método to_response_dict."""
        from app.models.gee_analysis import GeeAnalysis

        analysis = GeeAnalysis(
            id=1,
            geometry={"type": "Point", "coordinates": [0, 0]},
            status="completed",
            classification="DESMATAMENTO",
            confidence=0.85,
        )

        response = analysis.to_response_dict()
        assert response["id"] == 1
        assert response["status"] == "completed"


class TestServices:
    """Testes para os serviços."""

    def test_gee_service_import(self):
        """Testa import do serviço GEE."""
        from app.services.gee_service import GeeService, gee_service
        assert GeeService is not None
        assert gee_service is not None

    def test_llm_service_import(self):
        """Testa import do serviço LLM."""
        from app.services.llm_service import LLMService, llm_service
        assert LLMService is not None
        assert llm_service is not None

    def test_llm_service_suggested_questions(self):
        """Testa sugestões de perguntas do LLM."""
        from app.services.llm_service import llm_service

        context = {
            "classification": {
                "change_type": "DESMATAMENTO",
                "confidence": 0.8,
                "alert_level": "critical",
            }
        }

        questions = llm_service.get_suggested_questions(context)
        assert len(questions) > 0
        assert all("question" in q for q in questions)
        assert all("category" in q for q in questions)
