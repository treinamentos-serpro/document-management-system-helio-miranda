function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  const message = status < 500 ? error.message : 'Ocorreu um erro interno.';

  return res.status(status).json({ error: { code, message } });
}

module.exports = errorHandler;