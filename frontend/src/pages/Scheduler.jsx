import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function Scheduler() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ appointment_type: 'consultation', scheduled_at: '', duration_minutes: 30, location: 'Main Hospital, Oncology Wing', notes: '' });

    useEffect(() => { loadAppts(); }, []);
    const loadAppts = () => api.getAppointments().then(setAppointments).catch(() => { });

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.createAppointment(form);
            setShowModal(false);
            loadAppts();
        } catch (err) { alert(err.message); }
    };

    const handleCancel = async (id) => {
        if (confirm('Cancel this appointment?')) {
            await api.cancelAppointment(id);
            loadAppts();
        }
    };

    const statusColor = (s) => s === 'completed' ? 'pill-success' : s === 'cancelled' ? 'pill-high' : s === 'rescheduled' ? 'pill-purple' : 'pill-info';

    const typeIcon = (t) => ({ screening: '🔬', chemotherapy: '💊', surgery: '🏥', follow_up: '📋', consultation: '👨‍⚕️' }[t] || '📅');

    return (
        <div className="animate-in">
            <div className="page-header flex-between">
                <div>
                    <h1>📅 Smart Scheduler</h1>
                    <p>Manage appointments, treatments, and follow-ups</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Appointment</button>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon cyan">📅</div>
                    <div className="stat-value">{appointments.filter(a => a.status === 'scheduled').length}</div>
                    <div className="stat-label">Upcoming</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-value">{appointments.filter(a => a.status === 'completed').length}</div>
                    <div className="stat-label">Completed</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red">❌</div>
                    <div className="stat-value">{appointments.filter(a => a.status === 'cancelled').length}</div>
                    <div className="stat-label">Cancelled</div>
                </div>
            </div>

            {/* Calendar-like display */}
            <div className="card">
                <h3 style={{ marginBottom: 16 }}>All Appointments</h3>
                {appointments.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">📅</div>
                        <h3>No Appointments</h3>
                        <p>Schedule your first appointment to get started</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Type</th><th>Date & Time</th><th>Doctor</th><th>Location</th><th>Status</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {appointments.map(a => (
                                    <tr key={a.id}>
                                        <td><span style={{ marginRight: 8 }}>{typeIcon(a.type)}</span>{a.type.replace('_', ' ').toUpperCase()}</td>
                                        <td>{new Date(a.scheduled_at).toLocaleString()}</td>
                                        <td>{a.doctor_name}</td>
                                        <td className="text-sm text-muted">{a.location}</td>
                                        <td><span className={`pill ${statusColor(a.status)}`}>{a.status}</span></td>
                                        <td>
                                            {a.status === 'scheduled' && (
                                                <button className="btn btn-sm btn-danger" onClick={() => handleCancel(a.id)}>Cancel</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>📅 Schedule Appointment</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label>Appointment Type</label>
                                <select className="form-select" value={form.appointment_type} onChange={e => setForm({ ...form, appointment_type: e.target.value })}>
                                    <option value="consultation">Consultation</option>
                                    <option value="screening">Screening</option>
                                    <option value="chemotherapy">Chemotherapy</option>
                                    <option value="surgery">Surgery</option>
                                    <option value="follow_up">Follow-Up</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Date & Time</label>
                                <input type="datetime-local" className="form-input" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional information..." />
                            </div>
                            <div className="flex-between">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
