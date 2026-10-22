import { useEffect, useState } from 'react';
import { ApiError, acceptEmotionalRecordConsent, createEmotionRecord, deleteEmotionRecord, getConsentStatus, getEmotionRecords } from '../api/authApi.js';
import { Logo } from '../components/AuthLayout.jsx';
import { validateEmotionForm } from '../validation/emotionValidation.js';

const INITIAL_FORM = { emocion: '', intensidad: '3', nota: '' };

const formatDate = (value) => new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(value));

export default function EmotionPage({ session, onBack, onLogout, onSessionExpired }) {
  const [consent, setConsent] = useState(null);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pageError, setPageError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const consentStatus = await getConsentStatus(session.token);
        const history = await getEmotionRecords(session.token);
        if (!cancelled) {
          setConsent(consentStatus);
          setRecords(history.registros);
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) onSessionExpired();
        else setPageError(error.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session.token, onSessionExpired]);

  const handleAccept = async () => {
    setAccepting(true);
    setPageError('');
    setSuccess('');
    try {
      const result = await acceptEmotionalRecordConsent(session.token);
      setConsent(result);
      setSuccess('Tu decisión de consentimiento quedó registrada.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onSessionExpired();
      else setPageError(error.message);
    } finally {
      setAccepting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const errors = validateEmotionForm(form);
    setFieldErrors(errors);
    setPageError('');
    setSuccess('');
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const result = await createEmotionRecord(session.token, {
        emocion: form.emocion,
        intensidad: Number(form.intensidad),
        nota: form.nota
      });
      setRecords((previous) => [result.registro, ...previous]);
      setForm(INITIAL_FORM);
      setSuccess('Registro emocional guardado.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onSessionExpired();
      else if (error instanceof ApiError && error.status === 400) setFieldErrors(error.errors);
      else {
        setPageError(error.message);
        if (error instanceof ApiError && error.status === 403) {
          try {
            setConsent(await getConsentStatus(session.token));
          } catch (statusError) {
            if (statusError instanceof ApiError && statusError.status === 401) onSessionExpired();
            else setPageError(statusError.message);
          }
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm('¿Quieres eliminar este registro emocional? Esta acción no se puede deshacer.')) return;
    setDeletingId(record.idRegistro);
    setPageError('');
    setSuccess('');
    try {
      await deleteEmotionRecord(session.token, record.idRegistro);
      setRecords((previous) => previous.filter((item) => item.idRegistro !== record.idRegistro));
      setSuccess('Registro eliminado.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onSessionExpired();
      else setPageError(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const isConsentValid = consent?.consentimiento?.valido === true;

  return (
    <div className="auth-page">
      <main className="emotion-card">
        <header className="emotion-header">
          <Logo />
          <div className="emotion-actions">
            <button type="button" className="link-button" onClick={onBack}>Volver</button>
            <button type="button" className="link-button" onClick={onLogout}>Cerrar sesión</button>
          </div>
        </header>

        <h1 className="auth-title">Mi registro emocional</h1>
        <p className="muted">Un espacio personal para registrar cómo te sientes. Tus registros no se envían a servicios externos.</p>

        {pageError && <p className="alert alert-error" role="alert">{pageError}</p>}
        {success && <p className="alert alert-success" role="status">{success}</p>}
        {loading && <p className="muted" role="status">Cargando tu información…</p>}
        {!loading && consent?.politica?.esBorrador && (
          <p className="alert alert-info" role="note">
            El texto de la política es un borrador pendiente de aprobación institucional; no representa una declaración de cumplimiento legal.
          </p>
        )}

        {!loading && consent && !isConsentValid && (
          <section className="consent-panel" aria-labelledby="consent-title">
            <h2 id="consent-title">Consentimiento para el registro emocional</h2>
            <p className="field-hint">
              Finalidad: almacenar tus registros emocionales para que puedas consultarlos en tu cuenta. Este permiso no autoriza otros usos.
            </p>
            <div className="policy-text">
              <h3>Política {consent.politica.version}</h3>
              <p>{consent.politica.contenido}</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleAccept} disabled={accepting}>
              {accepting ? 'Guardando decisión…' : 'Acepto y autorizo el registro emocional'}
            </button>
          </section>
        )}

        {!loading && isConsentValid && (
          <section className="emotion-form-panel" aria-labelledby="emotion-form-title">
            <h2 id="emotion-form-title">¿Cómo te sientes hoy?</h2>
            <form className="form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="emocion">Emoción</label>
                <select
                  id="emocion"
                  name="emocion"
                  value={form.emocion}
                  onChange={(event) => {
                    setForm((previous) => ({ ...previous, emocion: event.target.value }));
                    setFieldErrors((previous) => ({ ...previous, emocion: undefined }));
                  }}
                  aria-invalid={fieldErrors.emocion ? 'true' : undefined}
                  aria-describedby={fieldErrors.emocion ? 'emocion-error' : undefined}
                  disabled={saving}
                >
                  <option value="">Selecciona una emoción</option>
                  <option value="Calma">Calma</option>
                  <option value="Alegría">Alegría</option>
                  <option value="Tristeza">Tristeza</option>
                  <option value="Ansiedad">Ansiedad</option>
                </select>
                {fieldErrors.emocion && <p id="emocion-error" className="field-error">{fieldErrors.emocion}</p>}
              </div>

              <div className="field">
                <label htmlFor="intensidad">Intensidad (1 a 5)</label>
                <select
                  id="intensidad"
                  name="intensidad"
                  value={form.intensidad}
                  onChange={(event) => {
                    setForm((previous) => ({ ...previous, intensidad: event.target.value }));
                    setFieldErrors((previous) => ({ ...previous, intensidad: undefined }));
                  }}
                  aria-invalid={fieldErrors.intensidad ? 'true' : undefined}
                  aria-describedby={fieldErrors.intensidad ? 'intensidad-error' : undefined}
                  disabled={saving}
                >
                  {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                {fieldErrors.intensidad && <p id="intensidad-error" className="field-error">{fieldErrors.intensidad}</p>}
              </div>

              <div className="field">
                <label htmlFor="nota">Nota opcional</label>
                <textarea
                  id="nota"
                  name="nota"
                  value={form.nota}
                  maxLength={1000}
                  rows={4}
                  onChange={(event) => {
                    setForm((previous) => ({ ...previous, nota: event.target.value }));
                    setFieldErrors((previous) => ({ ...previous, nota: undefined }));
                  }}
                  aria-invalid={fieldErrors.nota ? 'true' : undefined}
                  aria-describedby={fieldErrors.nota ? 'nota-error' : 'nota-count'}
                  disabled={saving}
                />
                <p id="nota-count" className="field-hint">{form.nota.length}/1000 caracteres</p>
                {fieldErrors.nota && <p id="nota-error" className="field-error">{fieldErrors.nota}</p>}
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar registro'}
              </button>
            </form>
          </section>
        )}

        <section className="history-section" aria-labelledby="history-title">
          <h2 id="history-title">Historial personal</h2>
          {!loading && records.length === 0 && <p className="muted">Todavía no tienes registros guardados.</p>}
          {records.length > 0 && (
            <ul className="emotion-list">
              {records.map((record) => (
                <li className="emotion-record" key={record.idRegistro}>
                  <div className="emotion-record-details">
                    <strong>{record.emocion}</strong>
                    <span>Intensidad {record.intensidad} de 5 · {formatDate(record.fecha)}</span>
                    {record.nota && <p>{record.nota}</p>}
                  </div>
                  <button
                    type="button"
                    className="link-button delete-button"
                    onClick={() => handleDelete(record)}
                    disabled={deletingId === record.idRegistro}
                    aria-label={`Eliminar registro de ${record.emocion}`}
                  >
                    {deletingId === record.idRegistro ? 'Eliminando…' : 'Eliminar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
