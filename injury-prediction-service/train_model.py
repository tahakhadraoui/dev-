import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib

# Placeholder data
data = pd.DataFrame({
    'matches_played_week': [3, 5, 2, 4, 1, 6, 3, 0],
    'match_frequency': [2.5, 1.2, 3.0, 1.5, 4.0, 1.0, 2.0, 0],
    'match_intensity': [3, 4, 2, 5, 1, 4, 3, 3],
    'age': [25, 30, 22, 28, 35, 27, 24, 29],
    'bmi': [22.5, 24.0, 21.0, 23.5, 25.0, 22.0, 23.0, 22.8],
    'recent_injuries': ['none', 'muscle', 'none', 'joint', 'none', 'muscle', 'none', 'none'],
    'fitness_level': [4, 3, 5, 3, 2, 4, 4, 3],
    'training_hours': [10, 8, 12, 6, 5, 9, 10, 7],
    'sleep_hours': [7, 6, 8, 6, 5, 7, 8, 6],
    'stress_level': [2, 4, 1, 3, 5, 2, 2, 3],
    'injury_occurred': [0, 1, 0, 1, 0, 1, 0, 0]
})

# Preprocess
le = LabelEncoder()
data['recent_injuries'] = le.fit_transform(data['recent_injuries'])
joblib.dump(le, 'label_encoder.pkl')

# Features and target
X = data[['matches_played_week', 'match_frequency', 'match_intensity', 'age', 'bmi', 'recent_injuries', 'fitness_level', 'training_hours', 'sleep_hours', 'stress_level']]
y = data['injury_occurred']

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X, y)

# Save model
joblib.dump(model, 'injury_model.pkl')