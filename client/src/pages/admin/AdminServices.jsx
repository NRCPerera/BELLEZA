import { useEffect, useState } from 'react';
import { getAllServices, getAllStaff, createService, updateService, deleteService } from '../../api';
import { useForm } from 'react-hook-form';
import Modal from '../../components/ui/Modal';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    Promise.all([getAllServices(), getAllStaff()])
      .then(([sRes, stRes]) => { setServices(sRes.data); setStaffList(stRes.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchServices = () => getAllServices().then(res => setServices(res.data)).catch(console.error);

  const openAdd = () => {
    setEditing(null);
    reset({ name: '', category: '', description: '', durationMinutes: 60, price: 0 });
    setSelectedStaffIds([]);
    setModalOpen(true);
  };

  const openEdit = (svc) => {
    setEditing(svc);
    reset({ name: svc.name, category: svc.category, description: svc.description, durationMinutes: svc.durationMinutes, price: svc.price });
    setSelectedStaffIds(svc.assignedStaff?.map(s => s._id || s) || []);
    setModalOpen(true);
  };

  const toggleStaff = (id) => {
    setSelectedStaffIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    const payload = { ...data, durationMinutes: Number(data.durationMinutes), price: Number(data.price), assignedStaff: selectedStaffIds };
    try {
      if (editing) {
        await updateService(editing._id, payload);
        toast.success('Service updated');
      } else {
        await createService(payload);
        toast.success('Service created');
      }
      setModalOpen(false);
      fetchServices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this service?')) return;
    try {
      await deleteService(id);
      toast.success('Service deactivated');
      fetchServices();
    } catch (err) {
      toast.error('Failed');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-primary-700 animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Services Management</h1>
          <p className="text-ink-500 text-sm mt-1">Manage salon services and pricing</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Service</button>
      </div>

      <div className="card overflow-hidden">
        {services.length === 0 ? (
          <div className="p-12 text-center text-ink-500">No services yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-ink-100 bg-background">
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Service</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Category</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Duration</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Price</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Staff</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-ink-500 uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-ink-100">
                {services.map((svc) => (
                  <tr key={svc._id} className="hover:bg-primary-50">
                    <td className="px-5 py-3 font-medium text-ink-900">{svc.name}</td>
                    <td className="px-5 py-3"><span className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs">{svc.category}</span></td>
                    <td className="px-5 py-3 text-ink-500">{svc.durationMinutes} min</td>
                    <td className="px-5 py-3 font-medium text-ink-900">Rs {svc.price}</td>
                    <td className="px-5 py-3 text-ink-500 text-xs">{svc.assignedStaff?.map(s => s.name || 'N/A').join(', ')}</td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${svc.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{svc.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(svc)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        {svc.isActive && <button onClick={() => handleDelete(svc._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Service' : 'Add Service'} maxWidth="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div><label className="block text-sm font-medium text-ink-700 mb-1">Service Name *</label><input className="input-field" {...register('name', { required: 'Required' })} />{errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Category *</label><input className="input-field" placeholder="e.g. Hair, Skin, Nails" {...register('category', { required: 'Required' })} /></div>
            <div><label className="block text-sm font-medium text-ink-700 mb-1">Duration (min) *</label><input type="number" className="input-field" {...register('durationMinutes', { required: 'Required', min: { value: 15, message: 'Min 15' } })} /></div>
          </div>
          <div><label className="block text-sm font-medium text-ink-700 mb-1">Price (Rs) *</label><input type="number" step="0.01" className="input-field" {...register('price', { required: 'Required', min: { value: 0, message: 'Min 0' } })} /></div>
          <div><label className="block text-sm font-medium text-ink-700 mb-1">Description</label><textarea className="input-field" rows="2" {...register('description')} /></div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">Assign Staff</label>
            <div className="flex flex-wrap gap-2">
              {staffList.filter(s => s.isActive).map(s => (
                <button key={s._id} type="button" onClick={() => toggleStaff(s._id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selectedStaffIds.includes(s._id) ? 'bg-primary-700 text-white border-primary-700' : 'bg-surface text-ink-700 border-ink-100 hover:border-primary-300'
                  }`}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-ink-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? 'Update' : 'Create Service'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminServices;
