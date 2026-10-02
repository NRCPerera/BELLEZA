// Kept as a compatibility export for existing routes; loading is intentionally
// represented as layout-shaped skeletons rather than an indeterminate spinner.
const Spinner = ({ className = '' }) => <span aria-label="Loading" className={`inline-block h-5 w-5 animate-pulse rounded-full bg-primary-200 ${className}`} />;

export const PageSpinner = () => <div className="mx-auto flex min-h-[400px] max-w-5xl items-center px-5" aria-label="Loading content"><div className="w-full space-y-5"><div className="h-9 w-44 animate-pulse rounded-xl bg-ink-100"/><div className="grid gap-5 sm:grid-cols-3">{[1,2,3].map(i=><div key={i} className="h-48 animate-pulse rounded-3xl bg-ink-100"/>)}</div></div></div>;

export default Spinner;
