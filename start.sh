#!/bin/bash
set -e

# Actualizar paquetes
apt update

# Instalar ffmpeg
apt install -y ffmpeg

# ✅ Verificar que ffmpeg está instalado
echo "Verificando instalación de ffmpeg..."
ffmpeg -version

# 🔥 Iniciar la app
npm start