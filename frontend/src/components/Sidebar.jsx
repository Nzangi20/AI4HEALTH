import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const patientNav = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/risk-assessment', icon: '🔬', label: 'Risk Assessment' },
    { path: '/appointments', icon: '📅', label: 'Appointments' },
    { path: '/monitoring', icon: '💓', label: 'Health Monitor' },
    { path: '/records', icon: '📋', label: 'My Records' },
    { path: '/telemedicine', icon: '📹', label: 'Telemedicine' },
    { path: '/knowledge', icon: '🧠', label: 'Knowledge Base' },
    { path: '/notifications', icon: '🔔', label: 'Notifications' },
];

const doctorNav = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/patients', icon: '👥', label: 'Patients' },
    { path: '/appointments', icon: '📅', label: 'Appointments' },
    { path: '/monitoring', icon: '💓', label: 'Monitoring' },
    { path: '/knowledge', icon: '🧠', label: 'Knowledge Hub' },
    { path: '/telemedicine', icon: '📹', label: 'Telemedicine' },
];

const labNav = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/lab-results', icon: '🧪', label: 'Lab Results' },
    { path: '/knowledge', icon: '🧠', label: 'Knowledge Base' },
    { path: '/patients', icon: '👥', label: 'Patients' },
];

const adminNav = [
    { path: '/dashboard', icon: '🛡️', label: 'Admin Overview' },
    { path: '/admin', icon: '📈', label: 'System Dashboard' },
    { path: '/patients', icon: '👥', label: 'Patients' },
    { path: '/appointments', icon: '📅', label: 'Appointments' },
    { path: '/telemedicine', icon: '📹', label: 'Telemedicine' },
    { path: '/knowledge', icon: '🧠', label: 'Knowledge Hub' },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const navItems = user?.role === 'admin' ? adminNav : user?.role === 'doctor' ? doctorNav : user?.role === 'lab_tech' ? labNav : patientNav;
    const roleLabel = user?.role === 'admin' ? 'Administrator' : user?.role === 'doctor' ? 'Doctor' : user?.role === 'lab_tech' ? 'Lab Tech' : 'Patient';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            <aside className="sidebar">
                <div className="logo">
                    <div className="logo-icon">B</div>
                    <div>
                        <div className="logo-text">BreastGuard</div>
                        <div className="logo-sub">AI Health System</div>
                    </div>
                </div>

                <nav className="nav-section" style={{ flex: 1 }}>
                    <div className="nav-label">{roleLabel} Menu</div>
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="icon">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user-card">
                        <div className="user-avatar">{user?.name?.charAt(0) || '?'}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="signout-btn-main">
                        <span className="icon">🚪</span>
                        Sign Out
                    </button>
                </div>
            </aside>

            <button onClick={handleLogout} className="signout-global-topright" aria-label="Sign out">
                🚪 Sign Out
            </button>
        </>
    );
}
