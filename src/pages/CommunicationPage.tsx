import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Megaphone, MessageSquare } from 'lucide-react';

export const CommunicationPage: React.FC = () => (
  <section className="space-y-6 min-w-0" aria-labelledby="communication-heading">
    <header className="space-y-2">
      <h1 id="communication-heading">Communication</h1>
      <p className="text-sm text-muted-foreground">School notices and messages, together in one place.</p>
    </header>
    <nav aria-label="Communication sections" className="flex gap-2 border-b border-border pb-3">
      {[
        { to: '/communication/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/communication/messages', label: 'Messages', icon: MessageSquare },
      ].map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) =>
          `inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-strong'}`}>
          <Icon size={18} aria-hidden="true" />{label}
        </NavLink>
      ))}
    </nav>
    <Outlet />
  </section>
);

export const MessageAvailability: React.FC = () => (
  <section className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-3" aria-labelledby="messages-heading">
    <MessageSquare size={28} className="text-muted-foreground" aria-hidden="true" />
    <h2 id="messages-heading">Messaging is not available yet</h2>
    <p className="max-w-xl text-sm text-muted-foreground leading-relaxed">Sending messages to staff, students and parents has not been enabled for this portal. No messages will be sent from this page.</p>
    <NavLink to="/communication/announcements" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">View announcement drafts</NavLink>
  </section>
);
