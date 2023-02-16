FROM node:18.8.0-alpine3.15
WORKDIR /app
ADD package*.json ./
ADD . .
RUN npm install
CMD node index.js