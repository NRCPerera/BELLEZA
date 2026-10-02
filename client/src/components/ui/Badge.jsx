const tones = { neutral: 'bg-ink-100 text-ink-700', success: 'bg-emerald-50 text-emerald-700', warning: 'bg-amber-50 text-amber-800', danger: 'bg-red-50 text-red-700', brand: 'bg-primary-50 text-primary-700' };
const Badge = ({ tone = 'neutral', children, className = '' }) => <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}>{children}</span>;
export default Badge;
