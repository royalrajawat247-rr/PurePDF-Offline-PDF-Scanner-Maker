/**
 * On-device cryptography utilities:
 * 1. AES-256-GCM + PBKDF2 (Web Crypto) for locking/unlocking files inside File Vault.
 * 2. Standard PDF 1.4 RC4-128 (/Encrypt Revision 3) encryption for exported password-locked PDFs.
 */

const VAULT_MAGIC = new Uint8Array([0x50, 0x44, 0x53, 0x4c]); // "PDSL"
const SALT_LEN = 16;
const IV_LEN = 12;

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API is unavailable in this context.');
  }
  return subtle;
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtle();
  const enc = new TextEncoder();
  const baseKey = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBytesWithPassword(
  plainBytes: Uint8Array,
  password: string
): Promise<Uint8Array> {
  if (!password) throw new Error('Password cannot be empty.');
  const subtle = getSubtle();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveAesKey(password, salt);

  const cipherBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(plainBytes)
  );
  const cipherBytes = new Uint8Array(cipherBuffer);

  const out = new Uint8Array(VAULT_MAGIC.length + SALT_LEN + IV_LEN + cipherBytes.length);
  out.set(VAULT_MAGIC, 0);
  out.set(salt, VAULT_MAGIC.length);
  out.set(iv, VAULT_MAGIC.length + SALT_LEN);
  out.set(cipherBytes, VAULT_MAGIC.length + SALT_LEN + IV_LEN);
  return out;
}

export async function decryptBytesWithPassword(
  encryptedEnvelope: Uint8Array,
  password: string
): Promise<Uint8Array> {
  if (!password) throw new Error('Password cannot be empty.');
  const headerLen = VAULT_MAGIC.length + SALT_LEN + IV_LEN;
  if (encryptedEnvelope.length <= headerLen) {
    throw new Error('Corrupted locked file payload.');
  }
  for (let i = 0; i < VAULT_MAGIC.length; i++) {
    if (encryptedEnvelope[i] !== VAULT_MAGIC[i]) {
      throw new Error('Invalid locked file header.');
    }
  }
  const salt = encryptedEnvelope.slice(VAULT_MAGIC.length, VAULT_MAGIC.length + SALT_LEN);
  const iv = encryptedEnvelope.slice(VAULT_MAGIC.length + SALT_LEN, headerLen);
  const cipherBytes = encryptedEnvelope.slice(headerLen);

  const key = await deriveAesKey(password, salt);
  try {
    const plainBuffer = await getSubtle().decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(cipherBytes)
    );
    return new Uint8Array(plainBuffer);
  } catch {
    throw new Error('Incorrect password. Unable to unlock file.');
  }
}

// ---------------------------------------------------------------------------
// Standard PDF 1.4 RC4-128 Encryption (ISO 32000-1 Standard Security Handler R3)
// ---------------------------------------------------------------------------

const PDF_PADDING = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41,
  0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80,
  0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

function md5(input: Uint8Array): Uint8Array {
  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
  }

  const bitLen = input.length * 8;
  const padLen = ((56 - ((input.length + 1) % 64)) + 64) % 64;
  const padded = new Uint8Array(input.length + 1 + padLen + 8);
  padded.set(input, 0);
  padded[input.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLen >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000) >>> 0, true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(offset + j * 4, true);
    }
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      const rot = s[i];
      B = (B + ((F << rot) | (F >>> (32 - rot)))) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return out;
}

function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) & 0xff;
    const tmp = S[i];
    S[i] = S[j];
    S[j] = tmp;
  }
  const out = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) & 0xff;
    j = (j + S[i]) & 0xff;
    const tmp = S[i];
    S[i] = S[j];
    S[j] = tmp;
    out[k] = data[k] ^ S[(S[i] + S[j]) & 0xff];
  }
  return out;
}

