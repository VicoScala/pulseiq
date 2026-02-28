import axios from 'axios';

// Dev: baseURL='/' → Vite proxy reroute to localhost:3001
// Prod: baseURL=VITE_API_URL → Railway backend URL
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── API helpers ────────────────────────────────────────────────────────────
export const fitiqApi = {
  getMe: () => api.get('/auth/me').then(r => r.data.user),
  getDashboard: () => api.get('/api/dashboard').then(r => r.data),
  getRecovery: (period = '30d') => api.get(`/api/recovery?period=${period}`).then(r => r.data),
  getSleep: (period = '30d') => api.get(`/api/sleep?period=${period}`).then(r => r.data),
  getCycles: (period = '30d') => api.get(`/api/cycles?period=${period}`).then(r => r.data),
  getWorkouts: (period = '30d') => api.get(`/api/workouts?period=${period}`).then(r => r.data),
  getInsights: () => api.get('/api/insights').then(r => r.data),
  triggerSync: (full = false) => api.post(`/api/sync?full=${full}`).then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
};

// ── Social API ─────────────────────────────────────────────────────────────
export const socialApi = {
  // Profile
  getMyProfile:     ()                  => api.get('/social/profile/me').then(r => r.data),
  getProfile:       (userId: number)    => api.get(`/social/profile/${userId}`).then(r => r.data),
  updateProfile:    (data: { bio?: string; avatar_url?: string }) => api.patch('/social/profile', data).then(r => r.data),

  // Follow
  follow:           (userId: number)    => api.post(`/social/follow/${userId}`).then(r => r.data),
  unfollow:         (userId: number)    => api.delete(`/social/follow/${userId}`).then(r => r.data),
  getFollowers:     ()                  => api.get('/social/followers').then(r => r.data),
  getFollowing:     ()                  => api.get('/social/following').then(r => r.data),

  // Feed
  getFeed:          (cursor?: number, since?: string) =>
    api.get('/social/feed', { params: { cursor, since } }).then(r => r.data),
  getMorningStats:  ()                  => api.get('/social/morning-stats').then(r => r.data),

  // Posts
  repost:           (postId: number)    => api.post(`/social/posts/${postId}/repost`).then(r => r.data),

  // Reactions
  react:            (postId: number, reactionType: string) =>
    api.post(`/social/posts/${postId}/react`, { reaction_type: reactionType }).then(r => r.data),
  unreact:          (postId: number)    => api.delete(`/social/posts/${postId}/react`).then(r => r.data),
  getReactions:     (postId: number)    => api.get(`/social/posts/${postId}/reactions`).then(r => r.data),

  // Comments
  getComments:      (postId: number)    => api.get(`/social/posts/${postId}/comments`).then(r => r.data),
  addComment:       (postId: number, content: string, parentId?: number) =>
    api.post(`/social/posts/${postId}/comment`, { content, parent_comment_id: parentId }).then(r => r.data),

  // Notifications
  getNotifications: ()                  => api.get('/social/notifications').then(r => r.data),
  markRead:         (id?: number)       => api.post('/social/notifications/read', id ? { id } : {}).then(r => r.data),

  // Leaderboard
  getLeaderboard:   (type = 'recovery') => api.get('/social/leaderboard', { params: { type } }).then(r => r.data),

  // Discover
  discover:         (q?: string)        => api.get('/social/discover', { params: { q } }).then(r => r.data),

  // Nudge
  nudge:            (userId: number)    => api.post(`/social/nudge/${userId}`).then(r => r.data),
};
