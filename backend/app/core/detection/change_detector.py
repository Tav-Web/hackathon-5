import uuid
from typing import Any

import cv2
import numpy as np
from PIL import Image


async def detect_changes(
    image_before_path: str,
    image_after_path: str,
    threshold: float = 0.3,
    min_area: int = 100,
) -> list[dict[str, Any]]:
    """
    Detecta mudanças entre duas imagens.

    Args:
        image_before_path: Caminho da imagem anterior
        image_after_path: Caminho da imagem posterior
        threshold: Limiar para detecção de mudanças (0-1)
        min_area: Área mínima em pixels para considerar uma mudança

    Returns:
        Lista de mudanças detectadas com geometrias
    """
    # Carregar imagens
    img_before = cv2.imread(image_before_path)
    img_after = cv2.imread(image_after_path)

    if img_before is None or img_after is None:
        # Tentar com PIL para formatos alternativos
        img_before = np.array(Image.open(image_before_path).convert("RGB"))
        img_after = np.array(Image.open(image_after_path).convert("RGB"))
        img_before = cv2.cvtColor(img_before, cv2.COLOR_RGB2BGR)
        img_after = cv2.cvtColor(img_after, cv2.COLOR_RGB2BGR)

    # Redimensionar se necessário (mesmo tamanho)
    if img_before.shape != img_after.shape:
        h = min(img_before.shape[0], img_after.shape[0])
        w = min(img_before.shape[1], img_after.shape[1])
        img_before = cv2.resize(img_before, (w, h))
        img_after = cv2.resize(img_after, (w, h))

    # Converter para escala de cinza
    gray_before = cv2.cvtColor(img_before, cv2.COLOR_BGR2GRAY)
    gray_after = cv2.cvtColor(img_after, cv2.COLOR_BGR2GRAY)

    # Normalizar histogramas
    gray_before = cv2.equalizeHist(gray_before)
    gray_after = cv2.equalizeHist(gray_after)

    # Calcular diferença absoluta
    diff = cv2.absdiff(gray_before, gray_after)

    # Aplicar threshold
    threshold_value = int(threshold * 255)
    _, binary = cv2.threshold(diff, threshold_value, 255, cv2.THRESH_BINARY)

    # Operações morfológicas para remover ruído
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

    # Encontrar contornos
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    changes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue

        # Calcular centróide
        M = cv2.moments(contour)
        if M["m00"] == 0:
            continue
        cx = M["m10"] / M["m00"]
        cy = M["m01"] / M["m00"]

        # Converter contorno para coordenadas (simplificado)
        # Em produção, usar georreferenciamento real
        epsilon = 0.02 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)

        # Criar geometria GeoJSON (coordenadas em pixels por enquanto)
        coordinates = [[[float(p[0][0]), float(p[0][1])] for p in approx]]
        # Fechar o polígono
        if coordinates[0] and coordinates[0][0] != coordinates[0][-1]:
            coordinates[0].append(coordinates[0][0])

        # Classificar tipo de mudança (simplificado)
        change_type = classify_change(img_before, img_after, contour)

        changes.append(
            {
                "id": str(uuid.uuid4()),
                "type": change_type,
                "area": float(area),
                "centroid": (float(cx), float(cy)),
                "confidence": calculate_confidence(diff, contour),
                "geometry": {"type": "Polygon", "coordinates": coordinates},
            }
        )

    return changes


def classify_change(
    img_before: np.ndarray, img_after: np.ndarray, contour: np.ndarray
) -> str:
    """
    Classifica o tipo de mudança baseado nas características da região.

    Análise simplificada baseada em cor média da região.
    Em produção, usar modelo de ML para classificação.
    """
    # Criar máscara do contorno
    mask = np.zeros(img_before.shape[:2], dtype=np.uint8)
    cv2.drawContours(mask, [contour], -1, 255, -1)

    # Calcular cor média antes e depois
    mean_before = cv2.mean(img_before, mask=mask)[:3]
    mean_after = cv2.mean(img_after, mask=mask)[:3]

    # Converter para HSV para análise
    hsv_before = cv2.cvtColor(
        np.uint8([[mean_before]]), cv2.COLOR_BGR2HSV
    )[0][0]
    hsv_after = cv2.cvtColor(
        np.uint8([[mean_after]]), cv2.COLOR_BGR2HSV
    )[0][0]

    # Lógica simplificada de classificação
    # Verde (vegetação) -> Marrom/Cinza = Desmatamento
    # Marrom/Cinza -> Verde = Crescimento de vegetação
    # Qualquer -> Cinza escuro = Construção
    # Verde -> Marrom = Movimentação de solo

    h_before, s_before, v_before = hsv_before
    h_after, s_after, v_after = hsv_after

    # Verde: H entre 35-85
    is_green_before = 35 <= h_before <= 85 and s_before > 50
    is_green_after = 35 <= h_after <= 85 and s_after > 50

    # Cinza: baixa saturação
    is_gray_after = s_after < 50

    if is_green_before and not is_green_after:
        if is_gray_after and v_after < 100:
            return "construction"
        return "deforestation"
    elif not is_green_before and is_green_after:
        return "vegetation_growth"
    elif is_gray_after and v_after < 80:
        return "construction"
    elif v_after > v_before + 30:
        return "debris"

    return "unknown"


def calculate_confidence(diff: np.ndarray, contour: np.ndarray) -> float:
    """Calcula a confiança da detecção baseado na intensidade da diferença."""
    mask = np.zeros(diff.shape, dtype=np.uint8)
    cv2.drawContours(mask, [contour], -1, 255, -1)
    mean_diff = cv2.mean(diff, mask=mask)[0]
    # Normalizar para 0-1
    return min(float(mean_diff) / 255.0 * 2, 1.0)
