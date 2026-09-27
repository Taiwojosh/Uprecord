import React, { useState } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

export default function EmbeddedClassroom({ token, serverUrl, title, onLeave }: { token: string; serverUrl: string; title: string; onLeave: () => void }) {
  const [error, setError] = useState('');
  return <section aria-label={title} className="overflow-hidden rounded-2xl border border-slate-300">
    <div className="flex items-center justify-between gap-3 bg-slate-900 p-3 text-white"><h2 className="font-semibold">{title}</h2><button onClick={onLeave} className="rounded-lg border border-slate-500 px-3 py-2 text-sm">Leave classroom</button></div>
    {error && <p role="alert" className="bg-red-50 p-3 text-red-900">{error} Leave and rejoin to try again.</p>}
    <LiveKitRoom token={token} serverUrl={serverUrl} connect video={false} audio={false} onDisconnected={onLeave} onError={() => setError('The video connection failed. Check camera permissions and your connection.')} data-lk-theme="default" style={{ height: 'min(75vh, 720px)' }}>
      <VideoConference />
    </LiveKitRoom>
  </section>;
}
