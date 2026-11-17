import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  encryptBytesWithPassword,
  decryptBytesWithPassword,
  encryptPdfBytes,
} from './pdfCrypto';

test('AES-256-GCM vault encryption roundtrip succeeds with right password and fails with wrong password', async () => {
  const payload = new TextEncoder().encode('Confidential PDF bytes 12345');
  const encrypted = await encryptBytesWithPassword(payload, 'VaultPass99');
  assert.notDeepEqual(encrypted, payload);

  const decrypted = await decryptBytesWithPassword(encrypted, 'VaultPass99');
  assert.deepEqual(decrypted, payload);

  await assert.rejects(
    () => decryptBytesWithPassword(encrypted, 'WrongPass'),
    /Incorrect password/
  );
});

test('encryptPdfBytes creates valid Standard Security Handler R3 PDF verified by pdfjs-dist', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([300, 300]);
  page.drawText('Top Secret Document', { x: 40, y: 200, size: 16, font });
  const rawPdf = await doc.save({ useObjectStreams: false });

  const encryptedPdf = encryptPdfBytes(rawPdf, 'OpenSesame');
  const pdfText = new TextDecoder('latin1').decode(encryptedPdf);
  assert.ok(pdfText.includes('/Encrypt '));
  assert.ok(pdfText.includes('/Filter /Standard'));

  // Verify using pdfjs-dist legacy build in Node
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  await assert.rejects(async () => {
    const task = pdfjs.getDocument({ data: encryptedPdf.slice(), verbosity: 0 });
    await task.promise;
  });

  const unlockedTask = pdfjs.getDocument({
    data: encryptedPdf.slice(),
    password: 'OpenSesame',
    verbosity: 0,
  });
  const loaded = await unlockedTask.promise;
  assert.equal(loaded.numPages, 1);
  const p1 = await loaded.getPage(1);
  const textContent = await p1.getTextContent();
  const extracted = textContent.items.map((item) => ('str' in item ? item.str : '')).join(' ');
  assert.ok(extracted.includes('Top Secret Document'));
});
