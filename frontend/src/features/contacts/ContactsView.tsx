import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  useContactsQuery,
  useCreateContactMutation,
  useDeactivateUserMutation,
} from './api';
import type { CreateContactInput } from './api';
import {
  contactToCardModel,
  isFullyTrained,
  type ContactCardModel,
} from './contactDisplay';

/** IDs reales del API (no tarjetas demo). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPersistedUserId(id: string): boolean {
  return UUID_RE.test(id);
}

const relationshipOptions: { value: string; label: string }[] = [
  { value: 'FAMILY', label: 'Familia' },
  { value: 'FRIEND', label: 'Amigo' },
  { value: 'OTHER', label: 'Contacto de Confianza' },
  { value: 'FATHER', label: 'Padre' },
  { value: 'MOTHER', label: 'Madre' },
];

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16v12H4V6Zm0 0 8 6 8-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 16.92v2a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h2a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.11a2 2 0 0 1 2.11-.45c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDots() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}

type BiometricKind = 'face' | 'voice';

function BiometricUploadModal({
  kind,
  contactName,
  onClose,
}: {
  kind: BiometricKind;
  contactName: string;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputId = useId();

  useEffect(() => {
    if (kind !== 'face' || !file || !file.type.startsWith('image/')) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [kind, file]);

  const title =
    kind === 'face' ? 'Registrar rostro' : 'Registrar voz';
  const accept =
    kind === 'face'
      ? 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
      : 'audio/*,.mp3,.wav,.webm,.m4a,.ogg,audio/mp4';

  const handlePick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onClose();
  };

  return createPortal(
    <div
      className="contacts-modal-backdrop contacts-modal-backdrop--bio"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="contacts-modal contacts-modal--bio"
        role="dialog"
        aria-labelledby="bio-upload-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="bio-upload-title" className="contacts-modal-title">
          {title}
        </h2>
        <p className="bio-upload-contact-name">{contactName}</p>
        <p className="bio-upload-hint">
          {kind === 'face'
            ? 'Sube una imagen del rostro (frente, buena luz). Por ahora solo eliges el archivo; el entrenamiento con el motor biométrico se conectará después.'
            : 'Sube un audio con la voz del contacto (unos segundos, ambiente silencioso). El entrenamiento automático se habilitará en una siguiente fase.'}
        </p>
        <form className="contacts-modal-form" onSubmit={handleSubmit}>
          <label className="contacts-modal-field" htmlFor={fileInputId}>
            <span>{kind === 'face' ? 'Imagen' : 'Archivo de audio'}</span>
            <input
              id={fileInputId}
              type="file"
              accept={accept}
              className="contacts-modal-input"
              onChange={handlePick}
            />
            {file ? (
              <p className="bio-upload-file-name">
                Seleccionado: <strong>{file.name}</strong>
              </p>
            ) : null}
          </label>
          {kind === 'face' && previewUrl ? (
            <div className="bio-upload-preview-wrap">
              <img
                src={previewUrl}
                alt="Vista previa del rostro seleccionado"
                className="bio-upload-preview"
              />
            </div>
          ) : null}
          {kind === 'voice' && file ? (
            <p className="bio-upload-audio-meta">
              Tamaño aproximado: {(file.size / 1024).toFixed(1)} KB
            </p>
          ) : null}
          <div className="contacts-modal-actions">
            <button type="button" className="contacts-modal-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="contacts-modal-submit">
              Cerrar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function ContactsView() {
  const { data, isLoading } = useContactsQuery();
  const createMutation = useCreateContactMutation();
  const deactivateMutation = useDeactivateUserMutation();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateContactInput>({
    name: '',
    relationship: 'FAMILY',
    email: '',
    phone: '',
  });

  const allCards = useMemo(
    () => (data ?? []).map(contactToCardModel),
    [data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCards;
    return allCards.filter((c) => {
      const rel = c.relationship.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        rel.includes(q)
      );
    });
  }, [allCards, search]);

  const stats = useMemo(() => {
    const total = allCards.length;
    const trained = allCards.filter(isFullyTrained).length;
    const pending = total - trained;
    return { total, trained, pending };
  }, [allCards]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    if (!form.email?.trim()) {
      window.alert('El email es obligatorio para registrar un usuario autorizado.');
      return;
    }
    createMutation.mutate(
      {
        name: form.name.trim(),
        relationship: form.relationship,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
      },
      {
        onSuccess: () => {
          setModalOpen(false);
          setForm({
            name: '',
            relationship: 'FAMILY',
            email: '',
            phone: '',
          });
        },
      },
    );
  };

  return (
    <div className="contacts-page">
      <header className="contacts-head">
        <div>
          <h1 className="contacts-title">Contactos Registrados</h1>
          <p className="contacts-subtitle">
            Gestiona los contactos autorizados para acceder a tu residencia
          </p>
        </div>
        <button
          type="button"
          className="contacts-btn-new"
          onClick={() => setModalOpen(true)}
        >
          + Nuevo Contacto
        </button>
      </header>

      <div className="contacts-search-wrap">
        <span className="contacts-search-icon" aria-hidden>
          <IconSearch />
        </span>
        <input
          type="search"
          className="contacts-search-input"
          placeholder="Buscar por nombre, email o relación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar contactos"
        />
      </div>

      <section className="contacts-stats" aria-label="Resumen de contactos">
        <article className="contacts-stat-card">
          <p className="contacts-stat-label">Total Contactos</p>
          <p className="contacts-stat-num contacts-stat-num--dark">
            {isLoading ? '—' : stats.total}
          </p>
        </article>
        <article className="contacts-stat-card">
          <p className="contacts-stat-label">Completamente Entrenados</p>
          <p className="contacts-stat-num contacts-stat-num--green">{stats.trained}</p>
        </article>
        <article className="contacts-stat-card">
          <p className="contacts-stat-label">Pendientes de Entrenar</p>
          <p className="contacts-stat-num contacts-stat-num--orange">{stats.pending}</p>
        </article>
      </section>

      {isLoading ? (
        <p className="contacts-loading">Cargando…</p>
      ) : filtered.length === 0 ? (
        <p className="contacts-loading">
          {search.trim()
            ? 'No hay contactos que coincidan con la búsqueda.'
            : 'No hay contactos registrados. Agrega uno con «Nuevo Contacto».'}
        </p>
      ) : (
        <ul className="contacts-grid">
          {filtered.map((c) => (
            <li key={c.id}>
              <ContactCard
                contact={c}
                onDeactivate={
                  isPersistedUserId(c.id)
                    ? () => {
                        if (
                          window.confirm(
                            `¿Desactivar a ${c.name}? Podrás seguir viéndolo en la lista como inactivo.`,
                          )
                        ) {
                          deactivateMutation.mutate(c.id);
                        }
                      }
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}

      {modalOpen ? (
        <div
          className="contacts-modal-backdrop"
          role="presentation"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="contacts-modal"
            role="dialog"
            aria-labelledby="contacts-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="contacts-modal-title" className="contacts-modal-title">
              Nuevo contacto
            </h2>
            <form className="contacts-modal-form" onSubmit={handleSubmit}>
              <label className="contacts-modal-field">
                <span>Nombre</span>
                <input
                  className="contacts-modal-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label className="contacts-modal-field">
                <span>Relación</span>
                <select
                  className="contacts-modal-input"
                  value={form.relationship}
                  onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                >
                  {relationshipOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="contacts-modal-field">
                <span>Email</span>
                <input
                  className="contacts-modal-input"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="contacts-modal-field">
                <span>Teléfono</span>
                <input
                  className="contacts-modal-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <div className="contacts-modal-actions">
                <button
                  type="button"
                  className="contacts-modal-cancel"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="contacts-modal-submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ContactCard({
  contact: c,
  onDeactivate,
}: {
  contact: ContactCardModel;
  onDeactivate?: () => void;
}) {
  const [bioModal, setBioModal] = useState<BiometricKind | null>(null);

  const relClass =
    c.relationship === 'Familia'
      ? 'contacts-rel--familia'
      : c.relationship === 'Amigo'
        ? 'contacts-rel--amigo'
        : 'contacts-rel--confianza';

  return (
    <article className="contact-card">
      <div className="contact-card-top">
        <div className="contact-card-identity">
          <div className={`contact-avatar contact-avatar--${c.avatarTone}`}>{c.initials}</div>
          <div className="contact-card-name-block">
            <h3 className="contact-card-name">{c.name}</h3>
            <span className={`contacts-rel-badge ${relClass}`}>{c.relationship}</span>
          </div>
        </div>
        <button
          type="button"
          className="contact-card-menu"
          aria-label={onDeactivate ? 'Desactivar usuario' : 'Más opciones'}
          onClick={() => onDeactivate?.()}
          disabled={!onDeactivate}
          title={onDeactivate ? 'Desactivar usuario' : undefined}
        >
          <IconDots />
        </button>
      </div>

      <div className="contact-card-row">
        <span className="contact-card-row-icon" aria-hidden>
          <IconMail />
        </span>
        <span className="contact-card-row-text">{c.email}</span>
      </div>
      <div className="contact-card-row">
        <span className="contact-card-row-icon" aria-hidden>
          <IconPhone />
        </span>
        <span className="contact-card-row-text">{c.phone}</span>
      </div>

      <div className="contact-bio-section">
        <p className="contact-bio-label">Datos Biométricos</p>
        <p className="contact-bio-microcopy">
          Pulsa <strong>Rostro</strong> o <strong>Voz</strong> para subir imagen o audio (entrenamiento próximamente).
        </p>
        <div className="contact-bio-badges">
          <button
            type="button"
            className={`contact-bio-pill contact-bio-pill--action ${c.faceOk ? 'contact-bio-pill--ok' : 'contact-bio-pill--no'}`}
            onClick={() => setBioModal('face')}
          >
            {c.faceOk ? '✓ Rostro' : '✕ Rostro'}
          </button>
          <button
            type="button"
            className={`contact-bio-pill contact-bio-pill--action ${c.voiceOk ? 'contact-bio-pill--ok' : 'contact-bio-pill--no'}`}
            onClick={() => setBioModal('voice')}
          >
            {c.voiceOk ? '✓ Voz' : '✕ Voz'}
          </button>
        </div>
      </div>

      <p className="contact-card-footer">Último acceso: {c.lastAccess}</p>

      {bioModal ? (
        <BiometricUploadModal
          kind={bioModal}
          contactName={c.name}
          onClose={() => setBioModal(null)}
        />
      ) : null}
    </article>
  );
}
