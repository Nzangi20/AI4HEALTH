import React, { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#2563eb', '#0d9488', '#059669', '#d97706', '#dc2626'];

export default function KnowledgeHub() {
    const { user } = useAuth();
    const [tab, setTab] = useState('data');
    const [stats, setStats] = useState(null);
    const [cases, setCases] = useState([]);
    const [seeding, setSeeding] = useState(false);

    // Chat state
    const [messages, setMessages] = useState([]);
    const [chatTopic, setChatTopic] = useState('General Discussion');
    const [topics, setTopics] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [newMsg, setNewMsg] = useState('');
    const [newTopic, setNewTopic] = useState('');
    const [showNewTopic, setShowNewTopic] = useState(false);
    const [chatFile, setChatFile] = useState(null);
    const [sending, setSending] = useState(false);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiReply, setAiReply] = useState('');
    const [aiTrainingInfo, setAiTrainingInfo] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiHistory, setAiHistory] = useState([]);

    useEffect(() => { loadData(); }, []);
    useEffect(() => { if (tab === 'chat' && user?.role === 'doctor') loadChat(); }, [tab, chatTopic]);

    const loadData = () => {
        api.getKnowledgeStats().then(setStats).catch(() => { });
        api.getKnowledgeCases().then(setCases).catch(() => { });
    };

    const loadChat = () => {
        api.getChatMessages(chatTopic === 'All Topics' ? null : chatTopic).then(m => {
            setMessages(m.reverse());
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }).catch(() => { });
        api.getChatTopics().then(t => setTopics(['All Topics', 'General Discussion', ...t.filter(x => x !== 'General Discussion')])).catch(() => { });
        api.getChatDoctors().then(setDoctors).catch(() => { });
    };

    const handleSeed = async () => {
        setSeeding(true);
        try { await api.seedKnowledge(50); loadData(); } catch (e) { alert(e.message); }
        setSeeding(false);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMsg.trim()) return;
        setSending(true);
        try {
            const topic = showNewTopic && newTopic.trim() ? newTopic.trim() : chatTopic === 'All Topics' ? 'General Discussion' : chatTopic;
            if (chatFile) {
                await api.sendChatWithAttachment(topic, newMsg, chatFile);
            } else {
                await api.sendChatMessage({ topic, message: newMsg });
            }
            setNewMsg('');
            setChatFile(null);
            setShowNewTopic(false);
            setNewTopic('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (chatTopic === 'All Topics' || chatTopic === topic) loadChat();
            else { setChatTopic(topic); }
        } catch (err) { alert(err.message); }
        setSending(false);
    };

    const outcomeData = stats ? Object.entries(stats.by_outcome).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v })) : [];
    const treatmentData = stats ? Object.entries(stats.by_treatment).map(([k, v]) => ({ name: k.replace('_', ' ').toUpperCase(), value: v })) : [];

    const isDoctor = user?.role === 'doctor';
    const canTrainAssistant = user?.role === 'doctor' || user?.role === 'admin';

    const handleTrainAssistant = async () => {
        setAiLoading(true);
        try {
            const res = await api.trainKnowledgeAssistant();
            setAiTrainingInfo(res);
            setAiReply('Knowledge assistant has been trained using current platform data.');
        } catch (e) {
            alert(e.message);
        }
        setAiLoading(false);
    };

    const handleAskAssistant = async (e) => {
        e.preventDefault();
        if (!aiQuestion.trim()) return;
        setAiLoading(true);
        try {
            const res = await api.chatKnowledgeAssistant(aiQuestion.trim());
            setAiReply(res.answer);
            setAiTrainingInfo((prev) => prev || { trained_at: res.trained_at });
            setAiQuestion('');
            api.getKnowledgeAssistantHistory().then(setAiHistory).catch(() => { });
        } catch (e) {
            alert(e.message);
        }
        setAiLoading(false);
    };

    const loadAssistantHistory = () => api.getKnowledgeAssistantHistory().then(setAiHistory).catch(() => { });

    return (
        <div className="animate-in">
            <div className="page-header flex-between">
                <div>
                    <h1>🧠 Global Knowledge Hub</h1>
                    <p>Anonymized case data, cross-hospital collaboration, and doctor networking</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {isDoctor && (
                        <button className="btn btn-secondary" onClick={handleSeed} disabled={seeding}>{seeding ? '⏳ Seeding...' : '🌱 Seed Demo Data'}</button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 24 }}>
                <button className={`tab ${tab === 'data' ? 'active' : ''}`} onClick={() => setTab('data')}>📊 Research Data</button>
                <button className={`tab ${tab === 'assistant' ? 'active' : ''}`} onClick={() => { setTab('assistant'); loadAssistantHistory(); }}>🤖 AI Assistant</button>
                {isDoctor && <button className={`tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>💬 Doctor Collaboration</button>}
                {isDoctor && <button className={`tab ${tab === 'doctors' ? 'active' : ''}`} onClick={() => { setTab('doctors'); api.getChatDoctors().then(setDoctors).catch(() => { }); }}>👨‍⚕️ Doctors Network</button>}
            </div>

            {/* ====== DATA TAB ====== */}
            {tab === 'data' && (
                <>
                    <div className="stats-grid">
                        <div className="stat-card"><div className="stat-icon cyan">📊</div><div className="stat-value">{stats?.total_cases || 0}</div><div className="stat-label">Total Cases</div></div>
                        <div className="stat-card"><div className="stat-icon green">✅</div><div className="stat-value">{stats?.by_outcome?.negative || 0}</div><div className="stat-label">Negative Outcomes</div></div>
                        <div className="stat-card"><div className="stat-icon red">⚠️</div><div className="stat-value">{stats?.by_outcome?.positive || 0}</div><div className="stat-label">Positive Outcomes</div></div>
                    </div>

                    {stats && stats.total_cases > 0 && (
                        <div className="grid-2 mb-24">
                            <div className="card">
                                <h3 style={{ marginBottom: 16 }}>Diagnosis Outcomes</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                                            {outcomeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-center gap-16" style={{ flexWrap: 'wrap' }}>
                                    {outcomeData.map((d, i) => (
                                        <div key={d.name} className="flex gap-8" style={{ alignItems: 'center' }}>
                                            <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                                            <span className="text-sm">{d.name}: {d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="card">
                                <h3 style={{ marginBottom: 16 }}>Treatment Distribution</h3>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={treatmentData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                                        <YAxis stroke="#64748b" fontSize={11} />
                                        <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                                        <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <h3 style={{ marginBottom: 16 }}>📋 Recent Cases ({cases.length})</h3>
                        {cases.length === 0 ? (
                            <div className="empty-state"><div className="icon">🧠</div><h3>No Knowledge Cases</h3><p>Click "Seed Demo Data" to populate.</p></div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead><tr><th>Age Group</th><th>Risk</th><th>Outcome</th><th>Treatment</th><th>Hospital</th><th>Region</th></tr></thead>
                                    <tbody>
                                        {cases.slice(0, 20).map(c => (
                                            <tr key={c.id}>
                                                <td>{c.age_group}</td>
                                                <td><span className={`pill pill-${c.risk_level.toLowerCase()}`}>{c.risk_level}</span></td>
                                                <td><span className={`pill ${c.diagnosis_outcome === 'positive' ? 'pill-high' : c.diagnosis_outcome === 'negative' ? 'pill-success' : 'pill-pending'}`}>{c.diagnosis_outcome}</span></td>
                                                <td>{c.treatment_type.replace('_', ' ')}</td>
                                                <td className="text-sm">{c.hospital}</td>
                                                <td className="text-sm text-muted">{c.region}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {tab === 'assistant' && (
                <div className="card">
                    <div className="flex-between mb-16">
                        <h3>🤖 Knowledge Base Assistant</h3>
                        {canTrainAssistant && (
                            <button className="btn btn-secondary" onClick={handleTrainAssistant} disabled={aiLoading}>
                                {aiLoading ? '⏳ Training...' : '🧠 Train Breast-Cancer Chatbot'}
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-muted mb-16">Ask medical questions about breast cancer symptoms, screening, diagnosis, stages, treatments, side effects, and follow-up care.</p>
                    <form onSubmit={handleAskAssistant} style={{ display: 'flex', gap: 8 }}>
                        <input
                            className="form-input"
                            placeholder="Ask: What are early warning signs of breast cancer?"
                            value={aiQuestion}
                            onChange={e => setAiQuestion(e.target.value)}
                        />
                        <button className="btn btn-primary" type="submit" disabled={aiLoading || !aiQuestion.trim()}>{aiLoading ? '⏳' : 'Ask'}</button>
                    </form>
                    {aiTrainingInfo?.trained_at && (
                        <p className="text-sm text-muted mt-16">Last trained: {new Date(aiTrainingInfo.trained_at).toLocaleString()}</p>
                    )}
                    {aiReply && (
                        <div className="disclaimer mt-24">
                            <span className="icon">💡</span>
                            <span>{aiReply}</span>
                        </div>
                    )}
                    {aiHistory.length > 0 && (
                        <div className="mt-24">
                            <h4 style={{ marginBottom: 10 }}>Conversation</h4>
                            <div style={{ display: 'grid', gap: 10, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                                {[...aiHistory].reverse().map(h => (
                                    <div key={h.id}>
                                        <div style={{ justifySelf: 'end', maxWidth: '82%', marginLeft: 'auto', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 14, padding: '10px 12px' }}>
                                            <div className="text-sm fw-600">You</div>
                                            <div className="text-sm">{h.question}</div>
                                        </div>
                                        <div style={{ maxWidth: '88%', marginTop: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 12px' }}>
                                            <div className="text-sm fw-600">AI Assistant</div>
                                            <div className="text-sm">{h.answer}</div>
                                            <div className="text-sm text-muted mt-16">Sources: {(h.sources || []).join(', ') || 'system facts'} • {h.created_at ? new Date(h.created_at).toLocaleString() : ''}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {aiHistory.length === 0 && (
                        <div className="empty-state mt-24">
                            <div className="icon">🤖</div>
                            <h3>Start a conversation</h3>
                            <p>Ask anything about the platform, workflows, or healthcare-support insights.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ====== CHAT TAB ====== */}
            {tab === 'chat' && isDoctor && (
                <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 260px)', minHeight: 500 }}>
                    {/* Topic sidebar */}
                    <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                        <div className="card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                                <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)' }}>Topics</h4>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {topics.map(t => (
                                    <div key={t} onClick={() => setChatTopic(t)}
                                        style={{
                                            padding: '12px 16px', cursor: 'pointer', fontSize: 13,
                                            borderLeft: chatTopic === t ? '3px solid var(--accent)' : '3px solid transparent',
                                            background: chatTopic === t ? 'var(--accent-glow)' : 'transparent',
                                            color: chatTopic === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontWeight: chatTopic === t ? 600 : 400,
                                            transition: 'var(--transition)',
                                        }}>
                                        {t === 'All Topics' ? '📋 ' : t === 'General Discussion' ? '💬 ' : '🏷️ '}{t}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Chat area */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                            {/* Chat header */}
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <h3 style={{ fontSize: 16, margin: 0 }}>💬 {chatTopic}</h3>
                                    <span className="text-sm text-muted">{messages.length} messages • {doctors.length} doctors</span>
                                </div>
                                <button className="btn btn-sm btn-secondary" onClick={loadChat}>🔄 Refresh</button>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {messages.length === 0 && (
                                    <div className="empty-state" style={{ margin: 'auto' }}>
                                        <div className="icon">💬</div>
                                        <h3>Start the conversation</h3>
                                        <p>Share case insights, ask questions, or discuss treatment approaches with doctors across hospitals.</p>
                                    </div>
                                )}
                                {messages.map(m => {
                                    const isMe = m.sender_id === user?.id;
                                    return (
                                        <div key={m.id} style={{
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: isMe ? 'flex-end' : 'flex-start',
                                            maxWidth: '75%', alignSelf: isMe ? 'flex-end' : 'flex-start',
                                        }}>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                                <span style={{
                                                    width: 28, height: 28, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: isMe ? 'var(--gradient-1)' : 'var(--gradient-3)', color: 'white',
                                                }}>{m.sender_name?.charAt(0)}</span>
                                                <span className="fw-600 text-sm">{m.sender_name}</span>
                                                {m.sender_hospital && <span className="text-sm text-muted">• {m.sender_hospital}</span>}
                                            </div>
                                            <div style={{
                                                padding: '12px 16px', borderRadius: 16,
                                                borderTopLeftRadius: isMe ? 16 : 4,
                                                borderTopRightRadius: isMe ? 4 : 16,
                                                background: isMe ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                                                border: `1px solid ${isMe ? 'var(--accent)' : 'var(--border)'}`,
                                            }}>
                                                {m.topic !== chatTopic && chatTopic === 'All Topics' && (
                                                    <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4 }}>🏷️ {m.topic}</div>
                                                )}
                                                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{m.message}</div>
                                                {m.attachment_name && (
                                                    <a href={m.attachment_path} target="_blank" rel="noreferrer"
                                                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--accent)', fontSize: 12 }}>
                                                        📎 {m.attachment_name}
                                                    </a>
                                                )}
                                            </div>
                                            <span className="text-sm text-muted" style={{ marginTop: 4, fontSize: 11 }}>
                                                {new Date(m.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Message input */}
                            <form onSubmit={handleSendMessage} style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                                {showNewTopic && (
                                    <div style={{ marginBottom: 8 }}>
                                        <input className="form-input" placeholder="New topic name..." value={newTopic} onChange={e => setNewTopic(e.target.value)} style={{ padding: '8px 12px', fontSize: 13 }} autoFocus />
                                    </div>
                                )}
                                {chatFile && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 12px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
                                        📎 {chatFile.name} ({(chatFile.size / 1024).toFixed(1)} KB)
                                        <button type="button" onClick={() => { setChatFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>×</button>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => fileInputRef.current?.click()} title="Attach file">📎</button>
                                    <input type="file" ref={fileInputRef} onChange={e => setChatFile(e.target.files[0])} style={{ display: 'none' }} />
                                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowNewTopic(!showNewTopic)} title="New topic"
                                        style={{ background: showNewTopic ? 'var(--accent-glow)' : undefined }}>#</button>
                                    <input className="form-input" placeholder="Type a message to doctors across hospitals..." value={newMsg} onChange={e => setNewMsg(e.target.value)}
                                        style={{ flex: 1, padding: '10px 14px', fontSize: 14 }} />
                                    <button type="submit" className="btn btn-primary" disabled={sending || !newMsg.trim()}>
                                        {sending ? '⏳' : '📤'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== DOCTORS NETWORK TAB ====== */}
            {tab === 'doctors' && isDoctor && (
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>👨‍⚕️ Collaborating Doctors</h3>
                    {doctors.length === 0 ? (
                        <div className="empty-state"><div className="icon">👨‍⚕️</div><h3>No Doctors Yet</h3><p>Doctors who register on the platform will appear here.</p></div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                            {doctors.map(d => (
                                <div key={d.id} style={{
                                    padding: 20, borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                    transition: 'var(--transition)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '50%', background: 'var(--gradient-1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 18, fontWeight: 700, color: 'white',
                                        }}>{d.name?.charAt(0)}</div>
                                        <div>
                                            <div className="fw-600">{d.name}</div>
                                            <div className="text-sm text-muted">{d.specialization}</div>
                                        </div>
                                    </div>
                                    <div className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        🏥 <span>{d.hospital || 'Hospital not set'}</span>
                                    </div>
                                    <div style={{ marginTop: 12 }}>
                                        <span className="pill pill-info">{d.specialization}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
