import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
const Dropdown = ({ label = 'More actions', trigger, children }) => {
  const [open, setOpen] = useState(false); const ref = useRef(null);
  useEffect(() => { const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, []);
  return <div className="relative inline-block" ref={ref}><button aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} className="rounded-lg p-2 text-ink-500 hover:bg-ink-50">{trigger || <MoreHorizontal className="h-5 w-5" />}</button>{open && <div role="menu" className="absolute right-0 z-30 mt-1 min-w-40 rounded-xl border border-ink-100 bg-white p-1 shadow-float" onClick={() => setOpen(false)}>{children}</div>}</div>;
};
export default Dropdown;
