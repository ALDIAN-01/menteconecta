export const EMOTIONS = [
  { nombre: 'Calma', emoji: '😌' },
  { nombre: 'Alegría', emoji: '😊' },
  { nombre: 'Tristeza', emoji: '😢' },
  { nombre: 'Ansiedad', emoji: '😟' }
];
const MAX_NOTE_LENGTH = 1000;

export function validateEmotionForm({ emocion, intensidad, nota }) {
  const errors = {};
  if (!EMOTIONS.some((item) => item.nombre === emocion)) errors.emocion = 'Selecciona una emoción.';
  const intensity = Number(intensidad);
  if (!Number.isInteger(intensity) || intensity < 1 || intensity > 5) {
    errors.intensidad = 'Selecciona una intensidad entre 1 y 5.';
  }
  if (typeof nota !== 'string' || nota.length > MAX_NOTE_LENGTH) {
    errors.nota = `La nota no puede superar ${MAX_NOTE_LENGTH} caracteres.`;
  }
  return errors;
}
