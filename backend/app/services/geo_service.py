"""Geospatial service for geometry operations."""

from typing import cast

from geoalchemy2 import WKBElement
from geoalchemy2.shape import to_shape
from pyproj import Geod
from shapely import wkb
from shapely.geometry import mapping, shape
from shapely.validation import explain_validity

SRID_WGS84 = 4326


def calculate_area_m2(geojson_geometry: dict[str, object]) -> float:
    """Calculate the area of a geometry in square meters."""
    shapely_geom = shape(geojson_geometry)

    if shapely_geom.is_empty or not shapely_geom.is_valid:
        return 0.0

    geod = Geod(ellps="WGS84")
    area, _ = geod.geometry_area_perimeter(shapely_geom)
    return abs(area)


def validate_geometry(geojson_geometry: dict[str, object]) -> tuple[bool, str]:
    """Validate a GeoJSON geometry."""
    try:
        shapely_geom = shape(geojson_geometry)
    except Exception as e:
        return (False, f"GeoJSON inválido: {e}")

    if shapely_geom.geom_type not in ("Polygon", "MultiPolygon"):
        return (False, f"Esperado Polygon, recebido {shapely_geom.geom_type}")

    if shapely_geom.is_empty:
        return (False, "Geometria vazia")

    if not shapely_geom.is_valid:
        return (False, explain_validity(shapely_geom))

    return (True, "")


def geojson_to_wkb(geojson_geometry: dict[str, object]) -> bytes:
    """Convert GeoJSON geometry to WKB."""
    shapely_geom = shape(geojson_geometry)
    return wkb.dumps(shapely_geom, include_srid=False)


def wkb_to_geojson(wkb_data: bytes | WKBElement) -> dict[str, object]:
    """Convert WKB to GeoJSON geometry."""
    if isinstance(wkb_data, WKBElement):
        shapely_geom = to_shape(wkb_data)
    else:
        shapely_geom = wkb.loads(wkb_data)
    result = mapping(shapely_geom)
    return cast(dict[str, object], result)


def pixel_to_geo(
    pixel_coords: list[list[float]],
    bounds: dict[str, float],
    image_width: int,
    image_height: int,
) -> list[list[float]]:
    """Convert pixel coordinates to geographic coordinates.

    Args:
        pixel_coords: List of [x, y] pixel coordinates
        bounds: Dictionary with minx, miny, maxx, maxy
        image_width: Image width in pixels
        image_height: Image height in pixels

    Returns:
        List of [lon, lat] geographic coordinates
    """
    minx = bounds["minx"]
    miny = bounds["miny"]
    maxx = bounds["maxx"]
    maxy = bounds["maxy"]

    x_scale = (maxx - minx) / image_width
    y_scale = (maxy - miny) / image_height

    geo_coords = []
    for px, py in pixel_coords:
        lon = minx + px * x_scale
        lat = maxy - py * y_scale  # Y is inverted in images
        geo_coords.append([lon, lat])

    return geo_coords
