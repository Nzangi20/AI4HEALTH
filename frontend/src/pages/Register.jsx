import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient', phone: '', specialization: '', hospital: '', location: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const update = (k, v) => setForm({ ...form, [k]: v });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(form);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Registration failed');
        }
        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-hero">
                <img src="/images/login_hero.png" alt="BreastGuard AI Healthcare" />
                <div className="auth-hero-text">
                    <h2>Join Our Care Network</h2>
                    <p>Whether you're a patient seeking peace of mind, a doctor supporting early detection, 
                       or a lab tech delivering critical results — together we save lives.</p>
                </div>
            </div>

            <div className="auth-form-side">
                <div className="auth-card animate-in" style={{ maxWidth: 500 }}>
                    <div className="logo" style={{ justifyContent: 'center', marginBottom: 24 }}>
                        <div className="logo-icon" style={{ width: 48, height: 48, fontSize: 24 }}>B</div>
                        <div>
                            <div className="logo-text" style={{ fontSize: 22 }}>BreastGuard AI</div>
                            <div className="logo-sub">Create Your Account</div>
                        </div>
                    </div>
                    <h1>Get Started</h1>
                    <p className="auth-subtitle">Join the intelligent breast cancer care platform</p>

                    {error && (
                        <div style={{ background: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--danger)' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>I am a</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[{ v: 'patient', l: '🩺 Patient' }, { v: 'doctor', l: '👨‍⚕️ Doctor' }, { v: 'lab_tech', l: '🧪 Lab Tech' }].map(r => (
                                    <button key={r.v} type="button"
                                        className={`btn ${form.role === r.v ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={() => update('role', r.v)}
                                    >{r.l}</button>
                                ))}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input className="form-input" placeholder="Dr. Jane Smith" value={form.name} onChange={e => update('name', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input className="form-input" placeholder="+1 234 567 8900" value={form.phone} onChange={e => update('phone', e.target.value)} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" className="form-input" placeholder="jane@hospital.com" value={form.email} onChange={e => update('email', e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" className="form-input" placeholder="Minimum 6 characters" value={form.password} onChange={e => update('password', e.target.value)} required />
                        </div>

                        {form.role === 'doctor' && (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Specialization</label>
                                        <select className="form-select" value={form.specialization} onChange={e => update('specialization', e.target.value)}>
                                            <option value="">Select...</option>
                                            <option value="Oncology">Oncology</option>
                                            <option value="Surgical Oncology">Surgical Oncology</option>
                                            <option value="Breast Surgery">Breast Surgery</option>
                                            <option value="Radiology">Radiology</option>
                                            <option value="General Practice">General Practice</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Hospital</label>
                                        <input className="form-input" placeholder="City Hospital" value={form.hospital} onChange={e => update('hospital', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Location</label>
                                    <input className="form-input" placeholder="City, Country" value={form.location} onChange={e => update('location', e.target.value)} />
                                </div>
                            </>
                        )}

                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
                            {loading ? '⏳ Creating Account...' : '🚀 Create Account'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
                        Already have an account? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
                    </p>

                    <div className="auth-features">
                        <span className="auth-feature">🛡️ Secure</span>
                        <span className="auth-feature">🧬 AI Diagnostics</span>
                        <span className="auth-feature">📊 Analytics</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
