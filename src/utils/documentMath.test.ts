import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCropRectPixels,
  formatFileSize,
  getScanQualityConfig,
  parsePageRange,
  estimateCompressedSize,
  reorderItems,
  filterVaultDocs,
  sortVaultDocs,
  toggleDocumentTag,
  collectAllTags,
  validateBackupPayload,
  uint8ToBase64,
  base64ToUint8,
  toggleSelectedId,
  selectAllIds,
  pruneSelectedIds,
  filterSelectedDocuments,
} from './documentMath';
import { hashFourDigitPin, isValidFourDigitPin, verifyFourDigitPin } from './appSecurity';
import { getTranslations } from './i18n';
import type { VaultDocument } from '../types';

test('formatFileSize formats bytes, KB, and MB cleanly', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(1.5 * 1024 * 1024), '1.50 MB');
});

test('parsePageRange parses single pages, ranges, reverse ranges, and deduplicates', () => {
  assert.deepEqual(parsePageRange('1-3, 5', 6), [0, 1, 2, 4]);
  assert.deepEqual(parsePageRange('4-2, 2, 99', 5), [1, 2, 3]);
  assert.deepEqual(parsePageRange('', 5), []);
  assert.deepEqual(parsePageRange('0, -1', 5), []);
});

test('estimateCompressedSize scales down size by preset', () => {
  const high = estimateCompressedSize(1_000_000, 'high');
  const med = estimateCompressedSize(1_000_000, 'medium');
  const ext = estimateCompressedSize(1_000_000, 'extreme');
  assert.ok(high.estimatedBytes > med.estimatedBytes);
  assert.ok(med.estimatedBytes > ext.estimatedBytes);
  assert.ok(ext.reductionPercent > med.reductionPercent);
  assert.equal(estimateCompressedSize(0, 'medium').reductionPercent, 0);
});

