const getToken = () => localStorage.getItem('token');

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

async function request(method, endpoint, body = null) {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`/api/${endpoint}`, opts);

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('fullname');
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
};

export default api;
