// Quick-log works without a connection: entries wait on the device and upload later.
import { addMeasurement } from './api';
import type { Measurement } from './types';

const KEY = 'ekoa-offline-queue';
type Pending = Omit<Measurement, 'id' | 'created_at'>;

const read = (): Pending[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Pending[];
  } catch {
    return [];
  }
};
const write = (q: Pending[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
};

export const queued = () => read().length;
export function enqueue(m: Pending) {
  write([...read(), m]);
}
export async function flush(): Promise<number> {
  if (!navigator.onLine) return 0;
  const q = read();
  let sent = 0;
  for (const m of q) {
    try {
      await addMeasurement(m);
      sent += 1;
    } catch {
      break;
    }
  }
  write(q.slice(sent));
  return sent;
}
