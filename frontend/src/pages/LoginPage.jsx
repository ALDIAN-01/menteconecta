import { useState } from 'react';
import AuthLayout from '../components/AuthLayout.jsx';
import Field from '../components/Field.jsx';
import SubmitButton from '../components/SubmitButton.jsx';
import { ApiError, loginUser } from '../api/authApi.js';
import { validateLogin } from '../validation/authValidation.js';

const focusField = (id) => document.getElementById(id)?.focus();

export default function LoginPage({ onSuccess, onGoToRegister, notice }) {
  const [values, setValues] = useState({ correo: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecoveryNote, setShowRecoveryNote] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined })); // limpia el error al corregir
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const found = validateLogin(values);
    setErrors(found);
    setFormError('');
    const firstInvalid = ['correo', 'password'].find((key) => found[key]);
    if (firstInvalid) return focusField(firstInvalid);

    setLoading(true);
    try {
      const { message, user, token } = await loginUser({
        correo: values.correo.trim().toLowerCase(),
        password: values.password
      });
      onSuccess({ message, user, token });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) setErrors(err.errors);
      else setFormError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Iniciar sesión">
      {notice && (
        <p className="alert alert-info" role="status">
          {notice}
        </p>
      )}
      <form className="form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <p className="alert alert-error" role="alert">
            {formError}
          </p>
        )}

        <Field
          id="correo"
          label="Correo electrónico"
          type="email"
          placeholder="nombre@correo.com"
          autoComplete="email"
          value={values.correo}
          onChange={handleChange}
          error={errors.correo}
        />
        <Field
          id="password"
          label="Contraseña"
          type="password"
          placeholder="Tu contraseña"
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
        />

        <div className="form-row-end">
          <button type="button" className="link-button" onClick={() => setShowRecoveryNote((v) => !v)}>
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        {showRecoveryNote && (
          <p className="alert alert-info" role="status">
            La recuperación de contraseña aún no está disponible en el piloto.
          </p>
        )}

        <SubmitButton loading={loading} loadingText="Iniciando sesión…">
          Iniciar sesión
        </SubmitButton>
      </form>

      <p className="switch-text">
        ¿No tienes una cuenta?{' '}
        <button type="button" className="link-button desktop-only" onClick={onGoToRegister} disabled={loading}>
          Crear cuenta
        </button>
      </p>
      <button type="button" className="btn btn-secondary mobile-only" onClick={onGoToRegister} disabled={loading}>
        Crear una cuenta
      </button>
    </AuthLayout>
  );
}
