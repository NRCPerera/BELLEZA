import { useEffect, useState, useCallback } from 'react';
import { getStaffAppointments, updateStaffAppointmentStatus } from '../../api';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import {
  Loader2,
  Filter,
  Eye,
  X as XIcon,
  CalendarDays,
  User,
  Clock,
  Tag,
  FileText,
  ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ALLOWED_ACTIONS = {
  pending: [{ status: 'confirmed', label: 'Confirm', color: 'bg-green-600 hover:bg-green-700 text-white' }],
  confirmed: [
    { status: 'completed', label: 'Complete', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { status: 'no-show', label: 'No-show', color: 'bg-orange-500 hover:bg-orange-600 text-white' },
  ],
};

const StaffAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '', startDate: '', endDate: '' });
  const [selectedApt, setSelectedApt] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const res = await getStaffAppointments(params);
      setAppointments(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleStatusChange = async (id, status) => {
    setUpdatingStatus(true);
    try {
      const res = await updateStaffAppointmentStatus(id, status);
      toast.success(`Status updated to ${status === 'no-show' ? 'no-show' : status}`);
      fetchAppointments();
      if (selectedApt?._id === id) setSelectedApt(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const clearFilters = () => setFilters({ status: '', startDate: '', endDate: '' });
  const hasFilters = filters.status || filters.startDate || filters.endDate;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
        <p className="text-gray-500 text-sm mt-1">View and manage your appointments</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="input-field !w-auto text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No-show</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
              className="input-field !w-auto text-sm"
              placeholder="From"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
              className="input-field !w-auto text-sm"
              placeholder="To"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <XIcon className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-6 mb-6 text-center text-red-500">{error}</div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {appointments.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No appointments found</p>
            {hasFilters && (
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.map((apt) => (
                    <tr key={apt._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-900">
                        {new Date(apt.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {apt.startTime} - {apt.endTime}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">{((apt.guestName || apt.customer?.name) || '—')}</td>
                      <td className="px-5 py-3 text-gray-600">{apt.service?.name}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={apt.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedApt(apt);
                              setModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {ALLOWED_ACTIONS[apt.status] && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) handleStatusChange(apt._id, e.target.value);
                                e.target.value = '';
                              }}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white"
                              defaultValue=""
                            >
                              <option value="" disabled>
                                Change...
                              </option>
                              {ALLOWED_ACTIONS[apt.status].map((action) => (
                                <option key={action.status} value={action.status}>
                                  {action.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {appointments.map((apt) => (
                <div key={apt._id} className="p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{((apt.guestName || apt.customer?.name) || '—')}</p>
                      <p className="text-sm text-gray-500">{apt.service?.name}</p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(apt.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {apt.startTime} - {apt.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedApt(apt);
                        setModalOpen(true);
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View details
                    </button>
                    {ALLOWED_ACTIONS[apt.status]?.map((action) => (
                      <button
                        key={action.status}
                        onClick={() => handleStatusChange(apt._id, action.status)}
                        disabled={updatingStatus}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${action.color}`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Appointment Details">
        {selectedApt && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{((selectedApt.guestName || selectedApt.customer?.name) || '—')}</p>
                <p className="text-sm text-gray-500">{(selectedApt.guestEmail || selectedApt.customer?.email)}</p>
                {(selectedApt.guestPhone || selectedApt.customer?.phone) && (
                  <p className="text-sm text-gray-500">{(selectedApt.guestPhone || selectedApt.customer?.phone)}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Service</p>
                  <p className="font-medium text-sm">{selectedApt.service?.name}</p>
                  <p className="text-xs text-gray-400">
                    {selectedApt.service?.durationMinutes}min · Rs {selectedApt.service?.price}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CalendarDays className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-medium text-sm">
                    {new Date(selectedApt.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="font-medium text-sm">
                    {selectedApt.startTime} - {selectedApt.endTime}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <StatusBadge status={selectedApt.status} />
              </div>
            </div>

            {selectedApt.notes && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                <FileText className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-700">Notes</p>
                  <p className="text-sm text-amber-800">{selectedApt.notes}</p>
                </div>
              </div>
            )}

            {ALLOWED_ACTIONS[selectedApt.status] && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-3">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {ALLOWED_ACTIONS[selectedApt.status].map((action) => (
                    <button
                      key={action.status}
                      onClick={() => handleStatusChange(selectedApt._id, action.status)}
                      disabled={updatingStatus}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${action.color}`}
                    >
                      {updatingStatus ? (
                        <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" />
                      ) : null}
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StaffAppointments;
