import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { isAllowedRelativePath, resolveStaticPath } from './dev-server.mjs';

test('static server allows app files only', () => {
  const root = path.resolve('test-root');
  assert.equal(resolveStaticPath(root, '/index.html'), path.join(root, 'index.html'));
  assert.equal(resolveStaticPath(root, '/js/app.js'), path.join(root, 'js', 'app.js'));
  assert.equal(resolveStaticPath(root, '/css/main.css'), path.join(root, 'css', 'main.css'));
  assert.equal(resolveStaticPath(root, '/supabase/migration.sql'), null);
  assert.equal(resolveStaticPath(root, '/.env'), null);
  assert.equal(resolveStaticPath(root, '/assets/user-media/private.jpg'), null);
  assert.equal(resolveStaticPath(root, '/../outside.txt'), null);
  assert.equal(resolveStaticPath(root, '/js/../../outside.txt'), null);
  assert.equal(isAllowedRelativePath('js/.hidden.js'), false);
});
