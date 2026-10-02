import { useEffect, useState } from 'react';
import { getAppointments, updateAppointmentStatus, cancelAppointment, getAllStaff } from '../../api';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { Loader2, Filter, Eye, Search, X as XIcon, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', staffId: '', date: '' });
  const [selectedApt, setSelectedApt] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchAppointments(), getAllStaff().then(res => setStaffList(res.data))]).finally(() => setLoading(false));
  }, []);

  const fetchAppointments = async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.staffId) params.staffId = filters.staffId;
      if (filters.date) params.date = filters.date;
      const res = await getAppointments(params);
      setAppointments(res.data); setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load appointments.');
    }
  };

  useEffect(() => { fetchAppointments(); }, [filters]);
  useEffect(() => setPage(1), [query, filters]);
  const filteredAppointments = appointments.filter(a => `${a.customer?.name} ${a.service?.name} ${a.staff?.name}`.toLowerCase().includes(query.toLowerCase()));
  const pageSize = 8; const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / pageSize)); const displayedAppointments = filteredAppointments.slice((page - 1) * pageSize, page * pageSize);

  const handleStatusChange = async (id, status) => {
    setUpdatingStatus(true);
    try {
      await updateAppointmentStatus(id, status);
      toast.success(`Status updated to ${status}`);
      fetchAppointments();
      if (selectedApt?._id === id) setSelectedApt(prev => ({ ...prev, status }));
    } catch (err) {
      toast.error('Failed to update');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await cancelAppointment(id);
      toast.success('Appointment cancelled');
      fetchAppointments();
    } catch (err) {
      toast.error('Failed to cancel');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-primary-700 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-[1500px] p-5 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Appointments</h1>
          <p className="text-ink-500 text-sm mt-1">Manage all salon appointments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" /><input value={query} onChange={e => setQuery(e.target.value)} className="input-field !py-2.5 pl-9 text-sm" placeholder="Search customer, service, staff..." /></div>
          <Filter className="w-4 h-4 text-ink-500" />
          <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))} className="input-field !w-auto text-sm">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={filters.staffId} onChange={(e) => setFilters(f => ({ ...f, staffId: e.target.value }))} className="input-field !w-auto text-sm">
            <option value="">All Staff</option>
            {staffList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <input type="date" value={filters.date} onChange={(e) => setFilters(f => ({ ...f, date: e.target.value }))} className="input-field !w-auto text-sm" />
          {(filters.status || filters.staffId || filters.date) && (
            <button onClick={() => setFilters({ status: '', staffId: '', date: '' })} className="text-xs text-ink-500 hover:text-red-500 flex items-center gap-1">
              <XIcon className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {error ? <EmptyState icon={AlertCircle} title="Appointments unavailable" description={error} action={<button onClick={fetchAppointments} className="btn-secondary">Retry</button>} /> : displayedAppointments.length === 0 ? (
          <EmptyState title="No appointments found" description={query || filters.status || filters.staffId || filters.date ? 'Try widening your filters.' : 'New bookings will show up here.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-background">
                  <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Time</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Service</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Staff</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {displayedAppointments.map((apt) => (
                  <tr key={apt._id} className="hover:bg-primary-50 transition-colors">
                    <td className="px-5 py-3 text-ink-900">{new Date(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td className="px-5 py-3 text-ink-500">{apt.startTime} - {apt.endTime}</td>
                    <td className="px-5 py-3 font-medium text-ink-900">{apt.customer?.name}</td>
                    <td className="px-5 py-3 text-ink-500">{apt.service?.name}</td>
                    <td className="px-5 py-3 text-ink-500">{apt.staff?.name}</td>
                    <td className="px-5 py-3"><StatusBadge status={apt.status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setSelectedApt(apt); setModalOpen(true); }} className="p-1.5 text-ink-500 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-all" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        {['pending', 'confirmed'].includes(apt.status) && (
                          <select onChange={(e) => { if (e.target.value) handleStatusChange(apt._id, e.target.value); e.target.value = ''; }}
                            className="text-xs border border-ink-100 rounded-lg px-2 py-1 text-ink-700 bg-surface" defaultValue="">
                            <option value="" disabled>Change...</option>
                            <option value="confirmed">Confirm</option>
                            <option value="completed">Complete</option>
                            <option value="cancelled">Cancel</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredAppointments.length > pageSize && <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3 text-sm text-ink-500"><span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredAppointments.length)} of {filteredAppointments.length}</span><div className="flex gap-2"><button aria-label="Previous page" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-ink-100 p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button aria-label="Next page" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-ink-100 p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Appointment Details">
        {selectedApt && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-ink-500">Customer</p><p className="font-medium text-ink-900">{selectedApt.customer?.name}</p></div>
              <div><p className="text-xs text-ink-500">Email</p><p className="text-sm text-ink-700">{selectedApt.customer?.email}</p></div>
              <div><p className="text-xs text-ink-500">Service</p><p className="font-medium text-ink-900">{selectedApt.service?.name}</p></div>
              <div><p className="text-xs text-ink-500">Price</p><p className="font-medium text-ink-900">${selectedApt.service?.price}</p></div>
              <div><p className="text-xs text-ink-500">Staff</p><p className="font-medium text-ink-900">{selectedApt.staff?.name}</p></div>
              <div><p className="text-xs text-ink-500">Status</p><StatusBadge status={selectedApt.status} /></div>
              <div><p className="text-xs text-ink-500">Date</p><p className="font-medium text-ink-900">{new Date(selectedApt.date).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-ink-500">Time</p><p className="font-medium text-ink-900">{selectedApt.startTime} - {selectedApt.endTime}</p></div>
            </div>
            {selectedApt.notes && <div><p className="text-xs text-ink-500">Notes</p><p className="text-sm text-ink-700">{selectedApt.notes}</p></div>}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminAppointments;
