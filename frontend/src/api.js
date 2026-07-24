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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function request(method, endpoint, body = null, retries = 2) {
  const opts = { method, headers: headers(), credentials: 'include' };
  if (body) opts.body = JSON.stringify(body);

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    opts.signal = controller.signal;

    let res;
    try {
      res = await fetch(`/api/${endpoint}`, opts);
    } catch (err) {
      clearTimeout(timeout);
      lastErr = err;
      if (err.name === 'AbortError' && attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if (err.name === 'AbortError') throw new Error('Request timed out. Please check your connection.');
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw new Error('Network error. Please check your connection.');
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

  throw lastErr || new Error('Request failed');
}

const api = {
  get: (endpoint) => request('GET', endpoint),
  post: (endpoint, data) => request('POST', endpoint, data),
  put: (endpoint, data) => request('PUT', endpoint, data),
  delete: (endpoint) => request('DELETE', endpoint),
  fetchCsrfToken,
};

export default api;
