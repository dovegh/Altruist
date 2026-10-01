'use client';

/**
 * The prescription photo in a sunken well. Click to zoom to full size and
 * pan by scrolling; rotate, because patients photograph scripts sideways.
 * Right-click save is not blocked — a pharmacist may need to keep a copy, and
 * pretending a browser can stop that would be theatre.
 */
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import styles from './review.module.css';

export function DocumentViewer({ src, alt }: { src: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false);
  const [turns, setTurns] = useState(0);

  return (
    <div className={styles.viewerInner}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setTurns((t) => (t + 1) % 4)}
        >
          Rotate
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setZoomed((z) => !z)}>
          {zoomed ? 'Fit to screen' : 'Full size'}
        </button>
        <a className="btn btn-secondary btn-sm" href={src} target="_blank" rel="noreferrer">
          Open original
        </a>
      </div>
      <div className={`${styles.stage} ${zoomed ? styles.stageZoomed : ''}`}>
        {/* A signed, expiring Supabase URL — next/image would cache it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onClick={() => setZoomed((z) => !z)}
          className={zoomed ? styles.imgZoomed : styles.imgFit}
          style={{ transform: `rotate(${turns * 90}deg)` }}
        />
      </div>
      <p className={styles.caption}>
        <Icon name="shield-check" size={14} /> Click the image to zoom · this link expires in 10
        minutes
      </p>
    </div>
  );
}
