import { useEffect, useMemo, useState } from 'react';
import { getAdminStats, getAppointments } from '../../api';
import { CalendarDays, Users, Scissors, UserCog, ArrowUpRight, Loader2, AlertCircle } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null); const [appointments, setAppointments] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { Promise.all([getAdminStats(), getAppointments()]).then(([s, a]) => { setStats(s.data); setAppointments(a.data); }).catch(e => setError(e.response?.data?.message || 'Dashboard data could not be loaded.')).finally(() => setLoading(false)); }, []);
  const chartData = useMemo(() => { const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { key: d.toISOString().slice(0, 10), name: d.toLocaleDateString('en-US', { weekday: 'short' }), bookings: 0 }; }); appointments.forEach(a => { const row = days.find(d => d.key === new Date(a.date).toISOString().slice(0, 10)); if (row) row.bookings += 1; }); return days; }, [appointments]);
  const services = useMemo(() => Object.values(appointments.reduce((acc, a) => { const name = a.service?.name || 'Other'; acc[name] = acc[name] || { name, count: 0 }; acc[name].count += 1; return acc; }, {})).sort((a,b) => b.count-a.count).slice(0, 5), [appointments]);
  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary-700" /></div>;
  if (error) return <div className="p-5 lg:p-8"><EmptyState icon={AlertCircle} title="Couldn't load your dashboard" description={error} action={<button onClick={() => window.location.reload()} className="btn-secondary">Try again</button>} /></div>;
  const cards = [
    { label: "Today's bookings", value: stats?.todayCount || 0, icon: CalendarDays, tone: 'bg-primary-50 text-primary-700' },
    { label: 'Customers', value: stats?.totalCustomers || 0, icon: Users, tone: 'bg-accent-50 text-accent-600' },
    { label: 'Services', value: stats?.totalServices || 0, icon: Scissors, tone: 'bg-highlight-50 text-highlight-600' },
    { label: 'Team members', value: stats?.totalStaff || 0, icon: UserCog, tone: 'bg-primary-100 text-primary-600' },
  ];
  return <div className="mx-auto max-w-[1500px] p-5 lg:p-8">
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow">Operations overview</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">Good morning, here's the salon pulse.</h1>
        <p className="mt-2 text-sm text-ink-500">Bookings, customer activity, and team capacity in one place.</p>
      </div>
      <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(c => <div key={c.label} className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-soft">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-ink-500">{c.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink-900">{c.value}</p>
          </div>
          <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.tone}`}><c.icon className="h-5 w-5" /></span>
        </div>
        <p className="mt-4 flex items-center gap-1 text-xs text-ink-500"><ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />Live salon total</p>
      </div>)}
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-3">
      <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-soft xl:col-span-2">
        <div className="mb-5"><h2 className="font-semibold text-ink-900">Booking momentum</h2><p className="text-sm text-ink-500">Last seven days</p></div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs><linearGradient id="bookings" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4B2638" stopOpacity={.25}/><stop offset="100%" stopColor="#4B2638" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="var(--color-ink-100)"/>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-ink-500)', fontSize: 12 }}/>
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-ink-500)', fontSize: 12 }}/>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-ink-100)', background: 'var(--color-surface)' }}/>
              <Area type="monotone" dataKey="bookings" stroke="#4B2638" strokeWidth={3} fill="url(#bookings)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-soft">
        <h2 className="font-semibold text-ink-900">Popular services</h2>
        <p className="mb-4 text-sm text-ink-500">By appointment volume</p>
        <div className="h-56">{services.length ? <ResponsiveContainer width="100%" height="100%">
          <BarChart data={services} layout="vertical" margin={{ left: 8 }}>
            <XAxis type="number" hide/>
            <YAxis dataKey="name" type="category" width={95} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-ink-500)', fontSize: 11 }}/>
            <Tooltip cursor={{ fill: 'var(--color-primary-50)' }} contentStyle={{ borderRadius: 12, border: '1px solid var(--color-ink-100)', background: 'var(--color-surface)' }}/>
            <Bar dataKey="count" fill="#4B2638" radius={[0, 6, 6, 0]} barSize={18}/>
          </BarChart>
        </ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-ink-500">No booking data yet</div>}</div>
      </section>
    </div>
    <section className="mt-6 overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-soft">
      <div className="border-b border-ink-100 px-5 py-4"><h2 className="font-semibold text-ink-900">Recent appointments</h2><p className="text-sm text-ink-500">Latest customer activity</p></div>
      {appointments.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
        <thead className="bg-background text-left text-[11px] font-bold uppercase tracking-wider text-ink-500"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Service</th><th className="px-5 py-3">Staff</th><th className="px-5 py-3">When</th><th className="px-5 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-ink-100">{appointments.slice(0, 6).map(a => <tr key={a._id} className="hover:bg-primary-50/30">
          <td className="px-5 py-4 font-semibold text-ink-900">{((a.guestName || a.customer?.name) || '—')}</td>
          <td className="px-5 py-4 text-ink-500">{a.service?.name}</td>
          <td className="px-5 py-4 text-ink-500">{a.staff?.name}</td>
          <td className="px-5 py-4 text-ink-500">{new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {a.startTime}</td>
          <td className="px-5 py-4"><StatusBadge status={a.status}/></td>
        </tr>)}</tbody>
      </table></div> : <EmptyState title="No appointments yet" description="New bookings will appear here as customers schedule." />}
    </section>
  </div>;
};
export default AdminDashboard;
