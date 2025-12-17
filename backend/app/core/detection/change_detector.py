"""
Change detection module for satellite images using Spectral Indices.
Supports GeoTIFF with georeferencing for proper coordinate conversion.

Uses NDVI, NDBI, NDWI for more accurate change detection.
"""
import uuid
from typing import Any, Optional

import cv2
import numpy as np
import rasterio
from rasterio.transform import Affine


class GeoTransformer:
    """Handles coordinate transformations between pixels and geographic coordinates."""

    def __init__(self, transform: Affine, crs: str):
        self.transform = transform
        self.crs = crs

    def pixel_to_geo(self, x: float, y: float) -> tuple[float, float]:
        """Convert pixel coordinates to geographic coordinates (lon, lat)."""
        lon, lat = rasterio.transform.xy(self.transform, y, x)
        return float(lon), float(lat)

    def pixels_to_geo_polygon(self, pixel_coords: list[list[float]]) -> list[list[float]]:
        """Convert a list of pixel coordinates to geographic coordinates."""
        geo_coords = []
        for px, py in pixel_coords:
            lon, lat = self.pixel_to_geo(px, py)
            geo_coords.append([float(lon), float(lat)])
        return geo_coords


def load_sentinel2_bands(filepath: str) -> tuple[dict[str, np.ndarray], Optional[GeoTransformer]]:
    """
    Load Sentinel-2 bands from a GeoTIFF file.

    Expected band order from Earth Engine: B4 (Red), B3 (Green), B2 (Blue), B8 (NIR)
    Some files may also include B11 (SWIR) and B12 (SWIR2)

    Returns:
        Tuple of (bands dict, GeoTransformer or None)
    """
    try:
        with rasterio.open(filepath) as src:
            bands = {}
            geo_transformer = None

            # Get transform if available
            if src.transform and src.crs:
                geo_transformer = GeoTransformer(src.transform, str(src.crs))

            # Read bands based on count
            # Sentinel-2 from GEE typically has: B4, B3, B2, B8 (and optionally B11, B12)
            if src.count >= 4:
                bands['red'] = src.read(1).astype(np.float32)    # B4
                bands['green'] = src.read(2).astype(np.float32)  # B3
                bands['blue'] = src.read(3).astype(np.float32)   # B2
                bands['nir'] = src.read(4).astype(np.float32)    # B8

                if src.count >= 5:
                    bands['swir1'] = src.read(5).astype(np.float32)  # B11
                if src.count >= 6:
                    bands['swir2'] = src.read(6).astype(np.float32)  # B12
            elif src.count == 3:
                # RGB only - use green index approximation
                bands['red'] = src.read(1).astype(np.float32)
                bands['green'] = src.read(2).astype(np.float32)
                bands['blue'] = src.read(3).astype(np.float32)
                # Approximate NIR from RGB (not ideal but works for testing)
                bands['nir'] = bands['green'] * 1.5
            else:
                # Single band
                band = src.read(1).astype(np.float32)
                bands['red'] = band
                bands['green'] = band
                bands['blue'] = band
                bands['nir'] = band

            return bands, geo_transformer

    except Exception as e:
        print(f"Error loading GeoTIFF: {e}")
        return {}, None


def calculate_ndvi(nir: np.ndarray, red: np.ndarray) -> np.ndarray:
    """
    Calculate Normalized Difference Vegetation Index.
    NDVI = (NIR - RED) / (NIR + RED)

    Values range from -1 to 1:
    - High values (0.6-0.9): Dense vegetation
    - Medium values (0.2-0.5): Sparse vegetation
    - Low values (-0.1 to 0.1): Bare soil, rocks
    - Negative values: Water, snow, clouds
    """
    with np.errstate(divide='ignore', invalid='ignore'):
        ndvi = (nir - red) / (nir + red)
        ndvi = np.nan_to_num(ndvi, nan=0.0, posinf=0.0, neginf=0.0)
    return np.clip(ndvi, -1, 1)


def calculate_ndbi(swir: np.ndarray, nir: np.ndarray) -> np.ndarray:
    """
    Calculate Normalized Difference Built-up Index.
    NDBI = (SWIR - NIR) / (SWIR + NIR)

    Higher values indicate built-up/urban areas.
    """
    with np.errstate(divide='ignore', invalid='ignore'):
        ndbi = (swir - nir) / (swir + nir)
        ndbi = np.nan_to_num(ndbi, nan=0.0, posinf=0.0, neginf=0.0)
    return np.clip(ndbi, -1, 1)


def calculate_ndwi(green: np.ndarray, nir: np.ndarray) -> np.ndarray:
    """
    Calculate Normalized Difference Water Index.
    NDWI = (GREEN - NIR) / (GREEN + NIR)

    Higher values indicate water bodies.
    """
    with np.errstate(divide='ignore', invalid='ignore'):
        ndwi = (green - nir) / (green + nir)
        ndwi = np.nan_to_num(ndwi, nan=0.0, posinf=0.0, neginf=0.0)
    return np.clip(ndwi, -1, 1)


