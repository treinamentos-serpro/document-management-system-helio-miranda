const fs = require('node:fs');
const path = require('node:path');
const documentsService = require('../services/documents.service');

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

async function upload(req, res, next) {
  if (!req.file) {
    return sendError(res, 400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
  }

  try {
    const document = documentsService.create(req.file);
    return res.status(201).json({ document });
  } catch (error) {
    return next(error);
  }
}

function list(req, res, next) {
  try {
    return res.json({ documents: documentsService.list() });
  } catch (error) {
    return next(error);
  }
}

function download(req, res, next) {
  const result = documentsService.getForDownload(req.params.id);
  if (!result) {
    return sendError(res, 404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  const safeName = path.basename(result.document.originalName.replace(/\\/g, '/'))
    .replace(/[\r\n\0]/g, '') || 'document';
  const fileStream = fs.createReadStream(result.filePath);

  fileStream.on('error', () => {
    if (res.headersSent) {
      res.destroy();
      return;
    }

    const error = new Error('Não foi possível ler o documento.');
    error.statusCode = 500;
    error.code = 'FILE_READ_ERROR';
    next(error);
  });

  res.attachment(safeName);
  res.set('Content-Type', 'application/octet-stream');
  res.set('X-Content-Type-Options', 'nosniff');
  return fileStream.pipe(res);
}

module.exports = { upload, list, download };