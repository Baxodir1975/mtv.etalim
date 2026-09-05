// Public form requests can only reduce an existing session's privileges.
// The admin route still requires a verified server-side admin session.
export function isListenerAudience(request: Request) {
  return request.headers.get('x-mtv-audience') === 'listener';
}

export function listenerAudienceHeaders(isAdminForm: boolean) {
  return { 'x-mtv-audience': isAdminForm ? 'admin' : 'listener' };
}
