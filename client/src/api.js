import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const API = axios.create({
  baseURL,
  withCredentials: true,
});

const csrfToken = () => document.cookie.split('; ').find((cookie) => cookie.startsWith('csrf_token='))?.split('=').slice(1).join('');

// Cookie sessions are httpOnly; CSRF token is sent on state-changing requests.
API.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    const token = csrfToken();
    if (token) config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

// Handle 401 responses (staff/admin portal only - public guest booking never redirects)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const isCredentialCheck = ['/auth/login', '/auth/change-password'].some((path) =>
      error.config?.url?.includes(path)
    );
    if (error.response?.status === 401 && !isCredentialCheck) {
      // Only redirect if already inside the hidden staff/admin portal
      const path = window.location.pathname;
      const inPortal = path.startsWith('/admin') || path.startsWith('/staff');
      if (inPortal && !path.includes('/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');
export const changePassword = (data) => API.post('/auth/change-password', data);
export const logout = () => API.post('/auth/logout');

// Services
export const getServices = () => API.get('/services');
export const getAllServices = () => API.get('/services/all');
export const getService = (id) => API.get(`/services/${id}`);
export const createService = (data) => API.post('/services', data);
export const updateService = (id, data) => API.put(`/services/${id}`, data);
export const deleteService = (id) => API.delete(`/services/${id}`);

// Staff
export const getStaff = () => API.get('/staff');
export const getAllStaff = () => API.get('/staff/all');
export const getStaffMember = (id) => API.get(`/staff/${id}`);
export const createStaff = (data) => API.post('/staff', data);
export const updateStaff = (id, data) => API.put(`/staff/${id}`, data);
export const deleteStaff = (id) => API.delete(`/staff/${id}`);

// Appointments
export const getAppointments = (params) => API.get('/appointments', { params });
export const getAvailableSlots = (params) => API.get('/appointments/slots', { params });
export const createAppointment = (data) => API.post('/appointments', data);
export const getBookingByRef = (ref) => API.get(`/appointments/track/${encodeURIComponent(ref)}`);
export const updateAppointmentStatus = (id, status) => API.put(`/appointments/${id}/status`, { status });
export const cancelAppointment = (id) => API.put(`/appointments/${id}/cancel`);

// Admin
export const getAdminStats = () => API.get('/admin/stats');
export const getCustomers = () => API.get('/admin/customers');
export const getCustomerAppointments = (id) => API.get(`/admin/customers/${id}/appointments`);
export const createStaffAccount = (data) => API.post('/admin/staff-accounts', data);
export const getSlotBlocks = (params) => API.get('/admin/blocks', { params });
export const createSlotBlock = (data) => API.post('/admin/blocks', data);
export const deleteSlotBlock = (id) => API.delete(`/admin/blocks/${id}`);
export const getPublicBlocks = (params) => API.get('/appointments/blocks', { params });

// Staff Self-Service (staff portal)
export const getStaffOverview = () => API.get('/staff/me/overview');
export const getStaffAppointments = (params) => API.get('/staff/me/appointments', { params });
export const updateStaffAppointmentStatus = (id, status) =>
  API.patch(`/staff/me/appointments/${id}/status`, { status });
export const getStaffProfile = () => API.get('/staff/me/profile');
export const updateStaffProfile = (data) => API.patch('/staff/me/profile', data);
export const uploadStaffProfilePhoto = (formData) =>
  API.post('/staff/me/profile/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Portfolio - Staff
export const getMyPortfolio = () => API.get('/staff/me/portfolio');
export const uploadPortfolioPhotos = (formData, onProgress) =>
  API.post('/staff/me/portfolio', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
export const updatePortfolioPhoto = (id, data) => API.patch(`/staff/me/portfolio/${id}`, data);
export const reorderPortfolio = (order) => API.patch('/staff/me/portfolio/bulk-reorder', { order });
export const deletePortfolioPhoto = (id) => API.delete(`/staff/me/portfolio/${id}`);

// Portfolio - Public
export const getRecentPortfolio = (limit) => API.get('/portfolio/recent', { params: { limit } });
export const getStaffPortfolio = (staffId, params) =>
  API.get(`/staff/${staffId}/portfolio`, { params });

export default API;
