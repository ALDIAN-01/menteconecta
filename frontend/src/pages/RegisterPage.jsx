import { useState } from 'react';
import AuthLayout from '../components/AuthLayout.jsx';
import Field from '../components/Field.jsx';
import SubmitButton from '../components/SubmitButton.jsx';
import { ApiError, registerUser } from '../api/authApi.js';
import { RULES, validateRegister } from '../validation/authValidation.js';

const FIELD_ORDER = ['nombre', 'correo', 'password', 'confirmPassword', 'acepta'];
const focusField = (id) => document.getElementById(id)?.focus();

export default function RegisterPage({ onSuccess, onGoToLogin }) {
  const [values, setValues] = useState({
    nombre: '',
    correo: '',
    password: '',
    confirmPassword: '',
    acepta: false
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setValues((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const found = validateRegister(values);
    setErrors(found);
    setFormError('');
    const firstInvalid = FIELD_ORDER.find((key) => found[key]);
    if (firstInvalid) return focusField(firstInvalid);

    setLoading(true);
    try {
      // Solo se envían los 3 campos del contrato; la confirmación y los términos no viajan al backend.
      const { message, user, token } = await registerUser({
        nombre: values.nombre.trim(),
        correo: values.correo.trim().toLowerCase(),
        password: values.password
      });
      onSuccess({ message, user, token });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ correo: err.message });
        focusField('correo');
      } else if (err instanceof ApiError && err.status === 400) {
        setErrors(err.errors);
      } else {
        setFormError(err.message);
      }
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Crear cuenta">
      <form className="form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <p className="alert alert-error" role="alert">
            {formError}
          </p>
        )}

        <div className="form-grid">
          <Field
            id="nombre"
            label="Nombre completo"
            type="text"
            placeholder="Escribe tu nombre"
            autoComplete="name"
            maxLength={RULES.nombreMax}
            value={values.nombre}
            onChange={handleChange}
            error={errors.nombre}
          />
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
            placeholder="Crea una contraseña"
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange}
            error={errors.password}
          />
          <Field
            id="confirmPassword"
            label="Confirmar contraseña"
            type="password"
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
          />
        </div>
        {!errors.password && <p className="field-hint">Usa al menos {RULES.passwordMin} caracteres.</p>}

        <div className="check-field">
          <label className="check">
            <input
              id="acepta"
              name="acepta"
              type="checkbox"
              checked={values.acepta}
              onChange={handleChange}
              aria-invalid={errors.acepta ? 'true' : undefined}
              aria-describedby={errors.acepta ? 'acepta-error' : undefined}
            />
            <span>Acepto los términos y condiciones y la política de protección de datos.</span>
          </label>
          {errors.acepta && (
            <p id="acepta-error" className="field-error">
              {errors.acepta}
            </p>
          )}
        </div>

        <SubmitButton loading={loading} loadingText="Creando cuenta…">
          Crear mi cuenta
        </SubmitButton>
      </form>

      <p className="switch-text">
        <button type="button" className="link-button" onClick={onGoToLogin} disabled={loading}>
          Ya tengo una cuenta
        </button>
      </p>
    </AuthLayout>
  );
}
