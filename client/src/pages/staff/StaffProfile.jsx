import { useEffect, useState } from 'react';
import { getStaffProfile, updateStaffProfile } from '../../api';
import { Loader2, XCircle, Save, UserCircle, Clock, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const StaffProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Editable fields
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState([]);
  const [photo, setPhoto] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');

  useEffect(() => {
    getStaffProfile()
      .then((res) => {
        const p = res.data;
        setProfile(p);
        setBio(p.bio || '');
        setSpecialties(p.specialties || []);
        setPhoto(p.photo || '');
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleAddSpecialty = () => {
    const trimmed = newSpecialty.trim();
    if (trimmed && !specialties.includes(trimmed)) {
      setSpecialties([...specialties, trimmed]);
      setNewSpecialty('');
    }
  };

  const handleRemoveSpecialty = (idx) => {
    setSpecialties(specialties.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateStaffProfile({ bio, specialties, photo });
      setProfile(res.data);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Detect changes
  const hasChanges =
    profile &&
    (bio !== (profile.bio || '') ||
      photo !== (profile.photo || '') ||
      JSON.stringify(specialties) !== JSON.stringify(profile.specialties || []));

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

  // Sort working hours by day order
  const sortedHours = [...(profile?.workingHours || [])].sort(
    (a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day)
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Edit your bio, specialties, and avatar</p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile Card */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <div className="text-center">
              {photo ? (
                <img
                  src={photo}
                  alt={profile.name}
                  className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-primary-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center border-4 border-primary-100">
                  <span className="text-3xl font-bold text-white">
                    {profile?.name?.charAt(0)}
                  </span>
                </div>
              )}
              <h2 className="mt-4 text-lg font-semibold text-gray-900">{profile?.name}</h2>
              <p className="text-sm text-gray-500">{profile?.email}</p>
              {profile?.phone && (
                <p className="text-sm text-gray-500 mt-0.5">{profile?.phone}</p>
              )}
            </div>

            {/* Avatar URL */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Avatar URL
              </label>
              <input
                type="url"
                className="input-field text-sm"
                value={photo}
                onChange={(e) => setPhoto(e.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
              <p className="text-xs text-gray-400 mt-1">Paste a link to your profile photo</p>
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-primary-500" />
              Bio
            </h3>
            <textarea
              className="input-field text-sm min-h-[120px] resize-y"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell clients about yourself, your experience, and what you specialize in..."
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/500</p>
          </div>

          {/* Specialties */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Specialties</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {specialties.length === 0 ? (
                <p className="text-sm text-gray-400">No specialties added yet</p>
              ) : (
                specialties.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
                  >
                    {s}
                    <button
                      onClick={() => handleRemoveSpecialty(i)}
                      className="hover:text-primary-900 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field text-sm flex-1"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialty())}
                placeholder="Add a specialty..."
              />
              <button
                onClick={handleAddSpecialty}
                disabled={!newSpecialty.trim()}
                className="btn-secondary flex items-center gap-1.5 !px-4 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Working Hours (read-only) */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" />
              Working Hours
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-normal">
                Read-only
              </span>
            </h3>
            {sortedHours.length === 0 ? (
              <p className="text-sm text-gray-400">No working hours set. Contact an admin to update.</p>
            ) : (
              <div className="space-y-2">
                {sortedHours.map((wh, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2.5 px-4 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-sm text-gray-700">{wh.day}</span>
                    <span className="text-sm text-gray-500">
                      {wh.start} – {wh.end}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile save button */}
      {hasChanges && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-30">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};

export default StaffProfile;
