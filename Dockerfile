FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /data/uploads /data && chown -R node:node /data /app
USER node

EXPOSE 8080

CMD ["node", "server.js"]