import type { Category } from '@/domain/types';
import { createTableRemote } from './tableRemote';

export const categoriesRemoteRepo = createTableRemote<Category>({
  table: 'categories',
  columns: [
    'id',
    'user_id',
    'name',
    'slug',
    'is_system',
    'created_at',
    'updated_at',
    'deleted_at',
    'server_updated_at',
  ],
  timestamps: ['created_at', 'updated_at', 'deleted_at', 'server_updated_at'],
});
