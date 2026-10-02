import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  UserCircle,
  KeyRound,
  ImageIcon,
  LogOut,
  Scissors,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { to: '/staff', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/staff/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/staff/appointments', icon: ClipboardList, label: 'Appointments' },
  { to: '/staff/portfolio', icon: ImageIcon, label: 'Portfolio' },
  { to: '/staff/profile', icon: UserCircle, label: 'Profile' },
  { to: '/staff/password', icon: KeyRound, label: 'Password' },
];

const StaffLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-primary-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary-900 text-white flex flex-col flex-shrink-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-primary-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent-400 rounded-lg flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary-900" />
            </div>
            <span className="font-display text-lg font-bold">
              Belleza <span className="text-accent-400">Staff</span>
            </span>
          </div>
          <button
            onClick={closeSidebar}
            className="p-1.5 text-primary-300 hover:text-white rounded-lg hover:bg-white/10 transition-all lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) =>
            item.disabled ? (
              <span
                key={item.label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary-400 cursor-not-allowed"
                title="Coming soon"
              >
                <item.icon className="w-4.5 h-4.5" />
                {item.label}
                <span className="ml-auto text-[10px] bg-primary-800 text-primary-500 px-1.5 py-0.5 rounded-full">
                  Soon
                </span>
              </span>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-accent-400 text-primary-900'
                      : 'text-primary-300 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <item.icon className="w-4.5 h-4.5" />
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="p-3 border-t border-primary-800">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 bg-accent-400 rounded-full flex items-center justify-center text-sm font-bold text-primary-900">
              {user?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-primary-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-primary-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-surface border-b border-ink-100 px-4 h-14 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-ink-700 hover:text-ink-900 hover:bg-primary-50 rounded-lg transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent-400 rounded-lg flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5 text-primary-900" />
            </div>
            <span className="font-display text-base font-bold text-ink-900">
              Belleza <span className="text-primary-700">Staff</span>
            </span>
          </div>
          <div className="w-9" /> {/* Spacer for centering */}
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;
