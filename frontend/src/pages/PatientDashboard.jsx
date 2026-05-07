import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

export default function PatientDashboard() {
    const { user } = useAuth();
    const [dash, setDash] = useState(null);
    const [assessments, setAssessments] = useState([]);

    useEffect(() => {
        api.getPatientDashboard().then(setDash).catch(() => { });
        api.getRiskAssessments().then(setAssessments).catch(() => { });
    }, []);

    return (
        <div className="animate-in">
            <div className="dashboard-banner">
                <img src="/images/dashboard_banner.png" alt="Health Dashboard" />
                <div className="dashboard-banner-content">
                    <h1>{getGreeting()}, {user?.name} 👋</h1>
                    <p>Your breast health overview and activity summary</p>
                </div>
            </div>

            <div className="disclaimer">
                <span className="icon">🛡️</span>
                <span>BreastGuard AI uses advanced machine learning to support early detection. All AI assessments should be reviewed by qualified healthcare professionals. This system complements — never replaces — clinical judgment.</span>
            </div>

            <div className="quick-actions">
                <Link to="/risk-assessment" className="quick-action">
                    <span className="qa-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>🔬</span>
                    Risk Assessment
                </Link>
                <Link to="/appointments" className="quick-action">
                    <span className="qa-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>📅</span>
                    Book Appointment
                </Link>
                <Link to="/telemedicine" className="quick-action">
                    <span className="qa-icon" style={{ background: 'rgba(139,92,246,0.12)' }}>📹</span>
                    Telemedicine
                </Link>
                <Link to="/monitoring" className="quick-action">
                    <span className="qa-icon" style={{ background: 'rgba(236,72,153,0.12)' }}>💓</span>
                    Health Monitor
                </Link>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon cyan">🔬</div>
                    <div className="stat-value">{dash?.latest_risk?.level || '—'}</div>
                    <div className="stat-label">Current Risk Level</div>
                    {dash?.latest_risk?.probability && <div className="text-sm text-muted mt-16">{dash.latest_risk.probability}% confidence</div>}
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">📅</div>
                    <div className="stat-value">{dash?.upcoming_appointments || 0}</div>
                    <div className="stat-label">Upcoming Appointments</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">🔔</div>
                    <div className="stat-value">{dash?.unread_notifications || 0}</div>
                    <div className="stat-label">Unread Notifications</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon pink">📊</div>
                    <div className="stat-value">{assessments.length}</div>
                    <div className="stat-label">Risk Assessments</div>
                </div>
            </div>

            <div className="grid-2">
                <div className="card card-gradient">
                    <h3 style={{ marginBottom: 16 }}>🔬 Quick Risk Assessment</h3>
                    <p className="text-muted text-sm" style={{ marginBottom: 20 }}>Take a comprehensive breast cancer risk assessment powered by our AI engine. Get instant results with explainable insights.</p>
                    <Link to="/risk-assessment" className="btn btn-primary">Start Assessment →</Link>
                </div>

                <div className="card card-gradient">
                    <h3 style={{ marginBottom: 16 }}>📹 Telemedicine</h3>
                    <p className="text-muted text-sm" style={{ marginBottom: 20 }}>Connect with oncology specialists remotely. Schedule video consultations without visiting the hospital.</p>
                    <Link to="/telemedicine" className="btn btn-secondary">Schedule Session →</Link>
                </div>
            </div>

            {assessments.length > 0 && (
                <div className="card mt-24">
                    <h3 style={{ marginBottom: 16 }}>📋 Recent Risk Assessments</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Risk Level</th>
                                    <th>Probability</th>
                                    <th>Symptoms</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assessments.slice(0, 5).map(a => (
                                    <tr key={a.id}>
                                        <td>{new Date(a.created_at).toLocaleDateString()}</td>
                                        <td><span className={`pill pill-${a.risk_level.toLowerCase()}`}>{a.risk_level}</span></td>
                                        <td>{a.probability}%</td>
                                        <td>{(a.symptoms || []).join(', ') || 'None reported'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {assessments.length === 0 && (
                <div className="card mt-24">
                    <div className="empty-state">
                        <img src="/images/empty_state.png" alt="Get started" />
                        <h3>Start Your Health Journey</h3>
                        <p>Take your first AI-powered risk assessment to begin tracking your breast health.</p>
                        <Link to="/risk-assessment" className="btn btn-primary" style={{ marginTop: 16 }}>🔬 Take Assessment</Link>
                    </div>
                </div>
            )}
        </div>
    );
}
