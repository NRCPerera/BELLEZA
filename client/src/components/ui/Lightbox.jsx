import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const Lightbox = ({ images, currentIndex, onClose, onPrev, onNext }) => {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    // The component stays mounted on landing and profile pages. Only lock the
    // document while an image is actually open; otherwise it prevents normal
    // page scrolling even though the lightbox renders nothing.
    if (currentIndex === null || currentIndex === undefined || !images?.[currentIndex]) {
      return undefined;
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [currentIndex, images, handleKeyDown]);

  if (currentIndex === null || currentIndex === undefined || !images?.[currentIndex]) return null;

  const current = images[currentIndex];
  // Cloudinary: full-size transform
  const fullUrl = current.url?.includes('cloudinary')
    ? current.url.replace('/upload/', '/upload/w_1600,f_auto,q_auto/')
    : current.url;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Prev */}
      {onPrev && currentIndex > 0 && (
        <button
          onClick={onPrev}
          className="absolute left-4 z-10 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Image */}
      <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center">
        <img
          src={fullUrl}
          alt={current.caption || 'Portfolio photo'}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        {current.caption && (
          <p className="mt-4 text-white/80 text-sm text-center max-w-lg">{current.caption}</p>
        )}
        {current.staff?.name && (
          <p className="mt-1 text-white/50 text-xs">by {current.staff.name}</p>
        )}
      </div>

      {/* Next */}
      {onNext && currentIndex < images.length - 1 && (
        <button
          onClick={onNext}
          className="absolute right-4 z-10 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
};

export default Lightbox;
