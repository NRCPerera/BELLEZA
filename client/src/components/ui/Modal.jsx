import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  const closeRef = useRef(null);
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    if (isOpen) closeRef.current?.focus();
    const escape = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', escape);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-primary-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`relative bg-surface rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-slide-up`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <h2 id="modal-title" className="text-lg font-semibold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            ref={closeRef}
            aria-label="Close dialog"
            className="p-1.5 text-ink-500 hover:text-ink-700 hover:bg-ink-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
