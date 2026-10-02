import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { PageSpinner } from './components/ui/Spinner';

// Customer pages
import LandingPage from './pages/customer/LandingPage';
import ServicesPage from './pages/customer/ServicesPage';
import StaffPage from './pages/customer/StaffPage';
import BookingPage from './pages/customer/BookingPage';
import MyBookingsPage from './pages/customer/MyBookingsPage';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';

// Admin pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminAppointments from './pages/admin/AdminAppointments';
import AdminStaff from './pages/admin/AdminStaff';
import AdminServices from './pages/admin/AdminServices';
import AdminCustomers from './pages/admin/AdminCustomers';

// Staff pages
import StaffLayout from './pages/staff/StaffLayout';
import StaffHome from './pages/staff/StaffHome';
import StaffSchedule from './pages/staff/StaffSchedule';
import StaffAppointments from './pages/staff/StaffAppointments';
import StaffProfile from './pages/staff/StaffProfile';
import StaffChangePassword from './pages/staff/StaffChangePassword';
import StaffPortfolio from './pages/staff/StaffPortfolio';
import DesignSystemPage from './pages/DesignSystemPage';

const homeByRole = { customer: '/', admin: '/admin', staff: '/staff' };

const PasswordChangeGate = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageSpinner />;
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return children;
};

// Protected route wrapper for authenticated users and authorized roles
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={homeByRole[user.role] || '/'} replace />;
  }
  return children || <Outlet />;
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
    <PasswordChangeGate><Routes>
      {/* Public customer pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/team" element={<StaffPage />} />
        <Route path="/team/:id" element={<StaffPage />} />

        {/* Protected customer routes */}
        <Route path="/booking" element={<ProtectedRoute allowedRoles={['customer']}><BookingPage /></ProtectedRoute>} />
        <Route path="/my-bookings" element={<ProtectedRoute allowedRoles={['customer']}><MyBookingsPage /></ProtectedRoute>} />
      </Route>

      {/* Auth pages (no navbar/footer) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
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
    </Routes></PasswordChangeGate>
  );
}

export default App;
