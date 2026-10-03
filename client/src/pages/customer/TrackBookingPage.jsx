import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Clock, User, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { getBookingByRef } from '../../api';
import StatusBadge from '../../components/ui/StatusBadge';

const TrackBookingPage = () => {
  const { bookingRef } = useParams();
  const ref = String(bookingRef || '').trim().toUpperCase();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getBookingByRef(ref)
      .then((res) => {
        setBooking(res.data);
        setError('');
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Booking not found. Check your link or reference.');
      })
      .finally(() => setLoading(false));
  }, [ref]);

  return (
    <main className="min-h-screen bg-champagne-50">
      <section className="bg-ink-900 px-5 py-14 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow !text-champagne-200">Booking status</p>
          <h1 className="mt-2 font-display text-4xl font-bold">{ref || 'Your booking'}</h1>
          <p className="mt-2 text-white/60">View-only link from your SMS. No login needed.</p>
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-5 py-10">
        {loading ? (
          <div className="card p-10 flex items-center justify-center gap-2 text-ink-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading booking...
          </div>
        ) : error || !booking ? (
          <div className="card p-10 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-3 font-bold">Booking not found</p>
            <p className="mt-1 text-sm text-ink-500">{error}</p>
            <Link to="/booking" className="btn-primary mt-6 inline-block">Book Appointment</Link>
          </div>
        ) : (
          <div className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">Hi {booking.guestName || 'there'}</h2>
              <StatusBadge status={booking.status} />
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <div><p className="text-xs text-gray-500">Service</p><p className="font-medium">{booking.service?.name}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <User className="w-5 h-5 text-primary-500" />
                <div><p className="text-xs text-gray-500">Stylist</p><p className="font-medium">{booking.staff?.name}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <CalendarDays className="w-5 h-5 text-primary-500" />
                <div><p className="text-xs text-gray-500">Date & Time</p><p className="font-medium">{new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {booking.startTime} - {booking.endTime}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Clock className="w-5 h-5 text-primary-500" />
                <div><p className="text-xs text-gray-500">Mobile</p><p className="font-medium">{booking.phoneMasked}</p></div>
              </div>
            </div>
            <p className="mt-6 text-sm text-ink-500">To change or cancel, please call the salon and share ref <span className="font-bold text-ink-900">{booking.bookingRef}</span>.</p>
            <Link to="/booking" className="btn-secondary mt-4 inline-block">Book Another</Link>
          </div>
        )}
      </div>
    </main>
  );
};

export default TrackBookingPage;
