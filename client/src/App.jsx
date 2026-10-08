import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { PageSpinner } from './components/ui/Spinner';

// Customer pages
const LandingPage = lazy(() => import('./pages/customer/LandingPage'));
const ServicesPage = lazy(() => import('./pages/customer/ServicesPage'));
const StaffPage = lazy(() => import('./pages/customer/StaffPage'));
const BookingPage = lazy(() => import('./pages/customer/BookingPage'));
const TrackBookingPage = lazy(() => import('./pages/customer/TrackBookingPage'));

// Auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage'));

// Admin pages
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminCalendar = lazy(() => import('./pages/admin/AdminCalendar'));
const AdminAppointments = lazy(() => import('./pages/admin/AdminAppointments'));
const AdminStaff = lazy(() => import('./pages/admin/AdminStaff'));
const AdminServices = lazy(() => import('./pages/admin/AdminServices'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'));

// Staff pages
const StaffLayout = lazy(() => import('./pages/staff/StaffLayout'));
const StaffHome = lazy(() => import('./pages/staff/StaffHome'));
const StaffSchedule = lazy(() => import('./pages/staff/StaffSchedule'));
const StaffAppointments = lazy(() => import('./pages/staff/StaffAppointments'));
const StaffProfile = lazy(() => import('./pages/staff/StaffProfile'));
const StaffChangePassword = lazy(() => import('./pages/staff/StaffChangePassword'));
const StaffPortfolio = lazy(() => import('./pages/staff/StaffPortfolio'));
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage'));

const homeByRole = { admin: '/admin', staff: '/staff' };

// Protected route wrapper for staff/admin only (customer login removed)
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={homeByRole[user.role] || '/'} replace />;
  }
  return children || <Outlet />;
};

const PasswordChangeGate = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/admin') || location.pathname.startsWith('/staff') || location.pathname === '/change-password';
  if (loading && isPortal) return <PageSpinner />;
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return children;
};

// Public layout with navbar and footer
const PublicLayout = () => (
  <>
    <Navbar />
    <Outlet />
    <Footer />
  </>
);

function App() {
  return (
    <PasswordChangeGate><Suspense fallback={<PageSpinner />}><Routes>
      {/* Public pages - no login required, guest booking via mobile */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/team" element={<StaffPage />} />
        <Route path="/team/:id" element={<StaffPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/t/:bookingRef" element={<TrackBookingPage />} />
      </Route>

      {/* Hidden staff/admin entry (unlinked from public site) */}
      <Route path="/admin/login" element={<LoginPage staffOnly />} />
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="/my-bookings" element={<Navigate to="/booking" replace />} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />

      {/* Admin panel */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="calendar" element={<AdminCalendar />} />
        <Route path="appointments" element={<AdminAppointments />} />
        <Route path="staff" element={<AdminStaff />} />
        <Route path="services" element={<AdminServices />} />
        <Route path="customers" element={<AdminCustomers />} />
      </Route>

      {/* Staff panel */}
      <Route path="/staff" element={<ProtectedRoute allowedRoles={['staff']}><StaffLayout /></ProtectedRoute>}>
        <Route index element={<StaffHome />} />
        <Route path="schedule" element={<StaffSchedule />} />
        <Route path="appointments" element={<StaffAppointments />} />
        <Route path="profile" element={<StaffProfile />} />
        <Route path="portfolio" element={<StaffPortfolio />} />
        <Route path="password" element={<StaffChangePassword />} />
      </Route>

      {/* Catch all */}
      {import.meta.env.DEV && <Route path="/design-system" element={<DesignSystemPage />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense></PasswordChangeGate>
  );
}

export default App;
