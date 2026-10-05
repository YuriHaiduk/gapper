import type { Card } from '@/domain/types';
import { createTableRemote } from './tableRemote';

export const cardsRemoteRepo = createTableRemote<Card>({
  table: 'vocabulary_cards',
  columns: [
    'id',
    'user_id',
    'title',
    'translation',
    'example_sentence',
    'example_sentence_translation',
    'category_id',
    'status',
    'audio_path',
    'learned_at',
    'created_at',
    'updated_at',
    'deleted_at',
    'server_updated_at',
  ],
  timestamps: ['learned_at', 'created_at', 'updated_at', 'deleted_at', 'server_updated_at'],
});
