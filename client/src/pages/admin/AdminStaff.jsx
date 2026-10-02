import { useEffect, useState } from 'react';
import { getAllStaff, createStaff, updateStaff, deleteStaff } from '../../api';
import { useForm } from 'react-hook-form';
import Modal from '../../components/ui/Modal';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AdminStaff = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [workingHours, setWorkingHours] = useState(
    DAYS.slice(0, 5).map(d => ({ day: d, start: '09:00', end: '18:00', enabled: true }))
      .concat([ { day: 'Saturday', start: '10:00', end: '16:00', enabled: true }, { day: 'Sunday', start: '', end: '', enabled: false } ])
  );

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = () => {
    getAllStaff().then(res => setStaffList(res.data)).catch(console.error).finally(() => setLoading(false));
  };

  const openAdd = () => {
    setEditing(null);
    reset({ name: '', email: '', phone: '', bio: '', specialties: '' });
    setWorkingHours(DAYS.slice(0, 5).map(d => ({ day: d, start: '09:00', end: '18:00', enabled: true }))
      .concat([ { day: 'Saturday', start: '10:00', end: '16:00', enabled: true }, { day: 'Sunday', start: '', end: '', enabled: false } ]));
    setModalOpen(true);
  };

  const openEdit = (staff) => {
    setEditing(staff);
    reset({ name: staff.name, email: staff.email, phone: staff.phone, bio: staff.bio, specialties: staff.specialties?.join(', ') });
    const wh = DAYS.map(d => {
      const existing = staff.workingHours?.find(w => w.day === d);
      return existing ? { ...existing, enabled: true } : { day: d, start: '', end: '', enabled: false };
    });
    setWorkingHours(wh);
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    const payload = {
      ...data,
      specialties: data.specialties ? data.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
      workingHours: workingHours.filter(w => w.enabled).map(({ day, start, end }) => ({ day, start, end })),
    };
    try {
      if (editing) {
        await updateStaff(editing._id, payload);
        toast.success('Staff updated');
      } else {
        await createStaff(payload);
        toast.success('Staff added');
      }
      setModalOpen(false);
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this staff member?')) return;
    try {
      await deleteStaff(id);
      toast.success('Staff deactivated');
      fetchStaff();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const toggleDay = (i) => {
    setWorkingHours(wh => wh.map((w, idx) => idx === i ? { ...w, enabled: !w.enabled } : w));
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your salon team</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Staff</button>
      </div>

      <div className="card overflow-hidden">
        {staffList.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No staff members yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Specialties</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {staffList.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-5 py-3 text-gray-600">{s.email}</td>
                    <td className="px-5 py-3 text-gray-600">{s.phone}</td>
                    <td className="px-5 py-3"><div className="flex flex-wrap gap-1">{s.specialties?.map((sp, i) => <span key={i} className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs">{sp}</span>)}</div></td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        {s.isActive && <button onClick={() => handleDelete(s._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Staff' : 'Add Staff'} maxWidth="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input className="input-field" {...register('name', { required: 'Required' })} />{errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}</div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input className="input-field" {...register('email', { required: 'Required' })} />{errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input className="input-field" {...register('phone')} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label><input className="input-field" placeholder="Comma separated" {...register('specialties')} /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Bio</label><textarea className="input-field" rows="2" {...register('bio')} /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Working Hours</label>
            <div className="space-y-2">
              {workingHours.map((wh, i) => (
                <div key={wh.day} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-28">
                    <input type="checkbox" checked={wh.enabled} onChange={() => toggleDay(i)} className="rounded text-primary-600" />
                    <span className="text-sm">{wh.day.slice(0, 3)}</span>
                  </label>
                  {wh.enabled && (
                    <>
                      <input type="time" value={wh.start} onChange={e => setWorkingHours(w => w.map((x, idx) => idx === i ? { ...x, start: e.target.value } : x))} className="input-field !w-auto text-sm" />
                      <span className="text-gray-400">to</span>
                      <input type="time" value={wh.end} onChange={e => setWorkingHours(w => w.map((x, idx) => idx === i ? { ...x, end: e.target.value } : x))} className="input-field !w-auto text-sm" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? 'Update' : 'Add Staff'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminStaff;
