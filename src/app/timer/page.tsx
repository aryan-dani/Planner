import { Suspense } from 'react';
import TimerClient from './TimerClientComponent';

export const metadata = {
  title: 'Focus Timer',
  description: 'Study with the Pomodoro technique to stay productive.',
};

export default function TimerPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[60vh]" role="status">
        <span className="loading-orb" aria-hidden />
        <p className="text-xs font-medium text-muted tracking-wide">Loading timer…</p>
      </div>
    }>
      <TimerClient />
    </Suspense>
  );
}
