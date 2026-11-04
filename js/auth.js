import { supabase } from './supabase-client.js';
import { createSessionEventFilter } from './auth-session-events.js';

const PENDING_INVITE_KEY = 'pending_pair_invite';
const INVITE_TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const INITIAL_SESSION_TIMEOUT_MS = 18_000;
const APP_STARTUP_TIMEOUT_MS = 15_000;
const REQUEST_TIMEOUT_MS = 12_000;
const byId = (id) => document.getElementById(id);

function setVisible(id, visible) {
  const element = byId(id);
  if (element) element.hidden = !visible;
}

function setStatus(message) {
  const status = byId('auth-status');
  if (status) status.textContent = message;
}

function setError(message = '') {
  ['auth-error', 'settings-auth-error'].forEach((id) => {
    const error = byId(id);
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
  });
}

async function withRequestTimeout(request) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await request.abortSignal(controller.signal);
  } finally {
    window.clearTimeout(timeout);
  }
}

function withTimeout(promise, ms) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = window.setTimeout(() => reject(new Error('Startup timed out')), ms);
    })
  ]).finally(() => window.clearTimeout(timeout));
}

function captureInviteToken() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (!params.has('invite')) return;

  const token = params.get('invite');
  if (token && INVITE_TOKEN_PATTERN.test(token)) {
    sessionStorage.setItem(PENDING_INVITE_KEY, token);
  } else {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
  }

  history.replaceState(history.state, '', `${location.pathname}${location.search}`);
}

function errorMessage(error, action) {
  const message = String(error?.message || '').toLowerCase();
  if (error?.status === 0 || message.includes('abort') || message.includes('timeout')) {
    return 'Supabase phản hồi quá thời gian chờ. Kiểm tra mạng rồi thử lại.';
  }
  if (message.includes('rate limit')) return 'Tạo quá nhiều lời mời trong thời gian ngắn. Hãy thử lại sau.';
  if (message.includes('leave the active space') || message.includes('both people must leave')) {
    return 'Cả hai tài khoản cần rời không gian đang hoạt động trước khi ghép đôi.';
  }
  if (message.includes('verified google')) return 'Cần đăng nhập bằng tài khoản Google đã xác minh email.';
  if (message.includes('schema cache') || message.includes('function') || error?.code === 'PGRST202') {
    return 'Supabase chưa có migration hiện tại. Cài schema/RLS rồi thử lại.';
  }
  if (action === 'invite') return 'Không tạo được link mời. Kiểm tra email và trạng thái không gian.';
  return 'Link mời không hợp lệ, đã hết hạn, đã dùng, hoặc không khớp email Google.';
}

function initializationErrorMessage(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('fetch') || message.includes('network') || message.includes('abort') || error?.status === 0) {
    return {
      status: 'Không kết nối được Supabase.',
      error: 'Yêu cầu xác thực đã hết thời gian chờ. Kiểm tra mạng rồi thử lại.'
    };
  }
  return {
    status: 'Không xác minh được phiên đăng nhập.',
    error: 'Phiên Google không hợp lệ hoặc đã hết hạn. Hãy đăng nhập lại.'
  };
}

