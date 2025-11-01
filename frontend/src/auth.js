const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

 let scriptLoadingPromise = null;
 function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google script failed to load')));
      return;
    }
    if (!scriptLoadingPromise) {
      scriptLoadingPromise = new Promise((res, rej) => {
        const script = document.createElement('script');
        script.src = GOOGLE_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => res();
        script.onerror = () => rej(new Error('Google script failed to load'));
        document.head.appendChild(script);
      });
    }
    scriptLoadingPromise.then(resolve).catch(reject);
  });
}

export async function initializeGoogle() {
  await loadGoogleScript();
  if (initializeGoogle._initialized) return true;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const useFedcm = String(import.meta.env.VITE_USE_FEDCM || 'false') === 'true';
  if (!clientId) {
    console.warn('Missing VITE_GOOGLE_CLIENT_ID. Google sign-in will be disabled.');
    return false;
  }
  console.info('[Auth] Origin:', window.location.origin, '| Client ID present:', Boolean(clientId));
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: handleCredentialResponse,
    auto_select: false,
    ux_mode: 'popup',
    use_fedcm_for_prompt: useFedcm,
  });
  initializeGoogle._initialized = true;
  return true;
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function handleCredentialResponse(response) {
  const { credential } = response || {};
  const profile = parseJwt(credential);
  if (profile) {
    const user = {
      id: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      credential,
      provider: 'google',
    };
    localStorage.setItem('authUser', JSON.stringify(user));
    const evt = new CustomEvent('auth:login', { detail: user });
    window.dispatchEvent(evt);
  }
}

export async function signInWithGoogle() {
  const ok = await initializeGoogle();
  if (!ok) return;
  window.google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed()) {
      const reason = notification.getNotDisplayedReason();
      console.warn('Google prompt not displayed:', reason);
      if (reason === 'unregistered_origin') {
        alert('This origin is not allowed for your Google Client ID. Add ' + window.location.origin + ' to Authorized JavaScript origins in Google Cloud for your OAuth client, save, then reload.');
      }
    }
    if (notification.isSkippedMoment()) console.warn('Google prompt skipped:', notification.getSkippedReason());
  });
}

export function signOut() {
  const user = JSON.parse(localStorage.getItem('authUser') || 'null');
  if (user && user.provider === 'google' && window.google && window.google.accounts && window.google.accounts.id) {
    try { window.google.accounts.id.revoke(user.email, () => {}); } catch (e) { console.warn('Google revoke failed', e); }
  }
  localStorage.removeItem('authUser');
  const evt = new CustomEvent('auth:logout');
  window.dispatchEvent(evt);
}


