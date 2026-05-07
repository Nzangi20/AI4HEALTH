import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import LabDashboard from './pages/LabDashboard';
import RiskAssessment from './pages/RiskAssessment';
import Scheduler from './pages/Scheduler';
import Monitoring from './pages/Monitoring';
import KnowledgeHub from './pages/KnowledgeHub';
import PatientRecord from './pages/PatientRecord';
import Telemedicine from './pages/Telemedicine';
import Notifications from './pages/Notifications';
import PatientList from './pages/PatientList';
import LabResults from './pages/LabResults';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="flex-center" style={{ minHeight: '100vh' }}>Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    return children;
}

function DashboardRouter() {
    const { user } = useAuth();
    if (user?.role === 'admin') return <AdminDashboard />;
    if (user?.role === 'doctor') return <DoctorDashboard />;
    if (user?.role === 'lab_tech') return <LabDashboard />;
    return <PatientDashboard />;
}

function AppRoutes() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/*" element={
                <ProtectedRoute>
                    <div className="app-layout">
                        <Sidebar />
                        <main className="main-content">
                            <Routes>
                                <Route path="/dashboard" element={<DashboardRouter />} />
                                <Route path="/risk-assessment" element={<RiskAssessment />} />
                                <Route path="/appointments" element={<Scheduler />} />
                                <Route path="/monitoring" element={<Monitoring />} />
                                <Route path="/knowledge" element={<KnowledgeHub />} />
                                <Route path="/records" element={<PatientRecord />} />
                                <Route path="/telemedicine" element={<Telemedicine />} />
                                <Route path="/notifications" element={<Notifications />} />
                                <Route path="/patients" element={<PatientList />} />
                                <Route path="/lab-results" element={<LabResults />} />
                                <Route path="/admin" element={<AdminDashboard />} />
                                <Route path="*" element={<Navigate to="/dashboard" />} />
                            </Routes>
                        </main>
                    </div>
                </ProtectedRoute>
            } />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
