import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  VerticalAlign,
  UnderlineType,
} from 'docx';
import saveAs from 'file-saver';
import { EquipmentRequest } from '../types';
import tvriLogoAsset from '../assets/images/TVRI_logo.png';
import signatureNovaAsset from '../assets/images/signature_nova.png';

async function getImageBuffer(assetPath: string): Promise<ArrayBuffer | null> {
  try {
    if (!assetPath) return null;
    if (assetPath.startsWith('data:')) {
      const base64Parts = assetPath.split(',');
      if (base64Parts.length > 1) {
        const binaryString = atob(base64Parts[1]);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      }
    }

    const response = await fetch(assetPath);
    if (response.ok) {
      return await response.arrayBuffer();
    }
  } catch (e) {
    console.warn('Could not load image asset for docx', e);
  }
  return null;
}

export async function generateAndDownloadDocx(request: EquipmentRequest) {
  const [logoBuffer, adminSigBuffer, requesterSigBuffer] = await Promise.all([
    getImageBuffer(tvriLogoAsset),
    request.adminSignature ? getImageBuffer(request.adminSignature) : Promise.resolve(null),
    request.requesterSignature ? getImageBuffer(request.requesterSignature) : Promise.resolve(null),
  ]);

  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };

  const thinBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: '000000',
  };

  const tableBorders = {
    top: thinBorder,
    bottom: thinBorder,
    left: thinBorder,
    right: thinBorder,
  };

  // Format date like: "02 Desember 2025"
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Helper to capitalize each word (Title Case)
  const capitalizeWords = (str?: string): string => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formattedDate = formatDate(request.requestDate);

  // Helper to get department name without "Unit Kerja" prefix, preserving proper casing
  const getCleanDepartment = (dept?: string): string => {
    if (!dept) return '';
    let cleaned = dept.replace(/^(unit kerja\s*)+/i, '').trim();
    if (!cleaned) return '';

    // If it already has uppercase letters (e.g. BMN, SDM, Dokpus, etc.), preserve original casing
    if (/[A-Z]/.test(cleaned)) {
      return cleaned;
    }

    // If all lowercase, convert to Title Case and uppercase acronyms
    return cleaned
      .replace(/\b[a-z]/g, (c) => c.toUpperCase())
      .replace(/\bBmn\b/gi, 'BMN')
      .replace(/\bSdm\b/gi, 'SDM')
      .replace(/\bDokpus\b/gi, 'Dokpus');
  };

  const logoChildren: (TextRun | ImageRun)[] = [];
  if (logoBuffer) {
    logoChildren.push(
      new ImageRun({
        data: logoBuffer,
        transformation: {
          width: 150,
          height: 90,
        },
        type: 'png',
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1200,
              right: 1200,
            },
          },
        },
        children: [
          // Logo (Top Left)
          ...(logoBuffer
            ? [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: logoChildren,
                }),
                new Paragraph({ text: '' }),
                new Paragraph({ text: '' }),
              ]
            : []),

          // Main Title: TANDA PERMINTAAN BARANG (Centered below logo)
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'TANDA PERMINTAAN BARANG',
                bold: true,
                size: 28, // 14pt
                font: 'Arial',
              }),
            ],
          }),

          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Header Info Table (NOMOR, TANGGAL, TIM)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorder,
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Nomor     : ', bold: true, font: 'Arial', size: 20 }),
                          new TextRun({ text: request.requestNumber, font: 'Arial', size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Tanggal   : ', bold: true, font: 'Arial', size: 20 }),
                          new TextRun({ text: formattedDate, font: 'Arial', size: 20 }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: noBorder,
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: 'Unit Kerja   : ', 
                            bold: true,
                            font: 'Arial',
                            size: 20, 
                          }),
                          new TextRun({ text: request.department, font: 'Arial', size: 20 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '' }),

          // Items Table: NO | KODE BARANG | NAMA BARANG | JUMLAH | SATUAN | KETERANGAN
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: [
              // Header Row
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 5, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 60, right: 60 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'NO', bold: true, font: 'Arial', size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 60, right: 60 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'KODE BARANG', bold: true, font: 'Arial', size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 40, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 60, right: 60 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'NAMA BARANG', bold: true, font: 'Arial', size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 60, right: 60 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'JUMLAH', bold: true, font: 'Arial', size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 60, right: 60 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'SATUAN', bold: true, font: 'Arial', size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 60, right: 60 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'KETERANGAN', bold: true, font: 'Arial', size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),

              // Data Rows
              ...request.items.map((item, index) => {
                return new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 5, type: WidthType.PERCENTAGE },
                      margins: { top: 80, bottom: 80, left: 60, right: 60 },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: (index + 1).toString(), font: 'Arial', size: 20 })],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 20, type: WidthType.PERCENTAGE },
                      margins: { top: 80, bottom: 80, left: 60, right: 60 },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: capitalizeWords(item.itemCode || '-'), font: 'Arial', size: 20 })],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 40, type: WidthType.PERCENTAGE },
                      margins: { top: 80, bottom: 80, left: 60, right: 60 },
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: capitalizeWords(item.itemName), font: 'Arial', size: 20 })],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 10, type: WidthType.PERCENTAGE },
                      margins: { top: 80, bottom: 80, left: 60, right: 60 },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: item.quantity.toString(), font: 'Arial', size: 20 })],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 10, type: WidthType.PERCENTAGE },
                      margins: { top: 80, bottom: 80, left: 60, right: 60 },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: capitalizeWords(item.unit), font: 'Arial', size: 20 })],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 15, type: WidthType.PERCENTAGE },
                      margins: { top: 80, bottom: 80, left: 60, right: 60 },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.LEFT,
                          children: [new TextRun({ text: '', font: 'Arial', size: 20 })],
                        }),
                      ],
                    }),
                  ],
                });
              }),
            ],
          }),

          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
        
          // Signatures Section (2 Signatures only: Menyetujui & Yang Meminta)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: [
              // Row 1: Titles
              new TableRow({
                children: [
                  // Left: Menyetujui
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 40 },
                        children: [new TextRun({ text: 'Menyetujui', font: 'Arial', size: 20 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 120 },
                        children: [
                          new TextRun({ text: 'Katim Pengelola BMN', font: 'Arial', size: 20 }),
                        ],
                      }),
                    ],
                  }),
                  // Right: Yang Meminta
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 40 },
                        children: [new TextRun({ text: 'Yang meminta', font: 'Arial', size: 20 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 120 },
                        children: [
                          new TextRun({
                            text: getCleanDepartment(request.department) || 'Pemohon',
                            font: 'Arial',
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Row 2: Signature Space / Image
              new TableRow({
                children: [
                  // Left Signature Space (Katim / Admin)
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: adminSigBuffer
                      ? [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 120, after: 120 },
                            children: [
                              new ImageRun({
                                data: adminSigBuffer,
                                transformation: {
                                  width: 175,
                                  height: 85,
                                },
                                type: 'png',
                              }),
                            ],
                          }),
                        ]
                      : [
                          new Paragraph({ text: '', spacing: { before: 800, after: 800 } }),
                        ],
                  }),
                  // Right Signature Space (Pemohon)
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: requesterSigBuffer
                      ? [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 120, after: 120 },
                            children: [
                              new ImageRun({
                                data: requesterSigBuffer,
                                transformation: {
                                  width: 175,
                                  height: 85,
                                },
                                type: 'png',
                              }),
                            ],
                          }),
                        ]
                      : [
                          new Paragraph({ text: '', spacing: { before: 800, after: 800 } }),
                        ],
                  }),
                ],
              }),

              // Row 3: Name and NIP (100% Horizontally Aligned)
              new TableRow({
                children: [
                  // Left Name & NIP
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 60, after: 40 },
                        children: [
                          new TextRun({
                            text: 'Novarida Dwi Anggraini',
                            bold: true,
                            underline: { type: UnderlineType.SINGLE },
                            font: 'Arial',
                            size: 20,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'NIP.199711192022032007',
                            font: 'Arial',
                            size: 18,
                          }),
                        ],
                      }),
                    ],
                  }),
                  // Right Name & NIP
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 60, after: 40 },
                        children: [
                          new TextRun({
                            text: request.requesterName || 'Pemohon',
                            bold: true,
                            underline: { type: UnderlineType.SINGLE },
                            font: 'Arial',
                            size: 20,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: `NIP. ${
                              request.nip && request.nip !== '-'
                                ? request.nip
                                : request.phone && request.phone !== '-' && !request.phone.startsWith('08')
                                ? request.phone
                                : '...................................'
                            }`,
                            font: 'Arial',
                            size: 18,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanNumber = request.requestNumber.replace(/[\/\s]/g, '-');
  const fileName = `Tanda_Permintaan_Barang_${cleanNumber}.docx`;
  saveAs(blob, fileName);
}

// Helper function for converting numbers to Indonesian words (terbilang)
function angkaToTerbilang(num: number): string {
  if (num === 0) return 'Nol';
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  let res = '';
  if (num < 12) {
    res = satuan[num];
  } else if (num < 20) {
    res = angkaToTerbilang(num - 10) + ' belas';
  } else if (num < 100) {
    res = angkaToTerbilang(Math.floor(num / 10)) + ' puluh ' + (num % 10 !== 0 ? ' ' + angkaToTerbilang(num % 10) : '');
  } else if (num < 200) {
    res = 'seratus' + (num - 100 !== 0 ? ' ' + angkaToTerbilang(num - 100) : '');
  } else if (num < 1000) {
    res = angkaToTerbilang(Math.floor(num / 100)) + ' ratus' + (num % 100 !== 0 ? ' ' + angkaToTerbilang(num % 100) : '');
  } else if (num < 2000) {
    res = 'seribu' + (num - 1000 !== 0 ? ' ' + angkaToTerbilang(num - 1000) : '');
  } else if (num < 1000000) {
    res = angkaToTerbilang(Math.floor(num / 1000)) + ' ribu' + (num % 1000 !== 0 ? ' ' + angkaToTerbilang(num % 1000) : '');
  } else {
    res = num.toString();
  }
  res = res.replace(/\s+/g, ' ').trim();
  return res.charAt(0).toUpperCase() + res.slice(1);
}

// Helper to convert month index (0-11) or string to Roman numeral
function getRomanMonth(dateStr?: string): string {
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const d = dateStr ? new Date(dateStr) : new Date();
  const monthIdx = isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  return romanMonths[monthIdx] || 'XII';
}

// ----------------------------------------------------------------------
// 2. Export BON BARANG KELUAR (BKB / BBK)
// ----------------------------------------------------------------------
export async function generateBonKeluarDocx(request: EquipmentRequest, customKeterangan: string = '') {
  const [logoBuffer, adminSigBuffer, requesterSigBuffer] = await Promise.all([
    getImageBuffer(tvriLogoAsset),
    request.adminSignature ? getImageBuffer(request.adminSignature) : Promise.resolve(null),
    request.requesterSignature ? getImageBuffer(request.requesterSignature) : Promise.resolve(null),
  ]);

  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };

  const thinBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: '000000',
  };

  const tableBorders = {
    top: thinBorder,
    bottom: thinBorder,
    left: thinBorder,
    right: thinBorder,
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const approvedDate = request.approvedAt || request.requestDate;
  const formattedDate = formatDate(approvedDate);
  const romanMonth = getRomanMonth(approvedDate);
  const yearStr = approvedDate ? new Date(approvedDate).getFullYear() || 2025 : 2025;

  // Format bon number matching standard format: No. [104] /BBK/ATK/[ROMAN]/[YEAR]
  let numOnly = '104';
  const match = request.requestNumber.match(/\d+/g);
  if (match && match.length > 0) {
    numOnly = match[match.length - 1];
  }
  const bonNumberFormatted = `No. ${numOnly}/BBK/ATK/${romanMonth}/${yearStr}`;

  const logoChildren: (TextRun | ImageRun)[] = [];
  if (logoBuffer) {
    logoChildren.push(
      new ImageRun({
        data: logoBuffer,
        transformation: { width: 140, height: 80 },
        type: 'png',
      })
    );
  }

  // Header Table Rows for Bon Barang Keluar (with Banyaknya: Angka | Huruf)
  const cellMargins = { top: 120, bottom: 120, left: 100, right: 100 };

  const headerRow1 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders,
        width: { size: 5, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No Urut', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders,
        width: { size: 22, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kode', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders,
        width: { size: 42, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nama Barang', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        columnSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders,
        width: { size: 15, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Banyaknya', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders,
        width: { size: 6, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Satuan', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders,
        width: { size: 10, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Keterangan', bold: true, size: 20, font: 'Arial' })] })],
      }),
    ],
  });

  const headerRow2 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        borders: tableBorders,
        verticalAlign: VerticalAlign.CENTER,
        width: { size: 6, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Angka', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        borders: tableBorders,
        verticalAlign: VerticalAlign.CENTER,
        width: { size: 9, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Huruf', bold: true, size: 20, font: 'Arial' })] })],
      }),
    ],
  });

  const itemRows = request.items.map((item, idx) => {
    const qtyWords = angkaToTerbilang(item.quantity);
    return new TableRow({
      children: [
        new TableCell({
          borders: tableBorders,
          verticalAlign: VerticalAlign.CENTER,
          width: { size: 5, type: WidthType.PERCENTAGE },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, size: 20, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: tableBorders,
          verticalAlign: VerticalAlign.CENTER,
          width: { size: 22, type: WidthType.PERCENTAGE },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.itemCode || '-', size: 20, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: tableBorders,
          verticalAlign: VerticalAlign.CENTER,
          width: { size: 42, type: WidthType.PERCENTAGE },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: item.itemName, size: 20, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: tableBorders,
          verticalAlign: VerticalAlign.CENTER,
          width: { size: 6, type: WidthType.PERCENTAGE },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.quantity}`, size: 20, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: tableBorders,
          verticalAlign: VerticalAlign.CENTER,
          width: { size: 9, type: WidthType.PERCENTAGE },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: qtyWords, size: 20, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: tableBorders,
          verticalAlign: VerticalAlign.CENTER,
          width: { size: 6, type: WidthType.PERCENTAGE },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.unit || 'Pcs', size: 20, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: tableBorders,
          verticalAlign: VerticalAlign.CENTER,
          width: { size: 10, type: WidthType.PERCENTAGE },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: customKeterangan || '', size: 20, font: 'Arial' })] })],
        }),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
        children: [
          // Top Left Header Text
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: 'TVRI STASIUN D.I. YOGYAKARTA\n', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: 'UMUM / BMN & PERLENGKAPAN', bold: true, size: 16, font: 'Arial', break: 1 }),
            ],
          }),
          new Paragraph({ text: '' }),

          // Centered Document Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'BON BARANG KELUAR', bold: true, size: 24, font: 'Arial' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: bonNumberFormatted, size: 18, font: 'Arial' })],
          }),
          new Paragraph({ text: '' }),

          // Table of Items
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: [headerRow1, headerRow2, ...itemRows],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Signatures Section - Multi-row 100% Alignment
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: [
              // Row 1: Date on Right
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: '' })],
                  }),
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 80 },
                        children: [new TextRun({ text: `Yogyakarta, ${formattedDate}`, font: 'Arial', size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),
              // Row 2: Designation Titles
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Menyetujui diterima,', font: 'Arial', size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Ketua Tim Pengelola BMN', font: 'Arial', size: 20 })] }),
                    ],
                  }),
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Diterima oleh', font: 'Arial', size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: `Pelaksana Unit Kerja ${request.department || 'PU'}`, font: 'Arial', size: 20 })] }),
                    ],
                  }),
                ],
              }),
              // Row 3: Signature Image / Blank Space
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: adminSigBuffer
                      ? [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 80, after: 80 },
                            children: [new ImageRun({ data: adminSigBuffer, transformation: { width: 150, height: 75 }, type: 'png' })],
                          }),
                        ]
                      : [new Paragraph({ text: '', spacing: { before: 800, after: 800 } })],
                  }),
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: requesterSigBuffer
                      ? [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 80, after: 80 },
                            children: [new ImageRun({ data: requesterSigBuffer, transformation: { width: 150, height: 75 }, type: 'png' })],
                          }),
                        ]
                      : [new Paragraph({ text: '', spacing: { before: 800, after: 800 } })],
                  }),
                ],
              }),
              // Row 4: Name and NIP
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Novarida Dwi Anggraini', bold: true, underline: { type: UnderlineType.SINGLE }, font: 'Arial', size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIP. 19971119 202203 2007', font: 'Arial', size: 16 })] }),
                    ],
                  }),
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: request.requesterName || 'Indah Fajrin Romadani', bold: true, underline: { type: UnderlineType.SINGLE }, font: 'Arial', size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NIP. ${request.nip || '19940303 202203 2010'}`, font: 'Arial', size: 16 })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanNumber = bonNumberFormatted.replace(/[\/\s]/g, '-');
  saveAs(blob, `Bon_Barang_Keluar_${cleanNumber}.docx`);
}

// ----------------------------------------------------------------------
// 3. Export BON BARANG MASUK (BMB / BBM)
// ----------------------------------------------------------------------
export async function generateBonMasukDocx(
  item: { code: string; name: string; category: string; stock: number; unit: string; location?: string },
  addedQty: number,
  supplier: string = '',
  adminSig?: string,
  receiverSig?: string,
  receiverName?: string,
  receiverNip?: string,
  keterangan: string = '',
  customBonNumber?: string
) {
  const [logoBuffer, adminSigBuffer, receiverSigBuffer] = await Promise.all([
    getImageBuffer(tvriLogoAsset),
    adminSig ? getImageBuffer(adminSig) : Promise.resolve(null),
    receiverSig ? getImageBuffer(receiverSig) : Promise.resolve(null),
  ]);

  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };

  const thinBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: '000000',
  };

  const tableBorders = {
    top: thinBorder,
    bottom: thinBorder,
    left: thinBorder,
    right: thinBorder,
  };

  const now = new Date();
  const formattedDate = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const romanMonth = getRomanMonth(now.toISOString());
  const yearStr = now.getFullYear();

  let bonNumberFormatted = '';
  if (customBonNumber && customBonNumber.trim()) {
    const trimmed = customBonNumber.trim();
    if (trimmed.startsWith('No.') || trimmed.includes('/BBM/')) {
      bonNumberFormatted = trimmed;
    } else {
      bonNumberFormatted = `No. ${trimmed}/BBM/ATK/${romanMonth}/${yearStr}`;
    }
  } else {
    bonNumberFormatted = `No.       /BBM/ATK/${romanMonth}/${yearStr}`;
  }
  const qtyWords = angkaToTerbilang(addedQty);

  const cellMargins = { top: 120, bottom: 120, left: 100, right: 100 };

  const headerRow1 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders,
        width: { size: 5, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No Urut', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders,
        width: { size: 22, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kode', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders,
        width: { size: 42, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nama Barang', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        columnSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders,
        width: { size: 15, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Banyaknya', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders,
        width: { size: 6, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Satuan', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders,
        width: { size: 10, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Keterangan', bold: true, size: 20, font: 'Arial' })] })],
      }),
    ],
  });

  const headerRow2 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        borders: tableBorders,
        verticalAlign: VerticalAlign.CENTER,
        width: { size: 6, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Angka', bold: true, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        borders: tableBorders,
        verticalAlign: VerticalAlign.CENTER,
        width: { size: 9, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Huruf', bold: true, size: 20, font: 'Arial' })] })],
      }),
    ],
  });

  const itemRow = new TableRow({
    children: [
      new TableCell({
        borders: tableBorders,
        verticalAlign: VerticalAlign.CENTER,
        width: { size: 5, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '1', size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        borders: tableBorders,
        verticalAlign: VerticalAlign.CENTER,
        width: { size: 22, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.code || '-', size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        borders: tableBorders,
        verticalAlign: VerticalAlign.CENTER,
        width: { size: 42, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: item.name, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        borders: tableBorders,
        verticalAlign: VerticalAlign.CENTER,
        width: { size: 6, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${addedQty}`, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        borders: tableBorders,
        verticalAlign: VerticalAlign.CENTER,
        width: { size: 9, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: qtyWords, size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        borders: tableBorders,
        verticalAlign: VerticalAlign.CENTER,
        width: { size: 6, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.unit || 'Pcs', size: 20, font: 'Arial' })] })],
      }),
      new TableCell({
        borders: tableBorders,
        verticalAlign: VerticalAlign.CENTER,
        width: { size: 10, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: keterangan || '', size: 20, font: 'Arial' })] })],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
        children: [
          // Header 2 Columns: Left (TVRI ... UMUM/BMN) & Right (Diterima dari...)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorder,
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.LEFT,
                        children: [
                          new TextRun({ text: 'TVRI STASIUN D.I. YOGYAKARTA', bold: true, size: 18, font: 'Arial' }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.LEFT,
                        children: [
                          new TextRun({ text: 'UMUM/BMN', bold: true, size: 16, font: 'Arial' }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: noBorder,
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({ text: `Diterima dari : ${supplier || '-'}`, size: 14, font: 'Arial' }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({ text: 'No.Nota Dinas : -', size: 14, font: 'Arial' }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({ text: 'No. Disposisi Kepsta : -', size: 14, font: 'Arial' }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: '' }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'BON BARANG MASUK', bold: true, size: 24, font: 'Arial' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: bonNumberFormatted, size: 18, font: 'Arial' })],
          }),
          new Paragraph({ text: '' }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: [headerRow1, headerRow2, itemRow],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Signatures Section - Multi-row 100% Alignment
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: [
              // Row 1: Date on Right
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: '' })],
                  }),
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 80 },
                        children: [new TextRun({ text: `Yogyakarta, ${formattedDate}`, font: 'Arial', size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),
              // Row 2: Designation Titles
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Menyetujui diterima,', font: 'Arial', size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Ketua Tim Pengelola BMN', font: 'Arial', size: 20 })] }),
                    ],
                  }),
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Diterima oleh', font: 'Arial', size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Pelaksana Unit Kerja Perlengkapan', font: 'Arial', size: 20 })] }),
                    ],
                  }),
                ],
              }),
              // Row 3: Signature Image / Blank Space
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: adminSigBuffer
                      ? [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 80, after: 80 },
                            children: [new ImageRun({ data: adminSigBuffer, transformation: { width: 150, height: 75 }, type: 'png' })],
                          }),
                        ]
                      : [new Paragraph({ text: '', spacing: { before: 800, after: 800 } })],
                  }),
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: receiverSigBuffer
                      ? [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 80, after: 80 },
                            children: [new ImageRun({ data: receiverSigBuffer, transformation: { width: 150, height: 75 }, type: 'png' })],
                          }),
                        ]
                      : [new Paragraph({ text: '', spacing: { before: 800, after: 800 } })],
                  }),
                ],
              }),
              // Row 4: Name and NIP
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Novarida Dwi Anggraini', bold: true, underline: { type: UnderlineType.SINGLE }, font: 'Arial', size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIP. 19971119 202203 2007', font: 'Arial', size: 16 })] }),
                    ],
                  }),
                  new TableCell({
                    borders: noBorder,
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: receiverName || 'Heri Febrianto', bold: true, underline: { type: UnderlineType.SINGLE }, font: 'Arial', size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: receiverNip ? (receiverNip.startsWith('NIP') ? receiverNip : `NIP. ${receiverNip}`) : 'NIP.PPPK. 19850223 202521 1 035', font: 'Arial', size: 16 })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanNumber = bonNumberFormatted.replace(/[\/\s]/g, '-');
  saveAs(blob, `Bon_Barang_Masuk_${cleanNumber}.docx`);
}

