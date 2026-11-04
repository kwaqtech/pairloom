export function createSessionEventFilter() {
  let initialSessionReceived = false;
  let lastSessionKey = Symbol('unprocessed');

  return (event, session) => {
    if (event === 'INITIAL_SESSION') initialSessionReceived = true;
    else if (!initialSessionReceived) return false;

    const sessionKey = session
      ? `${session.user?.id || ''}:${session.user?.email || ''}`
      : null;
    if (sessionKey === lastSessionKey) return false;
    lastSessionKey = sessionKey;
    return true;
  };
}
