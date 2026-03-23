import { useState } from 'react';
import { ContactsView } from '../contacts/ContactsView';
import { AiManagementView } from '../ai/AiManagementView';
import { AlertsCenterView } from '../alerts/AlertsCenterView';
import { useAlertsQuery } from '../alerts/api';
import { useEventsQuery } from '../events/api';
import { DashboardHomeView } from './DashboardHomeView';

type Tab = 'dashboard' | 'contacts' | 'ai' | 'alerts';

type DashboardLayoutProps = {
  onLogout: () => void;
};

const tabs: {
  id: Tab;
  label: string;
  icon: 'home' | 'users' | 'chip' | 'alert';
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'contacts', label: 'Contactos', icon: 'users' },
  { id: 'ai', label: 'Gestión IA', icon: 'chip' },
  { id: 'alerts', label: 'Alertas', icon: 'alert' },
];

function TabIcon({ name }: { name: (typeof tabs)[number]['icon'] }) {
  switch (name) {
    case 'home':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'users':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm14 8v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'chip':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M9 9h6v6H9z" stroke="currentColor" strokeWidth="2" />
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'alert':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function DashboardLayout({ onLogout }: DashboardLayoutProps) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const { data: events } = useEventsQuery();
  const { data: alerts } = useAlertsQuery();
  const openCount = alerts?.filter((a) => a.status === 'OPEN').length ?? 0;
  const alertBadge =
    openCount > 0
      ? Math.min(openCount, 9)
      : events && events.length > 0
        ? Math.min(events.length, 9)
        : 0;

  return (
    <div className="dash-app">
      <header className="dash-topbar">
        <div className="dash-topbar-left">
          <div className="dash-logo-mark" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="dash-brand-text">
            <span className="dash-brand-name">SecureHome AI</span>
            <span className="dash-brand-tagline">Sistema de Seguridad Inteligente</span>
          </div>
        </div>
        <div className="dash-topbar-right">
          <button
            type="button"
            className="dash-icon-btn dash-icon-btn--badged"
            aria-label={`Notificaciones (${alertBadge} abiertas)`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 0 1-3.46 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {alertBadge > 0 ? <span className="dash-notif-badge">{alertBadge}</span> : null}
          </button>
          <div className="dash-user-block">
            <div className="dash-user-avatar" aria-hidden>
              A
            </div>
            <div className="dash-user-meta">
              <span className="dash-user-role-title">Admin</span>
              <span className="dash-user-role-sub">Propietario</span>
            </div>
          </div>
          <button type="button" className="dash-logout-btn" onClick={onLogout}>
            Salir
          </button>
        </div>
      </header>

      <nav className="dash-tabbar" aria-label="Navegación principal">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`dash-tab${tab === t.id ? ' dash-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <TabIcon name={t.icon} />
            {t.label}
            {t.id === 'alerts' && alertBadge > 0 ? (
              <span className="dash-tab-alert-badge">{alertBadge}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <main className="dash-main">
        {tab === 'dashboard' && <DashboardHomeView />}
        {tab === 'contacts' && <ContactsView />}
        {tab === 'ai' && <AiManagementView />}
        {tab === 'alerts' && (
          <AlertsCenterView onRegisterContact={() => setTab('contacts')} />
        )}
      </main>
    </div>
  );
}
