import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function PatientList() {
    const { user } = useAuth();
    const [patients, setPatients] = useState([]);
    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [showDiagnosis, setShowDiagnosis] = useState(false);
    const [diagForm, setDiagForm] = useState({ status: 'negative', clinical_notes: '', care_plan: '', stage: '' });

    useEffect(() => {
        if (user?.role === 'doctor') api.getPatients().then(setPatients).catch(() => { });
        else if (user?.role === 'lab_tech') api.getLabPatients().then(setPatients).catch(() => { });
    }, [user]);

    const viewPatient = async (id) => {
        setSelected(id);
        try { const d = await api.getPatientDetail(id); setDetail(d); } catch (e) { alert(e.message); }
    };

    const handleDiagnose = async (e) => {
        e.preventDefault();
        try {
            await api.createDiagnosis({
                patient_id: selected,
                status: diagForm.status,
                stage: diagForm.stage || null,
                clinical_notes: diagForm.clinical_notes,
                care_plan: diagForm.care_plan,
                risk_assessment_id: detail?.risk_assessments?.[0]?.id || null,
                lab_result_id: detail?.lab_results?.[0]?.id || null,
            });
            setShowDiagnosis(false);
            viewPatient(selected);
        } catch (e) { alert(e.message); }
    };

    return (
        <div className="animate-in">
            <div className="page-header"><h1>👥 Patient List</h1><p>View and manage patient records</p></div>

            <div style={{ display: 'flex', gap: 24 }}>
                {/* Patient list */}
                <div style={{ width: 320, flexShrink: 0 }}>
                    <div className="card" style={{ padding: 0 }}>
                        {patients.length === 0 ? (
                            <div className="empty-state"><div className="icon">👥</div><h3>No Patients</h3></div>
                        ) : patients.map(p => (
                            <div key={p.id} onClick={() => viewPatient(p.id)}
                                style={{
                                    padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                                    background: selected === p.id ? 'var(--accent-glow)' : 'transparent',
                                    transition: 'var(--transition)',
                                }}>
                                <div className="fw-600">{p.name}</div>
                                <div className="text-sm text-muted">{p.age ? `${p.age} years` : 'Age not set'}</div>
                                {p.latest_risk && <span className={`pill pill-${p.latest_risk.toLowerCase()}`} style={{ marginTop: 4 }}>{p.latest_risk}</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detail panel */}
                <div style={{ flex: 1 }}>
                    {!detail ? (
                        <div className="card"><div className="empty-state"><div className="icon">👈</div><h3>Select a Patient</h3><p>Click on a patient to view their details</p></div></div>
                    ) : (
                        <>
                            <div className="card mb-16">
                                <div className="flex-between">
                                    <div>
                                        <h2>{detail.patient.name}</h2>
                                        <span className="text-sm text-muted">{detail.patient.age ? `${detail.patient.age} years | ${detail.patient.gender || ''}` : ''} {detail.patient.blood_type ? `| ${detail.patient.blood_type}` : ''}</span>
                                    </div>
                                    {user?.role === 'doctor' && <button className="btn btn-primary" onClick={() => setShowDiagnosis(true)}>+ Diagnose</button>}
                                </div>
                                {detail.patient.medical_history && <div className="text-sm mt-16"><strong>Medical History:</strong> {detail.patient.medical_history}</div>}
                                {detail.patient.family_history && <div className="text-sm mt-16"><strong>Family History:</strong> {detail.patient.family_history}</div>}
                            </div>

                            {/* Risk Assessments */}
                            {detail.risk_assessments?.length > 0 && (
                                <div className="card mb-16">
                                    <h3 style={{ marginBottom: 12 }}>🔬 AI Risk Assessments</h3>
                                    {detail.risk_assessments.map(a => (
                                        <div key={a.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                                            <div className="flex-between">
                                                <span className={`pill pill-${a.risk_level.toLowerCase()}`}>{a.risk_level} ({a.probability}%)</span>
                                                <span className="text-sm text-muted">{new Date(a.date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-sm text-muted mt-16">Symptoms: {(a.symptoms || []).join(', ') || 'None'}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Lab Results */}
                            {detail.lab_results?.length > 0 && (
                                <div className="card mb-16">
                                    <h3 style={{ marginBottom: 12 }}>🧪 Lab Results</h3>
                                    {detail.lab_results.map(l => (
                                        <div key={l.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                                            <div className="flex-between"><span className="fw-600">{l.test_type}</span><span className={`pill pill-${l.status === 'completed' ? 'success' : 'pending'}`}>{l.status}</span></div>
                                            <div className="text-sm text-muted">{l.result_summary}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Diagnoses */}
                            {detail.diagnoses?.length > 0 && (
                                <div className="card">
                                    <h3 style={{ marginBottom: 12 }}>🩺 Previous Diagnoses</h3>
                                    {detail.diagnoses.map(d => (
                                        <div key={d.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                                            <div className="flex-between"><span className={`pill ${d.status === 'positive' ? 'pill-high' : 'pill-success'}`}>{d.status.toUpperCase()}{d.stage ? ` Stage ${d.stage}` : ''}</span><span className="text-sm text-muted">{new Date(d.date).toLocaleDateString()}</span></div>
                                            <p className="text-sm mt-16">{d.notes}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Diagnosis Modal */}
            {showDiagnosis && (
                <div className="modal-overlay" onClick={() => setShowDiagnosis(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>🩺 Create Diagnosis</h2>
                        <form onSubmit={handleDiagnose}>
                            <div className="form-group">
                                <label>Diagnosis Status</label>
                                <select className="form-select" value={diagForm.status} onChange={e => setDiagForm({ ...diagForm, status: e.target.value })}>
                                    <option value="negative">Negative</option>
                                    <option value="positive">Positive</option>
                                    <option value="inconclusive">Inconclusive</option>
                                </select>
                            </div>
                            {diagForm.status === 'positive' && (
                                <div className="form-group">
                                    <label>Cancer Stage</label>
                                    <select className="form-select" value={diagForm.stage} onChange={e => setDiagForm({ ...diagForm, stage: e.target.value })}>
                                        <option value="">Select stage</option>
                                        <option value="0">Stage 0 (DCIS)</option>
                                        <option value="I">Stage I</option>
                                        <option value="II">Stage II</option>
                                        <option value="III">Stage III</option>
                                        <option value="IV">Stage IV</option>
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <label>Clinical Notes</label>
                                <textarea className="form-textarea" value={diagForm.clinical_notes} onChange={e => setDiagForm({ ...diagForm, clinical_notes: e.target.value })} required placeholder="Document your findings..." />
                            </div>
                            <div className="form-group">
                                <label>Care Plan</label>
                                <textarea className="form-textarea" value={diagForm.care_plan} onChange={e => setDiagForm({ ...diagForm, care_plan: e.target.value })} placeholder="Personalized care plan for the patient..." />
                            </div>
                            <div className="flex-between">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDiagnosis(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Submit Diagnosis</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
