FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run db:migrate && npm run db:seed

EXPOSE 3001 5173

CMD npm run dev
