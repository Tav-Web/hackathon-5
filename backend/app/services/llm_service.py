"""
Serviço de integração com LLM via OpenRouter.

Fornece funcionalidades para análise automática de mudanças
territoriais e chat interativo com IA.
"""

from typing import Any

from openai import OpenAI

from app.config import settings


class LLMService:
    """
    Serviço para interação com LLM via OpenRouter.

    Usa a API compatível com OpenAI para se comunicar com modelos
    como Gemini 3 Flash via OpenRouter.
    """

    # System prompts
    SYSTEM_ANALYST = """Você é um especialista em análise ambiental e territorial usando imagens de satélite.
Seu papel é analisar dados de mudanças territoriais detectadas via índices espectrais do Sentinel-2.

Índices que você interpreta:
- NDVI (Vegetação): valores positivos indicam vegetação, negativos indicam solo/construção
- NDBI (Área Construída): valores positivos indicam áreas construídas
- BSI (Solo Exposto): valores positivos indicam solo exposto, entulho ou terraplanagem
- NBR (Queimadas): valores negativos indicam áreas queimadas

Tipos de mudança:
- NOVA_CONSTRUCAO: Vegetação removida e substituída por construção
- ENTULHO: Solo exposto, terraplanagem ou depósito de material
- QUEIMADA: Área queimada recentemente
- DESMATAMENTO: Redução significativa de vegetação
- REFLORESTAMENTO: Aumento de cobertura vegetal
- EXPANSAO_URBANA: Expansão de área urbana
- SEM_MUDANCA: Sem alterações significativas

Forneça análises técnicas mas acessíveis, sempre em português brasileiro."""

    SYSTEM_CHAT = """Você é um assistente especializado em análise ambiental e territorial.
Responda perguntas sobre análises de mudanças detectadas em imagens de satélite.

Seja objetivo, técnico mas acessível. Use dados concretos quando disponíveis.
Sempre responda em português brasileiro.

Se não tiver informação suficiente para responder, diga claramente."""

    def __init__(self):
        """Inicializa o cliente OpenRouter."""
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY,
        )
        self.model = settings.OPENROUTER_MODEL

    def _format_analysis_context(self, analysis_data: dict) -> str:
        """
        Formata dados da análise para contexto do LLM.

        Args:
            analysis_data: Dicionário com resultados da análise GEE

        Returns:
            String formatada com os dados relevantes
        """
        parts = []

        # Classificação
        if classification := analysis_data.get("classification"):
            parts.append(f"""## Classificação Detectada
- Tipo: {classification.get('change_type', 'N/A')}
- Confiança: {classification.get('confidence', 0) * 100:.1f}%
- Nível de Alerta: {classification.get('alert_level', 'N/A')}
- Descrição: {classification.get('description', 'N/A')}""")

        # Índices do início
        if indices_start := analysis_data.get("indices_start"):
            parts.append(f"""## Índices Espectrais - Início do Período
- NDVI (Vegetação): {indices_start.get('ndvi', 0):.4f}
- NDBI (Área Construída): {indices_start.get('ndbi', 0):.4f}
- BSI (Solo Exposto): {indices_start.get('bsi', 0):.4f}
- NBR (Queimadas): {indices_start.get('nbr', 0):.4f}""")

        # Índices do fim
        if indices_end := analysis_data.get("indices_end"):
            parts.append(f"""## Índices Espectrais - Fim do Período
- NDVI (Vegetação): {indices_end.get('ndvi', 0):.4f}
- NDBI (Área Construída): {indices_end.get('ndbi', 0):.4f}
- BSI (Solo Exposto): {indices_end.get('bsi', 0):.4f}
- NBR (Queimadas): {indices_end.get('nbr', 0):.4f}""")

        # Deltas
        if deltas := analysis_data.get("deltas"):
            parts.append(f"""## Variações (Deltas)
- ΔNDVI: {deltas.get('ndvi', 0):+.4f}
- ΔNDBI: {deltas.get('ndbi', 0):+.4f}
- ΔBSI: {deltas.get('bsi', 0):+.4f}
- ΔNBR: {deltas.get('nbr', 0):+.4f}""")

        # Metadados
        if images_found := analysis_data.get("images_found"):
            parts.append(f"""## Metadados
- Imagens analisadas: {images_found}""")

        if start_date := analysis_data.get("start_date"):
            end_date = analysis_data.get("end_date", "N/A")
            parts.append(f"- Período: {start_date} até {end_date}")

        return "\n\n".join(parts)

    def analyze_changes(self, analysis_data: dict) -> str:
        """
        Gera análise descritiva automática das mudanças detectadas.

        Args:
            analysis_data: Dicionário com resultados da análise GEE

        Returns:
            Texto com análise detalhada gerada pela IA
        """
        context = self._format_analysis_context(analysis_data)

        prompt = f"""Analise os seguintes dados de mudança territorial detectada por satélite:

{context}

Forneça uma análise completa incluindo:
1. Resumo executivo (2-3 frases)
2. Interpretação técnica dos índices e suas variações
3. Possíveis causas da mudança detectada
4. Impactos ambientais potenciais
5. Recomendações de ação (se aplicável)

Seja objetivo e baseie-se nos dados fornecidos."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.SYSTEM_ANALYST},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1500,
            temperature=0.3,
        )

        return response.choices[0].message.content or ""

    def answer_question(
        self,
        question: str,
        analysis_data: dict,
        chat_history: list[dict] | None = None,
    ) -> str:
        """
        Responde perguntas do usuário sobre as mudanças detectadas.

        Args:
            question: Pergunta do usuário
            analysis_data: Dicionário com resultados da análise
            chat_history: Histórico de mensagens anteriores (opcional)

        Returns:
            Resposta gerada pela IA
        """
        context = self._format_analysis_context(analysis_data)

        # Monta mensagens
        messages = [{"role": "system", "content": self.SYSTEM_CHAT}]

        # Adiciona contexto da análise como primeira mensagem
        messages.append(
            {
                "role": "user",
                "content": f"Contexto da análise atual:\n\n{context}",
            }
        )
        messages.append(
            {
                "role": "assistant",
                "content": "Entendido. Tenho o contexto da análise. Como posso ajudar?",
            }
        )

        # Adiciona histórico se existir
        if chat_history:
            for msg in chat_history:
                messages.append(
                    {
                        "role": msg.get("role", "user"),
                        "content": msg.get("content", ""),
                    }
                )

        # Adiciona pergunta atual
        messages.append({"role": "user", "content": question})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=1000,
            temperature=0.5,
        )

        return response.choices[0].message.content or ""

    def get_suggested_questions(self, analysis_data: dict) -> list[dict]:
        """
        Retorna perguntas sugeridas baseadas no tipo de mudança.

        Args:
            analysis_data: Dicionário com resultados da análise

        Returns:
            Lista de perguntas sugeridas com categoria
        """
        classification = analysis_data.get("classification", {})
        change_type = classification.get("change_type", "SEM_MUDANCA")

        # Perguntas base para todos os tipos
        base_questions = [
            {
                "question": "Qual o impacto ambiental dessa mudança?",
                "category": "impacto",
            },
            {
                "question": "O que pode ter causado essa alteração?",
                "category": "causa",
            },
            {
                "question": "Essa mudança é reversível?",
                "category": "reversibilidade",
            },
        ]

        # Perguntas específicas por tipo de mudança
        specific_questions = {
            "NOVA_CONSTRUCAO": [
                {
                    "question": "Essa construção parece regular ou irregular?",
                    "category": "regularidade",
                },
                {
                    "question": "Qual área aproximada foi construída?",
                    "category": "area",
                },
            ],
            "ENTULHO": [
                {
                    "question": "Pode ser um aterro sanitário ou depósito irregular?",
                    "category": "identificacao",
                },
                {
                    "question": "Há risco de contaminação do solo?",
                    "category": "risco",
                },
            ],
            "QUEIMADA": [
                {
                    "question": "A queimada parece intencional ou acidental?",
                    "category": "causa",
                },
                {
                    "question": "Quanto tempo leva para a vegetação se recuperar?",
                    "category": "recuperacao",
                },
            ],
            "DESMATAMENTO": [
                {
                    "question": "Quais espécies podem ter sido afetadas?",
                    "category": "biodiversidade",
                },
                {
                    "question": "Isso pode ser desmatamento ilegal?",
                    "category": "legalidade",
                },
            ],
            "REFLORESTAMENTO": [
                {
                    "question": "Parece reflorestamento natural ou plantado?",
                    "category": "tipo",
                },
                {
                    "question": "Qual o benefício ambiental dessa recuperação?",
                    "category": "beneficio",
                },
            ],
            "EXPANSAO_URBANA": [
                {
                    "question": "A expansão respeita áreas de preservação?",
                    "category": "legalidade",
                },
                {
                    "question": "Há infraestrutura adequada para essa expansão?",
                    "category": "infraestrutura",
                },
            ],
            "SEM_MUDANCA": [
                {
                    "question": "O que os índices espectrais indicam sobre a área?",
                    "category": "caracterizacao",
                },
                {
                    "question": "Há alguma tendência sutil nos dados?",
                    "category": "tendencia",
                },
            ],
        }

        # Combina perguntas base com específicas
        questions = base_questions + specific_questions.get(change_type, [])

        return questions[:6]  # Máximo de 6 sugestões

    def generate_report_summary(self, analysis_data: dict) -> dict[str, Any]:
        """
        Gera um resumo estruturado para relatório.

        Args:
            analysis_data: Dicionário com resultados da análise

        Returns:
            Dict com resumo, pontos-chave e recomendações
        """
        context = self._format_analysis_context(analysis_data)

        prompt = f"""Com base nos dados abaixo, gere um resumo estruturado em JSON:

