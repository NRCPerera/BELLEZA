import { useEffect, useMemo, useState } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getAppointments, updateAppointmentStatus, getSlotBlocks } from '../../api';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const localizer = momentLocalizer(moment);

const AdminCalendar = () => {
  const [appointments, setAppointments] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApt, setSelectedApt] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [view, setView] = useState('week');

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = () => {
    Promise.all([
      getAppointments().then((res) => setAppointments(res.data)),
      getSlotBlocks().then((res) => setBlocks(res.data)),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const events = useMemo(() => {
  const blockEvents = blocks.map((b) => {
    const dateStr = new Date(b.date).toISOString().split('T')[0];
    return {
      id: `block-${b._id}`,
      title: `Paused: ${b.staff ? b.staff.name : 'Whole salon'}`,
      start: new Date(dateStr + 'T' + b.startTime + ':00'),
      end: new Date(dateStr + 'T' + b.endTime + ':00'),
      resource: { isBlock: true, block: b },
    };
  });

  return [
    ...appointments.map((apt) => {
      const dateStr = new Date(apt.date).toISOString().split('T')[0];
      return {
        id: apt._id,
        title: `${((apt.guestName || apt.customer?.name) || '—')} - ${apt.service?.name}`,
        start: new Date(dateStr + 'T' + apt.startTime + ':00'),
        end: new Date(dateStr + 'T' + apt.endTime + ':00'),
        resource: apt,
      };
    }),
    ...blockEvents,
  ];
  }, [appointments, blocks]);

  const handleSelectEvent = (event) => {
    if (event.resource?.isBlock) {
      toast(`Online booking paused: ${event.resource.block.startTime}–${event.resource.block.endTime}. Manage in Appointments.`);
      return;
    }
    setSelectedApt(event.resource);
    setModalOpen(true);
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedApt) return;
    setUpdatingStatus(true);
    try {
      await updateAppointmentStatus(selectedApt._id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      fetchAppointments();
      setSelectedApt({ ...selectedApt, status: newStatus });
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-primary-700 animate-spin" /></div>;
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Appointment Calendar</h1>
        <p className="text-ink-500 text-sm mt-1">View and manage all appointments</p>
      </div>

      <div className="card p-4" style={{ height: 'calc(100vh - 180px)' }}>
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          views={['month', 'week', 'day']}
          onSelectEvent={handleSelectEvent}
          min={new Date(2020, 0, 1, 8, 0)}
          max={new Date(2020, 0, 1, 20, 0)}
          step={30}
          timeslots={1}
          eventPropGetter={(event) => ({
            style: event.resource?.isBlock
              ? {
                backgroundColor: '#d6d3d1',
                color: '#57534e',
                borderRadius: '6px',
                border: '1px dashed #a8a29e',
                fontSize: '12px',
              }
              : {
                backgroundColor: 'var(--color-primary-700)',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
              },
          })}
        />
      </div>

      {/* Appointment Detail Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Appointment Details">
        {selectedApt && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-ink-500">Customer</p><p className="font-medium text-ink-900">{((selectedApt.guestName || selectedApt.customer?.name) || '—')}</p></div>
              <div><p className="text-xs text-ink-500">Email</p><p className="font-medium text-sm text-ink-700">{(selectedApt.guestEmail || selectedApt.customer?.email)}</p></div>
              <div><p className="text-xs text-ink-500">Service</p><p className="font-medium text-ink-900">{selectedApt.service?.name}</p></div>
              <div><p className="text-xs text-ink-500">Staff</p><p className="font-medium text-ink-900">{selectedApt.staff?.name}</p></div>
              <div><p className="text-xs text-ink-500">Date</p><p className="font-medium text-ink-900">{new Date(selectedApt.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div>
              <div><p className="text-xs text-ink-500">Time</p><p className="font-medium text-ink-900">{selectedApt.startTime} - {selectedApt.endTime}</p></div>
            </div>
            <div><p className="text-xs text-ink-500 mb-1">Status</p><StatusBadge status={selectedApt.status} /></div>
            {selectedApt.notes && <div><p className="text-xs text-ink-500">Notes</p><p className="text-sm text-ink-700">{selectedApt.notes}</p></div>}
            <div className="pt-4 border-t border-ink-100">
              <p className="text-xs font-medium text-ink-500 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {['pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
                  <button key={s} onClick={() => handleStatusChange(s)} disabled={updatingStatus || selectedApt.status === s}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      selectedApt.status === s ? 'bg-ink-100 text-ink-500 cursor-default' : 'hover:bg-primary-50 text-ink-700 border-ink-100'
                    }`}>
                    {updatingStatus ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminCalendar;
