import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetMsg, setResetMsg] = useState('');
    const [resetError, setResetError] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Login failed');
        }
        setLoading(false);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setResetError('');
        setResetMsg('');

        if (newPassword !== confirmPassword) {
            setResetError('Passwords do not match');
            return;
        }

        setResetLoading(true);
        try {
            await api.resetPassword(resetEmail, newPassword);
            setResetMsg('Password reset successful. You can now sign in.');
            setShowReset(false);
            setEmail(resetEmail);
            setPassword('');
            setResetEmail('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setResetError(err.message || 'Password reset failed');
        }
        setResetLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-hero">
                <img src="/images/login_hero.png" alt="BreastGuard AI Healthcare" />
                <div className="auth-hero-text">
                    <h2>AI-Powered Breast Cancer Detection</h2>
                    <p>Empowering patients and healthcare professionals with intelligent early detection, 
                       personalized care plans, and continuous health monitoring.</p>
                </div>
            </div>

            <div className="auth-form-side">
                <div className="auth-card animate-in">
                    <div className="logo" style={{ justifyContent: 'center', marginBottom: 24 }}>
                        <div className="logo-icon" style={{ width: 48, height: 48, fontSize: 24 }}>B</div>
                        <div>
                            <div className="logo-text" style={{ fontSize: 22 }}>BreastGuard AI</div>
                            <div className="logo-sub">Intelligent Health Platform</div>
                        </div>
                    </div>
                    <h1>Welcome Back</h1>
                    <p className="auth-subtitle">Sign in to access your healthcare dashboard</p>

                    {error && (
                        <div style={{ background: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--danger)' }}>
                            {error}
                        </div>
                    )}
                    {resetMsg && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--success)' }}>
                            {resetMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input type="email" className="form-input" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" className="form-input" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                            {loading ? '⏳ Signing In...' : '🔐 Sign In'}
                        </button>
                    </form>
                    <div style={{ marginTop: 12, textAlign: 'right' }}>
                        <button
                            type="button"
                            onClick={() => { setShowReset(!showReset); setResetError(''); }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                        >
                            Forgot password?
                        </button>
                    </div>

                    {showReset && (
                        <form onSubmit={handleResetPassword} style={{ marginTop: 12, padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Reset Password</div>
                            {resetError && (
                                <div style={{ background: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 12, fontSize: 12, color: 'var(--danger)' }}>
                                    {resetError}
                                </div>
                            )}
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" className="form-input" placeholder="Enter your account email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input type="password" className="form-input" placeholder="Minimum 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                            </div>
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input type="password" className="form-input" placeholder="Re-enter new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
                            </div>
                            <button type="submit" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} disabled={resetLoading}>
                                {resetLoading ? '⏳ Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    )}

                    <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
                        Don't have an account? <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Register</Link>
                    </p>

                    <div className="auth-features">
                        <span className="auth-feature">🛡️ HIPAA Compliant</span>
                        <span className="auth-feature">🔒 End-to-End Encrypted</span>
                        <span className="auth-feature">🧬 AI-Powered</span>
                    </div>

                    <div className="disclaimer" style={{ marginTop: 24, marginBottom: 0 }}>
                        <span className="icon">ℹ️</span>
                        <span>This system supports clinical decisions and does not replace professional medical diagnosis by qualified healthcare providers.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
