import { useEffect, useState, useRef, useCallback } from 'react';
import {
  getMyPortfolio,
  uploadPortfolioPhotos,
  updatePortfolioPhoto,
  reorderPortfolio,
  deletePortfolioPhoto,
} from '../../api';
import Modal from '../../components/ui/Modal';
import {
  Loader2,
  Upload,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  XCircle,
  Check,
  Pencil,
  X,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Cloudinary URL transformation helpers
const thumb = (url) => {
  if (!url?.includes('cloudinary')) return url;
  return url.replace('/upload/', '/upload/w_600,c_fill,f_auto,q_auto/');
};

const StaffPortfolio = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editCaption, setEditCaption] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const fetchPhotos = useCallback(() => {
    getMyPortfolio()
      .then((res) => {
        setPhotos(res.data);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load portfolio'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // ─── File selection ─────────────────────────────────────────
  const handleFiles = (files) => {
    const fileList = Array.from(files);
    const valid = fileList.filter((f) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        toast.error(`${f.name}: Only JPG, PNG, WebP allowed`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name}: Max 5MB per file`);
        return false;
      }
      return true;
    });

    if (valid.length === 0) return;
    if (valid.length > 10) {
      toast.error('Max 10 files per upload');
      return;
    }

    // Generate previews
    const newPreviews = valid.map((f) => ({
      file: f,
      name: f.name,
      preview: URL.createObjectURL(f),
    }));
    setPreviews(newPreviews);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (previews.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    previews.forEach((p) => formData.append('photos', p.file));

    try {
      const res = await uploadPortfolioPhotos(formData, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(pct);
      });

      toast.success(res.data.message);
      if (res.data.errors?.length > 0) {
        res.data.errors.forEach((e) => toast.error(`${e.file}: ${e.error}`));
      }

      setPreviews([]);
      fetchPhotos();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const cancelPreviews = () => {
    previews.forEach((p) => URL.revokeObjectURL(p.preview));
    setPreviews([]);
  };

  // ─── Caption editing ──────────────────────────────────────
  const startEdit = (photo) => {
    setEditingId(photo._id);
    setEditCaption(photo.caption || '');
  };

  const saveCaption = async (id) => {
    try {
      await updatePortfolioPhoto(id, { caption: editCaption });
      setPhotos((prev) =>
        prev.map((p) => (p._id === id ? { ...p, caption: editCaption } : p))
      );
      setEditingId(null);
      toast.success('Caption updated');
    } catch (err) {
      toast.error('Failed to update caption');
    }
  };

  // ─── Drag to reorder ──────────────────────────────────────
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;

    const reordered = [...photos];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setPhotos(reordered);
    setDragIdx(idx);
  };

  const handleDragEnd = async () => {
    if (dragIdx === null) return;
    setDragIdx(null);

    const order = photos.map((p, i) => ({ id: p._id, order: i }));
    try {
      await reorderPortfolio(order);
    } catch (err) {
      toast.error('Failed to save order');
      fetchPhotos();
    }
  };

  // ─── Delete ───────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await deletePortfolioPhoto(deleteModal._id);
      setPhotos((prev) => prev.filter((p) => p._id !== deleteModal._id));
      toast.success('Photo deleted');
      setDeleteModal(null);
    } catch (err) {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Portfolio</h1>
          <p className="text-gray-500 text-sm mt-1">
            Showcase your best work · {photos.length}/30 photos
          </p>
        </div>
      </div>

      {error && (
        <div className="card p-6 mb-6 text-center text-red-500">{error}</div>
      )}

      {/* Upload Zone */}
      {previews.length === 0 ? (
        <div
          className={`card border-2 border-dashed mb-8 transition-all duration-200 cursor-pointer ${
            dragOver
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50/50'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                dragOver ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              <Upload className="w-7 h-7" />
            </div>
            <p className="font-medium text-gray-700">
              {dragOver ? 'Drop files here' : 'Drag & drop photos or click to browse'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              JPG, PNG, WebP · Max 5MB each · Up to 10 at once
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      ) : (
        /* Preview panel */
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              {previews.length} file{previews.length > 1 ? 's' : ''} selected
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelPreviews}
                disabled={uploading}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? `Uploading ${uploadProgress}%` : 'Upload All'}
              </button>
            </div>
          </div>

          {/* Upload progress bar */}
          {uploading && (
            <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {previews.map((p, i) => (
              <div key={i} className="relative group">
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={p.preview}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{p.name}</p>
                {!uploading && (
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(p.preview);
                      setPreviews((prev) => prev.filter((_, idx) => idx !== i));
                    }}
                    className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="card p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No portfolio photos yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Upload your first photos to showcase your work to clients
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, idx) => (
            <div
              key={photo._id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`card group overflow-hidden transition-all duration-200 ${
                dragIdx === idx ? 'opacity-50 scale-95' : ''
              }`}
            >
              {/* Image */}
              <div className="relative aspect-square bg-gray-100">
                <img
                  src={thumb(photo.url)}
                  alt={photo.caption || 'Portfolio photo'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute top-2 left-2">
                    <div className="p-1.5 bg-white/90 rounded-lg cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => startEdit(photo)}
                      className="p-1.5 bg-white/90 rounded-lg text-gray-600 hover:text-primary-600 transition-colors"
                      title="Edit caption"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteModal(photo)}
                      className="p-1.5 bg-white/90 rounded-lg text-gray-600 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Caption */}
              <div className="p-3">
                {editingId === photo._id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      className="input-field text-xs !py-1 !px-2 flex-1"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveCaption(photo._id)}
                      maxLength={200}
                      autoFocus
                    />
                    <button
                      onClick={() => saveCaption(photo._id)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-xs text-gray-500 truncate cursor-pointer hover:text-gray-700"
                    onClick={() => startEdit(photo)}
                    title="Click to edit caption"
                  >
                    {photo.caption || 'Add a caption...'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Photo"
      >
        <div className="text-center py-4">
          <div className="w-14 h-14 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-gray-700 mb-1">Are you sure you want to delete this photo?</p>
          <p className="text-sm text-gray-500">This action cannot be undone.</p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setDeleteModal(null)}
              className="btn-ghost flex-1"
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffPortfolio;
