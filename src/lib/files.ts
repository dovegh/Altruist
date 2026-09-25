/**
 * Reading a local file (a photo from the picker or camera) into bytes for upload.
 *
 * `fetch(uri).arrayBuffer()` was used for this and it does not work for local
 * files on this runtime: it resolved without error and handed back 14 bytes,
 * which then uploaded "successfully". The avatar showed blank; a prescription
 * would have reached the pharmacist as an empty file with a success screen in
 * front of the patient. expo-file-system reads the file natively.
 *
 * expo-file-system only reads inside the app's own folders, though. An
 * uncropped pick from the photo library can come back somewhere else (under
 * Expo Go, always), and the read is refused with a permission error. The
 * fallback goes through the network layer, which can open any URI the picker
 * returns, and decodes the data URL it produces — `readAsDataURL` is the one
 * FileReader method React Native implements.
 *
 * It refuses to return nothing. An upload that silently sends zero bytes is
 * worse than one that fails, because nobody finds out until it matters.
 */
import { File as LocalFile } from 'expo-file-system';

async function readThroughFetch(uri: string): Promise<ArrayBuffer> {
  const blob = await (await fetch(uri)).blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('readThroughFetch: read failed'));
    reader.readAsDataURL(blob);
  });
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function readLocalFile(uri: string): Promise<ArrayBuffer> {
  let bytes: ArrayBuffer;
  try {
    bytes = await new LocalFile(uri).arrayBuffer();
  } catch {
    bytes = await readThroughFetch(uri);
  }
  if (!bytes.byteLength) {
    throw new Error(`readLocalFile: ${uri} read as empty`);
  }
  return bytes;
}
