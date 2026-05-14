const getToken = () => localStorage.getItem('token');

const headers = (isForm = false) => {
  const h = { Authorization: `Bearer ${getToken()}` };
  if (!isForm) h['Content-Type'] = 'application/json';
  return h;
};

async function req(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

export const api = {
  // Auth
  login: (body) => req('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  register: (body) => req('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  me: () => req('/api/auth/me', { headers: headers() }),
  uploadAvatar: (form) => req('/api/auth/avatar', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form }),

  // News
  getNews: () => req('/api/news'),
  createNews: (body) => req('/api/news', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  updateNews: (id, body) => req(`/api/news/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }),
  deleteNews: (id) => req(`/api/news/${id}`, { method: 'DELETE', headers: headers() }),

  // Members
  getMembers: () => req('/api/members'),
  getRankings: () => req('/api/members/rankings'),
  getActivities: () => req('/api/members/activities', { headers: headers() }),
  createActivity: (body) => req('/api/members/activities', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  markAttendance: (id, user_ids) => req(`/api/members/activities/${id}/attend`, { method: 'POST', headers: headers(), body: JSON.stringify({ user_ids }) }),
  updateStats: (id, body) => req(`/api/members/${id}/stats`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }),
  updateRole: (id, role) => req(`/api/members/${id}/role`, { method: 'PUT', headers: headers(), body: JSON.stringify({ role }) }),

  // Item search
  searchItems: (slot, q) => req(`/api/items/search?slot=${slot}&q=${encodeURIComponent(q || '')}`),

  // Builds
  getBuilds: (category) => req(`/api/builds${category ? `?category=${category}` : ''}`),
  getBuild: (id) => req(`/api/builds/${id}`),
  createBuild: (form) => req('/api/builds', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form }),
  updateBuild: (id, form) => req(`/api/builds/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${getToken()}` }, body: form }),
  deleteBuild: (id) => req(`/api/builds/${id}`, { method: 'DELETE', headers: headers() }),

  // Reequip
  getPresets: () => req('/api/reequip/presets', { headers: headers() }),
  submitReport: (form) => req('/api/reequip/report', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form }),
  getMyReports: () => req('/api/reequip/my-reports', { headers: headers() }),
  claimReport: (id) => req(`/api/reequip/report/${id}/claim`, { method: 'POST', headers: headers() }),
  getAdminReports: (status) => req(`/api/reequip/admin/reports${status ? `?status=${status}` : ''}`, { headers: headers() }),
  awardCoins: (id, body) => req(`/api/reequip/admin/report/${id}/award`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  rejectReport: (id, body) => req(`/api/reequip/admin/report/${id}/reject`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  createPreset: (body) => req('/api/reequip/admin/presets', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  updatePreset: (id, body) => req(`/api/reequip/admin/presets/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }),
  deletePreset: (id) => req(`/api/reequip/admin/presets/${id}`, { method: 'DELETE', headers: headers() }),

  // Blacklist
  checkPlayer: (username) => req(`/api/blacklist/check?username=${encodeURIComponent(username)}`),
  getBlacklist: () => req('/api/blacklist'),
  addToBlacklist: (body) => req('/api/blacklist', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  removeFromBlacklist: (id) => req(`/api/blacklist/${id}`, { method: 'DELETE', headers: headers() }),

  // Credits
  getPublicLog: () => req('/api/credits/log'),
  requestCredit: () => req('/api/credits/request', { method: 'POST', headers: headers() }),
  getMyRequests: () => req('/api/credits/my-requests', { headers: headers() }),
  getCreditRequests: (status) => req(`/api/credits/requests${status ? `?status=${status}` : ''}`, { headers: headers() }),
  getPendingCount: () => req('/api/credits/pending-count', { headers: headers() }),
  completeCredit: (id, body) => req(`/api/credits/requests/${id}/complete`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  rejectCredit: (id, body) => req(`/api/credits/requests/${id}/reject`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }),

  // Rankings TXT
  uploadRankings: (form) => req('/api/rankings/upload', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form }),
  getRankingsTop: () => req('/api/rankings/top'),

  // Giveaway
  getCurrentGiveaway: () => req('/api/giveaway/current'),
  createGiveaway: (body) => req('/api/giveaway', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  startGiveaway: (id) => req(`/api/giveaway/${id}/start`, { method: 'POST', headers: headers() }),
  cancelGiveaway: (id) => req(`/api/giveaway/${id}/cancel`, { method: 'POST', headers: headers() }),
  closeGiveaway: (id) => req(`/api/giveaway/${id}/close`, { method: 'POST', headers: headers() }),
  joinGiveaway: (id) => req(`/api/giveaway/${id}/join`, { method: 'POST', headers: headers() }),
  listGiveaways: () => req('/api/giveaway/list', { headers: headers() }),

  // Media
  getWeeklyPrize: () => req('/api/media/weekly-prize'),
  uploadWeeklyPrize: (form) => req('/api/media/weekly-prize', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form }),
  deleteWeeklyPrize: () => req('/api/media/weekly-prize', { method: 'DELETE', headers: headers() }),
  getBanners: () => req('/api/media/banners'),
  uploadBanner: (form) => req('/api/media/banners', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form }),
  deleteBanner: (id) => req(`/api/media/banners/${id}`, { method: 'DELETE', headers: headers() }),

  // Admin
  getAdminStats: () => req('/api/admin/stats', { headers: headers() }),
  getTransactions: () => req('/api/admin/transactions', { headers: headers() }),
  adjustCoins: (body) => req('/api/admin/coins/adjust', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  createUser: (body) => req('/api/admin/users', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  deleteUser: (id) => req(`/api/admin/users/${id}`, { method: 'DELETE', headers: headers() }),
};
