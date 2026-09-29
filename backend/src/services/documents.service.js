const documentsRepository = require('../repositories/documents.repository');

function create(file) {
  const document = {
    id: file.filename,
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: 'local'
  };

  return documentsRepository.create(document, file.filename);
}

const list = documentsRepository.findAll;
const getForDownload = documentsRepository.findForDownload;

module.exports = { create, list, getForDownload };