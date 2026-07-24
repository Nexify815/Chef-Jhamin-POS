const getToken = () => localStorage.getItem('token');
const getCsrfToken = () => localStorage.getItem('csrf_token');

async function fetchCsrfToken() {
  try {
    const res = await fetch('/api/csrf-token', { credentials: 'include' });
    const data = await res.json();
    if (data.csrfToken) {
      localStorage.setItem('csrf_token', data.csrfToken);
    }
  } catch {}
}

const headers = () => {
  const h = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
  const csrf = getCsrfToken();
  if (csrf) h['X-CSRF-Token'] = csrf;
  return h;
};

async function request(method, endpoint, body = null) {
  const opts = { method, headers: headers(), credentials: 'include' };
  if (body) opts.body = JSON.stringify(body);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  opts.signal = controller.signal;

  let res;
  try {
    res = await fetch(`/api/${endpoint}`, opts);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Request timed out. Please check your connection.');
    throw err;
  }
  clearTimeout(timeout);

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('fullname');
    localStorage.removeItem('csrf_token');
    window.location.href = '/';
    return null;
  }

  let payload = null;
  try { payload = await res.json(); } catch {}

  if (!res.ok) {
    const errMsg = payload?.message || payload?.error || `Request failed (${res.status})`;
    const err = new Error(errMsg);
    err.status = res.status;
    throw err;
  }
  return payload;
}

const api = {
  get: (endpoint) => request('GET', endpoint),
  post: (endpoint, data) => request('POST', endpoint, data),
  put: (endpoint, data) => request('PUT', endpoint, data),
  delete: (endpoint) => request('DELETE', endpoint),
  fetchCsrfToken,
};

export default api;