def calculate_bsi(blue: np.ndarray, red: np.ndarray, nir: np.ndarray, swir: np.ndarray) -> np.ndarray:
    """
    Calculate Bare Soil Index.
    BSI = ((SWIR + RED) - (NIR + BLUE)) / ((SWIR + RED) + (NIR + BLUE))

    Higher values indicate bare soil.
    """
    with np.errstate(divide='ignore', invalid='ignore'):
        bsi = ((swir + red) - (nir + blue)) / ((swir + red) + (nir + blue))
        bsi = np.nan_to_num(bsi, nan=0.0, posinf=0.0, neginf=0.0)
    return np.clip(bsi, -1, 1)


def classify_change_spectral(
    ndvi_before: float, ndvi_after: float,
    ndbi_before: Optional[float], ndbi_after: Optional[float],
    ndwi_before: float, ndwi_after: float,
) -> tuple[str, float]:
    """
    Classify the type of change based on spectral index differences.

    Returns:
        Tuple of (change_type, confidence)
    """
    delta_ndvi = ndvi_after - ndvi_before
    delta_ndwi = ndwi_after - ndwi_before
    delta_ndbi = (ndbi_after - ndbi_before) if ndbi_before is not None and ndbi_after is not None else None

    # Thresholds for classification
    NDVI_LOSS_THRESHOLD = -0.15  # Significant vegetation loss
    NDVI_GAIN_THRESHOLD = 0.15   # Significant vegetation gain
    NDBI_GAIN_THRESHOLD = 0.1    # New construction
    NDWI_GAIN_THRESHOLD = 0.2    # New water body

    # Classification logic
    confidence = 0.5

    # Deforestation: significant NDVI loss
    if delta_ndvi < NDVI_LOSS_THRESHOLD:
        if ndvi_before > 0.3:  # Was vegetation
            confidence = min(abs(delta_ndvi) * 2, 1.0)

            # Check if it became built-up
            if delta_ndbi is not None and delta_ndbi > NDBI_GAIN_THRESHOLD:
                return "urban_expansion", confidence

            # Check if soil exposed
            if ndvi_after < 0.1:
                return "deforestation", confidence

            return "vegetation_loss", confidence

    # Vegetation growth: significant NDVI gain
    if delta_ndvi > NDVI_GAIN_THRESHOLD:
        confidence = min(delta_ndvi * 2, 1.0)
        return "vegetation_growth", confidence

    # New construction: NDBI increase
    if delta_ndbi is not None and delta_ndbi > NDBI_GAIN_THRESHOLD:
        confidence = min(delta_ndbi * 3, 1.0)
        if ndvi_after < 0.2:  # Low vegetation
            return "construction", confidence
        return "urban_expansion", confidence

    # Water body change
    if delta_ndwi > NDWI_GAIN_THRESHOLD:
        confidence = min(delta_ndwi * 2, 1.0)
        return "water_increase", confidence

    if delta_ndwi < -NDWI_GAIN_THRESHOLD:
        confidence = min(abs(delta_ndwi) * 2, 1.0)
        return "water_decrease", confidence

    # Soil movement (moderate changes in multiple indices)
    if abs(delta_ndvi) > 0.1 or (delta_ndbi is not None and abs(delta_ndbi) > 0.05):
        confidence = 0.4
        return "soil_movement", confidence

    return "unknown", 0.3


