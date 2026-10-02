export const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-lg bg-ink-100 ${className}`} aria-hidden="true" />;
export const CardSkeleton = () => <div className="rounded-2xl border border-ink-100 p-6"><Skeleton className="h-4 w-1/3" /><Skeleton className="mt-4 h-8 w-2/3" /><Skeleton className="mt-3 h-4 w-full" /></div>;
