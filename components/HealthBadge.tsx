import { useEffect, useState } from 'react';
import styles from './HealthBadge.module.css';

type HealthBadgeProps = {
  metricsUrl: string;
};

type MetricsPayload = {
  ok?: boolean;
  rtt?: string | number;
};

export default function HealthBadge({ metricsUrl }: HealthBadgeProps) {
  const [ok, setOk] = useState<boolean | null>(null);
  const [rtt, setRtt] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        const res = await fetch(metricsUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Metrics request failed with ${res.status}`);
        const data = (await res.json()) as MetricsPayload;
        if (!alive) return;
        setOk(typeof data.ok === 'boolean' ? data.ok : null);
        const nextRtt = typeof data.rtt === 'string' ? (data.rtt === 'NA' ? null : Number(data.rtt)) : typeof data.rtt === 'number' ? data.rtt : null;
        setRtt(Number.isFinite(nextRtt || 0) ? (nextRtt as number | null) : null);
      } catch {
        if (!alive) return;
        setOk(null);
        setRtt(null);
      }
    };

    tick();
    const id = setInterval(tick, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [metricsUrl]);

  return (
    <div className={styles.badge}>
      <span
        className={styles.signal}
        data-status={ok === null ? 'unknown' : ok ? 'ok' : 'down'}
      />
      <span>GPU {ok === null ? '…' : ok ? 'OK' : 'DOWN'}</span>
      <span className={styles.rtt}>{rtt !== null ? `${rtt}ms` : ''}</span>
    </div>
  );
}
