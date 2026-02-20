# Usar una imagen oficial de Node.js ligera
FROM node:20-alpine

# Crear el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de dependencias
COPY package*.json ./

# Instalar las dependencias
RUN npm install

# Copiar el resto del código del backend
COPY . .

# Exponer el puerto del backend
EXPOSE 4000

# Comando para iniciar el servidor
CMD ["npm", "start"]