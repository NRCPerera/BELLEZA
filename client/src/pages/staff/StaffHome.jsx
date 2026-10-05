import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStaffOverview, updateStaffAppointmentStatus } from '../../api';
import { CalendarDays, CheckCircle2, XCircle, TrendingUp, Clock, Loader2, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/ui/StatusBadge';

const StaffOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState('');

  const load = () => getStaffOverview().then((res) => { setData(res.data); setError(''); }).catch((err) => setError(err.response?.data?.message || 'Failed to load overview')).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);
  const quickUpdate = async (id, status) => { setUpdating(id); try { await updateStaffAppointmentStatus(id, status); toast.success(status === 'confirmed' ? 'Appointment confirmed' : 'Appointment completed'); load(); } catch (e) { toast.error(e.response?.data?.message || 'Could not update appointment'); } finally { setUpdating(''); } };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="card p-8 text-center">
          <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Today's Appointments",
      value: data?.todayCount || 0,
      icon: CalendarDays,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Upcoming',
      value: data?.upcomingCount || 0,
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Completed',
      value: data?.stats?.totalCompleted || 0,
      icon: CheckCircle2,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Total Appointments',
      value: data?.stats?.totalAll || 0,
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div><p className="eyebrow">Today’s studio</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">Your schedule, simplified.</h1><p className="text-gray-500 text-sm mt-1">Focus on the next guest, then keep the day flowing.</p></div>
        <Link to="/staff/schedule" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">Full schedule <ArrowRight className="h-4 w-4" /></Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="card p-5 animate-fade-in"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${card.color}`}
              >
                <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Schedule */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div><h2 className="font-semibold text-gray-900">Today’s schedule</h2><p className="text-xs text-gray-500">{data?.todayAppointments?.length || 0} appointments planned</p></div><Link to="/staff/schedule" className="sm:hidden text-sm font-semibold text-primary-600">View all</Link>
        </div>
        {(!data?.todayAppointments || data.todayAppointments.length === 0) ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No appointments for today</p>
            <p className="text-gray-400 text-sm mt-1">Enjoy your free time!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.todayAppointments.map((apt) => (
              <div
                key={apt._id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-gray-50/50 transition-colors"
              >
                {/* Time */}
                <div className="flex items-center gap-3 sm:w-32 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-900">
                    {apt.startTime} - {apt.endTime}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {((apt.guestName || apt.customer?.name) || '—')}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {apt.service?.name} · {apt.service?.durationMinutes}min ·{' '}
                    <span className="text-primary-600 font-medium">
                      Rs {apt.service?.price}
                    </span>
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 flex-shrink-0"><StatusBadge status={apt.status} />{apt.status === 'pending' && <button onClick={() => quickUpdate(apt._id, 'confirmed')} disabled={updating === apt._id} className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{updating === apt._id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}</button>}{apt.status === 'confirmed' && <button onClick={() => quickUpdate(apt._id, 'completed')} disabled={updating === apt._id} className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{updating === apt._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3" />Complete</>}</button>}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffOverview;
