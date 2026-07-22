# Gestionnaire d'Étiquettes PDF

Application web permettant d'extraire automatiquement des références d'étiquettes depuis un PDF et de les assigner à des magasins.

## Technologies
- React, TypeScript, Vite
- Tailwind CSS
- Zustand (State Management)
- Tesseract.js (OCR)
- PDF.js

## Démarrage rapide (Local)
1. `npm install`
2. `npm run dev`

## Déploiement via Docker
```bash
docker-compose up -d --build
```
L'application sera disponible sur `http://localhost:8080`.
