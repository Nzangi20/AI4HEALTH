import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function LabDashboard() {
    const [dash, setDash] = useState(null);

    useEffect(() => {
        api.getLabDashboard().then(setDash).catch(() => { });
    }, []);

    return (
        <div className="animate-in">
            <div className="dashboard-banner">
                <img src="/images/lab_banner.png" alt="Lab Dashboard" />
                <div className="dashboard-banner-content">
                    <h1>Lab Technician Dashboard 🧪</h1>
                    <p>Manage screening results and lab reports</p>
                </div>
            </div>

            <div className="quick-actions">
                <Link to="/lab-results" className="quick-action">
                    <span className="qa-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>🧪</span>
                    Upload Results
                </Link>
                <Link to="/patients" className="quick-action">
                    <span className="qa-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>👥</span>
                    View Patients
                </Link>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon cyan">📊</div>
                    <div className="stat-value">{dash?.stats?.total || 0}</div>
                    <div className="stat-label">Total Results</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">⏳</div>
                    <div className="stat-value">{dash?.stats?.pending || 0}</div>
                    <div className="stat-label">Pending</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-value">{dash?.stats?.completed || 0}</div>
                    <div className="stat-label">Completed</div>
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: 16 }}>Recent Results</h3>
                {(!dash?.recent_results || dash.recent_results.length === 0) ? (
                    <div className="empty-state">
                        <img src="/images/empty_state.png" alt="No results" style={{ width: 140 }} />
                        <h3>No Results Yet</h3>
                        <p>Upload lab results from the Lab Results page.</p>
                        <Link to="/lab-results" className="btn btn-primary" style={{ marginTop: 12 }}>🧪 Upload Results</Link>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Patient</th><th>Test Type</th><th>Status</th><th>Date</th></tr>
                            </thead>
                            <tbody>
                                {dash.recent_results.map(r => (
                                    <tr key={r.id}>
                                        <td>{r.patient_name}</td>
                                        <td>{r.test_type.replace('_', ' ').toUpperCase()}</td>
                                        <td><span className={`pill pill-${r.status === 'completed' ? 'success' : 'pending'}`}>{r.status}</span></td>
                                        <td>{new Date(r.date).toLocaleDateString()}</td>
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
