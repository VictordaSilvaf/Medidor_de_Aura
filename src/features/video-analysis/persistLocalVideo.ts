import { Directory, File, Paths } from 'expo-file-system';

/**
 * Copia o vídeo da câmera/galeria para um path estável no cache do app.
 * Evita falhas de thumbnail/upload quando o arquivo temporário do Expo some.
 */
export async function persistLocalVideo(
  uri: string,
  fileName: string,
): Promise<string> {
  const source = new File(uri);
  if (!source.exists) {
    throw new Error('Arquivo de vídeo não encontrado. Grave ou escolha de novo.');
  }

  const dir = new Directory(Paths.cache, 'captures');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }

  const safeName = fileName.replace(/[^\w.-]+/g, '_') || 'capture.mp4';
  const dest = new File(dir, `${Date.now()}-${safeName}`);
  if (dest.exists) {
    dest.delete();
  }

  await source.copy(dest);
  return dest.uri;
}
