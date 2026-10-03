import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Calendar, ClipboardList, Users, Scissors, UserCog, LogOut, ChevronLeft, Menu, X, Bell } from 'lucide-react';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/admin/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/admin/appointments', icon: ClipboardList, label: 'Appointments' },
  { to: '/admin/staff', icon: UserCog, label: 'Team' },
  { to: '/admin/services', icon: Scissors, label: 'Services' },
  { to: '/admin/customers', icon: Users, label: 'Customers' },
];

const AdminLayout = () => {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const close = () => setOpen(false);
  const sidebar = <aside className="h-full w-72 bg-primary-900 p-4 text-white flex flex-col shadow-2xl">
    <div className="flex items-center justify-between px-3 py-3 mb-5">
      <NavLink to="/admin" onClick={close} className="flex items-center gap-3">
        <img src="/logo.jpg" alt="Belleza" className="h-11 w-auto rounded-xl bg-white px-2.5 py-1" />
      </NavLink>
      <button onClick={close} className="lg:hidden rounded-xl p-2 text-primary-300 hover:bg-white/10"><X className="h-5 w-5" /></button>
    </div>
    <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-primary-400">Workspace</p>
    <nav className="flex-1 space-y-1 overflow-y-auto">
      {navItems.map(({ to, icon: Icon, label, end }) => <NavLink key={to} to={to} end={end} onClick={close} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${isActive ? 'bg-accent-400 text-primary-900 shadow-lg shadow-primary-900/20' : 'text-primary-300 hover:bg-white/10 hover:text-white'}`}><Icon className="h-4 w-4" />{label}</NavLink>)}
    </nav>
    <div className="mt-5 border-t border-white/10 pt-4">
      <NavLink to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-primary-300 hover:bg-white/10 hover:text-white"><ChevronLeft className="h-4 w-4" />View website</NavLink>
      <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-400 text-sm font-bold text-primary-900">{user?.name?.charAt(0)}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user?.name}</p>
          <p className="truncate text-xs text-primary-400">Administrator</p>
        </div>
        <button onClick={handleLogout} className="rounded-lg p-2 text-primary-300 hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" /></button>
      </div>
    </div>
  </aside>;

  return <div className="flex h-dvh overflow-hidden bg-background">
    <div className="hidden lg:block">{sidebar}</div>
    {open && <div className="fixed inset-0 z-40 lg:hidden">
      <button aria-label="Close menu" onClick={close} className="absolute inset-0 bg-primary-900/50 backdrop-blur-sm" />
      <div className="relative h-full w-72">{sidebar}</div>
    </div>}
    <section className="min-w-0 flex-1 overflow-y-auto">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 bg-background/90 px-4 backdrop-blur lg:h-20 lg:px-8">
        <button onClick={() => setOpen(true)} className="rounded-xl p-2 text-ink-700 hover:bg-surface lg:hidden"><Menu className="h-5 w-5" /></button>
        <div className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-highlight-500">Salon control center</p>
          <p className="text-sm text-ink-500">Keep every appointment moving beautifully.</p>
        </div>
        <button className="ml-auto grid h-10 w-10 place-items-center rounded-xl border border-ink-100 bg-surface text-ink-500 hover:text-primary-700"><Bell className="h-4 w-4" /></button>
      </header>
      <main><Outlet /></main>
    </section>
  </div>;
};

export default AdminLayout;
