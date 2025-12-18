FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias do sistema para OpenCV, GDAL e PostgreSQL client
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    libgdal-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar codigo
COPY . .

# Dar permissao aos scripts
RUN chmod +x /app/scripts/*.sh

# Criar diretorio de uploads
RUN mkdir -p uploads

# Expor porta
EXPOSE 8000

# Usar entrypoint script (cria tabelas, bucket, e inicia servidor)
ENTRYPOINT ["/app/scripts/entrypoint.sh"]
