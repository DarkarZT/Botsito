#!/bin/bash
set -e

# Actualizar la lista de paquetes
apt update

# Instalar ffmpeg
apt install -y ffmpeg

# Luego arrancar tu app (o el bot, o el servidor)
npm start