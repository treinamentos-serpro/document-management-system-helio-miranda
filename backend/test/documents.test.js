const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
process.env.UPLOAD_MAX_FILE_SIZE_BYTES = '64';
const app = require('../src/app');

const storageDirectory = path.resolve(__dirname, '../storage');

test('upload, listagem e download de documentos', async (t) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const uploadedIds = [];

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await Promise.all(uploadedIds.map((id) => fs.unlink(path.join(storageDirectory, id))));
  });

  const emptyListResponse = await fetch(`${baseUrl}/documents`);
  assert.equal(emptyListResponse.status, 200);
  assert.deepEqual((await emptyListResponse.json()).documents, []);

  const emptyUpload = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: new FormData()
  });
  assert.equal(emptyUpload.status, 400);
  assert.equal((await emptyUpload.json()).error.code, 'FILE_REQUIRED');

  const storageBeforeRejectedUploads = await fs.readdir(storageDirectory);
  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob([Buffer.alloc(65)]), 'large.bin');
  const oversizedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: oversizedForm
  });
  assert.equal(oversizedResponse.status, 413);
  assert.equal((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');

  const multipleFilesForm = new FormData();
  multipleFilesForm.append('file', new Blob(['one']), 'one.txt');
  multipleFilesForm.append('file', new Blob(['two']), 'two.txt');
  const multipleFilesResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: multipleFilesForm
  });
  assert.equal(multipleFilesResponse.status, 400);
  assert.equal((await multipleFilesResponse.json()).error.code, 'INVALID_MULTIPART');
  assert.deepEqual(await fs.readdir(storageDirectory), storageBeforeRejectedUploads);

  const form = new FormData();
  form.append('file', new Blob(['conteudo de teste'], { type: 'text/plain' }), 'exemplo.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
  assert.equal(uploadResponse.status, 201);

  const { document } = await uploadResponse.json();
  uploadedIds.push(document.id);
  assert.match(document.id, /^[0-9a-f-]{36}$/);
  assert.equal(document.originalName, 'exemplo.txt');
  assert.equal(document.size, Buffer.byteLength('conteudo de teste'));
  assert.equal(document.owner, 'local');
  assert.ok(Number.isNaN(Date.parse(document.uploadedAt)) === false);

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.equal(listResponse.status, 200);
  assert.deepEqual((await listResponse.json()).documents, [document]);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.equal(downloadResponse.status, 200);
  assert.equal(downloadResponse.headers.get('content-type'), 'application/octet-stream');
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
  assert.match(downloadResponse.headers.get('content-disposition'), /exemplo\.txt/);
  assert.equal(await downloadResponse.text(), 'conteudo de teste');

  const missingDownload = await fetch(`${baseUrl}/documents/not-found/download`);
  assert.equal(missingDownload.status, 404);
  assert.equal((await missingDownload.json()).error.code, 'DOCUMENT_NOT_FOUND');
});