function padPassword(password: string): Uint8Array {
  const raw = new TextEncoder().encode(password);
  const out = new Uint8Array(32);
  const copyLen = Math.min(32, raw.length);
  out.set(raw.subarray(0, copyLen), 0);
  if (copyLen < 32) {
    out.set(PDF_PADDING.subarray(0, 32 - copyLen), copyLen);
  }
  return out;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function escapePdfLiteralBytes(bytes: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x28 || b === 0x29 || b === 0x5c) {
      out.push(0x5c, b);
    } else if (b === 0x0d) {
      out.push(0x5c, 0x72);
    } else if (b === 0x0a) {
      out.push(0x5c, 0x6e);
    } else {
      out.push(b);
    }
  }
  return new Uint8Array(out);
}

function unescapePdfLiteral(inner: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < inner.length; i++) {
    const b = inner[i];
    if (b === 0x5c && i + 1 < inner.length) {
      i++;
      const n = inner[i];
      if (n === 0x6e) out.push(0x0a);
      else if (n === 0x72) out.push(0x0d);
      else if (n === 0x74) out.push(0x09);
      else if (n === 0x62) out.push(0x08);
      else if (n === 0x66) out.push(0x0c);
      else if (n >= 0x30 && n <= 0x37) {
        let oct = String.fromCharCode(n);
        if (i + 1 < inner.length && inner[i + 1] >= 0x30 && inner[i + 1] <= 0x37) {
          oct += String.fromCharCode(inner[++i]);
        }
        if (i + 1 < inner.length && inner[i + 1] >= 0x30 && inner[i + 1] <= 0x37) {
          oct += String.fromCharCode(inner[++i]);
        }
        out.push(parseInt(oct, 8) & 0xff);
      } else {
        out.push(n);
      }
    } else {
      out.push(b);
    }
  }
  return new Uint8Array(out);
}

function computeObjectKey(fileKey: Uint8Array, objNum: number, genNum: number): Uint8Array {
  const buf = new Uint8Array(fileKey.length + 5);
  buf.set(fileKey, 0);
  buf[fileKey.length] = objNum & 0xff;
  buf[fileKey.length + 1] = (objNum >> 8) & 0xff;
  buf[fileKey.length + 2] = (objNum >> 16) & 0xff;
  buf[fileKey.length + 3] = genNum & 0xff;
  buf[fileKey.length + 4] = (genNum >> 8) & 0xff;
  return md5(buf);
}

function encryptObjectBody(body: string, objKey: Uint8Array): string {
  // Encrypt streams and literal/hex strings inside an indirect object body
  const latin1Bytes = (str: string): Uint8Array => {
    const arr = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i) & 0xff;
    return arr;
  };
  const bytesToLatin1 = (bytes: Uint8Array): string => {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  };

  const encryptDictAndTokens = (segment: string): string => {
    let result = '';
    let i = 0;
    while (i < segment.length) {
      const ch = segment[i];
      if (ch === '(') {
        // Parse literal string accounting for escapes and nested parens
        let depth = 1;
        let j = i + 1;
        while (j < segment.length && depth > 0) {
          if (segment[j] === '\\') {
            j += 2;
            continue;
          }
          if (segment[j] === '(') depth++;
          else if (segment[j] === ')') depth--;
          j++;
        }
        const rawInner = latin1Bytes(segment.slice(i + 1, j - 1));
        const unescaped = unescapePdfLiteral(rawInner);
        const encrypted = rc4(objKey, unescaped);
        result += '(' + bytesToLatin1(escapePdfLiteralBytes(encrypted)) + ')';
        i = j;
      } else if (ch === '<' && segment[i + 1] === '<') {
        result += '<<';
        i += 2;
      } else if (ch === '>' && segment[i + 1] === '>') {
        result += '>>';
        i += 2;
      } else if (ch === '<') {
        const end = segment.indexOf('>', i + 1);
        if (end !== -1) {
          const hex = segment.slice(i + 1, end).replace(/\s+/g, '');
          const cleanHex = hex.length % 2 === 1 ? hex + '0' : hex;
          const raw = new Uint8Array(cleanHex.length / 2);
          for (let k = 0; k < raw.length; k++) {
            raw[k] = parseInt(cleanHex.slice(k * 2, k * 2 + 2), 16) || 0;
          }
          const encrypted = rc4(objKey, raw);
          result += '<' + toHex(encrypted) + '>';
          i = end + 1;
          continue;
        }
        result += ch;
        i++;
      } else {
        result += ch;
        i++;
      }
    }
    return result;
  };

  const streamIdx = body.indexOf('stream');
  if (streamIdx === -1) {
    return encryptDictAndTokens(body);
  }

  // Verify 'stream' is followed by \r\n or \n
  let dataStart = -1;
  if (body.startsWith('stream\r\n', streamIdx)) dataStart = streamIdx + 8;
  else if (body.startsWith('stream\n', streamIdx)) dataStart = streamIdx + 7;

  const endStreamIdx = body.lastIndexOf('endstream');
  if (dataStart === -1 || endStreamIdx === -1 || endStreamIdx < dataStart) {
    return encryptDictAndTokens(body);
  }

  // Trim trailing EOL right before endstream if present
  let dataEnd = endStreamIdx;
  if (dataEnd >= dataStart + 2 && body[dataEnd - 2] === '\r' && body[dataEnd - 1] === '\n') {
    dataEnd -= 2;
  } else if (dataEnd >= dataStart + 1 && (body[dataEnd - 1] === '\n' || body[dataEnd - 1] === '\r')) {
    dataEnd -= 1;
  }

  const dictPart = encryptDictAndTokens(body.slice(0, streamIdx));
  const streamRaw = latin1Bytes(body.slice(dataStart, dataEnd));
  const encryptedStream = rc4(objKey, streamRaw);
  const eol = body.slice(dataEnd, endStreamIdx);

  return (
    dictPart +
    body.slice(streamIdx, dataStart) +
    bytesToLatin1(encryptedStream) +
    eol +
    body.slice(endStreamIdx)
  );
}

