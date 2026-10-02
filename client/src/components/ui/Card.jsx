const Card = ({ children, className = '', padding = 'p-6', ...props }) => <section className={`rounded-2xl border border-ink-100 bg-white shadow-soft ${padding} ${className}`} {...props}>{children}</section>;
export default Card;
