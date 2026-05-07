import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function DoctorDashboard() {
    const { user } = useAuth();
    const [dash, setDash] = useState(null);

    useEffect(() => {
        api.getDoctorDashboard().then(setDash).catch(() => { });
    }, []);

    return (
        <div className="animate-in">
            <div className="dashboard-banner">
                <img src="/images/doctor_banner.png" alt="Doctor Dashboard" />
                <div className="dashboard-banner-content">
                    <h1>Doctor Dashboard 🩺</h1>
                    <p>Welcome, Dr. {user?.name} — {dash?.doctor?.specialization || 'Specialist'} at {dash?.doctor?.hospital || 'Hospital'}</p>
                </div>
            </div>

            <div className="quick-actions">
                <Link to="/patients" className="quick-action">
                    <span className="qa-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>👥</span>
                    View Patients
                </Link>
                <Link to="/appointments" className="quick-action">
                    <span className="qa-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>📅</span>
                    Appointments
                </Link>
                <Link to="/knowledge" className="quick-action">
                    <span className="qa-icon" style={{ background: 'rgba(139,92,246,0.12)' }}>🧠</span>
                    Knowledge Hub
                </Link>
                <Link to="/telemedicine" className="quick-action">
                    <span className="qa-icon" style={{ background: 'rgba(236,72,153,0.12)' }}>📹</span>
                    Telemedicine
                </Link>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon red">⚠️</div>
                    <div className="stat-value">{dash?.high_risk_patients?.length || 0}</div>
                    <div className="stat-label">High Risk Patients</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">🧪</div>
                    <div className="stat-value">{dash?.pending_lab_reviews || 0}</div>
                    <div className="stat-label">Pending Lab Reviews</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-value">{dash?.total_diagnoses || 0}</div>
                    <div className="stat-label">Total Diagnoses</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon cyan">📅</div>
                    <div className="stat-value">{dash?.today_appointments || 0}</div>
                    <div className="stat-label">Today's Appointments</div>
                </div>
            </div>

            <div className="card">
                <div className="flex-between mb-16">
                    <h3>⚠️ High Risk Patients Requiring Attention</h3>
                </div>
                {dash?.high_risk_patients?.length === 0 && (
                    <div className="empty-state">
                        <img src="/images/empty_state.png" alt="All clear" style={{ width: 120 }} />
                        <h3>No High Risk Patients</h3>
                        <p>All current patients have low to medium risk assessments.</p>
                    </div>
                )}
                {dash?.high_risk_patients?.length > 0 && (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Patient</th><th>Risk Level</th><th>Probability</th><th>Date</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {dash.high_risk_patients.map(p => (
                                    <tr key={p.assessment_id}>
                                        <td style={{ fontWeight: 600 }}>{p.patient_name}</td>
                                        <td><span className="pill pill-high">{p.risk_level}</span></td>
                                        <td>{p.probability}%</td>
                                        <td>{new Date(p.date).toLocaleDateString()}</td>
                                        <td><Link to={`/patients?id=${p.patient_id}`} className="btn btn-sm btn-primary">Review →</Link></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
