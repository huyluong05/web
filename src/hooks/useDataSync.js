import { useEffect, useRef } from 'react';
export const DATA_EVENT = 'vitaltrack:data-changed';
export function publishDataChange(resource) {
  window.dispatchEvent(new CustomEvent(DATA_EVENT, { detail: resource }));
  try { localStorage.setItem('vitaltrack_data_change', JSON.stringify({ resource, nonce: `${Date.now()}-${Math.random()}` })); } catch { /* In-tab updates still work when storage is unavailable. */ }
}
export function useDataSync(refresh, resources = ['health', 'goals', 'profile'], poll = false) {
  const callback = useRef(refresh);
  callback.current = refresh;
  const resourceKey = resources.join(',');
  useEffect(() => {
    let timer, lastRefresh = Date.now(), dirty = false;
    const run = () => {
      if (document.visibilityState !== 'visible') { dirty = true; return; }
      clearTimeout(timer);
      timer = setTimeout(() => { dirty = false; lastRefresh = Date.now(); callback.current(); }, 180);
    };
    const event = e => { if (resourceKey.split(',').includes(e.detail)) run(); };
    const storage = e => {
      if (e.key !== 'vitaltrack_data_change' || !e.newValue) return;
      try { if (resourceKey.split(',').includes(JSON.parse(e.newValue).resource)) run(); } catch { /* Invalid external storage event. */ }
    };
    const focus = () => { if (dirty || Date.now() - lastRefresh > 30000) run(); };
    window.addEventListener(DATA_EVENT, event);
    window.addEventListener('storage', storage);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    const interval = poll ? setInterval(run, 120000) : null;
    return () => { clearTimeout(timer); clearInterval(interval); window.removeEventListener(DATA_EVENT, event); window.removeEventListener('storage', storage); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); };
  }, [resourceKey, poll]);
}
