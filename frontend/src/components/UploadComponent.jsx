import { useState } from 'react';
import { uploadDocument } from '../services/documents.js';

export default function UploadComponent({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploading) return;

    const form = event.currentTarget;
    setIsUploading(true);
    setError('');

    try {
      const document = await uploadDocument(file);
      form.reset();
      setFile(null);
      onUploaded(document);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label htmlFor="document-file">Arquivo</label>
      <div className="upload-controls">
        <input
          id="document-file"
          type="file"
          required
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        <button type="submit" disabled={!file || isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </div>
      {error && <p className="feedback error" role="alert">{error}</p>}
    </form>
  );
}