/**
 * Encrypts a classic-xref PDF (generated with `useObjectStreams: false`) using
 * Standard Security Handler Revision 3 (RC4 128-bit) so standard PDF viewers
 * and pdfjs-dist enforce the password on open.
 */
export function encryptPdfBytes(
  pdfBytes: Uint8Array,
  userPassword: string,
  ownerPassword = userPassword + '_owner'
): Uint8Array {
  if (!userPassword) throw new Error('PDF password cannot be empty.');

  // Decode PDF bytes as latin1 (1:1 byte preservation)
  let pdfStr = '';
  for (let i = 0; i < pdfBytes.length; i++) {
    pdfStr += String.fromCharCode(pdfBytes[i]);
  }

  const xrefPos = pdfStr.lastIndexOf('xref');
  const trailerPos = pdfStr.lastIndexOf('trailer');
  if (xrefPos === -1 || trailerPos === -1) {
    throw new Error('PDF must use a classic xref table (useObjectStreams: false).');
  }

  const trailerBody = pdfStr.slice(trailerPos);
  const rootMatch = trailerBody.match(/\/Root\s+(\d+\s+\d+\s+R)/);
  const sizeMatch = trailerBody.match(/\/Size\s+(\d+)/);
  const infoMatch = trailerBody.match(/\/Info\s+(\d+\s+\d+\s+R)/);
  if (!rootMatch || !sizeMatch) {
    throw new Error('Malformed PDF trailer: missing /Root or /Size.');
  }

  // Generate 16-byte document ID
  const docId = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const permissions = -4; // Allow printing/reading once authenticated, standard P value (-4 = 0xFFFFFFFC)

  // Step 1: Compute O (Owner) key (Algorithm 3)
  let ownerHash = md5(padPassword(ownerPassword));
  for (let i = 0; i < 50; i++) {
    ownerHash = md5(ownerHash);
  }
  const ownerRc4Key = ownerHash.subarray(0, 16);
  let oVal = rc4(ownerRc4Key, padPassword(userPassword));
  for (let i = 1; i <= 19; i++) {
    const tmpKey = new Uint8Array(16);
    for (let k = 0; k < 16; k++) tmpKey[k] = ownerRc4Key[k] ^ i;
    oVal = rc4(tmpKey, oVal);
  }

  // Step 2: Compute File Encryption Key (Algorithm 2, Revision 3)
  const keyInput = new Uint8Array(32 + 32 + 4 + 16);
  keyInput.set(padPassword(userPassword), 0);
  keyInput.set(oVal, 32);
  const pView = new DataView(keyInput.buffer);
  pView.setInt32(64, permissions, true);
  keyInput.set(docId, 68);

  let fileKey = md5(keyInput);
  for (let i = 0; i < 50; i++) {
    fileKey = md5(fileKey.subarray(0, 16));
  }
  fileKey = fileKey.subarray(0, 16);

  // Step 3: Compute U (User) value (Algorithm 5, Revision 3)
  const uInput = new Uint8Array(PDF_PADDING.length + docId.length);
  uInput.set(PDF_PADDING, 0);
  uInput.set(docId, PDF_PADDING.length);
  let uHash = rc4(fileKey, md5(uInput));
  for (let i = 1; i <= 19; i++) {
    const tmpKey = new Uint8Array(16);
    for (let k = 0; k < 16; k++) tmpKey[k] = fileKey[k] ^ i;
    uHash = rc4(tmpKey, uHash);
  }
  const uVal = new Uint8Array(32);
  uVal.set(uHash, 0);
  uVal.set(globalThis.crypto.getRandomValues(new Uint8Array(16)), 16);

  // Step 4: Parse and encrypt all indirect objects before xref
  const headerEndMatch = pdfStr.match(/^%PDF-\d\.\d[^\r\n]*[\r\n]+(%[^\r\n]*[\r\n]+)?/);
  const header = headerEndMatch ? headerEndMatch[0] : '%PDF-1.7\n';
  const bodySection = pdfStr.slice(header.length, xrefPos);

  const objRegex = /(\d+)\s+(\d+)\s+obj\b([\s\S]*?)endobj\b/g;
  const objects: Array<{ num: number; gen: number; content: string }> = [];
  let maxObjNum = 0;
  let match: RegExpExecArray | null;

  while ((match = objRegex.exec(bodySection)) !== null) {
    const num = parseInt(match[1], 10);
    const gen = parseInt(match[2], 10);
    if (num > maxObjNum) maxObjNum = num;
    const objKey = computeObjectKey(fileKey, num, gen);
    const encryptedBody = encryptObjectBody(match[3], objKey);
    objects.push({ num, gen, content: `${num} ${gen} obj${encryptedBody}endobj\n` });
  }

  const encryptObjNum = maxObjNum + 1;
  const encryptObjStr =
    `${encryptObjNum} 0 obj\n` +
    `<<\n` +
    `/Filter /Standard\n` +
    `/V 2\n` +
    `/R 3\n` +
    `/Length 128\n` +
    `/P ${permissions}\n` +
    `/O <${toHex(oVal)}>\n` +
    `/U <${toHex(uVal)}>\n` +
    `>>\n` +
    `endobj\n`;

  objects.push({ num: encryptObjNum, gen: 0, content: encryptObjStr });
  objects.sort((a, b) => a.num - b.num);

  // Rebuild PDF with updated xref offsets
  let output = header;
  const offsets = new Map<number, number>();
  for (const obj of objects) {
    offsets.set(obj.num, output.length);
    output += obj.content;
  }

  const newXrefOffset = output.length;
  const totalSize = encryptObjNum + 1;
  output += `xref\n0 ${totalSize}\n0000000000 65535 f \n`;
  for (let n = 1; n < totalSize; n++) {
    const off = offsets.get(n);
    if (off !== undefined) {
      output += `${String(off).padStart(10, '0')} 00000 n \n`;
    } else {
      output += `0000000000 65535 f \n`;
    }
  }

  const idHex = toHex(docId);
  output +=
    `trailer\n` +
    `<<\n` +
    `/Size ${totalSize}\n` +
    `/Root ${rootMatch[1]}\n` +
    (infoMatch ? `/Info ${infoMatch[1]}\n` : '') +
    `/Encrypt ${encryptObjNum} 0 R\n` +
    `/ID [<${idHex}><${idHex}>]\n` +
    `>>\n` +
    `startxref\n` +
    `${newXrefOffset}\n` +
    `%%EOF\n`;

  const outBytes = new Uint8Array(output.length);
  for (let i = 0; i < output.length; i++) {
    outBytes[i] = output.charCodeAt(i) & 0xff;
  }
  return outBytes;
}
