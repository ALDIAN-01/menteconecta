export default function SubmitButton({ loading, loadingText, children }) {
  return (
    <button type="submit" className="btn btn-primary" disabled={loading}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {loading ? loadingText : children}
    </button>
  );
}
