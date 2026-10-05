import { audioRemoteRepo } from './audioRemoteRepo';
import { cardsRemoteRepo } from './cardsRemoteRepo';
import { categoriesRemoteRepo } from './categoriesRemoteRepo';
import type { SyncRemote } from './types';

export const supabaseRemote: SyncRemote = {
  categories: categoriesRemoteRepo,
  cards: cardsRemoteRepo,
  audio: audioRemoteRepo,
};
