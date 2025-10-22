'use client';

import React, { useEffect, useState } from 'react';

interface AnnouncementData {
  version: string;
  highlights: string[];
  publishedAt: string;
  link?: string;
}

const STORAGE_KEY = 'weekly_announcement_dismissed';

async function fetchAnnouncement(): Promise<AnnouncementData | null> {
  try {
    const response = await fetch('/api/notifications/latest-announcement');
    if (!response.ok) return null;
    const data = await response.json();
    return data?.announcement ?? null;
  } catch (error) {
    console.error('Failed to load announcement', error);
    return null;
  }
}

function hasDismissed(version: string): boolean {
  if (typeof window === 'undefined') return false;
  const record = window.localStorage.getItem(STORAGE_KEY);
  if (!record) return false;
  try {
    const parsed = JSON.parse(record) as { version: string; dismissedAt: number };
    return parsed.version === version;
  } catch (error) {
    return false;
  }
}

function markDismissed(version: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, dismissedAt: Date.now() }));
}

export function WeeklyAnnouncement() {
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchAnnouncement().then((data) => {
      if (!mounted || !data) return;
      if (hasDismissed(data.version)) return;
      setAnnouncement(data);
      setIsOpen(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!announcement || !isOpen) {
    return null;
  }

  const handleDismiss = () => {
    markDismissed(announcement.version);
    setIsOpen(false);
  };

  const handleViewMore = () => {
    if (announcement.link) {
      window.open(announcement.link, '_blank');
    }
    handleDismiss();
  };

  return (
    <div style={{
      width: '100%',
      background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(139, 92, 246, 0.12))',
      borderBottom: '1px solid rgba(59, 130, 246, 0.25)',
    }}>
      <div style={{
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'rgba(37, 99, 235, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
        }}>
          🚀
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--gray-900)',
              margin: 0,
            }}>
              版本更新 · {announcement.version}
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
              {new Date(announcement.publishedAt).toLocaleDateString()}
            </span>
          </div>
          <ul style={{
            margin: '8px 0 0',
            paddingLeft: '18px',
            color: 'var(--gray-700)',
            fontSize: '14px',
            lineHeight: 1.6,
          }}>
            {announcement.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {announcement.link && (
            <button
              type="button"
              onClick={handleViewMore}
              className="modern-btn modern-btn-primary modern-btn-sm"
            >
              了解详情
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="modern-btn modern-btn-ghost modern-btn-sm"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}
