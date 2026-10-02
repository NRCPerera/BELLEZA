import { useEffect, useState } from 'react';
import { getCustomers, getCustomerAppointments } from '../../api';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { Users, Eye, Loader2, Search, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerApts, setCustomerApts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [aptsLoading, setAptsLoading] = useState(false);
  const [query, setQuery] = useState(''); const [page, setPage] = useState(1); const [error, setError] = useState('');

  useEffect(() => {
    getCustomers().then(res => { setCustomers(res.data); setError(''); }).catch(err => setError(err.response?.data?.message || 'Unable to load customers.')).finally(() => setLoading(false));
  }, []);
  const filteredCustomers = customers.filter(c => `${c.name} ${c.email} ${c.phone || ''}`.toLowerCase().includes(query.toLowerCase()));
  const pageSize = 8; const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize)); const displayedCustomers = filteredCustomers.slice((page - 1) * pageSize, page * pageSize);

  const viewHistory = async (customer) => {
    setSelectedCustomer(customer);
    setModalOpen(true);
    setAptsLoading(true);
    try {
      const res = await getCustomerAppointments(customer._id);
      setCustomerApts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAptsLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-[1500px] p-5 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-500 text-sm mt-1">View all registered customers</p>
        <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" /><input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="input-field !py-2.5 pl-9 text-sm" placeholder="Search customers..." /></div>
      </div>

      <div className="card overflow-hidden">
        {error ? <EmptyState icon={AlertCircle} title="Customers unavailable" description={error} /> : displayedCustomers.length === 0 ? (
          <EmptyState icon={Users} title="No customers found" description={query ? 'Try another name, email, or phone number.' : 'Customers will appear here once they register.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Bookings</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {displayedCustomers.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => viewHistory(c)}>
                    <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-5 py-3 text-gray-600">{c.email}</td>
                    <td className="px-5 py-3 text-gray-600">{c.phone || '—'}</td>
                    <td className="px-5 py-3"><span className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs font-medium">{c.totalBookings}</span></td>
                    <td className="px-5 py-3 text-gray-600">{new Date(c.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className="px-5 py-3">
                      <button onClick={(e) => { e.stopPropagation(); viewHistory(c); }} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredCustomers.length > pageSize && <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3 text-sm text-ink-500"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-ink-100 p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-ink-100 p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`${selectedCustomer?.name}'s Appointments`} maxWidth="max-w-2xl">
        {aptsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary-600 animate-spin" /></div>
        ) : customerApts.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No appointments found</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {customerApts.map((apt) => (
              <div key={apt._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div><p className="text-xs text-gray-500">Service</p><p className="text-sm font-medium">{apt.service?.name}</p></div>
                  <div><p className="text-xs text-gray-500">Date</p><p className="text-sm font-medium">{new Date(apt.date).toLocaleDateString()}</p></div>
                  <div><p className="text-xs text-gray-500">Time</p><p className="text-sm font-medium">{apt.startTime} - {apt.endTime}</p></div>
                </div>
                <StatusBadge status={apt.status} />
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminCustomers;
