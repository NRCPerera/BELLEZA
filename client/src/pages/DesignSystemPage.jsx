import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Field';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { Skeleton, CardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Tabs from '../components/ui/Tabs';
import Avatar from '../components/ui/Avatar';
import Dropdown from '../components/ui/Dropdown';
import Table from '../components/ui/Table';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';

const DesignSystemPage = () => {
  const [tab, setTab] = useState('overview'); const [modal, setModal] = useState(false);
  return <div className="min-h-screen bg-champagne-50 p-6 sm:p-10"><main className="mx-auto max-w-6xl space-y-10">
    <PageHeader title="Belleza design system" description="Development-only reference for the shared UI foundation." actions={<Button onClick={() => toast.success('Toast styles are ready')}>Test toast</Button>} />
    <Card><h2 className="mb-4 font-display text-2xl font-bold">Buttons & badges</h2><div className="flex flex-wrap gap-3"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Delete</Button><Button loading>Saving</Button><Badge tone="brand">New</Badge><Badge tone="success">Confirmed</Badge><Badge tone="warning">Pending</Badge></div></Card>
    <div className="grid gap-6 md:grid-cols-2"><Card><h2 className="mb-4 font-display text-2xl font-bold">Form controls</h2><div className="space-y-4"><Input id="demo-name" label="Name" placeholder="Avery Morgan" /><Select id="demo-service" label="Service"><option>Hair styling</option></Select><Textarea id="demo-notes" label="Notes" error="Please add a little more detail." rows="3" /></div></Card><Card><h2 className="mb-4 font-display text-2xl font-bold">Navigation & identity</h2><Tabs value={tab} onChange={setTab} tabs={[{ value: 'overview', label: 'Overview' }, { value: 'activity', label: 'Activity' }]} /><div className="mt-5 flex items-center gap-3"><Avatar name="Avery Morgan" size="lg" /><span className="text-sm text-ink-500">{tab} tab selected</span><Dropdown><button role="menuitem" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-50">Edit profile</button></Dropdown></div></Card></div>
    <Card><h2 className="mb-4 font-display text-2xl font-bold">Table & loading</h2><Table keyField="name" columns={[{ key: 'name', header: 'Client' }, { key: 'status', header: 'Status', render: (row) => <Badge tone="success">{row.status}</Badge> }]} data={[{ name: 'Mia Chen', status: 'Confirmed' }]} /><div className="mt-5 grid gap-4 sm:grid-cols-3"><Skeleton className="h-24" /><CardSkeleton /><EmptyState title="No appointments" description="New availability will appear here." /></div></Card>
    <Button variant="secondary" onClick={() => setModal(true)}>Open accessible modal</Button><Modal isOpen={modal} onClose={() => setModal(false)} title="A polished dialog"><p className="text-ink-500">Use Escape, the close button, or the backdrop to dismiss this dialog.</p></Modal>
  </main></div>;
};
export default DesignSystemPage;
