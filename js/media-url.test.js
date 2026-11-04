import assert from 'node:assert/strict';
import test from 'node:test';
import { safeMediaUrl } from './media-url.js';

const baseUrl = 'https://example.test/app/';

test('safeMediaUrl permits local media and rejects remote or active URLs', () => {
  assert.equal(safeMediaUrl('data:image/jpeg;base64,AA==', 'image', baseUrl), 'data:image/jpeg;base64,AA==');
  assert.equal(safeMediaUrl('data:image/svg+xml,%3Csvg%3E', 'image', baseUrl), '');
  assert.equal(safeMediaUrl('data:audio/mpeg;base64,AA==', 'audio', baseUrl), 'data:audio/mpeg;base64,AA==');
  assert.equal(safeMediaUrl('/assets/photo.jpg', 'image', baseUrl), 'https://example.test/assets/photo.jpg');
  assert.equal(safeMediaUrl('https://evil.test/track', 'image', baseUrl), '');
  assert.equal(safeMediaUrl('//evil.test/track', 'audio', baseUrl), '');
  assert.equal(safeMediaUrl('javascript:alert(1)', 'image', baseUrl), '');
  assert.equal(safeMediaUrl('blob:https://example.test/audio-id', 'audio', baseUrl), 'blob:https://example.test/audio-id');
});
