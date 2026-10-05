import { getSupabase } from '@/lib/supabase';
import { fromStorage } from './errors';
import type { AudioRemote } from './types';

const BUCKET = 'audio';

function isAlreadyExists(
  error: Error & { status?: number | undefined; statusCode?: string | undefined },
): boolean {
  return (
    error.status === 409 || error.statusCode === '409' || /already exists/i.test(error.message)
  );
}

export const audioRemoteRepo: AudioRemote = {
  async upload(path, blob, contentType) {
    const { error } = await getSupabase()
      .storage.from(BUCKET)
      .upload(path, blob, { contentType, upsert: false });
    if (error && !isAlreadyExists(error)) throw fromStorage(error);
  },

  async remove(pathOrPrefix) {
    const storage = getSupabase().storage.from(BUCKET);
    let paths = [pathOrPrefix];
    if (pathOrPrefix.endsWith('/')) {
      const folder = pathOrPrefix.slice(0, -1);
      const { data, error } = await storage.list(folder);
      if (error) throw fromStorage(error);
      paths = data.map((object) => `${folder}/${object.name}`);
      if (paths.length === 0) return;
    }
    // Removing a missing object is not an error in Storage.
    const { error } = await storage.remove(paths);
    if (error) throw fromStorage(error);
  },

  async download(path) {
    const { data, error } = await getSupabase().storage.from(BUCKET).download(path);
    if (error) throw fromStorage(error);
    return data;
  },
};
