import React, { useState } from 'react';
import { api } from '../api';

export default function RiskAssessment() {
    const [step, setStep] = useState(1);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        age: 45, bmi: 25, symptoms: [],
        family_history: false, hormonal_therapy: false,
        menopause: false, alcohol_use: 0, smoking: false,
        physical_activity: 2, previous_biopsy: false, breast_density: 2,
        medical_history: '', lifestyle: '',
    });

    const symptomOptions = [
        { id: 'lump', label: 'Breast Lump', icon: '🔴' },
        { id: 'pain', label: 'Breast Pain', icon: '😣' },
        { id: 'discharge', label: 'Nipple Discharge', icon: '💧' },
        { id: 'skin changes', label: 'Skin Changes', icon: '🔶' },
        { id: 'fatigue', label: 'Unusual Fatigue', icon: '😴' },
        { id: 'weight loss', label: 'Unexplained Weight Loss', icon: '📉' },
        { id: 'swelling', label: 'Breast Swelling', icon: '🫧' },
        { id: 'dimpling', label: 'Skin Dimpling', icon: '🔘' },
    ];

    const toggleSymptom = (s) => {
        setForm(f => ({
            ...f,
            symptoms: f.symptoms.includes(s) ? f.symptoms.filter(x => x !== s) : [...f.symptoms, s]
        }));
    };

    const update = (k, v) => setForm({ ...form, [k]: v });

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await api.submitRiskAssessment(form);
            setResult(res);
            setStep(4);
        } catch (err) {
            alert(err.message);
        }
        setLoading(false);
    };

    const riskClass = result?.risk_level === 'High' ? 'risk-high' : result?.risk_level === 'Medium' ? 'risk-medium' : 'risk-low';

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>🔬 AI Risk Assessment</h1>
                <p>Complete the guided assessment to receive an AI-powered breast cancer risk evaluation</p>
            </div>

            {/* Progress */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
                {[1, 2, 3, 4].map(s => (
                    <div key={s} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: s <= step ? 'var(--accent)' : 'var(--border)',
                        transition: 'all 0.5s ease',
                    }} />
                ))}
            </div>

            {step === 1 && (
                <div className="card">
                    <h2 style={{ marginBottom: 4 }}>Step 1: Symptoms</h2>
                    <p className="text-muted text-sm mb-24">Select any symptoms you are currently experiencing</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                        {symptomOptions.map(s => (
                            <div key={s.id} onClick={() => toggleSymptom(s.id)}
                                style={{
                                    padding: '16px', borderRadius: 'var(--radius-md)',
                                    border: `2px solid ${form.symptoms.includes(s.id) ? 'var(--accent)' : 'var(--border)'}`,
                                    background: form.symptoms.includes(s.id) ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                                    cursor: 'pointer', transition: 'var(--transition)',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                }}>
                                <span style={{ fontSize: 24 }}>{s.icon}</span>
                                <span className="fw-600">{s.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex-between mt-24">
                        <span className="text-muted text-sm">{form.symptoms.length} symptoms selected</span>
                        <button className="btn btn-primary" onClick={() => setStep(2)}>Continue →</button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="card">
                    <h2 style={{ marginBottom: 4 }}>Step 2: Personal & Medical History</h2>
                    <p className="text-muted text-sm mb-24">This information helps our AI provide more accurate predictions</p>
                    <div className="form-row mb-16">
                        <div className="form-group">
                            <label>Age</label>
                            <input type="number" className="form-input" value={form.age} onChange={e => update('age', parseInt(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>BMI</label>
                            <input type="number" step="0.1" className="form-input" value={form.bmi} onChange={e => update('bmi', parseFloat(e.target.value))} />
                        </div>
                    </div>
                    <div className="form-row mb-16">
                        <div className="form-group">
                            <label>Breast Density (1-4 BI-RADS)</label>
                            <select className="form-select" value={form.breast_density} onChange={e => update('breast_density', parseInt(e.target.value))}>
                                <option value={1}>1 - Almost entirely fatty</option>
                                <option value={2}>2 - Scattered fibroglandular</option>
                                <option value={3}>3 - Heterogeneously dense</option>
                                <option value={4}>4 - Extremely dense</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Alcohol Use</label>
                            <select className="form-select" value={form.alcohol_use} onChange={e => update('alcohol_use', parseInt(e.target.value))}>
                                <option value={0}>None</option>
                                <option value={1}>Light</option>
                                <option value={2}>Moderate</option>
                                <option value={3}>Heavy</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 20 }}>
                        {[
                            ['family_history', 'Family history of breast cancer'],
                            ['hormonal_therapy', 'Hormonal therapy'],
                            ['menopause', 'Post-menopausal'],
                            ['smoking', 'Smoker'],
                            ['previous_biopsy', 'Previous breast biopsy'],
                        ].map(([k, l]) => (
                            <label key={k} className="form-check">
                                <input type="checkbox" checked={form[k]} onChange={e => update(k, e.target.checked)} />
                                <span>{l}</span>
                            </label>
                        ))}
                    </div>
                    <div className="form-group">
                        <label>Physical Activity Level</label>
                        <select className="form-select" value={form.physical_activity} onChange={e => update('physical_activity', parseInt(e.target.value))}>
                            <option value={0}>Sedentary</option>
                            <option value={1}>Light</option>
                            <option value={2}>Moderate</option>
                            <option value={3}>High</option>
                        </select>
                    </div>
                    <div className="flex-between mt-24">
                        <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                        <button className="btn btn-primary" onClick={() => setStep(3)}>Continue →</button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="card">
                    <h2 style={{ marginBottom: 4 }}>Step 3: Review & Submit</h2>
                    <p className="text-muted text-sm mb-24">Please review your information before submitting</p>
                    <div className="grid-2 mb-24">
                        <div>
                            <h4 className="text-muted mb-8">Symptoms</h4>
                            {form.symptoms.length === 0
                                ? <p className="text-sm">No symptoms reported</p>
                                : form.symptoms.map(s => <span key={s} className="pill pill-info" style={{ marginRight: 8, marginBottom: 8 }}>{s}</span>)
                            }
                        </div>
                        <div>
                            <h4 className="text-muted mb-8">Personal Info</h4>
                            <p className="text-sm">Age: {form.age} | BMI: {form.bmi}</p>
                            <p className="text-sm">Breast Density: {form.breast_density}/4</p>
                            {form.family_history && <p className="text-sm text-warning">⚠️ Family history present</p>}
                            {form.hormonal_therapy && <p className="text-sm">Hormonal therapy: Yes</p>}
                            {form.previous_biopsy && <p className="text-sm">Previous biopsy: Yes</p>}
                        </div>
                    </div>
                    <div className="disclaimer">
                        <span className="icon">⚕️</span>
                        <span>By submitting, you acknowledge that this AI assessment is for screening support only. Results should be reviewed by a qualified healthcare professional.</span>
                    </div>
                    <div className="flex-between">
                        <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
                        <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
                            {loading ? '⏳ Analyzing...' : '🧬 Run AI Analysis'}
                        </button>
                    </div>
                </div>
            )}

            {step === 4 && result && (
                <div>
                    <div className="card" style={{ textAlign: 'center', marginBottom: 24 }}>
                        <div className={`risk-gauge ${riskClass}`}>
                            <div className="risk-circle" style={{ '--risk-pct': result.probability }}>
                                <span className="risk-value">{result.probability}%</span>
                                <span className="risk-unit">confidence</span>
                            </div>
                            <div className="risk-label">{result.risk_level} Risk</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 16 }}>
                            <div><span className="text-sm text-muted">Low</span><div className="fw-700 text-success">{result.probabilities.low}%</div></div>
                            <div><span className="text-sm text-muted">Medium</span><div className="fw-700 text-warning">{result.probabilities.medium}%</div></div>
                            <div><span className="text-sm text-muted">High</span><div className="fw-700 text-danger">{result.probabilities.high}%</div></div>
                        </div>
                    </div>

                    <div className="grid-2">
                        <div className="card">
                            <h3 style={{ marginBottom: 16 }}>🧠 Contributing Factors</h3>
                            {result.contributing_factors?.map((f, i) => (
                                <div key={i} className="factor-bar">
                                    <div className="factor-header">
                                        <span className="factor-name">{f.factor}</span>
                                        <span className="factor-value">{f.importance}%</span>
                                    </div>
                                    <div className="bar-bg">
                                        <div className={`bar-fill ${f.impact.toLowerCase()}`} style={{ width: `${f.importance * 5}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="card">
                            <h3 style={{ marginBottom: 16 }}>📋 Recommendations</h3>
                            {result.recommendations?.map((r, i) => (
                                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18 }}>{i + 1}</span>
                                    <span className="text-sm">{r}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="disclaimer mt-24">
                        <span className="icon">⚕️</span>
                        <span>{result.disclaimer}</span>
                    </div>

                    <div className="flex-center mt-24 gap-16">
                        <button className="btn btn-secondary" onClick={() => { setStep(1); setResult(null); }}>New Assessment</button>
                        <button className="btn btn-primary" onClick={() => window.location.href = '/appointments'}>Book Appointment →</button>
                    </div>
                </div>
            )}
        </div>
    );
}
