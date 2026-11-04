const DATA_MEDIA_TYPES = {
  image: /^data:image\/(?:gif|jpeg|png|webp);base64,/i,
  audio: /^data:audio\/(?:aac|flac|m4a|mp3|mpeg|ogg|wav|webm);base64,/i,
};

export function safeMediaUrl(value, type, baseUrl = window.location.href) {
  if (typeof value !== 'string' || !value) return '';
  if (DATA_MEDIA_TYPES[type]?.test(value)) return value;

  try {
    const base = new URL(baseUrl);
    const url = new URL(value, base);
    if (url.protocol === 'blob:' && url.origin === base.origin) return value;
    if (url.origin !== base.origin || !['http:', 'https:'].includes(url.protocol)) return '';
    return url.href;
  } catch {
    return '';
  }
}
