/**
 * Renders crisp, printable synthetic sample document PNGs directly on Canvas
 * (100% offline, zero external URLs) so users can test scanning, Photo-to-PDF,
 * OCR extraction, and PDF tools immediately.
 */
export function createSampleDocumentImage(
  variant: 'invoice' | 'receipt' | 'contract'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d')!;

  // Slight warm paper gradient to showcase Magic Color & B&W Crisp filters
  const bgGrad = ctx.createLinearGradient(0, 0, 900, 1200);
  bgGrad.addColorStop(0, '#F5F3EE');
  bgGrad.addColorStop(1, '#EAE6DC');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 900, 1200);

  // Subtle paper border
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(48, 48, 804, 1104);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, 804, 1104);

  if (variant === 'invoice') {
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('QUARTERLY EXPENSE INVOICE', 96, 140);

    ctx.fillStyle = '#2563EB';
    ctx.fillRect(96, 168, 708, 4);

    ctx.fillStyle = '#334155';
    ctx.font = '24px sans-serif';
    ctx.fillText('Invoice No: INV-2026-0418', 96, 230);
    ctx.fillText('Date Issued: November 17, 2026', 96, 270);
    ctx.fillText('Account: Northwind Logistics LLC', 96, 310);

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(96, 370, 708, 56);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Description', 116, 406);
    ctx.fillText('Amount (USD)', 620, 406);

    const rows = [
      ['Cloud Infrastructure & Storage', '$420.00'],
      ['Document Archival Audit', '$315.00'],
      ['Compliance Review Package', '$185.00'],
    ];
    ctx.font = '22px sans-serif';
    rows.forEach(([label, amt], idx) => {
      const y = 475 + idx * 70;
      ctx.fillStyle = '#1E293B';
      ctx.fillText(label, 116, y);
      ctx.fillText(amt, 650, y);
      ctx.strokeStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(96, y + 24);
      ctx.lineTo(804, y + 24);
      ctx.stroke();
    });

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('TOTAL DUE: $920.00', 500, 760);

    ctx.fillStyle = '#10B981';
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 4;
    ctx.strokeRect(104, 830, 220, 68);
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('VERIFIED PAID', 120, 874);
  } else if (variant === 'receipt') {
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('OFFICE SUPPLY MART', 180, 150);
    ctx.font = '24px monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText('RECEIPT #4082 - STORE #14', 200, 200);
    ctx.fillText('----------------------------------------', 110, 250);
    ctx.fillText('2x Archival Paper Ream         $24.50', 110, 320);
    ctx.fillText('1x Ink Cartridge Black         $38.00', 110, 380);
    ctx.fillText('4x Heavyweight Folders         $14.00', 110, 440);
    ctx.fillText('----------------------------------------', 110, 500);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('SUBTOTAL                       $76.50', 110, 560);
    ctx.fillText('TAX (8%)                        $6.12', 110, 615);
    ctx.fillText('TOTAL PAID                     $82.62', 110, 680);
    ctx.font = '22px monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('THANK YOU FOR SHOPPING LOCAL', 210, 810);
  } else {
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 38px serif';
    ctx.fillText('MUTUAL CONFIDENTIALITY AGREEMENT', 96, 150);
    ctx.fillStyle = '#334155';
    ctx.font = '22px sans-serif';
    const lines = [
      'This Agreement is entered into on November 17, 2026 by and',
      'between the Disclosing Party and Receiving Party solely for',
      'evaluating local document workflow integration.',
      '',
      '1. Confidential Information remains the exclusive property',
      'of its respective owner and shall be protected on-device.',
      '',
      '2. Neither party shall upload, transmit, or disclose private',
      'records to external cloud servers without written consent.',
      '',
      '3. Term: This agreement remains active for three (3) years.',
    ];
    lines.forEach((line, idx) => {
      ctx.fillText(line, 96, 240 + idx * 46);
    });
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(96, 980);
    ctx.lineTo(420, 980);
    ctx.stroke();
    ctx.font = '20px sans-serif';
    ctx.fillText('Authorized Signature & Date', 96, 1016);
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}
