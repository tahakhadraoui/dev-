# Utilise une image officielle Python légère
FROM python:3.11-slim

# Définit le dossier de travail dans le container
WORKDIR /app

# Copie les fichiers requirements.txt et les installe
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie tous les fichiers nécessaires dans le container
COPY app.py train_model.py label_encoder.pkl injury_model.pkl eslint.config.mjs ./

# Expose le port 5000 (port par défaut de Flask)
EXPOSE 5000

# Définit la variable d’environnement pour Flask
ENV FLASK_APP=app.py

# Commande pour lancer l'application Flask
CMD ["flask", "run", "--host=0.0.0.0"]
