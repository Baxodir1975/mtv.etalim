'use client';

import { useState } from 'react';
import { formShareText, formUrls } from '@/lib/form-sharing';
import './form-share-bar.css';

export function FormShareBar() {
  const [copied, setCopied] = useState('');
  const [manualCopy, setManualCopy] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  async function copy(kind: 'listener' | 'admin') {
    const text = formShareText(kind);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setManualCopy('');
    } catch {
      setCopied('');
      setManualCopy(text);
    }
  }
  return (
    <section className="mtv-form-share" aria-label="Formalar va QR">
      <div className="mtv-form-share-label">
        <strong>Formalar va QR</strong>
        <span>Kerakli havolani tanlang</span>
      </div>
      <div className="mtv-share-links">
        {(['listener', 'admin'] as const).map((kind) => (
          <article className={'mtv-share-item ' + kind} key={kind}>
            <span className="mtv-share-icon" aria-hidden="true">
              {kind === 'listener' ? '↗' : '◇'}
            </span>
            <div>
              <a
                href={formUrls[kind]}
                target="_blank"
                rel="noopener noreferrer"
              >
                {kind === 'listener'
                  ? 'Oddiy tinglovchi formasi'
                  : 'Bosh admin formasi'}
              </a>
              <small>
                {kind === 'listener'
                  ? 'Ro‘yxatdan o‘tish va o‘z guruhini ko‘rish'
                  : 'Faqat ruxsat berilgan administratorlar uchun'}
              </small>
              <button type="button" onClick={() => void copy(kind)}>
                {copied === kind
                  ? '✓ Matn nusxalandi'
                  : 'Telegram uchun nusxalash'}
              </button>
            </div>
          </article>
        ))}
        <article className="mtv-share-qr">
          <button
            type="button"
            onClick={() => setQrOpen(!qrOpen)}
            aria-expanded={qrOpen}
            aria-controls="mtv-form-qr-download"
          >
            <img
              src="/mtv-etalimai-form-qr.png"
              alt="Oddiy tinglovchi formasining QR-kodi"
              width="82"
              height="96"
            />
            <span>
              <b>Forma QR-kodi</b>
              <small>Kattalashtirish / yuklash</small>
            </span>
          </button>
        </article>
      </div>
      {copied && (
        <output className="mtv-share-feedback">
          Telegramga matnni joylashtiring — sarlavha, izoh va havola birga
          nusxalandi.
        </output>
      )}
      {manualCopy && (
        <label className="mtv-share-manual">
          Nusxalash uchun matnni belgilang:
          <textarea
            readOnly
            value={manualCopy}
            onFocus={(event) => event.currentTarget.select()}
            rows={6}
          />
        </label>
      )}
      {qrOpen && (
        <div id="mtv-form-qr-download" className="mtv-share-qr-expanded">
          <img
            src="/mtv-etalimai-form-qr.png"
            alt="mtv-etalimai — tinglovchi formasini ochish"
            width="410"
            height="478"
          />
          <div>
            <strong>Telefon kamerasi bilan oching</strong>
            <p>
              QR faqat oddiy tinglovchi formasiga olib boradi. Admin huquqlarini
              bermaydi.
            </p>
            <a
              href="/mtv-etalimai-form-qr.png"
              download="mtv-etalimai-form-qr.png"
            >
              QR rasmini yuklab olish ↓
            </a>
            <button type="button" onClick={() => setQrOpen(false)}>
              Yopish
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