test('reorderItems moves items immutably', () => {
  const list = ['a', 'b', 'c', 'd'];
  assert.deepEqual(reorderItems(list, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(list, ['a', 'b', 'c', 'd']);
  assert.deepEqual(reorderItems(list, -1, 2), ['a', 'b', 'c', 'd']);
});

test('filterVaultDocs and sortVaultDocs handle tags, queries, locked state, and sort order', () => {
  const docs: VaultDocument[] = [
    {
      id: '1',
      name: 'Q4 Tax Invoice.pdf',
      category: 'scanned',
      mimeType: 'application/pdf',
      size: 1200,
      pageCount: 2,
      createdAt: 10,
      updatedAt: 100,
      isLocked: false,
      tags: ['Finance', 'Work'],
      data: new Uint8Array([1]),
    },
    {
      id: '2',
      name: 'NDA Contract.pdf',
      category: 'signed',
      mimeType: 'application/pdf',
      size: 2400,
      pageCount: 1,
      createdAt: 20,
      updatedAt: 50,
      isLocked: true,
      tags: ['Work'],
      data: new Uint8Array([2]),
    },
    {
      id: '3',
      name: 'Home Lease.pdf',
      category: 'created',
      mimeType: 'application/pdf',
      size: 800,
      pageCount: 3,
      createdAt: 30,
      updatedAt: 200,
      isLocked: false,
      tags: ['Personal'],
      data: new Uint8Array([3]),
    },
  ];
  assert.equal(filterVaultDocs(docs, '', 'all').length, 3);
  assert.equal(filterVaultDocs(docs, 'tax', 'all').length, 1);
  assert.equal(filterVaultDocs(docs, 'finance', 'all').length, 1);
  assert.equal(filterVaultDocs(docs, '', 'locked')[0].id, '2');
  assert.equal(filterVaultDocs(docs, '', 'signed')[0].id, '2');
  assert.equal(filterVaultDocs(docs, '', 'tag:Work').length, 2);
  assert.equal(filterVaultDocs(docs, '', 'tag:Personal')[0].id, '3');

  assert.deepEqual(sortVaultDocs(docs, 'newest').map((d) => d.id), ['3', '1', '2']);
  assert.deepEqual(sortVaultDocs(docs, 'oldest').map((d) => d.id), ['2', '1', '3']);
  assert.deepEqual(sortVaultDocs(docs, 'name-asc').map((d) => d.id), ['3', '2', '1']);
  assert.deepEqual(sortVaultDocs(docs, 'size-desc').map((d) => d.id), ['2', '1', '3']);
  assert.deepEqual(sortVaultDocs(docs, 'size-asc').map((d) => d.id), ['3', '1', '2']);

  assert.deepEqual(toggleDocumentTag(['Work'], 'Finance'), ['Work', 'Finance']);
  assert.deepEqual(toggleDocumentTag(['Work', 'Finance'], 'work'), ['Finance']);
  assert.deepEqual(collectAllTags(docs), ['Work', 'Personal', 'Finance']);
});

test('validateBackupPayload validates structure and base64 roundtrip', () => {
  const bytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
  const b64 = uint8ToBase64(bytes);
  assert.deepEqual(base64ToUint8(b64), bytes);

  assert.equal(validateBackupPayload(null).valid, false);
  assert.equal(validateBackupPayload({ version: 2, documents: [] }).valid, false);
  assert.equal(
    validateBackupPayload({
      version: 1,
      documents: [{ id: '1', name: 'Doc.pdf', dataBase64: b64 }],
    }).valid,
    true
  );
});

test('getScanQualityConfig maps high-hd, balanced, and compact quality presets', () => {
  const hd = getScanQualityConfig('high-hd');
  const bal = getScanQualityConfig('balanced');
  const cmp = getScanQualityConfig('compact');
  assert.ok(hd.maxDimensionPx > bal.maxDimensionPx);
  assert.ok(bal.maxDimensionPx > cmp.maxDimensionPx);
  assert.ok(hd.jpegQuality > bal.jpegQuality);
  assert.ok(bal.jpegQuality > cmp.jpegQuality);
});

test('appSecurity validates, hashes, and verifies 4-digit PINs safely', async () => {
  assert.equal(isValidFourDigitPin('1234'), true);
  assert.equal(isValidFourDigitPin('0007'), true);
  assert.equal(isValidFourDigitPin('123'), false);
  assert.equal(isValidFourDigitPin('12a4'), false);

  const hash = await hashFourDigitPin('4829');
  assert.notEqual(hash, '4829');
  assert.equal(await verifyFourDigitPin('4829', hash), true);
  assert.equal(await verifyFourDigitPin('1111', hash), false);
  assert.equal(await verifyFourDigitPin('4829', null), false);
});

test('getTranslations provides complete English and Hindi dictionaries', () => {
  const en = getTranslations('en');
  const hi = getTranslations('hi');
  assert.equal(en.nav.settings, 'Settings');
  assert.equal(hi.nav.settings, 'सेटिंग्स');
  assert.equal(en.home.trustPoints.length, 3);
  assert.equal(hi.home.trustPoints.length, 3);
});

test('computeCropRectPixels computes valid bounded crop rectangles', () => {
  assert.deepEqual(
    computeCropRectPixels(1000, 2000, { top: 10, right: 20, bottom: 10, left: 10 }),
    { sx: 100, sy: 200, sw: 700, sh: 1600 }
  );
  const clamped = computeCropRectPixels(500, 500, { top: 95, right: 95, bottom: 95, left: 95 });
  assert.ok(clamped.sw >= 10 && clamped.sh >= 10);
  assert.ok(clamped.sx + clamped.sw <= 500 && clamped.sy + clamped.sh <= 500);
});

test('vault multi-select helpers toggle, select all, prune, and filter selected documents', () => {
  const sampleDocs: VaultDocument[] = [
    {
      id: 'a',
      name: 'Alpha.pdf',
      category: 'scanned',
      mimeType: 'application/pdf',
      size: 100,
      pageCount: 1,
      createdAt: 1,
      updatedAt: 1,
      isLocked: false,
      data: new Uint8Array([1]),
    },
    {
      id: 'b',
      name: 'Beta.pdf',
      category: 'created',
      mimeType: 'application/pdf',
      size: 200,
      pageCount: 2,
      createdAt: 2,
      updatedAt: 2,
      isLocked: false,
      data: new Uint8Array([2]),
    },
    {
      id: 'c',
      name: 'Gamma.pdf',
      category: 'merged',
      mimeType: 'application/pdf',
      size: 300,
      pageCount: 3,
      createdAt: 3,
      updatedAt: 3,
      isLocked: false,
      data: new Uint8Array([3]),
    },
  ];

  let selected = toggleSelectedId([], 'a');
  selected = toggleSelectedId(selected, 'c');
  assert.deepEqual(selected, ['a', 'c']);
  selected = toggleSelectedId(selected, 'a');
  assert.deepEqual(selected, ['c']);

  const allIds = selectAllIds(sampleDocs);
  assert.deepEqual(allIds, ['a', 'b', 'c']);

  const pruned = pruneSelectedIds(['a', 'deleted-id', 'c'], sampleDocs);
  assert.deepEqual(pruned, ['a', 'c']);

  const filtered = filterSelectedDocuments(sampleDocs, pruned);
  assert.deepEqual(
    filtered.map((d) => d.id),
    ['a', 'c']
  );
});
