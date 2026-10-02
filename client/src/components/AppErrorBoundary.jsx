import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Application render error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <section className="max-w-md rounded-3xl border border-ink-100 bg-surface p-8 shadow-soft">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary-600"><AlertTriangle className="h-6 w-6" /></div>
          <h1 className="mt-5 text-xl font-bold text-ink-900">Something didn’t load</h1>
          <p className="mt-2 text-sm leading-6 text-ink-500">Please refresh the page. If it persists, sign out and sign back in.</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-6 inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />Refresh page</button>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
