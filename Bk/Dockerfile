FROM node:18-alpine
WORKDIR /app
# 3. Copiem fișierele de dependențe
COPY package*.json ./

# 4. Instalăm dependențele
RUN npm install --production

# 5. Copiem restul codului sursă
COPY . .

# 6. Expunem portul pe care rulează aplicația
EXPOSE 3000

# 7. Comanda de start
CMD ["npm", "start"]