const path = require('node:path');

const storageDirectory = path.resolve(__dirname, '../../storage');
const documents = new Map();

function toPublicDocument(record) {
  const { storedFileName, ...document } = record;
  return document;
}

function create(document, storedFileName) {
  const record = { ...document, storedFileName };
  documents.set(document.id, record);
  return toPublicDocument(record);
}

function findAll() {
  return [...documents.values()]
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
    .map(toPublicDocument);
}

function findForDownload(id) {
  const record = documents.get(id);
  if (!record) {
    return null;
  }

  return {
    document: toPublicDocument(record),
    filePath: path.join(storageDirectory, record.storedFileName)
  };
}

module.exports = { create, findAll, findForDownload };