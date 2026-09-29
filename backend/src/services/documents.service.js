const documentsRepository = require('../repositories/documents.repository');

function create(file) {
  const document = {
    id: file.filename,
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: 'local'
  };

  documentsRepository.create(document, file.filename);
  return document;
}

function list() {
  return documentsRepository.findAll();
}

function getForDownload(id) {
  return documentsRepository.findForDownload(id);
}

module.exports = { create, list, getForDownload };