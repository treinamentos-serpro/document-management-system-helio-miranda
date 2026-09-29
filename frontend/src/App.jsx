import { useEffect, useRef, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documents.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const uploaded = useRef(false);

  useEffect(() => {
    let active = true;

    listDocuments()
      .then((items) => {
        if (active) {
          setDocuments((current) => {
            const listedIds = new Set(items.map((item) => item.id));
            return [...items, ...current.filter((item) => !listedIds.has(item.id))];
          });
        }
      })
      .catch((loadError) => {
        if (active && !uploaded.current) setError(loadError.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, []);

  function handleUploaded(document) {
    uploaded.current = true;
    setDocuments((current) => [...current, document]);
    setIsLoading(false);
    setError('');
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <span className="brand-mark" aria-hidden="true">D</span>
        <span>Document Management System</span>
      </header>

      <section className="page-intro">
        <p className="eyebrow">Biblioteca de arquivos</p>
        <h1>Documentos</h1>
      </section>

      <section className="upload-section" aria-labelledby="upload-heading">
        <h2 id="upload-heading">Novo documento</h2>
        <UploadComponent onUploaded={handleUploaded} />
      </section>

      <section className="documents-section" aria-labelledby="documents-heading">
        <div className="section-heading">
          <h2 id="documents-heading">Arquivos</h2>
          {!isLoading && !error && <span className="document-count">{documents.length} {documents.length === 1 ? 'documento' : 'documentos'}</span>}
        </div>
        {error && <p className="feedback error" role="alert">{error}</p>}
        {isLoading ? <p className="empty-state" role="status">Carregando documentos...</p> : !error && <DocumentList documents={documents} />}
      </section>
    </main>
  );
}
