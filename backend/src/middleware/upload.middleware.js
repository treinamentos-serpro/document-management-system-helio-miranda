const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const FILESYSTEM_ERROR_CODES = new Set(['EACCES', 'EIO', 'ENOSPC', 'EPERM', 'EROFS']);
const storageDirectory = path.resolve(__dirname, '../../storage');
const configuredMaxFileSize = process.env.UPLOAD_MAX_FILE_SIZE_BYTES;

if (configuredMaxFileSize !== undefined
  && (!Number.isSafeInteger(Number(configuredMaxFileSize)) || Number(configuredMaxFileSize) <= 0)) {
  throw new Error('UPLOAD_MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
}

const maxFileSize = configuredMaxFileSize === undefined
  ? DEFAULT_MAX_FILE_SIZE_BYTES
  : Number(configuredMaxFileSize);

fs.mkdirSync(storageDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, storageDirectory),
  filename: (req, file, callback) => {
    const id = crypto.randomUUID();
    req.documentId = id;
    callback(null, id);
  }
});

const upload = multer({ storage, limits: { fileSize: maxFileSize } }).single('file');

function uploadSingleFile(req, res, next) {
  upload(req, res, (error) => {
    if (!error) {
      return next();
    }

    const tooLarge = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
    const isMultipart = req.is('multipart/form-data');

    if (FILESYSTEM_ERROR_CODES.has(error.code)) {
      const storageError = new Error('Não foi possível salvar o arquivo.');
      storageError.statusCode = 500;
      storageError.code = 'STORAGE_ERROR';
      return next(storageError);
    }

    if (error instanceof multer.MulterError || isMultipart) {
      const normalizedError = new Error(tooLarge
        ? 'O arquivo excede o tamanho máximo permitido.'
        : 'A requisição multipart/form-data é inválida.');
      normalizedError.statusCode = tooLarge ? 413 : 400;
      normalizedError.code = tooLarge ? 'FILE_TOO_LARGE' : 'INVALID_MULTIPART';
      return next(normalizedError);
    }

    return next(error);
  });
}

module.exports = uploadSingleFile;