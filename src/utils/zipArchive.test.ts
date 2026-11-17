import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import type { AppSettings, VaultDocument } from '../types';
import {
  buildZipManifestData,
  exportVaultAsZip,
  sanitizeArchiveFilename,
} from './zipArchive';

test('sanitizeArchiveFilename cleans invalid path chars and deduplicates collisions', () => {
  const used = new Set<string>();
  assert.equal(sanitizeArchiveFilename('Report/Q4:Final?.pdf', used), 'Report_Q4_Final_.pdf');
  assert.equal(sanitizeArchiveFilename('Invoice.pdf', used), 'Invoice.pdf');
  assert.equal(sanitizeArchiveFilename('Invoice.pdf', used), 'Invoice (2).pdf');
  assert.equal(sanitizeArchiveFilename('invoice.pdf', used), 'invoice (3).pdf');
});

test('exportVaultAsZip generates a valid ZIP archive containing manifest and raw documents', async () => {
  const settings: AppSettings = {
    darkMode: false,
    notificationsEnabled: true,
    appLockEnabled: false,
    appPinHash: null,
    scanQuality: 'high-hd',
    language: 'en',
  };
  const docs: VaultDocument[] = [
    {
      id: 'd1',
      name: 'Contract.pdf',
      category: 'signed',
      mimeType: 'application/pdf',
      size: 5,
      pageCount: 1,
      createdAt: 1000,
      updatedAt: 2000,
      isLocked: false,
      tags: ['Work'],
      data: new Uint8Array([37, 80, 68, 70, 45]),
    },
    {
      id: 'd2',
      name: 'Contract.pdf',
      category: 'scanned',
      mimeType: 'application/pdf',
      size: 4,
      pageCount: 1,
      createdAt: 1500,
      updatedAt: 2500,
      isLocked: true,
      tags: ['Finance'],
      data: new Uint8Array([9, 8, 7, 6]),
    },
  ];

  const manifestBundle = buildZipManifestData(docs, settings);
  assert.equal(manifestBundle.manifest.documentCount, 2);
  assert.equal(manifestBundle.manifest.documents[0].archivePath, 'documents/Contract.pdf');
  assert.equal(manifestBundle.manifest.documents[1].archivePath, 'documents/Contract (2).pdf.aes256');

  const { bytes, fileCount, filename } = await exportVaultAsZip(docs, settings);
  assert.equal(fileCount, 2);
  assert.ok(filename.endsWith('.zip'));

  // Roundtrip inspect with JSZip
  const loaded = await JSZip.loadAsync(bytes);
  const manifestText = await loaded.file('vault-manifest.json')?.async('string');
  assert.ok(manifestText);
  const parsedManifest = JSON.parse(manifestText);
  assert.equal(parsedManifest.format, 'pdf-studio-zip-archive-v1');
  assert.equal(parsedManifest.documents.length, 2);

  const extractedDoc1 = await loaded.file('documents/Contract.pdf')?.async('uint8array');
  assert.deepEqual(extractedDoc1, docs[0].data);
  const extractedDoc2 = await loaded.file('documents/Contract (2).pdf.aes256')?.async('uint8array');
  assert.deepEqual(extractedDoc2, docs[1].data);

  const selectedExport = await exportVaultAsZip([docs[0]], settings, {
    filenamePrefix: 'PurePDF-Selected-Files',
  });
  assert.equal(selectedExport.fileCount, 1);
  assert.ok(selectedExport.filename.startsWith('PurePDF-Selected-Files-'));
  const selectedZip = await JSZip.loadAsync(selectedExport.bytes);
  assert.ok(selectedZip.file('documents/Contract.pdf'));
  assert.equal(selectedZip.file('documents/Contract (2).pdf.aes256'), null);
});
