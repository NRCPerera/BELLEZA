import { Inbox } from 'lucide-react';
const EmptyState = ({ icon: Icon = Inbox, title = 'Nothing here yet', description, action }) => <div className="rounded-2xl border border-dashed border-ink-100 p-10 text-center"><Icon className="mx-auto h-10 w-10 text-primary-400" aria-hidden="true" /><h3 className="mt-3 font-semibold text-ink-900">{title}</h3>{description && <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{description}</p>}{action && <div className="mt-5">{action}</div>}</div>;
export default EmptyState;
