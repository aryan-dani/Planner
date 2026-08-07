'use client';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col w-full page-fade-in">
      {children}
    </div>
  );
}
