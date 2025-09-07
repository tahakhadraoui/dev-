from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd

app = Flask(__name__)
CORS(app, resources={r"/predict": {"origins": "http://localhost:3001"}})
model = joblib.load('injury_model.pkl')
le = joblib.load('label_encoder.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        df = pd.DataFrame([{
            'matches_played_week': data['matchesPlayedWeek'],
            'match_frequency': data['matchFrequency'],
            'match_intensity': data['matchIntensity'],
            'age': data['age'],
            'bmi': data['bmi'],
            'recent_injuries': le.transform([data['recentInjuries']])[0],
            'fitness_level': data['fitnessLevel'],
            'training_hours': data['trainingHours'],
            'sleep_hours': data['sleepHours'],
            'stress_level': data['stressLevel'],
        }])
        risk = model.predict_proba(df)[:, 1][0]
        recommendations = 'Add a rest day between matches.' if risk > 0.5 else 'Maintain current activity level.'
        return jsonify({'risk': float(risk), 'recommendations': recommendations})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)