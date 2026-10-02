import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getServices, getStaff, getAvailableSlots, createAppointment } from '../../api';
import { Check, ChevronRight, Clock, CalendarDays, User, Sparkles, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { CardSkeleton, Skeleton } from '../../components/ui/Skeleton';

const steps = ['Select Service', 'Choose Stylist', 'Pick Date & Time', 'Confirm Booking'];

const BookingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedStaffId = searchParams.get('staffId');
  const [step, setStep] = useState(0);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [booking, setBooking] = useState(null);

  const [selected, setSelected] = useState({
    service: null,
    staff: null,
    date: '',
    time: '',
    notes: '',
  });

  useEffect(() => {
    Promise.all([getServices(), getStaff()])
      .then(([sRes, stRes]) => {
        setServices(sRes.data);
        setStaff(stRes.data);
        const requestedStaff = stRes.data.find((member) => member._id === requestedStaffId);
        if (requestedStaff) {
          setSelected((current) => ({ ...current, staff: requestedStaff }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [requestedStaffId]);

  const requestedStaff = staff.find((member) => member._id === requestedStaffId);
  const availableServices = requestedStaff
    ? services.filter((service) => service.assignedStaff?.some((member) => (member._id || member) === requestedStaff._id))
    : services;

  // Filter staff based on selected service
  const filteredStaff = selected.service
    ? staff.filter(s => selected.service.assignedStaff?.some(as => (as._id || as) === s._id))
    : [];

  // Fetch slots when staff and date are selected
  useEffect(() => {
    if (selected.staff && selected.date && selected.service) {
      setSlotsLoading(true);
      getAvailableSlots({
        staffId: selected.staff._id,
        date: selected.date,
        serviceId: selected.service._id,
      })
        .then((res) => setSlots(res.data))
        .catch(console.error)
        .finally(() => setSlotsLoading(false));
    }
  }, [selected.staff, selected.date, selected.service]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await createAppointment({
        serviceId: selected.service._id,
        staffId: selected.staff._id,
        date: selected.date,
        startTime: selected.time,
        notes: selected.notes,
      });
      setBooking(res.data);
      setSuccess(true);
      toast.success('Appointment booked successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Get today's date in YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  if (loading) return <div className="min-h-screen bg-champagne-50 px-5 py-16"><div className="mx-auto max-w-4xl"><Skeleton className="mx-auto h-24 max-w-3xl rounded-3xl" /><div className="mt-10 grid gap-5 sm:grid-cols-2">{[1,2,3,4].map(i => <CardSkeleton key={i} />)}</div></div></div>;

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center px-4">
        <div className="card p-10 max-w-md w-full text-center animate-slide-up">
          <div className="w-16 h-16 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-500 mb-6">Your appointment has been booked successfully.</p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
            <p className="text-sm"><span className="text-gray-500">Service:</span> <span className="font-medium">{booking?.service?.name}</span></p>
            <p className="text-sm"><span className="text-gray-500">Stylist:</span> <span className="font-medium">{booking?.staff?.name}</span></p>
            <p className="text-sm"><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date(booking?.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
            <p className="text-sm"><span className="text-gray-500">Time:</span> <span className="font-medium">{booking?.startTime} - {booking?.endTime}</span></p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/my-bookings')} className="btn-primary flex-1">My Bookings</button>
            <button onClick={() => navigate('/')} className="btn-secondary flex-1">Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-champagne-50">
      <div className="bg-ink-900 py-14">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <p className="eyebrow !text-champagne-200">Your appointment</p><h1 className="mt-2 font-display text-4xl font-bold text-white">Make time for you.</h1>
          <p className="mt-2 text-white/60">A few simple steps and you’re all set.</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="max-w-4xl mx-auto px-5 -mt-6">
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            {steps.map((label, i) => (
              <div key={i} className="flex items-center">
                <div className={`flex items-center gap-2 ${i <= step ? 'text-primary-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    i < step ? 'bg-primary-600 text-white' : i === step ? 'bg-primary-100 text-primary-600 ring-2 ring-primary-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className="text-xs font-medium hidden md:block">{label}</span>
                </div>
                {i < steps.length - 1 && <div className="mx-2 h-px w-3 bg-ink-100 sm:mx-4 sm:w-8" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-10">
        {/* Step 1: Select Service */}
        {step === 0 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose a Service</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableServices.map((service) => (
                <button
                  key={service._id}
                  onClick={() => {
                    setSelected((current) => ({ ...current, service, staff: requestedStaff || null, time: '' }));
                    setStep(requestedStaff ? 2 : 1);
                  }}
                  className={`card p-5 text-left hover:-translate-y-0.5 transition-all duration-200 ${
                    selected.service?._id === service._id ? 'ring-2 ring-primary-600 border-primary-200' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2.5 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs font-medium">{service.category}</span>
                    <span className="text-lg font-bold text-primary-600">${service.price}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                  <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-3">
                    <Clock className="w-3.5 h-3.5" /> {service.durationMinutes} min
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Choose Staff */}
        {step === 1 && (
          <div className="animate-fade-in">
            <button onClick={() => setStep(0)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to services
            </button>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Your Stylist</h2>
            {filteredStaff.length === 0 ? (
              <p className="text-gray-500 text-center py-10">No staff available for this service.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredStaff.map((member) => (
                  <button
                    key={member._id}
                    onClick={() => { setSelected(s => ({ ...s, staff: member, time: '' })); setStep(2); }}
                    className={`card p-5 text-left hover:-translate-y-0.5 transition-all ${
                      selected.staff?._id === member._id ? 'ring-2 ring-primary-600' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-200 to-primary-400 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{member.name}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {member.specialties?.slice(0, 2).map((s, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {member.portfolioPreview?.length > 0 && <div className="flex gap-1 mt-3 ml-[72px]">{member.portfolioPreview.slice(0, 3).map((url, index) => <img key={index} src={url.replace('/upload/', '/upload/w_600,c_fill,f_auto,q_auto/')} alt="Portfolio preview" className="w-10 h-10 rounded-md object-cover" loading="lazy" />)}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Pick Date & Time */}
        {step === 2 && (
          <div className="animate-fade-in">
            <button onClick={() => setStep(requestedStaff ? 0 : 1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4">
              <ArrowLeft className="w-4 h-4" /> {requestedStaff ? 'Back to services' : 'Back to staff'}
            </button>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pick Date & Time</h2>
            <div className="card p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                <input
                  type="date"
                  min={today}
                  value={selected.date}
                  onChange={(e) => setSelected(s => ({ ...s, date: e.target.value, time: '' }))}
                  className="input-field max-w-xs"
                />
              </div>
              {selected.date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available Time Slots</label>
                  {slotsLoading ? (
                    <div className="grid grid-cols-3 gap-2 py-3 sm:grid-cols-5">{[1,2,3,4,5,6,7,8,9,10].map(i => <Skeleton key={i} className="h-11 rounded-xl" />)}</div>
                  ) : slots.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No available slots for this date. Try another day.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => { setSelected(s => ({ ...s, time: slot })); }}
                          className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                            selected.time === slot
                              ? 'bg-primary-600 text-white shadow-md'
                              : 'bg-gray-50 text-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-gray-200'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                  {selected.time && (
                    <button onClick={() => setStep(3)} className="btn-primary mt-6 flex items-center gap-2">
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 3 && (
          <div className="animate-fade-in">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirm Your Booking</h2>
            <div className="card p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Sparkles className="w-5 h-5 text-primary-500" />
                  <div><p className="text-xs text-gray-500">Service</p><p className="font-medium">{selected.service?.name}</p></div>
                  <span className="ml-auto font-bold text-primary-600">${selected.service?.price}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <User className="w-5 h-5 text-primary-500" />
                  <div><p className="text-xs text-gray-500">Stylist</p><p className="font-medium">{selected.staff?.name}</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <CalendarDays className="w-5 h-5 text-primary-500" />
                  <div><p className="text-xs text-gray-500">Date & Time</p><p className="font-medium">{new Date(selected.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {selected.time}</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Clock className="w-5 h-5 text-primary-500" />
                  <div><p className="text-xs text-gray-500">Duration</p><p className="font-medium">{selected.service?.durationMinutes} minutes</p></div>
                </div>
              </div>
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                <textarea className="input-field" rows="2" placeholder="Any special requests..." value={selected.notes} onChange={(e) => setSelected(s => ({ ...s, notes: e.target.value }))} />
              </div>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full mt-6 flex items-center justify-center gap-2">
                {!submitting && <Sparkles className="w-4 h-4" />}
                {submitting ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPage;
