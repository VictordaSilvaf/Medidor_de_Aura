import * as ImagePicker from 'expo-image-picker';

import { MAX_VIDEO_DURATION_MS } from './constants';
import { ensureLibraryPermission } from './permissions';
import { validateVideoMeta, type ValidatedVideo } from './validateVideo';

export async function pickGalleryVideo(): Promise<ValidatedVideo | null> {
  const permission = await ensureLibraryPermission();
  if (!permission.granted) {
    throw new Error(
      permission.canAskAgain
        ? 'Permissão da galeria necessária para enviar um vídeo.'
        : 'Permissão da galeria negada. Ative nas configurações do aparelho.',
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    videoMaxDuration: Math.floor(MAX_VIDEO_DURATION_MS / 1000),
    // H.264 / qualidade média → melhor compatibilidade iOS + Android e tamanho menor.
    videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  return validateVideoMeta({
    uri: asset.uri,
    durationMs: asset.duration,
    fileSizeBytes: asset.fileSize,
    mimeType: asset.mimeType,
  });
}