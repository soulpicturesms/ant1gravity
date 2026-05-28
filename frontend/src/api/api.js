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
  getAlbionStats: () => req('/api/members/albion-stats', { headers: headers() }),
  getActivities: () => req('/api/members/activities', { headers: headers() }),
  createActivity: (body) => req('/api/members/activities', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  markAttendance: (id, user_ids) => req(`/api/members/activities/${id}/attend`, { method: 'POST', headers: headers(), body: JSON.stringify({ user_ids }) }),
  updateStats: (id, body) => req(`/api/members/${id}/stats`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }),
  updateRole: (id, role) => req(`/api/members/${id}/role`, { method: 'PUT', headers: headers(), body: JSON.stringify({ role }) }),

  // Item search
  searchItems: (slot, q) => req(`/api/items/search?slot=${slot}&q=${encodeURIComponent(q || '')}`),
  getMarketPrices: (codes) => req(`/api/market/price?items=${encodeURIComponent(codes.join(','))}`),
  getItemSpells: (baseId) => req(`/api/spells/item?id=${encodeURIComponent(baseId)}`),

  // Builds (legacy)
  getBuilds: (category) => req(`/api/builds${category ? `?category=${category}` : ''}`),
  getBuild: (id) => req(`/api/builds/${id}`),
  createBuild: (form) => req('/api/builds', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form }),
  updateBuild: (id, form) => req(`/api/builds/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${getToken()}` }, body: form }),
  deleteBuild: (id) => req(`/api/builds/${id}`, { method: 'DELETE', headers: headers() }),

  // Contents (new build system)
  getContents: (category) => req(`/api/contents${category ? `?category=${category}` : ''}`),
  getContent: (id) => req(`/api/contents/${id}`),
  createContent: (body) => req('/api/contents', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  updateContent: (id, body) => req(`/api/contents/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }),
  deleteContent: (id) => req(`/api/contents/${id}`, { method: 'DELETE', headers: headers() }),
  getPendingBuilds: () => req('/api/contents/pending', { headers: headers() }),
  approveContent: (id) => req(`/api/contents/${id}/approve`, { method: 'POST', headers: headers() }),

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

  // Killboard
  getKills:   () => req('/api/killboard/kills'),
  getDeaths:  () => req('/api/killboard/deaths'),
  getBattles:  () => req('/api/killboard/battles'),
  getBattle:   (id) => req(`/api/killboard/battles/${id}`),

  // Killboard - personal
  getMyDeaths: () => req('/api/killboard/my-deaths', { headers: headers() }),

  // Reequip - death-based flow
  getDeathPrices: (items) => req(`/api/reequip/prices?items=${encodeURIComponent(items)}`, { headers: headers() }),
  submitDeathRequest: (body) => req('/api/reequip/death-request', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  getMyDeathRequests: () => req('/api/reequip/my-death-requests', { headers: headers() }),
  claimDeathRequest: (id) => req(`/api/reequip/death-request/${id}/claim`, { method: 'POST', headers: headers() }),
  getAdminDeathRequests: (status) => req(`/api/reequip/admin/death-requests${status && status !== 'all' ? `?status=${status}` : ''}`, { headers: headers() }),
  approveDeathRequest: (id, body) => req(`/api/reequip/admin/death-requests/${id}/approve`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  rejectDeathRequest: (id, body) => req(`/api/reequip/admin/death-requests/${id}/reject`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  getDeathStats: () => req('/api/reequip/admin/death-stats', { headers: headers() }),

  // Ruleta
  getRuletaPrizes: () => req('/api/ruleta/prizes'),
  setRuletaPrizes: (prizes) => req('/api/ruleta/prizes', { method: 'PUT', headers: headers(), body: JSON.stringify({ prizes }) }),

  // Token transfer
  transferTokens: (body) => req('/api/tokens/transfer', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  getTransferHistory: () => req('/api/tokens/history', { headers: headers() }),

  // Bet events
  getBetEvents: () => req('/api/bets'),
  getBetEvent: (id) => req(`/api/bets/${id}`, { headers: headers() }),
  createBetEvent: (body) => req('/api/bets', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  lockBets: (id) => req(`/api/bets/${id}/lock`, { method: 'POST', headers: headers() }),
  resolveBet: (id, body) => req(`/api/bets/${id}/resolve`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  cancelBet: (id, body = {}) => req(`/api/bets/${id}/cancel`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  placeBet: (id, body) => req(`/api/bets/${id}/bet`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }),

  // Casino - Blackjack
  casinoBlackjack: (action, body) => req(`/api/casino/blackjack/${action}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  // Casino - Roulette
  casinoRuleta: (body) => req('/api/casino/roulette/spin', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  // Casino - Plinko
  casinoPlinko: (body) => req('/api/casino/plinko/drop', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),

  // Poker (REST-based, no WebSocket)
  pokerGetRooms: () => req('/api/poker/rooms', { headers: headers() }),
  pokerGetRoom: (id) => req(`/api/poker/rooms/${id}`, { headers: headers() }),
  pokerCreateRoom: (body) => req('/api/poker/rooms', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  pokerJoinRoom: (id) => req(`/api/poker/rooms/${id}/join`, { method: 'POST', headers: headers() }),
  pokerLeaveRoom: (id) => req(`/api/poker/rooms/${id}/leave`, { method: 'POST', headers: headers() }),
  pokerStartGame: (id) => req(`/api/poker/rooms/${id}/start`, { method: 'POST', headers: headers() }),
  pokerAction: (id, body) => req(`/api/poker/rooms/${id}/action`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  pokerNextHand: (id) => req(`/api/poker/rooms/${id}/next-hand`, { method: 'POST', headers: headers() }),

  // Truco (REST-based, no WebSocket)
  trucoGetRooms:      ()       => req('/api/truco/rooms', { headers: headers() }),
  trucoGetRoom:       (id)     => req(`/api/truco/rooms/${id}`, { headers: headers() }),
  trucoCreateRoom:    (body)   => req('/api/truco/rooms', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  trucoJoinRoom:      (id)     => req(`/api/truco/rooms/${id}/join`,          { method: 'POST', headers: headers() }),
  trucoLeaveRoom:     (id)     => req(`/api/truco/rooms/${id}/leave`,         { method: 'POST', headers: headers() }),
  trucoStart:         (id)     => req(`/api/truco/rooms/${id}/start`,         { method: 'POST', headers: headers() }),
  trucoPlayCard:      (id, b)  => req(`/api/truco/rooms/${id}/play-card`,     { method: 'POST', headers: headers(), body: JSON.stringify(b) }),
  trucoCallTruco:     (id, b)  => req(`/api/truco/rooms/${id}/call-truco`,    { method: 'POST', headers: headers(), body: JSON.stringify(b) }),
  trucoRespondTruco:  (id, b)  => req(`/api/truco/rooms/${id}/respond-truco`, { method: 'POST', headers: headers(), body: JSON.stringify(b) }),
  trucoCallEnvido:    (id, b)  => req(`/api/truco/rooms/${id}/call-envido`,   { method: 'POST', headers: headers(), body: JSON.stringify(b) }),
  trucoRespondEnvido: (id, b)  => req(`/api/truco/rooms/${id}/respond-envido`,{ method: 'POST', headers: headers(), body: JSON.stringify(b) }),
  trucoMazo:          (id)     => req(`/api/truco/rooms/${id}/mazo`,          { method: 'POST', headers: headers() }),
  trucoNextHand:      (id)     => req(`/api/truco/rooms/${id}/next-hand`,     { method: 'POST', headers: headers() }),
  trucoRematch:       (id)     => req(`/api/truco/rooms/${id}/rematch`,       { method: 'POST', headers: headers() }),

  // Admin
  getAdminStats: () => req('/api/admin/stats', { headers: headers() }),
  getTransactions: () => req('/api/admin/transactions', { headers: headers() }),
  adjustCoins: (body) => req('/api/admin/coins/adjust', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  createUser: (body) => req('/api/admin/users', { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  deleteUser: (id) => req(`/api/admin/users/${id}`, { method: 'DELETE', headers: headers() }),
  getPendingUsers: () => req('/api/admin/pending', { headers: headers() }),
  approveUser: (id, role) => req(`/api/admin/users/${id}/approve`, { method: 'POST', headers: headers(), body: JSON.stringify({ role }) }),
  rejectUser: (id) => req(`/api/admin/users/${id}/reject`, { method: 'DELETE', headers: headers() }),
  editUsername: (id, username) => req(`/api/admin/users/${id}/username`, { method: 'PUT', headers: headers(), body: JSON.stringify({ username }) }),
};
