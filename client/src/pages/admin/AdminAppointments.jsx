import { useEffect, useState } from 'react';
import { getAppointments, updateAppointmentStatus, cancelAppointment, getAllStaff, getSlotBlocks, createSlotBlock, deleteSlotBlock } from '../../api';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { Loader2, Filter, Eye, Search, X as XIcon, ChevronLeft, ChevronRight, AlertCircle, PauseCircle, PlayCircle } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

const todayStr = () => new Date().toISOString().split('T')[0];

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
  const [blocks, setBlocks] = useState([]);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockForm, setBlockForm] = useState({ staffId: '', date: todayStr(), startTime: '', endTime: '', reason: '' });

  useEffect(() => {
    Promise.all([fetchAppointments(), getAllStaff().then(res => setStaffList(res.data))]).finally(() => setLoading(false));
  }, []);

  const fetchBlocks = async (date) => {
    try {
      const res = await getSlotBlocks(date ? { date } : {});
      setBlocks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchBlocks(filters.date || todayStr()); }, [filters.date]);

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
  const filteredAppointments = appointments.filter(a => `${((a.guestName || a.customer?.name) || '—')} ${a.service?.name} ${a.staff?.name}`.toLowerCase().includes(query.toLowerCase()));
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

  const handleCreateBlock = async () => {
    if (!blockForm.date || !blockForm.startTime || !blockForm.endTime) {
      toast.error('Date, start and end time are required');
      return;
    }
    setBlockSaving(true);
    try {
      await createSlotBlock({
        staffId: blockForm.staffId || undefined,
        date: blockForm.date,
        startTime: blockForm.startTime,
        endTime: blockForm.endTime,
        reason: blockForm.reason || undefined,
      });
      toast.success('Online booking paused for this time');
      setBlockModalOpen(false);
      setBlockForm({ staffId: '', date: blockForm.date, startTime: '', endTime: '', reason: '' });
      fetchBlocks(filters.date || todayStr());
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to pause booking');
    } finally {
      setBlockSaving(false);
    }
  };

  const handleDeleteBlock = async (id) => {
    if (!window.confirm('Resume online booking for this time?')) return;
    try {
      await deleteSlotBlock(id);
      toast.success('Online booking resumed');
      fetchBlocks(filters.date || todayStr());
    } catch (err) {
      toast.error('Failed to resume');
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
        <button onClick={() => { setBlockForm((f) => ({ ...f, date: filters.date || todayStr() })); setBlockModalOpen(true); }} className="btn-secondary text-sm flex items-center gap-2">
          <PauseCircle className="w-4 h-4" /> Pause online booking
        </button>
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

      {/* Pause-blocks (walk-in rush) */}
      {blocks.length > 0 && (
        <div className="card p-4 mb-6 border-amber-200 bg-amber-50/50">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3">Online booking paused ({blocks.length})</p>
          <div className="space-y-2">
            {blocks.map((b) => (
              <div key={b._id} className="flex flex-wrap items-center gap-2 text-sm bg-white rounded-xl px-3 py-2 border border-amber-100">
                <span className="font-semibold text-ink-900">{b.staff ? b.staff.name : 'Whole salon'}</span>
                <span className="text-ink-500">{new Date(b.date).toLocaleDateString()} {b.startTime}–{b.endTime}</span>
                {b.reason && <span className="text-xs text-ink-500 truncate max-w-[220px]">· {b.reason}</span>}
                <button onClick={() => handleDeleteBlock(b._id)} className="ml-auto text-xs font-bold text-green-700 hover:text-green-600 flex items-center gap-1">
                  <PlayCircle className="w-3.5 h-3.5" /> Resume
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    <td className="px-5 py-3 font-medium text-ink-900">{((apt.guestName || apt.customer?.name) || '—')}</td>
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
              <div><p className="text-xs text-ink-500">Customer</p><p className="font-medium text-ink-900">{((selectedApt.guestName || selectedApt.customer?.name) || '—')}</p></div>
              <div><p className="text-xs text-ink-500">Mobile</p><p className="text-sm text-ink-700">{(selectedApt.guestPhone || selectedApt.customer?.phone) || '—'}</p></div>
              <div><p className="text-xs text-ink-500">Booking Ref</p><p className="font-medium text-ink-900">{selectedApt.bookingRef || '—'}</p></div>
              <div><p className="text-xs text-ink-500">Email</p><p className="text-sm text-ink-700">{(selectedApt.guestEmail || selectedApt.customer?.email) || '—'}</p></div>
              <div><p className="text-xs text-ink-500">Service</p><p className="font-medium text-ink-900">{selectedApt.service?.name}</p></div>
              <div><p className="text-xs text-ink-500">Price</p><p className="font-medium text-ink-900">Rs {selectedApt.service?.price}</p></div>
              <div><p className="text-xs text-ink-500">Staff</p><p className="font-medium text-ink-900">{selectedApt.staff?.name}</p></div>
              <div><p className="text-xs text-ink-500">Status</p><StatusBadge status={selectedApt.status} /></div>
              <div><p className="text-xs text-ink-500">Date</p><p className="font-medium text-ink-900">{new Date(selectedApt.date).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-ink-500">Time</p><p className="font-medium text-ink-900">{selectedApt.startTime} - {selectedApt.endTime}</p></div>
            </div>
            {selectedApt.notes && <div><p className="text-xs text-ink-500">Notes</p><p className="text-sm text-ink-700">{selectedApt.notes}</p></div>}
          </div>
        )}
      </Modal>

      {/* Pause online booking Modal */}
      <Modal isOpen={blockModalOpen} onClose={() => setBlockModalOpen(false)} title="Pause online booking">
        <div className="space-y-4">
          <p className="text-sm text-ink-500">Use when busy with walk-in customers. Online slots in this range disappear; existing bookings stay.</p>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Staff (empty = whole salon)</label>
            <select value={blockForm.staffId} onChange={(e) => setBlockForm((f) => ({ ...f, staffId: e.target.value }))} className="input-field text-sm">
              <option value="">Whole salon</option>
              {staffList.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Date *</label>
            <input type="date" value={blockForm.date} min={todayStr()} onChange={(e) => setBlockForm((f) => ({ ...f, date: e.target.value }))} className="input-field text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">From *</label>
              <input type="time" value={blockForm.startTime} onChange={(e) => setBlockForm((f) => ({ ...f, startTime: e.target.value }))} className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">To *</label>
              <input type="time" value={blockForm.endTime} onChange={(e) => setBlockForm((f) => ({ ...f, endTime: e.target.value }))} className="input-field text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Reason</label>
            <input value={blockForm.reason} onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Busy with walk-in customers" className="input-field text-sm" />
          </div>
          <button onClick={handleCreateBlock} disabled={blockSaving} className="btn-primary w-full">
            {blockSaving ? 'Pausing...' : 'Pause online booking'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminAppointments;
