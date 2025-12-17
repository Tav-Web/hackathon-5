"""Storage service for MinIO/S3 compatible object storage."""

import logging
from typing import TYPE_CHECKING, BinaryIO

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.config import settings

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client

logger = logging.getLogger(__name__)


class StorageError(Exception):
    """Base exception for storage errors."""


class StorageConnectionError(StorageError):
    """Connection to storage failed."""


class StorageUploadError(StorageError):
    """Upload failed."""


class StorageDownloadError(StorageError):
    """Download failed."""


class StorageNotFoundError(StorageError):
    """File not found in storage."""


def get_s3_client() -> "S3Client":
    """Create and return a boto3 S3 client configured for MinIO."""
    protocol = "https" if settings.MINIO_SECURE else "http"
    endpoint_url = f"{protocol}://{settings.MINIO_ENDPOINT}"

    try:
        client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.MINIO_ROOT_USER,
            aws_secret_access_key=settings.MINIO_ROOT_PASSWORD,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )
        return client
    except Exception as e:
        logger.error(f"Failed to create S3 client: {e}")
        raise StorageConnectionError(f"Failed to connect to storage: {e}") from e


def ensure_bucket_exists() -> None:
    """Create the bucket if it doesn't exist."""
    client = get_s3_client()
    bucket = settings.MINIO_BUCKET

    try:
        client.head_bucket(Bucket=bucket)
        logger.info(f"Bucket '{bucket}' already exists")
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        if error_code == "404":
            try:
                client.create_bucket(Bucket=bucket)
                logger.info(f"Bucket '{bucket}' created successfully")
            except ClientError as create_error:
                logger.error(f"Failed to create bucket '{bucket}': {create_error}")
                raise StorageError(f"Failed to create bucket: {create_error}") from create_error
        else:
            logger.error(f"Failed to check bucket '{bucket}': {e}")
            raise StorageConnectionError(f"Failed to check bucket: {e}") from e


def upload_file(file_path: str, destination_key: str) -> str:
    """Upload a local file to MinIO."""
    client = get_s3_client()

    try:
        client.upload_file(file_path, settings.MINIO_BUCKET, destination_key)
        logger.info(f"Uploaded '{file_path}' to '{destination_key}'")
        return destination_key
    except ClientError as e:
        logger.error(f"Failed to upload '{file_path}': {e}")
        raise StorageUploadError(f"Failed to upload: {e}") from e


def upload_fileobj(
    file_obj: BinaryIO, destination_key: str, content_type: str = "application/octet-stream"
) -> str:
    """Upload a file object to MinIO."""
    client = get_s3_client()

    try:
        client.upload_fileobj(
            file_obj,
            settings.MINIO_BUCKET,
            destination_key,
            ExtraArgs={"ContentType": content_type},
        )
        logger.info(f"Uploaded file object to '{destination_key}'")
        return destination_key
    except ClientError as e:
        logger.error(f"Failed to upload file object: {e}")
        raise StorageUploadError(f"Failed to upload: {e}") from e


def download_file(source_key: str, destination_path: str) -> None:
    """Download a file from MinIO to a local path."""
    client = get_s3_client()

    try:
        client.download_file(settings.MINIO_BUCKET, source_key, destination_path)
        logger.info(f"Downloaded '{source_key}' to '{destination_path}'")
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        if error_code == "404":
            raise StorageNotFoundError(f"File not found: '{source_key}'") from e
        raise StorageDownloadError(f"Failed to download: {e}") from e


def get_file_url(key: str, expiration: int | None = None) -> str:
    """Generate a presigned URL for accessing a file."""
    client = get_s3_client()
    if expiration is None:
        expiration = settings.MINIO_PRESIGNED_EXPIRY

    try:
        url: str = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.MINIO_BUCKET, "Key": key},
            ExpiresIn=expiration,
        )
        return url
    except ClientError as e:
        logger.error(f"Failed to generate URL for '{key}': {e}")
        raise StorageError(f"Failed to generate URL: {e}") from e


def delete_file(key: str) -> None:
    """Delete a file from MinIO."""
    client = get_s3_client()

    try:
        client.delete_object(Bucket=settings.MINIO_BUCKET, Key=key)
        logger.info(f"Deleted '{key}'")
    except ClientError as e:
        logger.error(f"Failed to delete '{key}': {e}")
        raise StorageError(f"Failed to delete: {e}") from e


def get_image_path(image_id: str, filename: str) -> str:
    """Get the storage path for an image."""
    return f"images/{image_id}/{filename}"


def get_analysis_path(analysis_id: str, filename: str) -> str:
    """Get the storage path for analysis results."""
    return f"analyses/{analysis_id}/{filename}"
