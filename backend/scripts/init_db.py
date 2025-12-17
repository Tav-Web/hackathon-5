#!/usr/bin/env python3
"""
Script para inicializar o banco de dados e criar bucket no MinIO.
Executado automaticamente no startup do container.
"""
import sys
import time
from pathlib import Path

# Adicionar backend ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.config import settings
from app.db.session import engine
from app.db.base import Base

# Importar todos os models para registrar no metadata
from app.models import SatelliteImage, Analysis, GeeAnalysis


def wait_for_db(max_retries: int = 30, delay: int = 2) -> bool:
    """Aguarda o banco de dados estar disponivel."""
    print("Aguardando banco de dados...")

    for attempt in range(max_retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                print(f"Banco de dados disponivel! (tentativa {attempt + 1})")
                return True
        except OperationalError as e:
            print(f"Tentativa {attempt + 1}/{max_retries}: Banco nao disponivel ainda...")
            if attempt < max_retries - 1:
                time.sleep(delay)

    print("ERRO: Banco de dados nao ficou disponivel!")
    return False


def create_postgis_extension():
    """Cria extensao PostGIS se nao existir."""
    print("Criando extensao PostGIS...")
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            conn.commit()
            print("Extensao PostGIS criada/verificada!")
    except Exception as e:
        print(f"Aviso ao criar PostGIS (pode ja existir): {e}")


def create_tables():
    """Cria todas as tabelas do banco."""
    print("Criando tabelas...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Tabelas criadas com sucesso!")

        # Listar tabelas criadas
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            ))
            tables = [row[0] for row in result]
            print(f"Tabelas existentes: {', '.join(tables)}")

    except Exception as e:
        print(f"ERRO ao criar tabelas: {e}")
        raise


def init_minio():
    """Inicializa o bucket no MinIO."""
    print("Inicializando MinIO...")

    try:
        import boto3
        from botocore.exceptions import ClientError

        s3 = boto3.client(
            's3',
            endpoint_url=f"http://{settings.MINIO_ENDPOINT}",
            aws_access_key_id=settings.MINIO_ROOT_USER,
            aws_secret_access_key=settings.MINIO_ROOT_PASSWORD,
        )

        bucket_name = settings.MINIO_BUCKET

        # Verificar se bucket existe
        try:
            s3.head_bucket(Bucket=bucket_name)
            print(f"Bucket '{bucket_name}' ja existe!")
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == '404':
                # Bucket nao existe, criar
                print(f"Criando bucket '{bucket_name}'...")
                s3.create_bucket(Bucket=bucket_name)
                print(f"Bucket '{bucket_name}' criado com sucesso!")
            else:
                print(f"Aviso MinIO: {e}")

    except Exception as e:
        print(f"Aviso: Nao foi possivel inicializar MinIO: {e}")
        print("MinIO pode nao estar disponivel ainda. O bucket sera criado depois.")


def main():
    """Executa toda a inicializacao."""
    print("=" * 50)
    print("INICIALIZACAO DO BACKEND")
    print("=" * 50)

    # 1. Aguardar banco
    if not wait_for_db():
        sys.exit(1)

    # 2. Criar extensao PostGIS
    create_postgis_extension()

    # 3. Criar tabelas
    create_tables()

    # 4. Inicializar MinIO (nao bloqueia se falhar)
    init_minio()

    print("=" * 50)
    print("INICIALIZACAO CONCLUIDA!")
    print("=" * 50)


if __name__ == "__main__":
    main()
