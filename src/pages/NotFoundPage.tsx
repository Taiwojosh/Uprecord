import React from 'react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col items-center justify-center text-center px-6">
      <div className="text-8xl mb-6">🔍</div>
      <h1 className="text-4xl font-bold mb-4">School Not Found</h1>
      <p className="text-white/50 text-lg max-w-md">
        This address doesn't match any known school portal. Please check your URL or contact support.
      </p>
    </div>
  );
};
