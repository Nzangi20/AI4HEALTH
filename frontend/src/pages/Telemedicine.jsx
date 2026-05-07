import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function Telemedicine() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [showSchedule, setShowSchedule] = useState(false);
    const [schedDate, setSchedDate] = useState('');
    const [participants, setParticipants] = useState({ doctors: [], patients: [] });
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [selectedPatient, setSelectedPatient] = useState('');

    useEffect(() => { load(); }, []);
    useEffect(() => {
        if (showSchedule) {
            api.getTelemedParticipants().then(setParticipants).catch(() => { });
        }
    }, [showSchedule]);
    const load = () => {
        api.getTelemedSessions().then(setSessions).catch(() => { });
        api.getTelemedParticipants().then(setParticipants).catch(() => { });
    };

    const handleSchedule = async (e) => {
        e.preventDefault();
        try {
            const payload = { scheduled_at: schedDate };
            if (user?.role === 'patient') payload.doctor_id = Number(selectedDoctor);
            if (user?.role === 'doctor') {
                if (!selectedPatient) throw new Error('Please select a patient');
                payload.patient_id = Number(selectedPatient);
            }
            if (user?.role === 'admin') {
                payload.patient_id = Number(selectedPatient);
                payload.doctor_id = Number(selectedDoctor);
            }
            await api.createTelemed(payload);
            setShowSchedule(false);
            setSchedDate('');
            setSelectedDoctor('');
            setSelectedPatient('');
            load();
        } catch (e) { alert(e.message); }
    };

    const handleJoin = async (id) => {
        const joined = await api.joinTelemed(id);
        const s = sessions.find(x => x.id === id);
        setActiveSession({ ...(s || {}), ...joined, status: joined.status || 'active' });
        load();
    };

    const handleEnd = async () => {
        if (activeSession) {
            await api.endTelemed(activeSession.id, { consultation_notes: 'Session completed.' });
            setActiveSession(null);
            load();
        }
    };

    return (
        <div className="animate-in">
            <div className="page-header flex-between">
                <div><h1>📹 Telemedicine</h1><p>Secure remote video consultations</p></div>
                <button className="btn btn-primary" onClick={() => setShowSchedule(true)}>+ Schedule Session</button>
            </div>

            {activeSession && (
                <div className="card mb-24">
                    <h3 style={{ marginBottom: 16 }}>Active Session</h3>
                    <div className="video-container">
                        <iframe
                            title="Telemedicine meeting"
                            src={`${activeSession.meeting_url || `https://meet.jit.si/BreastGuard-${activeSession.room_id}`}#config.prejoinPageEnabled=false`}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            allow="camera; microphone; fullscreen; display-capture"
                        />
                    </div>
                    <div className="video-controls" style={{ marginTop: 12 }}>
                        <a href={activeSession.meeting_url || `https://meet.jit.si/BreastGuard-${activeSession.room_id}`} target="_blank" rel="noreferrer" className="btn btn-secondary">↗ Open in New Tab</a>
                        <button className="video-btn end-call" title="End Call" onClick={handleEnd}>📵</button>
                    </div>
                </div>
            )}

            <div className="card">
                <h3 style={{ marginBottom: 16 }}>Sessions</h3>
                {sessions.length === 0 ? (
                    <div className="empty-state"><div className="icon">📹</div><h3>No Sessions</h3><p>Schedule a telemedicine session to get started.</p></div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead><tr><th>{user?.role === 'patient' ? 'Doctor' : user?.role === 'doctor' ? 'Patient' : 'Participants'}</th><th>Scheduled</th><th>Status</th><th>Room ID</th><th>Action</th></tr></thead>
                            <tbody>
                                {sessions.map(s => (
                                    <tr key={s.id}>
                                        <td>{user?.role === 'patient' ? s.doctor_name : user?.role === 'doctor' ? s.patient_name : `${s.patient_name} ↔ ${s.doctor_name}`}</td>
                                        <td>{new Date(s.scheduled_at).toLocaleString()}</td>
                                        <td><span className={`pill ${s.status === 'completed' ? 'pill-success' : s.status === 'active' ? 'pill-info' : 'pill-pending'}`}>{s.status}</span></td>
                                        <td><code className="text-sm">{s.room_id}</code></td>
                                        <td>
                                            {s.status !== 'completed' && <button className="btn btn-sm btn-primary" onClick={() => handleJoin(s.id)}>Join →</button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showSchedule && (
                <div className="modal-overlay" onClick={() => setShowSchedule(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>📹 Schedule Telemedicine Session</h2>
                        <form onSubmit={handleSchedule}>
                            {user?.role === 'patient' && (
                                <div className="form-group">
                                    <label>Select Doctor</label>
                                    <select className="form-select" value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)} required>
                                        <option value="">Choose doctor...</option>
                                        {participants.doctors?.map(d => <option key={d.user_id} value={d.user_id}>{d.name} — {d.specialization}{d.hospital ? ` (${d.hospital})` : ''}</option>)}
                                    </select>
                                </div>
                            )}
                            {user?.role === 'doctor' && (
                                <div className="form-group">
                                    <label>Select Patient</label>
                                    <select className="form-select" value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} required>
                                        <option value="">Choose patient...</option>
                                        {participants.patients?.map(p => <option key={p.patient_id} value={p.patient_id}>{p.name}{p.age ? ` (${p.age} yrs)` : ''}</option>)}
                                    </select>
                                    <div className="text-sm text-muted mt-16">You must select a patient before scheduling the telemedicine session.</div>
                                </div>
                            )}
                            {user?.role === 'admin' && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Select Patient</label>
                                        <select className="form-select" value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} required>
                                            <option value="">Choose patient...</option>
                                            {participants.patients?.map(p => <option key={p.patient_id} value={p.patient_id}>{p.name}{p.age ? ` (${p.age} yrs)` : ''}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Select Doctor</label>
                                        <select className="form-select" value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)} required>
                                            <option value="">Choose doctor...</option>
                                            {participants.doctors?.map(d => <option key={d.user_id} value={d.user_id}>{d.name} — {d.specialization}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                            <div className="form-group"><label>Date & Time</label><input type="datetime-local" className="form-input" value={schedDate} onChange={e => setSchedDate(e.target.value)} required /></div>
                            <div className="disclaimer"><span className="icon">🔒</span><span>Meeting opens in-browser using a secure room link, so doctor and patient can actually join the same session.</span></div>
                            <div className="flex-between"><button type="button" className="btn btn-secondary" onClick={() => setShowSchedule(false)}>Cancel</button><button type="submit" className="btn btn-primary">Schedule</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
