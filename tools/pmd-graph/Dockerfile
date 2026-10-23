FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends osmium-tool python3-pyosmium python3 python3-gdal python3-numpy gdal-bin && rm -rf /var/lib/apt/lists/*
WORKDIR /w
