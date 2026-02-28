import {
  useQuery, useMutation, useQueryClient, useInfiniteQuery,
} from '@tanstack/react-query';
import { socialApi } from '../api/client';

const STALE = 30_000; // 30s for social data

// ── Profile ───────────────────────────────────────────────────────────────

export const useMyProfile = () =>
  useQuery({ queryKey: ['social', 'profile', 'me'], queryFn: socialApi.getMyProfile, staleTime: STALE });

export const useUpdateAvatar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => socialApi.uploadAvatar(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social', 'profile', 'me'] });
      qc.invalidateQueries({ queryKey: ['social', 'feed'] });
    },
  });
};

export const useProfile = (userId: number) =>
  useQuery({
    queryKey: ['social', 'profile', userId],
    queryFn: () => socialApi.getProfile(userId),
    staleTime: STALE,
    enabled: !!userId,
  });

export const useMorningStats = () =>
  useQuery({ queryKey: ['social', 'morning-stats'], queryFn: socialApi.getMorningStats, staleTime: STALE });

// ── Feed ──────────────────────────────────────────────────────────────────

export const useFeed = () =>
  useInfiniteQuery({
    queryKey: ['social', 'feed'],
    queryFn: ({ pageParam }) => socialApi.getFeed(pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last: any) => last.nextCursor ?? undefined,
    staleTime: STALE,
  });

// ── Follow ────────────────────────────────────────────────────────────────

export const useFollow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => socialApi.follow(userId),
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ['social', 'profile', userId] });
      qc.invalidateQueries({ queryKey: ['social', 'profile', 'me'] });
      qc.invalidateQueries({ queryKey: ['social', 'discover'] });
    },
  });
};

export const useUnfollow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => socialApi.unfollow(userId),
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ['social', 'profile', userId] });
      qc.invalidateQueries({ queryKey: ['social', 'profile', 'me'] });
      qc.invalidateQueries({ queryKey: ['social', 'discover'] });
    },
  });
};

// ── Reactions ─────────────────────────────────────────────────────────────

export const useReact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, reactionType }: { postId: number; reactionType: string }) =>
      socialApi.react(postId, reactionType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'feed'] }),
  });
};

export const useUnreact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => socialApi.unreact(postId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'feed'] }),
  });
};

// ── Comments ──────────────────────────────────────────────────────────────

export const useComments = (postId: number) =>
  useQuery({
    queryKey: ['social', 'comments', postId],
    queryFn: () => socialApi.getComments(postId),
    staleTime: STALE,
    enabled: !!postId,
  });

export const useAddComment = (postId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: number }) =>
      socialApi.addComment(postId, content, parentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social', 'comments', postId] });
      qc.invalidateQueries({ queryKey: ['social', 'feed'] });
    },
  });
};

// ── Repost ────────────────────────────────────────────────────────────────

export const useRepost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => socialApi.repost(postId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'feed'] }),
  });
};

// ── Notifications ─────────────────────────────────────────────────────────

export const useNotifications = () =>
  useQuery({ queryKey: ['social', 'notifications'], queryFn: socialApi.getNotifications, staleTime: STALE });

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id?: number) => socialApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'notifications'] }),
  });
};

// ── Leaderboard ───────────────────────────────────────────────────────────

export const useLeaderboard = (type = 'recovery') =>
  useQuery({
    queryKey: ['social', 'leaderboard', type],
    queryFn: () => socialApi.getLeaderboard(type),
    staleTime: STALE,
  });

// ── Discover ──────────────────────────────────────────────────────────────

export const useDiscover = (q?: string) =>
  useQuery({
    queryKey: ['social', 'discover', q ?? ''],
    queryFn: () => socialApi.discover(q),
    staleTime: STALE,
  });

// ── Nudge ─────────────────────────────────────────────────────────────────

export const useNudge = () =>
  useMutation({ mutationFn: (userId: number) => socialApi.nudge(userId) });
