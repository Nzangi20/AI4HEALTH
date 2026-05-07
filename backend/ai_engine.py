import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import json

# Global model and scaler
_model = None
_scaler = None
_feature_names = [
    "age", "bmi", "family_history", "hormonal_therapy",
    "num_symptoms", "lump_present", "pain_present", "discharge_present",
    "skin_changes", "fatigue", "weight_loss", "menopause_status",
    "alcohol_use", "smoking", "physical_activity",
    "previous_biopsy", "breast_density"
]


def train_model():
    """Train Random Forest on synthetic breast cancer risk data."""
    global _model, _scaler
    np.random.seed(42)
    n_samples = 2000

    # Generate synthetic feature data
    age = np.random.normal(50, 12, n_samples).clip(20, 85)
    bmi = np.random.normal(26, 5, n_samples).clip(16, 45)
    family_history = np.random.binomial(1, 0.25, n_samples)
    hormonal_therapy = np.random.binomial(1, 0.15, n_samples)
    num_symptoms = np.random.poisson(1.5, n_samples).clip(0, 8)
    lump_present = np.random.binomial(1, 0.3, n_samples)
    pain_present = np.random.binomial(1, 0.35, n_samples)
    discharge_present = np.random.binomial(1, 0.1, n_samples)
    skin_changes = np.random.binomial(1, 0.08, n_samples)
    fatigue = np.random.binomial(1, 0.2, n_samples)
    weight_loss = np.random.binomial(1, 0.1, n_samples)
    menopause_status = np.random.binomial(1, 0.4, n_samples)
    alcohol_use = np.random.randint(0, 4, n_samples)  # 0=none, 1=light, 2=moderate, 3=heavy
    smoking = np.random.binomial(1, 0.2, n_samples)
    physical_activity = np.random.randint(0, 4, n_samples)  # 0=none, 1=light, 2=moderate, 3=high
    previous_biopsy = np.random.binomial(1, 0.12, n_samples)
    breast_density = np.random.randint(1, 5, n_samples)  # 1-4 BI-RADS density

    X = np.column_stack([
        age, bmi, family_history, hormonal_therapy,
        num_symptoms, lump_present, pain_present, discharge_present,
        skin_changes, fatigue, weight_loss, menopause_status,
        alcohol_use, smoking, physical_activity,
        previous_biopsy, breast_density
    ])

    # Generate risk labels based on weighted feature combination
    risk_score = (
        0.20 * (age / 85) +
        0.05 * (bmi / 45) +
        0.20 * family_history +
        0.05 * hormonal_therapy +
        0.08 * (num_symptoms / 8) +
        0.15 * lump_present +
        0.03 * pain_present +
        0.05 * discharge_present +
        0.06 * skin_changes +
        0.02 * fatigue +
        0.02 * weight_loss +
        0.03 * menopause_status +
        0.02 * (alcohol_use / 3) +
        0.02 * smoking +
        -0.02 * (physical_activity / 3) +
        0.05 * previous_biopsy +
        0.04 * (breast_density / 4) +
        np.random.normal(0, 0.08, n_samples)
    )

    # 0=Low, 1=Medium, 2=High
    y = np.digitize(risk_score, [0.35, 0.55]) 

    _scaler = StandardScaler()
    X_scaled = _scaler.fit_transform(X)

    _model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
    _model.fit(X_scaled, y)
    
    accuracy = _model.score(X_scaled, y)
    print(f"[AI Engine] Model trained successfully. Training accuracy: {accuracy:.2%}")
    return _model


def predict_risk(features: dict) -> dict:
    """
    Predict breast cancer risk from patient features.
    Returns risk_level, probability, and contributing factors.
    """
    global _model, _scaler
    if _model is None:
        train_model()

    # Map symptom list to feature vector
    symptoms = features.get("symptoms", [])
    symptom_lower = [s.lower() for s in symptoms]

    feature_vector = np.array([[
        features.get("age", 45),
        features.get("bmi", 25),
        1 if features.get("family_history", False) else 0,
        1 if features.get("hormonal_therapy", False) else 0,
        len(symptoms),
        1 if any("lump" in s for s in symptom_lower) else 0,
        1 if any("pain" in s for s in symptom_lower) else 0,
        1 if any("discharge" in s for s in symptom_lower) else 0,
        1 if any("skin" in s for s in symptom_lower) else 0,
        1 if any("fatigue" in s for s in symptom_lower) else 0,
        1 if any("weight" in s for s in symptom_lower) else 0,
        1 if features.get("menopause", False) else 0,
        features.get("alcohol_use", 0),
        1 if features.get("smoking", False) else 0,
        features.get("physical_activity", 2),
        1 if features.get("previous_biopsy", False) else 0,
        features.get("breast_density", 2),
    ]])

    X_scaled = _scaler.transform(feature_vector)
    
    prediction = _model.predict(X_scaled)[0]
    probabilities = _model.predict_proba(X_scaled)[0]
    
    risk_labels = ["Low", "Medium", "High"]
    risk_level = risk_labels[prediction]
    
    # Get feature importances for explainability
    importances = _model.feature_importances_
    feature_importance_pairs = list(zip(_feature_names, importances, feature_vector[0]))
    feature_importance_pairs.sort(key=lambda x: x[1], reverse=True)
    
    contributing_factors = []
    for name, importance, value in feature_importance_pairs[:6]:
        label = name.replace("_", " ").title()
        impact = "High" if importance > 0.1 else "Medium" if importance > 0.05 else "Low"
        contributing_factors.append({
            "factor": label,
            "value": float(value),
            "importance": round(float(importance) * 100, 1),
            "impact": impact,
        })
    
    # Generate recommendations based on risk
    recommendations = _get_recommendations(risk_level, symptoms)
    
    return {
        "risk_level": risk_level,
        "probability": round(float(max(probabilities)) * 100, 1),
        "probabilities": {
            "low": round(float(probabilities[0]) * 100, 1),
            "medium": round(float(probabilities[1]) * 100, 1),
            "high": round(float(probabilities[2]) * 100, 1),
        },
        "contributing_factors": contributing_factors,
        "recommendations": recommendations,
        "disclaimer": "This AI assessment is for screening support only and does not replace professional medical diagnosis. Please consult a qualified healthcare provider."
    }


def _get_recommendations(risk_level: str, symptoms: list) -> list:
    """Generate personalized recommendations based on risk level."""
    recs = []
    if risk_level == "High":
        recs = [
            "Immediate consultation with an oncologist is strongly recommended",
            "Schedule a diagnostic mammogram and/or breast ultrasound",
            "Consider genetic counseling if family history is present",
            "Biopsy may be required for definitive diagnosis",
            "Maintain regular follow-up appointments",
        ]
    elif risk_level == "Medium":
        recs = [
            "Schedule a clinical breast examination within 2 weeks",
            "Consider a screening mammogram if not done recently",
            "Monitor symptoms and report any changes immediately",
            "Discuss risk reduction strategies with your doctor",
            "Annual screening is recommended",
        ]
    else:
        recs = [
            "Continue annual breast cancer screenings as recommended",
            "Perform monthly breast self-examinations",
            "Maintain a healthy lifestyle with regular exercise",
            "Limit alcohol consumption and avoid smoking",
            "Report any new symptoms to your healthcare provider promptly",
        ]
    return recs
