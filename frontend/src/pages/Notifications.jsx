import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Notifications() {
    const [notifs, setNotifs] = useState([]);

    useEffect(() => { load(); }, []);
    const load = () => api.getNotifications().then(setNotifs).catch(() => { });

    const handleMarkRead = async (id) => { await api.markRead(id); load(); };
    const handleMarkAll = async () => { await api.markAllRead(); load(); };

    const typeIcon = (t) => ({ diagnosis: '🩺', risk_assessment: '🔬', appointment: '📅', reminder: '⏰', care_plan: '📋', lab_result: '🧪', telemedicine: '📹', general: 'ℹ️' }[t] || '🔔');
    const typeColor = (t) => ({ diagnosis: 'var(--danger)', risk_assessment: 'var(--accent)', care_plan: 'var(--purple)', appointment: 'var(--success)', lab_result: 'var(--warning)' }[t] || 'var(--text-secondary)');
    const priorityPill = (p) => ({ urgent: 'pill-high', high: 'pill-medium', normal: 'pill-info', low: 'pill-success' }[p] || 'pill-info');

    const unread = notifs.filter(n => !n.is_read).length;

    return (
        <div className="animate-in">
            <div className="page-header flex-between">
                <div><h1>🔔 Notifications</h1><p>{unread} unread notification{unread !== 1 ? 's' : ''}</p></div>
                {unread > 0 && <button className="btn btn-secondary" onClick={handleMarkAll}>✓ Mark All Read</button>}
            </div>

            <div className="card">
                {notifs.length === 0 ? (
                    <div className="empty-state"><div className="icon">🔔</div><h3>No Notifications</h3><p>You're all caught up!</p></div>
                ) : (
                    notifs.map(n => (
                        <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`} onClick={() => !n.is_read && handleMarkRead(n.id)}>
                            <div className="notif-icon" style={{ background: `${typeColor(n.type)}20`, color: typeColor(n.type) }}>
                                {typeIcon(n.type)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div className="flex-between">
                                    <span className="fw-600" style={{ fontSize: 14 }}>{n.title}</span>
                                    <span className="text-sm text-muted">{new Date(n.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-muted" style={{ marginTop: 4 }}>{n.message}</p>
                                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                    <span className={`pill ${priorityPill(n.priority)}`}>{n.priority}</span>
                                    <span className="pill pill-info">{n.type.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
