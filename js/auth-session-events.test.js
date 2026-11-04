import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionEventFilter } from './auth-session-events.js';

test('processes initial auth state once and ignores duplicate sessions', () => {
  const shouldProcess = createSessionEventFilter();
  const firstSession = { user: { id: 'user-a', email: 'a@example.com' } };

  assert.equal(shouldProcess('SIGNED_IN', firstSession), false);
  assert.equal(shouldProcess('INITIAL_SESSION', firstSession), true);
  assert.equal(shouldProcess('SIGNED_IN', firstSession), false);
  assert.equal(shouldProcess('SIGNED_OUT', null), true);
  assert.equal(shouldProcess('SIGNED_OUT', null), false);
  assert.equal(shouldProcess('SIGNED_IN', { user: { id: 'user-b', email: 'b@example.com' } }), true);
});
