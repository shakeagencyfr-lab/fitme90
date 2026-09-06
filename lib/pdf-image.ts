import { deflateSync, inflateSync } from "node:zlib";
import type { PdfImage } from "@/lib/pdf";

/**
 * Prépare un logo pour le PDF, sans bibliothèque d'images.
 *
 * Un JPEG entre tel quel : le lecteur PDF sait le décoder, il suffit de lire
 * ses dimensions dans l'en-tête. Un PNG demande plus : on décompresse, on
 * défiltre les lignes, on sépare la couleur de la transparence, et on
 * recompresse les deux. Formats couverts : PNG 8 bits RVB ou RVBA non
 * entrelacés, JPEG de base ou progressif. Le reste rend null, et le PDF se
 * contente du nom du coach en toutes lettres.
 */
export function decodeImageForPdf(bytes: Uint8Array, name = "Logo"): PdfImage | null {
  if (bytes.length < 16) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpeg(bytes, name);
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return png(bytes, name);
  return null;
}

function jpeg(b: Uint8Array, name: string): PdfImage | null {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = (b[i + 2] << 8) | b[i + 3];
    // SOF0 à SOF15, sauf les tables (C4, C8, CC) : là sont les dimensions.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const components = b[i + 9];
      // Un JPEG CMJN ou gris ne rentre pas dans un /DeviceRGB : on renonce.
      if (components !== 3) return null;
      const height = (b[i + 5] << 8) | b[i + 6];
      const width = (b[i + 7] << 8) | b[i + 8];
      if (!width || !height) return null;
      return { name, width, height, kind: "jpeg", data: b };
    }
    i += 2 + len;
  }
  return null;
}

function png(b: Uint8Array, name: string): PdfImage | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let bitDepth = 0;
  let interlace = 0;
  const idat: Uint8Array[] = [];
  while (pos + 8 <= b.length) {
    const len = dv.getUint32(pos);
    const type = String.fromCharCode(b[pos + 4], b[pos + 5], b[pos + 6], b[pos + 7]);
    const start = pos + 8;
    if (type === "IHDR") {
      width = dv.getUint32(start);
      height = dv.getUint32(start + 4);
      bitDepth = b[start + 8];
      colorType = b[start + 9];
      interlace = b[start + 12];
    } else if (type === "IDAT") {
      idat.push(b.subarray(start, start + len));
    } else if (type === "IEND") {
      break;
    }
    pos = start + len + 4;
  }
  if (!width || !height || bitDepth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) return null;
  if (width * height > 4_000_000) return null;

  const canaux = colorType === 6 ? 4 : 3;
  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(idat.map((u) => Buffer.from(u))));
  } catch {
    return null;
  }
  const stride = width * canaux;
  if (raw.length < (stride + 1) * height) return null;

  // Défiltrage PNG (None, Sub, Up, Average, Paeth), ligne par ligne.
  const pixels = Buffer.alloc(stride * height);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filtre = raw[y * (stride + 1)];
    const ligne = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= canaux ? cur[x - canaux] : 0;
      const up = prev[x];
      const c = x >= canaux ? prev[x - canaux] : 0;
      let v = ligne[x];
      if (filtre === 1) v += a;
      else if (filtre === 2) v += up;
      else if (filtre === 3) v += (a + up) >> 1;
      else if (filtre === 4) {
        const pp = a + up - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      cur[x] = v & 0xff;
    }
    cur.copy(pixels, y * stride);
    prev = cur;
  }

  const rgb = Buffer.alloc(width * height * 3);
  const alpha = canaux === 4 ? Buffer.alloc(width * height) : null;
  for (let i = 0, j = 0, k = 0; i < pixels.length; i += canaux, j += 3, k++) {
    rgb[j] = pixels[i];
    rgb[j + 1] = pixels[i + 1];
    rgb[j + 2] = pixels[i + 2];
    if (alpha) alpha[k] = pixels[i + 3];
  }
  return {
    name,
    width,
    height,
    kind: "rgb",
    data: new Uint8Array(deflateSync(rgb)),
    ...(alpha ? { alpha: new Uint8Array(deflateSync(alpha)) } : {}),
  };
}
