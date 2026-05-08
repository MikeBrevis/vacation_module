# Usa una imagen oficial de Node.js como base
FROM node:18-slim

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos del proyecto al contenedor
COPY . .

# Entra al directorio de la API e instala las dependencias
WORKDIR /app/vacation_module_api
RUN npm install

# Expone el puerto que usa la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]