{context}

Retorne APENAS um JSON válido com a seguinte estrutura:
{{
    "titulo": "string com título descritivo",
    "resumo": "string com resumo de 2-3 frases",
    "pontos_chave": ["lista", "de", "pontos", "importantes"],
    "recomendacoes": ["lista", "de", "recomendações"],
    "severidade": "baixa" | "media" | "alta" | "critica"
}}"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.SYSTEM_ANALYST},
                {"role": "user", "content": prompt},
            ],
            max_tokens=800,
            temperature=0.2,
        )

        content = response.choices[0].message.content or "{}"

        # Tenta extrair JSON da resposta
        import json
        import re

        # Remove possíveis blocos de código markdown
        content = re.sub(r"```json\s*", "", content)
        content = re.sub(r"```\s*", "", content)

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Retorna estrutura padrão se falhar
            classification = analysis_data.get("classification", {})
            return {
                "titulo": f"Análise de {classification.get('change_type', 'Mudança')}",
                "resumo": classification.get("description", "Análise não disponível"),
                "pontos_chave": [],
                "recomendacoes": [],
                "severidade": self._alert_to_severity(
                    classification.get("alert_level", "info")
                ),
            }

    def _alert_to_severity(self, alert_level: str) -> str:
        """Converte nível de alerta para severidade."""
        mapping = {
            "critical": "critica",
            "warning": "alta",
            "info": "baixa",
            "success": "baixa",
        }
        return mapping.get(alert_level, "media")


# Instância singleton para uso global
llm_service = LLMService()
