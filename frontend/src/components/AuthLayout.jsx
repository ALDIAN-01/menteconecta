import { useState } from 'react';

export function Logo({ className = '' }) {
  return (
    <span className={`logo ${className}`.trim()}>
      Mente<span className="logo-accent">Conecta</span>
    </span>
  );
}

/** Ilustración de la marca (anillo morado + círculos verdes), según Figma. */
function Illustration() {
  return (
    <svg className="aside-illustration" viewBox="0 0 140 140" role="img" aria-label="Ilustración de MenteConecta">
      <circle cx="62" cy="68" r="54" fill="#F7F5FC" />
      <circle cx="62" cy="68" r="38" fill="#FFFFFF" stroke="#6D28D9" strokeWidth="12" />
      <circle cx="14" cy="26" r="8" fill="#008060" />
      <circle cx="104" cy="104" r="22" fill="#008060" />
      <circle cx="104" cy="104" r="12" fill="#A7E8D3" />
    </svg>
  );
}

/**
 * Estructura común de las pantallas de acceso:
 *  - escritorio: panel lateral de marca + formulario
 *  - móvil: solo la tarjeta con el formulario
 */
export default function AuthLayout({ title, children }) {
  const [showPrivacyNote, setShowPrivacyNote] = useState(false);

  return (
    <div className="auth-page">
      <main className="auth-card">
        <aside className="auth-aside" aria-hidden="true">
          <div>
            <Logo />
            <p className="aside-tagline">Bienestar emocional</p>
          </div>
          <Illustration />
          <p className="aside-features">
            Registro emocional · Recursos
            <br />
            Asistente IA
          </p>
        </aside>

        <section className="auth-main">
          <Logo className="logo-mobile" />
          <h1 className="auth-title">{title}</h1>
          {children}
        </section>
      </main>

      <footer className="auth-footer">
        <span>MenteConecta</span>
        <button type="button" className="link-button" onClick={() => setShowPrivacyNote((v) => !v)}>
          Política de privacidad
        </button>
      </footer>
      {showPrivacyNote && (
        <p className="auth-footer-note" role="status">
          El texto de la política de privacidad institucional se publicará próximamente.
        </p>
      )}
    </div>
  );
}
