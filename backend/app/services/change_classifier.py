"""
Classificador de mudanças territoriais baseado em índices espectrais.

Classifica mudanças detectadas em imagens de satélite usando regras
baseadas em variações de NDVI, NDBI, BSI e NBR.
"""

from dataclasses import dataclass
from enum import Enum


class ChangeType(str, Enum):
    """Tipos de mudança territorial detectáveis."""
    NOVA_CONSTRUCAO = "NOVA_CONSTRUCAO"
    ENTULHO = "ENTULHO"
    QUEIMADA = "QUEIMADA"
    DESMATAMENTO = "DESMATAMENTO"
    REFLORESTAMENTO = "REFLORESTAMENTO"
    EXPANSAO_URBANA = "EXPANSAO_URBANA"
    SEM_MUDANCA = "SEM_MUDANCA"


@dataclass
class ClassificationResult:
    """Resultado da classificação de mudança."""
    change_type: ChangeType
    confidence: float
    description: str
    alert_level: str  # "critical", "warning", "info", "success"


class ChangeClassifier:
    """
    Classificador de mudanças territoriais.

    Usa regras baseadas em variações de índices espectrais para
    classificar o tipo de mudança ocorrida em uma área.
    """

    # Thresholds para classificação
    THRESHOLDS = {
        "ndvi_decrease_strong": -0.20,
        "ndvi_decrease_moderate": -0.15,
        "ndvi_increase": 0.15,
        "ndbi_increase": 0.10,
        "bsi_increase": 0.15,
        "nbr_decrease": -0.25,
    }

    # Descrições por tipo de mudança
    DESCRIPTIONS = {
        ChangeType.NOVA_CONSTRUCAO: "Área de vegetação foi removida e substituída por construção. Indica urbanização ou edificação nova.",
        ChangeType.ENTULHO: "Solo exposto detectado, possivelmente depósito de material, terraplanagem ou movimentação de terra.",
        ChangeType.QUEIMADA: "Padrão espectral consistente com área queimada recentemente. Possível incêndio ou queimada controlada.",
        ChangeType.DESMATAMENTO: "Redução significativa de cobertura vegetal sem substituição por construção.",
        ChangeType.REFLORESTAMENTO: "Aumento de cobertura vegetal detectado. Indica regeneração natural ou plantio.",
        ChangeType.EXPANSAO_URBANA: "Expansão de área urbana sobre zona anteriormente não urbanizada.",
        ChangeType.SEM_MUDANCA: "Não foram detectadas alterações significativas no período analisado.",
    }

    # Níveis de alerta por tipo
    ALERT_LEVELS = {
        ChangeType.NOVA_CONSTRUCAO: "warning",
        ChangeType.ENTULHO: "critical",
        ChangeType.QUEIMADA: "critical",
        ChangeType.DESMATAMENTO: "critical",
        ChangeType.REFLORESTAMENTO: "success",
        ChangeType.EXPANSAO_URBANA: "warning",
        ChangeType.SEM_MUDANCA: "info",
    }

    def classify(
        self,
        delta_ndvi: float,
        delta_ndbi: float,
        delta_bsi: float,
        delta_nbr: float,
    ) -> ClassificationResult:
        """
        Classifica o tipo de mudança baseado nos deltas dos índices espectrais.

        Args:
            delta_ndvi: Variação do NDVI (vegetação)
            delta_ndbi: Variação do NDBI (área construída)
            delta_bsi: Variação do BSI (solo exposto)
            delta_nbr: Variação do NBR (queimadas)

        Returns:
            ClassificationResult com tipo, confiança e descrição
        """
        th = self.THRESHOLDS

        # QUEIMADA: NBR caiu drasticamente E vegetação diminuiu
        if delta_nbr < th["nbr_decrease"] and delta_ndvi < th["ndvi_decrease_moderate"]:
            confidence = min(abs(delta_nbr) + abs(delta_ndvi) * 0.5, 1.0)
            return self._result(ChangeType.QUEIMADA, confidence)

        # NOVA CONSTRUÇÃO: vegetação sumiu E área construída aumentou
        if delta_ndvi < th["ndvi_decrease_moderate"] and delta_ndbi > th["ndbi_increase"]:
            confidence = min(abs(delta_ndvi) + delta_ndbi, 1.0)
            return self._result(ChangeType.NOVA_CONSTRUCAO, confidence)

        # ENTULHO/MOVIMENTAÇÃO DE TERRA: vegetação sumiu E solo exposto aumentou
        # (mas não é construção típica)
        if delta_ndvi < th["ndvi_decrease_moderate"] and delta_bsi > th["bsi_increase"]:
            if delta_ndbi < th["ndbi_increase"]:  # Não é construção
                confidence = min(abs(delta_ndvi) + delta_bsi, 1.0)
                return self._result(ChangeType.ENTULHO, confidence)

        # EXPANSÃO URBANA: combinação de construção + solo exposto
        if (delta_ndvi < th["ndvi_decrease_moderate"] and
            delta_ndbi > th["ndbi_increase"] * 0.5 and
            delta_bsi > th["bsi_increase"] * 0.5):
            confidence = min(abs(delta_ndvi) * 0.5 + delta_ndbi * 0.5 + delta_bsi * 0.5, 1.0)
            return self._result(ChangeType.EXPANSAO_URBANA, confidence)

        # DESMATAMENTO: apenas vegetação sumiu significativamente
        if delta_ndvi < th["ndvi_decrease_strong"]:
            confidence = min(abs(delta_ndvi), 1.0)
            return self._result(ChangeType.DESMATAMENTO, confidence)

        # REFLORESTAMENTO: vegetação aumentou significativamente
        if delta_ndvi > th["ndvi_increase"]:
            confidence = min(delta_ndvi, 1.0)
            return self._result(ChangeType.REFLORESTAMENTO, confidence)

        # SEM MUDANÇA SIGNIFICATIVA
        return self._result(ChangeType.SEM_MUDANCA, 0.0)

    def _result(self, change_type: ChangeType, confidence: float) -> ClassificationResult:
        """Cria resultado de classificação."""
        return ClassificationResult(
            change_type=change_type,
            confidence=round(confidence, 3),
            description=self.DESCRIPTIONS[change_type],
            alert_level=self.ALERT_LEVELS[change_type],
        )

    def classify_from_dict(self, deltas: dict) -> ClassificationResult:
        """
        Classifica mudanças a partir de um dicionário de deltas.

        Args:
            deltas: Dict com chaves 'ndvi', 'ndbi', 'bsi', 'nbr'

        Returns:
            ClassificationResult
        """
        return self.classify(
            delta_ndvi=deltas.get("ndvi", 0.0),
            delta_ndbi=deltas.get("ndbi", 0.0),
            delta_bsi=deltas.get("bsi", 0.0),
            delta_nbr=deltas.get("nbr", 0.0),
        )


# Instância singleton para uso global
change_classifier = ChangeClassifier()
