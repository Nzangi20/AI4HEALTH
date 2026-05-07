const API_BASE = 'http://localhost:8000';

function getToken() {
    return localStorage.getItem('token');
}

function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || 'Request failed');
    }
    return res.json();
}

async function formRequest(path, formData) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || 'Request failed');
    }
    return res.json();
}

export const api = {
    // Auth
    register: (data) => request('POST', '/auth/register', data),
    login: (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        return fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
        }).then(r => { if (!r.ok) throw new Error('Invalid credentials'); return r.json(); });
    },
    getMe: () => request('GET', '/auth/me'),
    resetPassword: (email, newPassword) => request('POST', '/auth/reset-password', { email, new_password: newPassword }),

    // Patient
    getPatientProfile: () => request('GET', '/patients/profile'),
    updatePatientProfile: (data) => request('PUT', '/patients/profile', data),
    submitRiskAssessment: (data) => request('POST', '/patients/risk-assessment', data),
    getRiskAssessments: () => request('GET', '/patients/risk-assessments'),
    getPatientDashboard: () => request('GET', '/patients/dashboard'),

    // Doctor
    getNearbyDoctors: (riskLevel) => request('GET', `/doctors/nearby${riskLevel ? `?risk_level=${riskLevel}` : ''}`),
    getDoctorDashboard: () => request('GET', '/doctors/dashboard'),
    getPatients: () => request('GET', '/doctors/patients'),
    getPatientDetail: (id) => request('GET', `/doctors/patients/${id}`),
    createDiagnosis: (data) => request('POST', '/doctors/diagnose', data),

    // Lab
    getLabDashboard: () => request('GET', '/lab/dashboard'),
    uploadLabResult: (data) => request('POST', '/lab/results', data),
    uploadLabResultWithFile: (patientId, testType, summary, file) => {
        const fd = new FormData();
        fd.append('patient_id', patientId);
        fd.append('test_type', testType);
        fd.append('result_summary', summary);
        fd.append('file', file);
        return formRequest('/lab/results/upload-file', fd);
    },
    downloadLabFile: (resultId) => `${API_BASE}/lab/results/${resultId}/file`,
    getLabResults: () => request('GET', '/lab/results'),
    getLabPatients: () => request('GET', '/lab/patients'),

    // Scheduler
    createAppointment: (data) => request('POST', '/scheduler/appointments', data),
    getAppointments: () => request('GET', '/scheduler/appointments'),
    rescheduleAppointment: (id, data) => request('PUT', `/scheduler/appointments/${id}/reschedule`, data),
    cancelAppointment: (id) => request('PUT', `/scheduler/appointments/${id}/cancel`),
    autoSchedule: (patientId, type, sessions) => request('POST', `/scheduler/auto-schedule?patient_id=${patientId}&treatment_type=${type}&sessions=${sessions}`),

    // Monitoring
    recordVitals: (data) => request('POST', '/monitoring/vitals', data),
    getVitals: (patientId) => request('GET', `/monitoring/vitals${patientId ? `?patient_id=${patientId}` : ''}`),
    getTreatmentProgress: (patientId) => request('GET', `/monitoring/treatment-progress${patientId ? `?patient_id=${patientId}` : ''}`),
    generateDemoVitals: (patientId, days) => request('POST', `/monitoring/generate-demo-vitals?patient_id=${patientId}&days=${days || 14}`),

    // Knowledge
    getKnowledgeCases: () => request('GET', '/knowledge/cases'),
    getKnowledgeStats: () => request('GET', '/knowledge/stats'),
    seedKnowledge: (count) => request('POST', `/knowledge/seed?count=${count || 50}`),
    trainKnowledgeAssistant: () => request('POST', '/knowledge/assistant/train'),
    chatKnowledgeAssistant: (message) => request('POST', '/knowledge/assistant/chat', { message }),
    getKnowledgeAssistantHistory: () => request('GET', '/knowledge/assistant/history'),

    // Knowledge Chat (Doctor Collaboration)
    getChatMessages: (topic) => request('GET', `/knowledge/chat${topic ? `?topic=${topic}` : ''}`),
    getChatTopics: () => request('GET', '/knowledge/chat/topics'),
    getChatDoctors: () => request('GET', '/knowledge/chat/doctors-online'),
    sendChatMessage: (data) => request('POST', '/knowledge/chat', data),
    sendChatWithAttachment: (topic, message, file) => {
        const fd = new FormData();
        fd.append('topic', topic);
        fd.append('message', message);
        fd.append('file', file);
        return formRequest('/knowledge/chat/with-attachment', fd);
    },

    // Records
    getUnifiedRecord: (patientId) => request('GET', `/records/${patientId}`),
    getRecordSummary: (patientId) => request('GET', `/records/summary/${patientId}`),

    // Telemedicine
    createTelemed: (data) => request('POST', '/telemedicine/sessions', data),
    getTelemedSessions: () => request('GET', '/telemedicine/sessions'),
    getTelemedParticipants: () => request('GET', '/telemedicine/participants'),
    joinTelemed: (id) => request('PUT', `/telemedicine/sessions/${id}/join`),
    startTelemed: (id) => request('PUT', `/telemedicine/sessions/${id}/start`),
    endTelemed: (id, notes) => request('PUT', `/telemedicine/sessions/${id}/end`, notes),

    // Notifications
    getNotifications: () => request('GET', '/notifications/'),
    markRead: (id) => request('PUT', `/notifications/${id}/read`),
    markAllRead: () => request('PUT', '/notifications/mark-all-read'),
    getUnreadCount: () => request('GET', '/notifications/unread-count'),

    // Access
    getAccessInfo: () => request('GET', '/access/accessibility-info'),

    // Admin
    getAdminDashboard: () => request('GET', '/admin/dashboard'),
    getAdminUsers: () => request('GET', '/admin/users'),
    updateAdminUserRole: (userId, role) => request('PUT', `/admin/users/${userId}/role?role=${encodeURIComponent(role)}`),
    deleteAdminUser: (userId) => request('DELETE', `/admin/users/${userId}`),
};
