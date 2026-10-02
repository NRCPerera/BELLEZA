import { Loader2 } from 'lucide-react';

const styles = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
  secondary: 'border border-primary-200 bg-white text-primary-700 hover:bg-primary-50',
  ghost: 'text-ink-700 hover:bg-ink-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};
const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-base' };

export const Button = ({ variant = 'primary', size = 'md', loading, disabled, className = '', children, type = 'button', ...props }) => (
  <button type={type} disabled={disabled || loading} className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${sizes[size]} ${className}`} {...props}>
    {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{children}
  </button>
);
export default Button;
