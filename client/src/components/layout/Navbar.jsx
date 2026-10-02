import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Scissors, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const navLinkClass = 'px-4 py-2 text-sm font-medium text-ink-700 hover:text-primary-700 rounded-lg hover:bg-primary-50 transition-all';

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/95 backdrop-blur-lg shadow-soft border-b border-ink-100' : 'bg-background/80 backdrop-blur-md'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-primary-700 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-ink-900">
              Belleza
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/" className={navLinkClass}>Home</Link>
            <Link to="/services" className={navLinkClass}>Services</Link>
            <Link to="/team" className={navLinkClass}>Our Team</Link>

            {user ? (
              <>
                {user.role === 'customer' && (
                  <Link to="/my-bookings" className={navLinkClass}>My Bookings</Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" className={`${navLinkClass} flex items-center gap-1`}>
                    <LayoutDashboard className="w-4 h-4" /> Admin
                  </Link>
                )}
                {user.role === 'staff' && (
                  <Link to="/staff" className={`${navLinkClass} flex items-center gap-1`}>
                    <LayoutDashboard className="w-4 h-4" /> Staff
                  </Link>
                )}
                <div className="ml-3 pl-3 border-l border-ink-100 flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-ink-700">{user.name?.split(' ')[0]}</span>
                  <button onClick={handleLogout} className="ml-1 p-1.5 text-ink-500 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all" title="Logout">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
                <Link to="/booking" className="ml-3 btn-primary text-sm !px-5 !py-2.5">Book Appointment</Link>
              </>
            ) : (
              <div className="ml-3 pl-3 border-l border-ink-100 flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
                <Link to="/booking" className="btn-primary text-sm !px-5 !py-2.5">Book Appointment</Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-ink-700 hover:text-primary-700 rounded-lg hover:bg-primary-50 transition-all"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-ink-100 bg-surface animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            <Link to="/" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-ink-700 hover:text-primary-700 rounded-lg hover:bg-primary-50">Home</Link>
            <Link to="/services" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-ink-700 hover:text-primary-700 rounded-lg hover:bg-primary-50">Services</Link>
            <Link to="/team" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-ink-700 hover:text-primary-700 rounded-lg hover:bg-primary-50">Our Team</Link>
            {user ? (
              <>
                <Link to="/booking" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-ink-700 hover:text-primary-700 rounded-lg hover:bg-primary-50">Book Now</Link>
                {user.role === 'customer' && (
                  <Link to="/my-bookings" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-ink-700 hover:text-primary-700 rounded-lg hover:bg-primary-50">My Bookings</Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-ink-700 hover:text-primary-700 rounded-lg hover:bg-primary-50">Admin Dashboard</Link>
                )}
                {user.role === 'staff' && (
                  <Link to="/staff" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-ink-700 hover:text-primary-700 rounded-lg hover:bg-primary-50">Staff Portal</Link>
                )}
                <div className="pt-2 mt-2 border-t border-ink-100">
                  <div className="flex items-center gap-2 px-4 py-2">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-ink-700">{user.name}</span>
                  </div>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-2 mt-2 border-t border-ink-100 space-y-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-ink-700 hover:text-primary-700 rounded-lg hover:bg-primary-50">Sign In</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="block mx-4 text-center btn-primary text-sm">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
