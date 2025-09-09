# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
ENV CI=true

ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
RUN npm run build

# --- Serve via nginx (static only) ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
