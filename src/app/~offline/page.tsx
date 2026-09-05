import { WifiOff } from 'lucide-react';
import Link from 'next/link';
import OfflineRecovery from '@/components/pwa/OfflineRecovery';
import { PageHeader } from '@/components/ui';

export default function Offline() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center px-4">
      <div className="bg-surface border border-border rounded-full p-4 mb-6">
        <WifiOff className="w-8 h-8 text-muted" />
      </div>
      <PageHeader
        className="mb-4 sm:flex-col sm:items-center [&_p]:mx-auto"
        title="You're Offline"
        description="It looks like you've lost your internet connection. Some features of Utility may be unavailable until you reconnect."
      />
      <OfflineRecovery />
      <Link 
        href="/"
        className="bg-primary text-primary-foreground hover:bg-primary-hover px-6 py-2 rounded-lg text-sm font-medium transition-colors mt-4"
      >
        Return to Home
      </Link>
    </div>
  );
}
