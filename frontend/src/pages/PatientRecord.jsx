import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function PatientRecord() {
    const { user } = useAuth();
    const [record, setRecord] = useState(null);
    const [tab, setTab] = useState('overview');

    useEffect(() => {
        // For patients, get their own profile first
        if (user?.role === 'patient') {
            api.getPatientProfile().then(p => {
                api.getUnifiedRecord(p.id).then(setRecord).catch(() => { });
            }).catch(() => { });
        }
    }, [user]);

    if (!record) {
        return (
            <div className="animate-in">
                <div className="page-header"><h1>📋 Unified Patient Record</h1><p>FHIR-inspired comprehensive health record</p></div>
                <div className="card"><div className="empty-state"><div className="icon">📋</div><h3>No Record Available</h3><p>Complete a risk assessment to start building your health record.</p></div></div>
            </div>
        );
    }

    const p = record.patient;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>📋 Unified Patient Record</h1>
                <p>FHIR-inspired comprehensive health record for {p.name}</p>
            </div>

            {/* Patient header */}
            <div className="card mb-24" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--gradient-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {p.name?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                    <h2>{p.name}</h2>
                    <div className="text-sm text-muted" style={{ display: 'flex', gap: 24, marginTop: 4, flexWrap: 'wrap' }}>
                        <span>📧 {p.email}</span>
                        {p.age && <span>🎂 {p.age} years</span>}
                        {p.gender && <span>👤 {p.gender}</span>}
                        {p.blood_type && <span>🩸 {p.blood_type}</span>}
                    </div>
                </div>
                <span className="pill pill-info">ResourceType: PatientBundle</span>
            </div>

            <div className="tabs">
                {['overview', 'assessments', 'lab_results', 'diagnoses', 'vitals', 'treatments'].map(t => (
                    <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                        {t.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <div className="grid-2">
                    <div className="card">
                        <h3 style={{ marginBottom: 12 }}>Medical Information</h3>
                        <div className="text-sm"><strong>Medical History:</strong> {p.medical_history || 'Not provided'}</div>
                        <div className="text-sm mt-16"><strong>Family History:</strong> {p.family_history || 'Not provided'}</div>
                        <div className="text-sm mt-16"><strong>Allergies:</strong> {p.allergies || 'None reported'}</div>
                        <div className="text-sm mt-16"><strong>Lifestyle:</strong> {p.lifestyle || 'Not provided'}</div>
                    </div>
                    <div className="card">
                        <h3 style={{ marginBottom: 12 }}>Record Summary</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="text-sm"><strong className="text-accent">{record.risk_assessments?.length || 0}</strong> Risk Assessments</div>
                            <div className="text-sm"><strong className="text-accent">{record.lab_results?.length || 0}</strong> Lab Results</div>
                            <div className="text-sm"><strong className="text-accent">{record.diagnoses?.length || 0}</strong> Diagnoses</div>
                            <div className="text-sm"><strong className="text-accent">{record.appointments?.length || 0}</strong> Appointments</div>
                            <div className="text-sm"><strong className="text-accent">{record.vitals?.length || 0}</strong> Vital Records</div>
                            <div className="text-sm"><strong className="text-accent">{record.treatments?.length || 0}</strong> Treatments</div>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'assessments' && (
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>Risk Assessments</h3>
                    {record.risk_assessments?.length === 0 ? <p className="text-muted">No assessments</p> : (
                        <div className="timeline">
                            {record.risk_assessments.map(a => (
                                <div key={a.id} className="timeline-item">
                                    <div className="flex-between"><span className={`pill pill-${a.risk_level.toLowerCase()}`}>{a.risk_level} Risk ({a.probability}%)</span><span className="text-sm text-muted">{new Date(a.date).toLocaleDateString()}</span></div>
                                    <div className="text-sm mt-16">Symptoms: {(a.symptoms || []).join(', ') || 'None'}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'lab_results' && (
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>Lab Results</h3>
                    {record.lab_results?.length === 0 ? <p className="text-muted">No lab results</p> : (
                        <div className="table-container">
                            <table>
                                <thead><tr><th>Test</th><th>Summary</th><th>Status</th><th>Date</th></tr></thead>
                                <tbody>
                                    {record.lab_results.map(l => (
                                        <tr key={l.id}><td>{l.test_type}</td><td>{l.result_summary}</td><td><span className={`pill pill-${l.status === 'completed' ? 'success' : 'pending'}`}>{l.status}</span></td><td>{new Date(l.date).toLocaleDateString()}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {tab === 'diagnoses' && (
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>Diagnoses</h3>
                    {record.diagnoses?.length === 0 ? <p className="text-muted">No diagnoses</p> : (
                        <div className="timeline">
                            {record.diagnoses.map(d => (
                                <div key={d.id} className={`timeline-item ${d.status === 'negative' ? 'completed' : 'pending'}`}>
                                    <div className="flex-between"><span className={`pill ${d.status === 'positive' ? 'pill-high' : d.status === 'negative' ? 'pill-success' : 'pill-pending'}`}>{d.status.toUpperCase()}{d.stage ? ` - Stage ${d.stage}` : ''}</span><span className="text-sm text-muted">{new Date(d.date).toLocaleDateString()}</span></div>
                                    <p className="text-sm mt-16">{d.clinical_notes}</p>
                                    {d.care_plan && <p className="text-sm text-accent mt-16">Care Plan: {d.care_plan}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'vitals' && (
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>Vital Records</h3>
                    {record.vitals?.length === 0 ? <p className="text-muted">No vitals recorded</p> : (
                        <div className="table-container">
                            <table>
                                <thead><tr><th>Date</th><th>HR</th><th>BP</th><th>Temp</th><th>O₂</th><th>Weight</th><th>Pain</th></tr></thead>
                                <tbody>
                                    {record.vitals.map(v => (
                                        <tr key={v.id}><td>{new Date(v.date).toLocaleDateString()}</td><td>{v.heart_rate}</td><td>{v.blood_pressure}</td><td>{v.temperature}°F</td><td>{v.oxygen}%</td><td>{v.weight}kg</td><td>{v.pain_level}/10</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {tab === 'treatments' && (
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>Treatment Progress</h3>
                    {record.treatments?.length === 0 ? <p className="text-muted">No treatments</p> : (
                        record.treatments.map(t => (
                            <div key={t.id} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
                                <div className="flex-between"><span className="fw-600">{t.type.replace('_', ' ').toUpperCase()}</span><span className="text-sm text-muted">{t.cycle}</span></div>
                                <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, marginTop: 8 }}>
                                    <div style={{ width: `${t.progress}%`, height: '100%', background: 'var(--gradient-3)', borderRadius: 3 }} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
