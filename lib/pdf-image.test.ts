import { describe, it, expect } from "vitest";
import { deflateSync } from "node:zlib";
import { decodeImageForPdf } from "./pdf-image";
import { PdfPage, renderPdf } from "./pdf";

/** Un PNG 2 x 2 RVBA construit à la main, filtre « Sub » sur la seconde ligne. */
function pngRgba(): Uint8Array {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(2, 0);
  ihdr.writeUInt32BE(2, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // Ligne 1 sans filtre : rouge opaque, vert semi-transparent.
  // Ligne 2 filtre Sub : premier pixel bleu opaque, second = premier + (0,0,0,0).
  const raw = Buffer.from([
    0, 255, 0, 0, 255, 0, 255, 0, 128,
    1, 0, 0, 255, 255, 0, 0, 0, 0,
  ]);
  return new Uint8Array(Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

describe("images pour le PDF", () => {
  it("lit les dimensions d'un JPEG et le laisse tel quel", () => {
    // En-tête SOI, un segment APP0 vide, puis un SOF0 320 x 240 à 3 composantes.
    const sof = Buffer.from([0xff, 0xc0, 0, 17, 8, 0, 240, 1, 64, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
    const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 2]), sof, Buffer.alloc(8)]);
    const img = decodeImageForPdf(new Uint8Array(jpg), "L")!;
    expect(img).toMatchObject({ kind: "jpeg", width: 320, height: 240 });
  });

  it("défiltre un PNG et sépare la transparence", () => {
    const img = decodeImageForPdf(pngRgba(), "L")!;
    expect(img).toMatchObject({ kind: "rgb", width: 2, height: 2 });
    expect(img.alpha).toBeDefined();
  });

  it("refuse ce qu'il ne sait pas lire", () => {
    expect(decodeImageForPdf(new Uint8Array(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")))).toBeNull();
  });

  it("entre dans un fichier PDF comme objet image", () => {
    const img = decodeImageForPdf(pngRgba(), "Logo")!;
    const page = new PdfPage();
    page.image("Logo", 10, 10, 40, 40);
    const out = Buffer.from(renderPdf([page], { images: [img] })).toString("latin1");
    expect(out).toContain("/XObject << /Logo");
    expect(out).toContain("/SMask");
    expect(out).toContain("/Logo Do");
  });
});
