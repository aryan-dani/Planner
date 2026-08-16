import { Suspense } from 'react';
import SrsClient from './SrsClientComponent';

export const metadata = {
  title: 'SRS Flashcards',
  description: 'Spaced Repetition System for rapid memorization and learning.',
};

export default function SrsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[60vh]" role="status">
        <span className="loading-orb" aria-hidden />
        <p className="text-xs font-medium text-muted tracking-wide">Loading flashcards…</p>
      </div>
    }>
      <SrsClient />
    </Suspense>
  );
}
