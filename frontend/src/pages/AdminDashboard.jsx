import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [users, setUsers] = useState([]);
    const [savingId, setSavingId] = useState(null);

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = () => {
        api.getAdminDashboard().then(setData).catch(() => { });
        api.getAdminUsers().then(setUsers).catch(() => { });
    };

    const handleRoleChange = async (userId, role) => {
        setSavingId(userId);
        try {
            await api.updateAdminUserRole(userId, role);
            loadAll();
        } catch (e) {
            alert(e.message);
        }
        setSavingId(null);
    };

    const handleDelete = async (userId) => {
        if (!confirm('Delete this user account?')) return;
        setSavingId(userId);
        try {
            await api.deleteAdminUser(userId);
            loadAll();
        } catch (e) {
            alert(e.message);
        }
        setSavingId(null);
    };

    const summary = data?.summary;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>🛡️ Admin Dashboard</h1>
                <p>Platform-wide oversight for users, clinical workflows, and telemedicine activity.</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon cyan">👤</div><div className="stat-value">{summary?.users_total || 0}</div><div className="stat-label">Total Users</div></div>
                <div className="stat-card"><div className="stat-icon green">🧬</div><div className="stat-value">{summary?.risk_assessments || 0}</div><div className="stat-label">Risk Assessments</div></div>
                <div className="stat-card"><div className="stat-icon orange">🧪</div><div className="stat-value">{summary?.lab_results || 0}</div><div className="stat-label">Lab Results</div></div>
                <div className="stat-card"><div className="stat-icon red">📹</div><div className="stat-value">{summary?.telemedicine_by_status?.active || 0}</div><div className="stat-label">Active Telemedicine</div></div>
            </div>

            <div className="grid-2 mb-24">
                <div className="card">
                    <h3 style={{ marginBottom: 12 }}>User Roles</h3>
                    <div className="text-sm mb-8"><strong>Patients:</strong> {summary?.users_by_role?.patient || 0}</div>
                    <div className="text-sm mb-8"><strong>Doctors:</strong> {summary?.users_by_role?.doctor || 0}</div>
                    <div className="text-sm mb-8"><strong>Lab Techs:</strong> {summary?.users_by_role?.lab_tech || 0}</div>
                    <div className="text-sm"><strong>Admins:</strong> {summary?.users_by_role?.admin || 0}</div>
                </div>
                <div className="card">
                    <h3 style={{ marginBottom: 12 }}>Operational Health</h3>
                    <div className="text-sm mb-8"><strong>Appointments Scheduled:</strong> {summary?.appointments_by_status?.scheduled || 0}</div>
                    <div className="text-sm mb-8"><strong>Appointments Completed:</strong> {summary?.appointments_by_status?.completed || 0}</div>
                    <div className="text-sm mb-8"><strong>Telemedicine Scheduled:</strong> {summary?.telemedicine_by_status?.scheduled || 0}</div>
                    <div className="text-sm"><strong>Unread Notifications:</strong> {summary?.notifications_unread || 0}</div>
                </div>
            </div>

            <div className="card mb-24">
                <h3 style={{ marginBottom: 16 }}>Recent Users</h3>
                {!data?.recent_users?.length ? <p className="text-muted">No recent users.</p> : (
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th></tr></thead>
                            <tbody>
                                {data.recent_users.map(u => (
                                    <tr key={u.id}>
                                        <td>{u.name}</td>
                                        <td>{u.email}</td>
                                        <td><span className="pill pill-info">{u.role}</span></td>
                                        <td>{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="card">
                <h3 style={{ marginBottom: 16 }}>Recent Telemedicine Sessions</h3>
                {!data?.recent_telemedicine?.length ? <p className="text-muted">No telemedicine sessions yet.</p> : (
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Patient</th><th>Doctor</th><th>Status</th><th>Scheduled</th><th>Room</th></tr></thead>
                            <tbody>
                                {data.recent_telemedicine.map(s => (
                                    <tr key={s.id}>
                                        <td>{s.patient_name}</td>
                                        <td>{s.doctor_name}</td>
                                        <td><span className={`pill ${s.status === 'active' ? 'pill-info' : s.status === 'completed' ? 'pill-success' : 'pill-pending'}`}>{s.status}</span></td>
                                        <td>{s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : '-'}</td>
                                        <td><code className="text-sm">{s.room_id}</code></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="card mt-24">
                <h3 style={{ marginBottom: 16 }}>User Management</h3>
                {!users.length ? <p className="text-muted">No users found.</p> : (
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Profile</th><th>Actions</th></tr></thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>{u.name}</td>
                                        <td>{u.email}</td>
                                        <td>
                                            <select
                                                className="form-select"
                                                value={u.role}
                                                onChange={e => handleRoleChange(u.id, e.target.value)}
                                                disabled={savingId === u.id}
                                                style={{ minWidth: 120 }}
                                            >
                                                <option value="patient">patient</option>
                                                <option value="doctor">doctor</option>
                                                <option value="lab_tech">lab_tech</option>
                                                <option value="admin">admin</option>
                                            </select>
                                        </td>
                                        <td className="text-sm text-muted">
                                            {u.doctor_profile_id ? `${u.doctor_specialization || 'Doctor'}${u.doctor_hospital ? ` @ ${u.doctor_hospital}` : ''}` : u.patient_profile_id ? 'Patient profile' : 'General'}
                                        </td>
                                        <td>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)} disabled={savingId === u.id}>Delete</button>
                                        </td>
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