async function signIn() {
  setError();
  const button = byId('auth-google-sign-in');
  if (button) button.disabled = true;
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}${location.pathname}`,
        queryParams: { prompt: 'select_account' }
      }
    });
    if (error) setError('Không bắt đầu được đăng nhập Google. Kiểm tra cấu hình provider trong Supabase.');
  } catch {
    setError('Không kết nối được Supabase. Kiểm tra URL và publishable key.');
  } finally {
    if (button) button.disabled = false;
  }
}

async function createInvite(event) {
  event.preventDefault();
  setError();
  const email = byId('auth-recipient-email')?.value.trim();
  const button = byId('auth-create-invite-button');
  if (!email) return;
  if (button) button.disabled = true;

  try {
    const { data: token, error } = await withRequestTimeout(supabase.rpc('create_pair_invite', {
      p_recipient_email: email
    }));
    if (error || typeof token !== 'string' || !INVITE_TOKEN_PATTERN.test(token)) {
      setError(errorMessage(error, 'invite'));
      return;
    }

    const inviteUrl = new URL(location.href);
    inviteUrl.hash = `invite=${token}`;
    const field = byId('auth-invite-url');
    if (field) field.value = inviteUrl.href;
    setVisible('auth-invite-result', true);
    setStatus('Link mời chỉ dùng một lần, hết hạn sau 7 ngày, và chỉ mở được bằng email Google đã mời.');
    byId('auth-copy-invite')?.focus();
  } catch {
    setError('Không tạo được link mời. Kiểm tra kết nối Supabase.');
  } finally {
    if (button) button.disabled = false;
  }
}

async function redeemPendingInvite() {
  const token = sessionStorage.getItem(PENDING_INVITE_KEY);
  if (!token) return null;
  if (!INVITE_TOKEN_PATTERN.test(token)) {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    setError('Link mời không hợp lệ.');
    return null;
  }

  const { data: spaceId, error } = await withRequestTimeout(supabase.rpc('redeem_pair_invite', {
    p_token: token
  }));
  if (error) {
    setError(errorMessage(error, 'redeem'));
    return null;
  }
  if (!spaceId) {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    setError('Link mời đã hết hạn.');
    return null;
  }

  sessionStorage.removeItem(PENDING_INVITE_KEY);
  return spaceId;
}

let onActiveSpace = async () => {};
let onLocked = () => {};
let sessionRevision = 0;

async function showSession(session) {
  const revision = ++sessionRevision;
  setError();
  setVisible('auth-signed-out', !session);
  setVisible('auth-signed-in', Boolean(session));
  setVisible('auth-paired', false);
  setVisible('auth-end-relationship', false);
  if (!session) {
    activeSpaceId = null;
    document.body.classList.add('auth-pending');
    onLocked();
    const emailEl = byId('auth-account-email');
    if (emailEl) emailEl.textContent = '';
    setVisible('auth-invite-result', false);
    const inviteUrl = byId('auth-invite-url');
    if (inviteUrl) inviteUrl.value = '';
    if (authInitializationError) {
      const message = initializationErrorMessage(authInitializationError);
      setStatus(message.status);
      setError(message.error);
    } else {
      setStatus(sessionStorage.getItem(PENDING_INVITE_KEY)
        ? 'Đăng nhập đúng email Google được mời để tiếp tục.'
        : 'Đăng nhập bằng Google để tạo hoặc mở không gian riêng.');
    }
    setVisible('auth-invite-note', Boolean(sessionStorage.getItem(PENDING_INVITE_KEY)));
    return;
  }

  const emailEl = byId('auth-account-email');
  authInitializationError = null;
  if (emailEl) emailEl.textContent = session.user.email || 'Tài khoản Google';

  try {
    setStatus('Đang xác minh quyền thành viên…');
    const redeemedSpaceId = await redeemPendingInvite();
    if (revision !== sessionRevision) return;
    const { data: membership, error } = await withRequestTimeout(supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle());
    if (revision !== sessionRevision) return;

    if (error) {
      activeSpaceId = null;
      document.body.classList.add('auth-pending');
      onLocked();
      setVisible('auth-create-invite', false);
      const timedOut = error.status === 0 || /abort|timeout/i.test(String(error.message || ''));
      setStatus(timedOut ? 'Supabase phản hồi quá thời gian chờ.' : 'Chưa đọc được membership. Kiểm tra migration và RLS của Supabase.');
      setError(timedOut ? 'Kiểm tra kết nối rồi tải lại trang để thử lại.' : 'Schema hoặc quyền truy cập chưa sẵn sàng.');
      return;
    }

    if (membership?.space_id) {
      activeSpaceId = membership.space_id;
      setVisible('auth-create-invite', false);
      setVisible('auth-invite-result', false);
      setVisible('auth-paired', true);
      setVisible('auth-end-relationship', true);
      const settingsEmail = byId('settings-account-email');
      if (settingsEmail) settingsEmail.textContent = session.user.email || 'Tài khoản Google';
      setStatus('Quyền thành viên đã xác nhận. Đang chuẩn bị giao diện…');
      try {
        await withTimeout(onActiveSpace(activeSpaceId), APP_STARTUP_TIMEOUT_MS);
      } catch {
        if (revision !== sessionRevision) return;
        onLocked();
        setStatus('Không khởi tạo được giao diện riêng.');
        setError('Tải lại trang để thử lại.');
        return;
      }
      if (revision !== sessionRevision) return;
      document.body.classList.remove('auth-pending');
      setStatus(redeemedSpaceId
        ? 'Mời đã được chấp nhận. Hai thành viên đã ghép đôi.'
        : 'Membership đã xác nhận.');
      return;
    }

    activeSpaceId = null;
    document.body.classList.add('auth-pending');
    onLocked();
    setVisible('auth-paired', false);
    setVisible('auth-end-relationship', false);
    setVisible('auth-create-invite', true);
    setStatus('Không gian mới chỉ được tạo khi người được mời chấp nhận link.');
  } catch {
    if (revision !== sessionRevision) return;
    activeSpaceId = null;
    document.body.classList.add('auth-pending');
    onLocked();
    setVisible('auth-paired', false);
    setVisible('auth-end-relationship', false);
    setStatus('Không tải được trạng thái không gian.');
    setError('Kiểm tra kết nối Supabase rồi tải lại trang.');
  }
}

let activeSpaceId = null;
let authInitializationError = null;

export async function initAuthGate(options = {}) {
  onActiveSpace = options.onActiveSpace || onActiveSpace;
  onLocked = options.onLocked || onLocked;
  document.body.classList.add('auth-pending');
  document.body.classList.add('auth-checking');
  captureInviteToken();

  if (!supabase) {
    setStatus('Chưa cấu hình Supabase.');
    setVisible('auth-setup-required', true);
    return;
  }

  setStatus('Đang kiểm tra phiên đăng nhập…');

  byId('auth-google-sign-in')?.addEventListener('click', signIn);
  byId('auth-create-invite')?.addEventListener('submit', createInvite);
  const signOut = async () => {
    setError();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setError('Không đăng xuất được. Tải lại trang rồi thử lại.');
    } catch {
      setError('Không đăng xuất được. Tải lại trang rồi thử lại.');
    }
  };
  byId('auth-sign-out')?.addEventListener('click', signOut);
  byId('settings-sign-out')?.addEventListener('click', signOut);
  byId('auth-copy-invite')?.addEventListener('click', async () => {
    const field = byId('auth-invite-url');
    if (!field?.value) return;
    const btn = byId('auth-copy-invite');
    try {
      await navigator.clipboard.writeText(field.value);
      setStatus('Đã sao chép link mời.');
      if (btn) {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 2000);
      }
    } catch {
      field.focus();
      field.select();
      setStatus('Chọn link rồi sao chép thủ công.');
    }
  });
  byId('auth-end-relationship')?.addEventListener('click', async () => {
    if (!activeSpaceId || !confirm('Không gian cũ sẽ chuyển sang chỉ xem cho người còn lại. Bạn mất quyền truy cập và có thể tạo không gian mới. Tiếp tục?')) return;
    try {
      const { error } = await withRequestTimeout(supabase.rpc('end_relationship', { p_space_id: activeSpaceId }));
      if (error) throw error;
    } catch {
      setError('Không thể kết thúc không gian. Tải lại trạng thái rồi thử lại.');
      return;
    }
    activeSpaceId = null;
    const { data: { session } } = await supabase.auth.getSession();
    await showSession(session);
  });

  let initialSessionReceived = false;
  let initialSession = null;
  const shouldProcessSession = createSessionEventFilter();
  const timeout = window.setTimeout(() => {
    if (initialSessionReceived) return;
    setStatus('Kiểm tra phiên đăng nhập quá thời gian chờ.');
    setError('Supabase chưa phản hồi. Kiểm tra mạng rồi tải lại trang để thử lại.');
  }, INITIAL_SESSION_TIMEOUT_MS);

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') {
      initialSessionReceived = true;
      initialSession = session;
      window.clearTimeout(timeout);
      document.body.classList.remove('auth-checking');
    }
    if (!shouldProcessSession(event, session)) return;
    window.setTimeout(() => { void showSession(session); }, 0);
  });

  // Auto-initialized by Supabase; this returns same initialization result and exposes callback errors.
  void supabase.auth.initialize().then(({ error }) => {
    if (!error || initialSession?.user) return;
    authInitializationError = error;
    const message = initializationErrorMessage(error);
    setStatus(message.status);
    setError(message.error);
  }).catch((error) => {
    authInitializationError = error;
    const message = initializationErrorMessage(error);
    setStatus(message.status);
    setError(message.error);
  });
}
