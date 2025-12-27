const DEVICE_KEY = 'hth_device_id';

const generateId = () => crypto.randomUUID();

export const Device = {
  getId(): string {
    if (typeof localStorage === 'undefined') {
      return 'local-device';
    }
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const next = generateId();
    localStorage.setItem(DEVICE_KEY, next);
    return next;
  }
};
