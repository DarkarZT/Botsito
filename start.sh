#!/bin/bash
set -e

# Actualizar paquetes
echo "Actualizando paquetes..."
apt update || { echo "Error al actualizar los paquetes"; exit 1; }

# Instalar ffmpeg
echo "Instalando ffmpeg..."
apt install -y ffmpeg || { echo "Error al instalar ffmpeg"; exit 1; }

# ✅ Verificar que ffmpeg está instalado
echo "Verificando instalación de ffmpeg..."
ffmpeg -version || { echo "ffmpeg no está instalado correctamente"; exit 1; }

# 🔥 Iniciar la app
echo "Iniciando la aplicación..."
npm install || { echo "Error al instalar las dependencias de npm"; exit 1; }

npm start || { echo "Error al iniciar la aplicación"; exit 1; }
