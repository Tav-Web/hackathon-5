#!/bin/bash
set -e

echo "=========================================="
echo "       HACKATHON-5 BACKEND STARTUP"
echo "=========================================="

# Executar script de inicializacao do banco
echo "Executando inicializacao do banco de dados..."
python /app/scripts/init_db.py

# Iniciar servidor
echo "Iniciando servidor FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
