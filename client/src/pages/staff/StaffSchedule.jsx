import { useEffect, useState } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getStaffAppointments, updateStaffAppointmentStatus } from '../../api';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { Loader2, XCircle, User, Clock, Tag, FileText, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';

const localizer = momentLocalizer(moment);

const STATUS_COLORS = {
  pending: '#eab308',
  confirmed: '#22c55e',
  completed: '#6b7280',
  cancelled: '#ef4444',
  'no-show': '#f97316',
};

const ALLOWED_ACTIONS = {
  pending: [{ status: 'confirmed', label: 'Confirm', color: 'bg-green-600 hover:bg-green-700 text-white' }],
  confirmed: [
    { status: 'completed', label: 'Complete', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { status: 'no-show', label: 'No-show', color: 'bg-orange-500 hover:bg-orange-600 text-white' },
  ],
};

const StaffSchedule = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApt, setSelectedApt] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = () => {
    getStaffAppointments()
      .then((res) => setAppointments(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load appointments'))
      .finally(() => setLoading(false));
  };

  const events = appointments.map((apt) => {
    const dateStr = new Date(apt.date).toISOString().split('T')[0];
    return {
      id: apt._id,
      title: `${apt.customer?.name} - ${apt.service?.name}`,
      start: new Date(dateStr + 'T' + apt.startTime + ':00'),
      end: new Date(dateStr + 'T' + apt.endTime + ':00'),
      resource: apt,
    };
  });

  const handleSelectEvent = (event) => {
    setSelectedApt(event.resource);
    setModalOpen(true);
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedApt) return;
    setUpdatingStatus(true);
    try {
      const res = await updateStaffAppointmentStatus(selectedApt._id, newStatus);
      toast.success(`Status updated to ${newStatus === 'no-show' ? 'no-show' : newStatus}`);
      setSelectedApt(res.data);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

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

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
        <p className="text-gray-500 text-sm mt-1">View your appointments calendar</p>
      </div>

      <div className="card p-4" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          views={['week', 'day']}
          onSelectEvent={handleSelectEvent}
          min={new Date(2020, 0, 1, 7, 0)}
          max={new Date(2020, 0, 1, 21, 0)}
          step={30}
          timeslots={1}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: STATUS_COLORS[event.resource?.status] || '#e11d48',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              opacity: event.resource?.status === 'cancelled' ? 0.5 : 1,
            },
          })}
        />
      </div>

      {/* Appointment Detail Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Appointment Details">
        {selectedApt && (
          <div className="space-y-5">
            {/* Customer info */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{selectedApt.customer?.name}</p>
                <p className="text-sm text-gray-500">{selectedApt.customer?.email}</p>
                {selectedApt.customer?.phone && (
                  <p className="text-sm text-gray-500">{selectedApt.customer?.phone}</p>
                )}
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Service</p>
                  <p className="font-medium text-sm">{selectedApt.service?.name}</p>
                  <p className="text-xs text-gray-400">
                    {selectedApt.service?.durationMinutes}min · ${selectedApt.service?.price}
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

            {/* Notes */}
            {selectedApt.notes && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                <FileText className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-700">Notes</p>
                  <p className="text-sm text-amber-800">{selectedApt.notes}</p>
                </div>
              </div>
            )}

            {/* Status Actions */}
            {ALLOWED_ACTIONS[selectedApt.status] && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-3">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {ALLOWED_ACTIONS[selectedApt.status].map((action) => (
                    <button
                      key={action.status}
                      onClick={() => handleStatusChange(action.status)}
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

export default StaffSchedule;