async def detect_changes(
    image_before_path: str,
    image_after_path: str,
    threshold: float = 0.15,
    min_area: int = 100,
) -> list[dict[str, Any]]:
    """
    Detect changes between two satellite images using spectral indices.

    Args:
        image_before_path: Path to the "before" image (GeoTIFF)
        image_after_path: Path to the "after" image
        threshold: Minimum index difference to consider as change (0-1)
        min_area: Minimum area in pixels to consider a change

    Returns:
        List of detected changes with geometries and classifications
    """
    # Load bands from both images
    bands_before, geo_before = load_sentinel2_bands(image_before_path)
    bands_after, geo_after = load_sentinel2_bands(image_after_path)

    if not bands_before or not bands_after:
        raise ValueError("Could not load image bands")

    geo_transformer = geo_before or geo_after

    # Ensure same dimensions
    h_before = bands_before['red'].shape[0]
    w_before = bands_before['red'].shape[1]
    h_after = bands_after['red'].shape[0]
    w_after = bands_after['red'].shape[1]

    if (h_before, w_before) != (h_after, w_after):
        # Resize to smaller dimensions
        h = min(h_before, h_after)
        w = min(w_before, w_after)
        for key in bands_before:
            bands_before[key] = cv2.resize(bands_before[key], (w, h))
        for key in bands_after:
            bands_after[key] = cv2.resize(bands_after[key], (w, h))

    # Calculate spectral indices for both images
    ndvi_before = calculate_ndvi(bands_before['nir'], bands_before['red'])
    ndvi_after = calculate_ndvi(bands_after['nir'], bands_after['red'])

    ndwi_before = calculate_ndwi(bands_before['green'], bands_before['nir'])
    ndwi_after = calculate_ndwi(bands_after['green'], bands_after['nir'])

    # NDBI only if SWIR available
    ndbi_before = None
    ndbi_after = None
    if 'swir1' in bands_before and 'swir1' in bands_after:
        ndbi_before = calculate_ndbi(bands_before['swir1'], bands_before['nir'])
        ndbi_after = calculate_ndbi(bands_after['swir1'], bands_after['nir'])

    # Calculate change magnitude using NDVI difference as primary indicator
    delta_ndvi = np.abs(ndvi_after - ndvi_before)
    delta_ndwi = np.abs(ndwi_after - ndwi_before)

    # Combined change magnitude
    change_magnitude = np.maximum(delta_ndvi, delta_ndwi * 0.7)

    if ndbi_before is not None:
        delta_ndbi = np.abs(ndbi_after - ndbi_before)
        change_magnitude = np.maximum(change_magnitude, delta_ndbi * 0.8)

    # Apply threshold to get binary change mask
    change_mask = (change_magnitude > threshold).astype(np.uint8) * 255

    # Morphological operations to clean up
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    change_mask = cv2.morphologyEx(change_mask, cv2.MORPH_OPEN, kernel)
    change_mask = cv2.morphologyEx(change_mask, cv2.MORPH_CLOSE, kernel)

    # Find contours
    contours, _ = cv2.findContours(change_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    changes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue

        # Calculate centroid
        M = cv2.moments(contour)
        if M["m00"] == 0:
            continue
        cx_px = int(M["m10"] / M["m00"])
        cy_px = int(M["m01"] / M["m00"])

        # Create mask for this region
        region_mask = np.zeros(change_mask.shape, dtype=np.uint8)
        cv2.drawContours(region_mask, [contour], -1, 255, -1)

        # Calculate mean spectral indices for this region
        mean_ndvi_before = np.mean(ndvi_before[region_mask == 255])
        mean_ndvi_after = np.mean(ndvi_after[region_mask == 255])
        mean_ndwi_before = np.mean(ndwi_before[region_mask == 255])
        mean_ndwi_after = np.mean(ndwi_after[region_mask == 255])

        mean_ndbi_before = None
        mean_ndbi_after = None
        if ndbi_before is not None:
            mean_ndbi_before = np.mean(ndbi_before[region_mask == 255])
            mean_ndbi_after = np.mean(ndbi_after[region_mask == 255])

        # Classify change type
        change_type, confidence = classify_change_spectral(
            mean_ndvi_before, mean_ndvi_after,
            mean_ndbi_before, mean_ndbi_after,
            mean_ndwi_before, mean_ndwi_after,
        )

        # Simplify contour
        epsilon = 0.02 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)

        # Extract pixel coordinates
        pixel_coords = [[float(p[0][0]), float(p[0][1])] for p in approx]

        # Close polygon
        if pixel_coords and pixel_coords[0] != pixel_coords[-1]:
            pixel_coords.append(pixel_coords[0])

        # Convert to geographic coordinates if available
        if geo_transformer:
            geo_coords = geo_transformer.pixels_to_geo_polygon(pixel_coords)
            cx_geo, cy_geo = geo_transformer.pixel_to_geo(cx_px, cy_px)
            coordinates = [geo_coords]
            centroid = (cx_geo, cy_geo)
        else:
            coordinates = [pixel_coords]
            centroid = (float(cx_px), float(cy_px))

        # Calculate area in square meters (Sentinel-2 at 10m resolution = 100m² per pixel)
        area_m2 = float(area) * 100 if geo_transformer else float(area)

        # Additional spectral info for the change
        spectral_info = {
            "ndvi_before": float(mean_ndvi_before),
            "ndvi_after": float(mean_ndvi_after),
            "ndvi_change": float(mean_ndvi_after - mean_ndvi_before),
            "ndwi_change": float(mean_ndwi_after - mean_ndwi_before),
        }
        if mean_ndbi_before is not None:
            spectral_info["ndbi_change"] = float(mean_ndbi_after - mean_ndbi_before)

        changes.append({
            "id": str(uuid.uuid4()),
            "type": change_type,
            "area": float(area_m2),
            "area_pixels": float(area),
            "centroid": (float(centroid[0]), float(centroid[1])),
            "confidence": float(confidence),
            "geometry": {"type": "Polygon", "coordinates": coordinates},
            "is_georeferenced": geo_transformer is not None,
            "spectral": spectral_info,
        })

    return changes


# Fallback for non-spectral images (RGB only)
async def detect_changes_rgb(
    image_before_path: str,
    image_after_path: str,
    threshold: float = 0.3,
    min_area: int = 100,
) -> list[dict[str, Any]]:
    """
    Fallback change detection for RGB images without spectral bands.
    Uses simplified green index approximation.
    """
    return await detect_changes(image_before_path, image_after_path, threshold, min_area)
