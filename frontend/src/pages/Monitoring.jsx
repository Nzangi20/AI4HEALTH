import React, { useEffect, useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function Monitoring() {
    const { user } = useAuth();
    const [vitals, setVitals] = useState([]);
    const [treatments, setTreatments] = useState([]);
    const [showVitalForm, setShowVitalForm] = useState(false);
    const [vForm, setVForm] = useState({ heart_rate: 75, blood_pressure_systolic: 120, blood_pressure_diastolic: 80, temperature: 98.6, weight: 65, oxygen_saturation: 98, pain_level: 0 });

    useEffect(() => { load(); }, []);
    const load = () => {
        api.getVitals().then(setVitals).catch(() => { });
        api.getTreatmentProgress().then(setTreatments).catch(() => { });
    };

    const chartData = [...vitals].reverse().map(v => ({
        date: new Date(v.recorded_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        hr: v.heart_rate,
        bp: v.bp_systolic,
        temp: v.temperature,
        o2: v.oxygen,
        weight: v.weight,
        pain: v.pain_level,
    }));

    const handleRecordVitals = async (e) => {
        e.preventDefault();
        try {
            await api.recordVitals(vForm);
            setShowVitalForm(false);
            load();
        } catch (err) { alert(err.message); }
    };

    const tooltipStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 };

    return (
        <div className="animate-in">
            <div className="page-header flex-between">
                <div>
                    <h1>💓 Health Monitor</h1>
                    <p>Track vitals, treatment progress, and health trends</p>
                </div>
                {user?.role === 'patient' && (
                    <button className="btn btn-primary" onClick={() => setShowVitalForm(true)}>+ Record Vitals</button>
                )}
            </div>

            {/* Latest vitals */}
            {vitals.length > 0 && (
                <div className="stats-grid mb-24">
                    <div className="stat-card"><div className="stat-icon cyan">❤️</div><div className="stat-value">{vitals[0]?.heart_rate}</div><div className="stat-label">Heart Rate (bpm)</div></div>
                    <div className="stat-card"><div className="stat-icon purple">🩸</div><div className="stat-value">{vitals[0]?.bp_systolic}/{vitals[0]?.bp_diastolic}</div><div className="stat-label">Blood Pressure</div></div>
                    <div className="stat-card"><div className="stat-icon orange">🌡️</div><div className="stat-value">{vitals[0]?.temperature}°F</div><div className="stat-label">Temperature</div></div>
                    <div className="stat-card"><div className="stat-icon green">🫁</div><div className="stat-value">{vitals[0]?.oxygen}%</div><div className="stat-label">O₂ Saturation</div></div>
                </div>
            )}

            {/* Charts */}
            {chartData.length > 1 && (
                <div className="grid-2 mb-24">
                    <div className="card">
                        <h3 style={{ marginBottom: 16 }}>❤️ Heart Rate Trend</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                                <YAxis stroke="#64748b" fontSize={11} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Area type="monotone" dataKey="hr" stroke="#06b6d4" fill="url(#hrGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="card">
                        <h3 style={{ marginBottom: 16 }}>🫁 O₂ Saturation Trend</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="o2Grad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                                <YAxis domain={[90, 100]} stroke="#64748b" fontSize={11} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Area type="monotone" dataKey="o2" stroke="#10b981" fill="url(#o2Grad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {chartData.length === 0 && (
                <div className="card mb-24">
                    <div className="empty-state">
                        <div className="icon">📊</div>
                        <h3>No Vital Data</h3>
                        <p>Record your vitals or generate demo data to see health trends.</p>
                    </div>
                </div>
            )}

            {/* Treatments */}
            {treatments.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>💊 Treatment Progress</h3>
                    {treatments.map(t => (
                        <div key={t.id} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
                            <div className="flex-between mb-8">
                                <span className="fw-600">{t.type.replace('_', ' ').toUpperCase()}</span>
                                <span className={`pill pill-${t.status === 'completed' ? 'success' : t.status === 'in_progress' ? 'info' : 'pending'}`}>{t.status}</span>
                            </div>
                            <div className="text-sm text-muted mb-8">Cycle {t.cycle}/{t.total_cycles}</div>
                            <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${t.progress}%`, height: '100%', background: 'var(--gradient-1)', borderRadius: 4, transition: 'width 1s ease' }} />
                            </div>
                            {t.side_effects && <div className="text-sm text-warning mt-16">Side effects: {t.side_effects}</div>}
                        </div>
                    ))}
                </div>
            )}

            {/* Vital Form Modal */}
            {showVitalForm && (
                <div className="modal-overlay" onClick={() => setShowVitalForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>💓 Record Vitals</h2>
                        <form onSubmit={handleRecordVitals}>
                            <div className="form-row">
                                <div className="form-group"><label>Heart Rate (bpm)</label><input type="number" className="form-input" value={vForm.heart_rate} onChange={e => setVForm({ ...vForm, heart_rate: +e.target.value })} /></div>
                                <div className="form-group"><label>Temperature (°F)</label><input type="number" step="0.1" className="form-input" value={vForm.temperature} onChange={e => setVForm({ ...vForm, temperature: +e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>BP Systolic</label><input type="number" className="form-input" value={vForm.blood_pressure_systolic} onChange={e => setVForm({ ...vForm, blood_pressure_systolic: +e.target.value })} /></div>
                                <div className="form-group"><label>BP Diastolic</label><input type="number" className="form-input" value={vForm.blood_pressure_diastolic} onChange={e => setVForm({ ...vForm, blood_pressure_diastolic: +e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Weight (kg)</label><input type="number" step="0.1" className="form-input" value={vForm.weight} onChange={e => setVForm({ ...vForm, weight: +e.target.value })} /></div>
                                <div className="form-group"><label>O₂ Saturation (%)</label><input type="number" step="0.1" className="form-input" value={vForm.oxygen_saturation} onChange={e => setVForm({ ...vForm, oxygen_saturation: +e.target.value })} /></div>
                            </div>
                            <div className="form-group">
                                <label>Pain Level (0-10)</label>
                                <input type="range" min="0" max="10" value={vForm.pain_level} onChange={e => setVForm({ ...vForm, pain_level: +e.target.value })} style={{ width: '100%' }} />
                                <div className="text-sm text-center">{vForm.pain_level}/10</div>
                            </div>
                            <div className="flex-between mt-16">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowVitalForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Vitals</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
