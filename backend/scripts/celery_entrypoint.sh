#!/bin/bash
set -e

echo "=========================================="
echo "       HACKATHON-5 CELERY STARTUP"
echo "=========================================="

# Aguardar alguns segundos para o backend inicializar primeiro
echo "Aguardando backend inicializar..."
sleep 10

# Iniciar Celery worker
echo "Iniciando Celery worker..."
exec celery -A app.celery_app worker --loglevel=info
