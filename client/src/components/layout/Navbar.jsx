import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
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

  const navLinkClass = ({ isActive }) =>
    `px-4 py-2 text-sm rounded-lg transition-all ${isActive ? 'text-white bg-primary-700 font-semibold shadow-sm' : 'font-medium text-ink-700 hover:text-primary-700 hover:bg-primary-50'}`;

  const mobileLinkClass = ({ isActive }) =>
    `block px-4 py-2.5 text-sm rounded-lg ${isActive ? 'text-white bg-primary-700 font-semibold shadow-sm' : 'font-medium text-ink-700 hover:text-primary-700 hover:bg-primary-50'}`;

  return (
    <nav className={`sticky top-0 z-50 border-b border-primary-200 transition-all duration-300 ${scrolled ? 'bg-primary-200 shadow-soft' : 'bg-primary-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px] sm:h-20 gap-4">
          {/* Logo */}
          <Link to="/" aria-label="Belleza home" className="relative block shrink-0 overflow-hidden rounded-lg bg-white w-20 h-14 sm:w-24 sm:h-16">
            {/* Frame the artwork without the source image's large white margins. */}
            <img src="/logo.jpg" alt="Belleza" className="absolute max-w-none w-[120px] sm:w-[140px] h-auto -left-[20px] sm:-left-[22px] -top-[38px] sm:-top-[44px]" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>Home</NavLink>
            <NavLink to="/services" className={navLinkClass}>Services</NavLink>
            <NavLink to="/team" className={navLinkClass}>Our Team</NavLink>

            {user && (user.role === 'admin' || user.role === 'staff') ? (
              <>
                {user.role === 'admin' && (
                  <NavLink to="/admin" className={({ isActive }) => `${navLinkClass({ isActive })} flex items-center gap-1`}>
                    <LayoutDashboard className="w-4 h-4" /> Admin
                  </NavLink>
                )}
                {user.role === 'staff' && (
                  <NavLink to="/staff" className={({ isActive }) => `${navLinkClass({ isActive })} flex items-center gap-1`}>
                    <LayoutDashboard className="w-4 h-4" /> Staff
                  </NavLink>
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
              </>
            ) : (
              <div className="ml-3 pl-3 border-l border-ink-100 flex items-center gap-2">
                <Link to="/booking" className="btn-primary text-sm !px-5 !py-2.5">Book Appointment</Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-ink-700 hover:text-primary-700 rounded-lg hover:bg-primary-50 transition-all"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-primary-200 bg-primary-100 animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            <NavLink to="/" end onClick={() => setMobileOpen(false)} className={mobileLinkClass}>Home</NavLink>
            <NavLink to="/services" onClick={() => setMobileOpen(false)} className={mobileLinkClass}>Services</NavLink>
            <NavLink to="/team" onClick={() => setMobileOpen(false)} className={mobileLinkClass}>Our Team</NavLink>
            <NavLink to="/booking" onClick={() => setMobileOpen(false)} className={mobileLinkClass}>Book Now</NavLink>
            {user && (user.role === 'admin' || user.role === 'staff') ? (
              <>
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
            ) : null}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
