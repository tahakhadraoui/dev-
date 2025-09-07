# --- Étape de build ---
FROM node:18-alpine AS builder

WORKDIR /app

# Copier uniquement les fichiers nécessaires pour installer les dépendances
COPY package*.json ./

# Installer les dépendances de manière propre et stable
RUN npm ci --legacy-peer-deps

# Copier tout le projet
COPY . .

# Définir l'URL du backend au moment du build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build de l'application Next.js pour la production
RUN npm run build

# --- Étape finale pour la production ---
FROM node:18-alpine

WORKDIR /app

# Copier uniquement les fichiers nécessaires depuis le builder pour la prod
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Exposer le port 3000
EXPOSE 3000

# Lancer l'application Next.js en production
CMD ["npm", "run", "start"]
