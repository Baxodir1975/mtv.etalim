'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type SectionId = 'listeners' | 'form' | 'terms' | 'sources' | 'roles';

type ListenerRecord = {
  id: string;
  date: string;
  startDate: string;
  year: string;
  category: string;
  group: string;
  initials: string;
  surname: string;
  firstName: string;
  patronymic: string;
  name: string;
  organization: string;
  workplace: string;
  region: string;
  district: string;
  phone: string;
  position: string;
  birthDate: string;
  note: string;
  age: number | null;
  role: string;
  status: string;
  photo: string;
  orderFile: string;
  passportFront: string;
  passportBack: string;
};

type ListenerDraft = Omit<ListenerRecord, 'id' | 'status'>;

const navigation: Array<{ id: SectionId; label: string }> = [
  { id: 'listeners', label: 'Тингловчилар' },
  { id: 'form', label: 'Тингловчи формаси' },
  { id: 'terms', label: 'Шартлар' },
  { id: 'sources', label: 'Манба' },
  { id: 'roles', label: 'Роллар' },
];

const listenerRows: ListenerRecord[] = [];

const pageTitles: Record<SectionId, string> = {
  listeners: 'Tinglovchilar',
  form: 'Tinglovchi formasi',
  terms: 'Ro‘yxatdan o‘tish shartlari',
  sources: 'Tingmanba',
  roles: 'Rollar',
};

const candidateGroups = [56, 57, 58, 59, 60, 61].map(
  (number) => `Nomzod direktor (${number}-guruh)`,
);

function listenerProgress(row: Partial<ListenerRecord>) {
  const fields = [
    row.startDate,
    row.region,
    row.district,
    row.workplace,
    row.category,
    row.group,
    row.surname,
    row.firstName,
    row.position === '—' ? '' : row.position,
    row.phone,
    row.birthDate,
    row.photo,
    row.orderFile,
    row.passportFront,
    row.passportBack,
  ];
  const completed = fields.filter((value) => String(value ?? '').trim()).length;
  return {
    completed,
    total: fields.length,
    complete: completed === fields.length,
  };
}

const districtsByRegion: Record<string, string[]> = {
  'Qoraqalpog‘iston Respublikasi': [
    'Amudaryo tumani',
    'Beruniy tumani',
    'Bo‘zatov tumani',
    'Chimboy tumani',
    'Ellikqal’a tumani',
    'Kegeyli tumani',
    'Mo‘ynoq tumani',
    'Nukus shahri',
    'Nukus tumani',
    'Qanliko‘l tumani',
    'Qo‘ng‘irot tumani',
    'Qorao‘zak tumani',
    'Shumanay tumani',
    'Taxtako‘pir tumani',
    'Taxiatosh tumani',
    'To‘rtko‘l tumani',
    'Xo‘jayli tumani',
  ],
  'Andijon viloyati': [
    'Andijon shahri',
    'Andijon tumani',
    'Asaka tumani',
    'Baliqchi tumani',
    'Bo‘ston tumani',
    'Buloqboshi tumani',
    'Izboskan tumani',
    'Jalaquduq tumani',
    'Marhamat tumani',
    'Oltinko‘l tumani',
    'Paxtaobod tumani',
    'Qo‘rg‘ontepa tumani',
    'Shahrixon tumani',
    'Ulug‘nor tumani',
    'Xo‘jaobod tumani',
    'Xonobod shahri',
  ],
  'Buxoro viloyati': [
    'Buxoro shahri',
    'Buxoro tumani',
    'G‘ijduvon tumani',
    'Jondor tumani',
    'Kogon shahri',
    'Kogon tumani',
    'Olot tumani',
    'Peshku tumani',
    'Qorako‘l tumani',
    'Qorovulbozor tumani',
    'Romitan tumani',
    'Shofirkon tumani',
    'Vobkent tumani',
  ],
  'Jizzax viloyati': [
    'Arnasoy tumani',
    'Baxmal tumani',
    'Do‘stlik tumani',
    'Forish tumani',
    'G‘allaorol tumani',
    'Jizzax shahri',
    'Mirzacho‘l tumani',
    'Paxtakor tumani',
    'Sharof Rashidov tumani',
    'Yangiobod tumani',
    'Zafarobod tumani',
    'Zarbdor tumani',
    'Zomin tumani',
  ],
  'Qashqadaryo viloyati': [
    'Chiroqchi tumani',
    'Dehqonobod tumani',
    'G‘uzor tumani',
    'Kasbi tumani',
    'Kitob tumani',
    'Ko‘kdala tumani',
    'Koson tumani',
    'Mirishkor tumani',
    'Muborak tumani',
    'Nishon tumani',
    'Qamashi tumani',
    'Qarshi shahri',
    'Qarshi tumani',
    'Shahrisabz shahri',
    'Shahrisabz tumani',
    'Yakkabog‘ tumani',
  ],
  'Navoiy viloyati': [
    'G‘ozg‘on shahri',
    'Karmana tumani',
    'Konimex tumani',
    'Navbahor tumani',
    'Navoiy shahri',
    'Nurota tumani',
    'Qiziltepa tumani',
    'Tomdi tumani',
    'Uchquduq tumani',
    'Xatirchi tumani',
    'Zarafshon shahri',
  ],
  'Namangan viloyati': [
    'Chortoq tumani',
    'Chust tumani',
    'Davlatobod tumani',
    'Kosonsoy tumani',
    'Mingbuloq tumani',
    'Namangan shahri',
    'Namangan tumani',
    'Norin tumani',
    'Pop tumani',
    'To‘raqo‘rg‘on tumani',
    'Uchqo‘rg‘on tumani',
    'Uychi tumani',
    'Yangi Namangan tumani',
    'Yangiqo‘rg‘on tumani',
  ],
  'Samarqand viloyati': [
    'Bulung‘ur tumani',
    'Ishtixon tumani',
    'Jomboy tumani',
    'Kattaqo‘rg‘on shahri',
    'Kattaqo‘rg‘on tumani',
    'Narpay tumani',
    'Nurobod tumani',
    'Oqdaryo tumani',
    'Paxtachi tumani',
    'Pastdarg‘om tumani',
    'Payariq tumani',
    'Qo‘shrabot tumani',
    'Samarqand shahri',
    'Samarqand tumani',
    'Toyloq tumani',
    'Urgut tumani',
  ],
  'Surxondaryo viloyati': [
    'Angor tumani',
    'Bandixon tumani',
    'Boysun tumani',
    'Denov tumani',
    'Jarqo‘rg‘on tumani',
    'Muzrabot tumani',
    'Oltinsoy tumani',
    'Qiziriq tumani',
    'Qumqo‘rg‘on tumani',
    'Sariosiyo tumani',
    'Sherobod tumani',
    'Sho‘rchi tumani',
    'Termiz shahri',
    'Termiz tumani',
    'Uzun tumani',
  ],
  'Sirdaryo viloyati': [
    'Boyovut tumani',
    'Guliston shahri',
    'Guliston tumani',
    'Mirzaobod tumani',
    'Oqoltin tumani',
    'Sardoba tumani',
    'Sayxunobod tumani',
    'Shirin shahri',
    'Sirdaryo tumani',
    'Yangiyer shahri',
    'Xovos tumani',
  ],
  'Toshkent viloyati': [
    'Angren shahri',
    'Bekobod shahri',
    'Bekobod tumani',
    'Bo‘ka tumani',
    'Bo‘stonliq tumani',
    'Chinoz tumani',
    'Chirchiq shahri',
    'Ohangaron shahri',
    'Ohangaron tumani',
    'Olmaliq shahri',
    'Oqqo‘rg‘on tumani',
    'Parkent tumani',
    'Piskent tumani',
    'Qibray tumani',
    'Quyi Chirchiq tumani',
    'Yangiyo‘l shahri',
    'Yangiyo‘l tumani',
    'Yuqori Chirchiq tumani',
    'Zangiota tumani',
    'O‘rta Chirchiq tumani',
  ],
  'Toshkent shahri': [
    'Bektemir tumani',
    'Chilonzor tumani',
    'Mirobod tumani',
    'Mirzo Ulug‘bek tumani',
    'Olmazor tumani',
    'Sergeli tumani',
    'Shayxontohur tumani',
    'Uchtepa tumani',
    'Yakkasaroy tumani',
    'Yangihayot tumani',
    'Yashnobod tumani',
    'Yunusobod tumani',
  ],
  'Farg‘ona viloyati': [
    'Bag‘dod tumani',
    'Beshariq tumani',
    'Buvayda tumani',
    'Dang‘ara tumani',
    'Farg‘ona shahri',
    'Farg‘ona tumani',
    'Furqat tumani',
    'Marg‘ilon shahri',
    'Oltiariq tumani',
    'O‘zbekiston tumani',
    'Qo‘qon shahri',
    'Qo‘shtepa tumani',
    'Quva tumani',
    'Quvasoy shahri',
    'Rishton tumani',
    'So‘x tumani',
    'Toshloq tumani',
    'Uchko‘prik tumani',
    'Yozyovon tumani',
  ],
  'Xorazm viloyati': [
    'Bog‘ot tumani',
    'Gurlan tumani',
    'Hazorasp tumani',
    'Qo‘shko‘pir tumani',
    'Shovot tumani',
    'Tuproqqal’a tumani',
    'Urganch shahri',
    'Urganch tumani',
    'Xiva shahri',
    'Xiva tumani',
    'Xonqa tumani',
    'Yangiariq tumani',
    'Yangibozor tumani',
  ],
};

export default function Home() {
  const [activeSection, setActiveSection] = useState<SectionId>('listeners');
  const [listenerMenuOpen, setListenerMenuOpen] = useState(true);
  const [accessMenuOpen, setAccessMenuOpen] = useState(false);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [listeners, setListeners] = useState<ListenerRecord[]>(listenerRows);
  const [telegramGroupUrl, setTelegramGroupUrl] = useState(
    'https://t.me/+KjvJ7LUjdmY3MDhi',
  );

  useEffect(() => {
    const requestedSection = new URLSearchParams(window.location.search).get(
      'section',
    ) as SectionId | null;
    if (
      requestedSection &&
      navigation.some((item) => item.id === requestedSection)
    )
      setActiveSection(requestedSection);
  }, []);

  function openSection(section: SectionId) {
    setActiveSection(section);
    const url = new URL(window.location.href);
    url.searchParams.set('section', section);
    window.history.replaceState({}, '', url);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Asosiy navigatsiya">
        <div className="brand-block">
          <div className="crest brand-emblem" aria-hidden="true">
            <img src="/imv-oquv-markazi.png" alt="" />
          </div>
          <div className="brand-copy">
            <h1>E-ta&apos;lim</h1>
            <p className="brand-kicker">MTV huzuridagi O‘quv markazi</p>
          </div>
        </div>
        <nav className="side-nav" aria-label="Bo‘limlar">
          <div className="staff-nav listener-nav">
            <button
              className={
                listenerMenuOpen || activeSection === 'listeners'
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() => setListenerMenuOpen((current) => !current)}
              aria-expanded={listenerMenuOpen}
            >
              <span className="nav-dot" aria-hidden="true" />
              TINGLOVCHILAR<b>{listenerMenuOpen ? '−' : '+'}</b>
            </button>
            {listenerMenuOpen && (
              <div className="staff-subnav">
                <button
                  className={activeSection === 'listeners' ? 'selected' : ''}
                  onClick={() => openSection('listeners')}
                >
                  Tinglovchilar
                </button>
              </div>
            )}
          </div>
          <button
            className={
              activeSection === 'form' ? 'nav-item active' : 'nav-item'
            }
            onClick={() => openSection('form')}
          >
            <span className="nav-dot" aria-hidden="true" />
            TINGLOVCHI FORMASI
          </button>
          <button
            className={
              activeSection === 'terms' ? 'nav-item active' : 'nav-item'
            }
            onClick={() => openSection('terms')}
          >
            <span className="nav-dot" aria-hidden="true" />
            SHARTLAR
          </button>
          <div className="staff-nav access-nav">
            <button
              className={
                accessMenuOpen || activeSection === 'roles'
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() => setAccessMenuOpen((current) => !current)}
              aria-expanded={accessMenuOpen}
            >
              <span className="nav-dot" aria-hidden="true" />
              RUXSAT VA ROLL<b>{accessMenuOpen ? '−' : '+'}</b>
            </button>
            {accessMenuOpen && (
              <div className="staff-subnav access-subnav">
                <button
                  className={activeSection === 'roles' ? 'selected' : ''}
                  onClick={() => openSection('roles')}
                >
                  Rollar
                </button>
              </div>
            )}
          </div>
          <div className="staff-nav source-nav">
            <button
              className={
                sourceMenuOpen || activeSection === 'sources'
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() => setSourceMenuOpen((current) => !current)}
              aria-expanded={sourceMenuOpen}
            >
              <span className="nav-dot" aria-hidden="true" />
              MANBALAR<b>{sourceMenuOpen ? '−' : '+'}</b>
            </button>
            {sourceMenuOpen && (
              <div className="staff-subnav source-subnav">
                <button
                  className={activeSection === 'sources' ? 'selected' : ''}
                  onClick={() => openSection('sources')}
                >
                  Tingmanba
                </button>
                <button onClick={() => openSection('sources')}>
                  Hudud, tuman-shahar
                </button>
                <button onClick={() => openSection('sources')}>
                  Kategoriya, guruh
                </button>
                <button onClick={() => openSection('sources')}>
                  Vazirlik va idoralar
                </button>
              </div>
            )}
          </div>
        </nav>
        <div className="profile-mini">
          <div className="avatar">ИБ</div>
          <div>
            <strong>Islom</strong>
            <span>moliya@appsheet.uz</span>
            <small>Bosh admin</small>
          </div>
          <button aria-label="Akkaunt">•••</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="crest">
              <img src="/imv-oquv-markazi.png" alt="" />
            </span>
            <strong>E-ta&apos;lim</strong>
          </div>
          <div className="breadcrumbs">
            <span>O‘quv jarayoni</span>
            <b>/</b>
            <strong>{pageTitles[activeSection]}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Bildirishnomalar">
              ♟<i />
            </button>
            <button className="lang-button">O‘Z</button>
            <div className="top-avatar">ИБ</div>
          </div>
        </header>
        <div className="content">
          {activeSection === 'listeners' && (
            <ListenersPanel
              rows={listeners}
              onOpenForm={() => openSection('form')}
              telegramGroupUrl={telegramGroupUrl}
              onTelegramGroupUrlChange={setTelegramGroupUrl}
            />
          )}
          {activeSection === 'form' && (
            <ListenerForm
              rows={listeners}
              telegramGroupUrl={telegramGroupUrl}
              onCancel={() => openSection('listeners')}
              onSave={(listener, editingId) => {
                const id =
                  editingId ||
                  (window.crypto?.randomUUID?.() ?? String(Date.now()));
                const record = { ...listener, id, status: '' };
                record.status = listenerProgress(record).complete
                  ? 'Тўлиқ'
                  : 'Тўлдирилмаган';
                setListeners((current) =>
                  editingId
                    ? current.map((row) =>
                        row.id === editingId ? record : row,
                      )
                    : [...current, record],
                );
                return id;
              }}
            />
          )}
          {activeSection === 'terms' && (
            <TermsPanel onOpenForm={() => openSection('form')} />
          )}
          {activeSection === 'sources' && <SourcesPanel />}
          {activeSection === 'roles' && <RolesPanel />}
        </div>
      </section>
    </main>
  );
}

function ListenersPanel({
  rows,
  onOpenForm,
  telegramGroupUrl,
  onTelegramGroupUrlChange,
}: {
  rows: ListenerRecord[];
  onOpenForm: () => void;
  telegramGroupUrl: string;
  onTelegramGroupUrlChange: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [workplaceQuery, setWorkplaceQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [group, setGroup] = useState('all');
  const [region, setRegion] = useState('all');
  const [district, setDistrict] = useState('all');
  const [phone, setPhone] = useState('');
  const [telegramUrl, setTelegramUrl] = useState(telegramGroupUrl);
  const [telegramEditing, setTelegramEditing] = useState(false);
  const [month, setMonth] = useState('all');
  const [copied, setCopied] = useState('');

  const registrationUrl = 'https://mtv.etalimai.uz/?section=form';
  const validTelegramUrl = /^https:\/\/(?:t\.me|telegram\.me)\/.+/i.test(
    telegramUrl.trim(),
  );

  useEffect(() => setTelegramUrl(telegramGroupUrl), [telegramGroupUrl]);

  async function copyValue(value: string, label: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1800);
  }

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesQuery = row.name
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesWorkplace = (row.workplace || row.organization)
          .toLowerCase()
          .includes(workplaceQuery.toLowerCase());
        const matchesDate =
          !dateFilter || row.date === dateFilter.split('-').reverse().join('.');
        const matchesGroup = group === 'all' || row.group === group;
        const matchesRegion = region === 'all' || row.region === region;
        const matchesDistrict = district === 'all' || row.district === district;
        const matchesPhone =
          !phone ||
          row.phone.replace(/\s/g, '').includes(phone.replace(/\s/g, ''));
        return (
          matchesQuery &&
          matchesWorkplace &&
          matchesDate &&
          matchesGroup &&
          matchesRegion &&
          matchesDistrict &&
          matchesPhone
        );
      }),
    [query, workplaceQuery, dateFilter, group, region, district, phone, rows],
  );

  const regions = [...new Set(rows.map((row) => row.region))];
  const districts = [
    ...new Set(
      rows
        .filter((row) => region === 'all' || row.region === region)
        .map((row) => row.district),
    ),
  ];

  return (
    <section className="ting-page">
      {copied && (
        <div className="notice" role="status">
          ✓ {copied} nusxalandi
        </div>
      )}
      <header className="ting-hero ting-hero-unified has-admin-links listener-toolbar-only">
        <div className="listener-admin-links">
          <article className="listener-quick-link registration">
            <a
              className="listener-registration-open"
              href="?section=form"
              onClick={(event) => {
                event.preventDefault();
                onOpenForm();
              }}
            >
              <span className="listener-client-icon">↗</span>
              <span className="listener-link-copy">
                <b>Ro‘yxatdan o‘tish</b>
                <code>mtv.etalimai.uz/tinglovchi.html</code>
              </span>
              <i>→</i>
            </a>
            <button
              className="listener-registration-copy"
              type="button"
              onClick={() => void copyValue(registrationUrl, 'Forma havolasi')}
              title="Nusxalash"
            >
              <svg viewBox="0 0 24 24">
                <rect x="8" y="3" width="11" height="14" rx="2" />
                <path d="M16 17v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1" />
              </svg>
            </button>
          </article>
          {!telegramEditing ? (
            <article className="listener-quick-link telegram">
              <div className="listener-telegram-icon">➤</div>
              <div className="listener-link-copy">
                <b>Telegram guruhi</b>
                <code>{telegramGroupUrl}</code>
              </div>
              <div className="listener-link-actions">
                <button
                  className="listener-copy-icon-button"
                  type="button"
                  onClick={() =>
                    void copyValue(telegramGroupUrl, 'Telegram havolasi')
                  }
                >
                  <svg viewBox="0 0 24 24">
                    <rect x="8" y="3" width="11" height="14" rx="2" />
                    <path d="M16 17v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1" />
                  </svg>
                </button>
                <button type="button" onClick={() => setTelegramEditing(true)}>
                  ✎ TAHRIRLASH
                </button>
              </div>
            </article>
          ) : (
            <form
              className="listener-quick-link telegram editing"
              onSubmit={(event) => {
                event.preventDefault();
                if (!validTelegramUrl) return;
                onTelegramGroupUrlChange(telegramUrl.trim());
                setTelegramEditing(false);
              }}
            >
              <div className="listener-telegram-icon">➤</div>
              <label className="listener-link-copy">
                <b>Telegram guruhi</b>
                <input
                  type="url"
                  required
                  placeholder="https://t.me/..."
                  value={telegramUrl}
                  onChange={(event) => setTelegramUrl(event.target.value)}
                />
              </label>
              <div className="listener-link-actions">
                <button
                  type="button"
                  onClick={() => {
                    setTelegramUrl(telegramGroupUrl);
                    setTelegramEditing(false);
                  }}
                >
                  BEKOR
                </button>
                <button className="telegram-save" type="submit">
                  SAQLASH
                </button>
              </div>
            </form>
          )}
          <label className="listener-year-control">
            <select aria-label="Yil" defaultValue="2026">
              <option>2026</option>
            </select>
          </label>
          <label className="listener-filter-control listener-month-control">
            <span>OYLAR</span>
            <select
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            >
              <option value="all">Barchasi</option>
              <option value="08">Avgust</option>
              <option value="09">Sentabr</option>
            </select>
          </label>
          <label className="listener-filter-control listener-category-control">
            <span>KATEGORIYA</span>
            <select defaultValue="all">
              <option value="all">Barchasi</option>
              <option>Nomzod direktor</option>
            </select>
          </label>
          <button
            className="listener-word-export"
            type="button"
            disabled={!filteredRows.length}
          >
            <b>W</b>
            <span>WORD</span>
          </button>
        </div>
      </header>
      <article className="listener-directory listener-directory-gridless">
        <div className="listener-list">
          <div className="listener-table-wrap">
            <table className="listener-table listener-table-filterable">
              <colgroup>
                <col className="col-order" />
                <col className="col-date" />
                <col className="col-group" />
                <col className="col-photo" />
                <col className="col-name" />
                <col className="col-organization" />
                <col className="col-region" />
                <col className="col-district" />
                <col className="col-phone" />
                <col className="col-position" />
                <col className="col-age" />
              </colgroup>
              <thead>
                <tr>
                  <th>№</th>
                  <th>MO B SANA</th>
                  <th>Guruhlar</th>
                  <th>Rasm</th>
                  <th>F.I.Sh.</th>
                  <th>Ish joyi (MTM)</th>
                  <th>Hudud</th>
                  <th>Tuman-shahar</th>
                  <th>Telefon raqam</th>
                  <th>Lavozim</th>
                  <th>Yoshi</th>
                </tr>
                <tr className="listener-filter-row">
                  <th>—</th>
                  <th>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(event) => setDateFilter(event.target.value)}
                    />
                  </th>
                  <th>
                    <select
                      value={group}
                      onChange={(event) => setGroup(event.target.value)}
                    >
                      <option value="all">Barchasi</option>
                      {candidateGroups.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </th>
                  <th>
                    <select>
                      <option>Barchasi</option>
                      <option>Rasm bor</option>
                      <option>Rasm yo‘q</option>
                    </select>
                  </th>
                  <th>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="F.I.Sh.…"
                    />
                  </th>
                  <th>
                    <input
                      value={workplaceQuery}
                      onChange={(event) =>
                        setWorkplaceQuery(event.target.value)
                      }
                      placeholder="MTM…"
                    />
                  </th>
                  <th>
                    <select
                      value={region}
                      onChange={(event) => {
                        setRegion(event.target.value);
                        setDistrict('all');
                      }}
                    >
                      <option value="all">Barchasi</option>
                      {regions.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </th>
                  <th>
                    <select
                      value={district}
                      onChange={(event) => setDistrict(event.target.value)}
                    >
                      <option value="all">Barchasi</option>
                      {districts.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </th>
                  <th>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Telefon…"
                    />
                  </th>
                  <th>
                    <select>
                      <option>Barchasi</option>
                    </select>
                  </th>
                  <th>
                    <select>
                      <option>Barchasi</option>
                    </select>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="listener-order">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="listener-date">{row.date}</td>
                    <td className="listener-group-cell">{row.group}</td>
                    <td className="listener-photo">
                      <span className="listener-photo-frame">
                        {row.photo ? (
                          <img src={row.photo} alt="" />
                        ) : (
                          <span>{row.initials}</span>
                        )}
                      </span>
                    </td>
                    <td className="listener-name">
                      <span>{row.name}</span>
                    </td>
                    <td className="listener-organization">
                      {row.workplace || row.organization || '—'}
                    </td>
                    <td className="listener-region">{row.region}</td>
                    <td className="listener-district">{row.district}</td>
                    <td className="listener-phone">
                      <a href={`tel:${row.phone}`}>{row.phone}</a>
                    </td>
                    <td className="listener-position">{row.position}</td>
                    <td className="listener-age">{row.age ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filteredRows.length && (
            <div className="listener-empty">
              <span>⌕</span>
              <h4>Tinglovchi topilmadi</h4>
              <p>
                Yangi tinglovchini ro‘yxatdan o‘tish formasi orqali bittadan
                kiriting.
              </p>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}

function fileDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Faylni o‘qib bo‘lmadi.'));
    reader.readAsDataURL(file);
  });
}

function ListenerForm({
  rows,
  telegramGroupUrl,
  onSave,
  onCancel,
}: {
  rows: ListenerRecord[];
  telegramGroupUrl: string;
  onSave: (listener: ListenerDraft, editingId?: string) => string;
  onCancel: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [groupPreviewOpen, setGroupPreviewOpen] = useState(false);
  const [cardsOnly, setCardsOnly] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [editingRecord, setEditingRecord] = useState<ListenerRecord | null>(
    null,
  );
  const [zoomedRecord, setZoomedRecord] = useState<ListenerRecord | null>(null);

  const matchedListener = useMemo(
    () =>
      rows.find(
        (row) =>
          row.phone.replace(/\D/g, '').slice(-9) === phoneDigits &&
          phoneDigits.length === 9,
      ),
    [rows, phoneDigits],
  );
  const detectedGroup = matchedListener?.group || selectedGroup;
  const detectedGroupRows = useMemo(
    () => rows.filter((row) => row.group === detectedGroup),
    [rows, detectedGroup],
  );

  function openGroupPreview() {
    if (!detectedGroup) {
      setError(
        'Avval guruhni tanlang yoki avval ro‘yxatdan o‘tgan telefon raqamini kiriting.',
      );
      return;
    }
    setError('');
    setGroupPreviewOpen(true);
  }

  function editRecord(row: ListenerRecord) {
    setCardsOnly(false);
    setEditingRecord(row);
    setSelectedGroup(row.group);
    setSelectedRegion(row.region);
    setSelectedDistrict(row.district);
    setPhoneDigits(row.phone.replace(/\D/g, '').slice(-9));
    setPhotoPreview(row.photo);
    setGroupPreviewOpen(false);
    setSubmitted(false);
    setError('');
    window.requestAnimationFrame(() =>
      document
        .querySelector('.ting-form-body')
        ?.scrollTo({ top: 0, behavior: 'smooth' }),
    );
  }

  function cancelEditing() {
    setCardsOnly(false);
    setEditingRecord(null);
    setSelectedGroup('');
    setSelectedRegion('');
    setSelectedDistrict('');
    setPhoneDigits('');
    setPhotoPreview('');
    setSubmitted(false);
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      setError('Barcha majburiy maydonlarni to‘ldiring.');
      setSubmitted(false);
      return;
    }
    const data = new FormData(form);
    const surname = String(data.get('surname') ?? '').trim();
    const firstName = String(data.get('firstName') ?? '').trim();
    const patronymic = String(data.get('patronymic') ?? '').trim();
    const startDate = String(data.get('startDate') ?? '');
    const birthDate = String(data.get('birthDate') ?? '');
    const cleanPhone = String(data.get('phone') ?? '').replace(/\D/g, '');
    const readFile = async (name: string, existing: string) => {
      const file = data.get(name);
      return file instanceof File && file.size ? fileDataUrl(file) : existing;
    };
    const photo = await readFile('photo', editingRecord?.photo || '');
    const orderFile = await readFile('order', editingRecord?.orderFile || '');
    const passportFront = await readFile(
      'passportFront',
      editingRecord?.passportFront || '',
    );
    const passportBack = await readFile(
      'passportBack',
      editingRecord?.passportBack || '',
    );
    const age = birthDate
      ? Math.max(
          0,
          new Date().getFullYear() - new Date(birthDate).getFullYear(),
        )
      : null;
    const formatDate = (value: string) =>
      value ? value.split('-').reverse().join('.') : '—';
    const workplace = String(data.get('workplace') ?? '').trim();
    const draft: ListenerDraft = {
      date: formatDate(startDate),
      startDate,
      year: String(data.get('year') ?? '2026'),
      category: String(data.get('category') ?? ''),
      group: String(data.get('group') ?? ''),
      initials: `${surname[0] ?? ''}${firstName[0] ?? ''}`.toUpperCase(),
      surname,
      firstName,
      patronymic,
      name: [surname, firstName, patronymic].filter(Boolean).join(' '),
      organization: workplace,
      workplace,
      region: String(data.get('region') ?? ''),
      district: String(data.get('district') ?? ''),
      phone: `+998 ${cleanPhone.slice(0, 2)} ${cleanPhone.slice(2, 5)} ${cleanPhone.slice(5, 7)} ${cleanPhone.slice(7, 9)}`,
      position: String(data.get('position') ?? '').trim() || '—',
      birthDate,
      note: String(data.get('note') ?? '').trim(),
      age,
      role: 'Тингловчи',
      photo,
      orderFile,
      passportFront,
      passportBack,
    };
    onSave(draft, editingRecord?.id);
    setEditingRecord(null);
    setPhotoPreview('');
    setError('');
    setSubmitted(true);
    setGroupPreviewOpen(true);
    setCardsOnly(true);
    window.requestAnimationFrame(() =>
      document
        .querySelector('.ting-form-body')
        ?.scrollTo({ top: 0, behavior: 'smooth' }),
    );
  }

  return (
    <section className="listener-form-standalone">
      <div className="listener-form-intro">
        <p>TINGLOVCHI · 2026</p>
        <h2>Ro‘yxatdan o‘tkazish</h2>
        <small>
          Forma va kartochkalar E-talim manbasidan olinib, MTV uchun
          moslashtirildi.
        </small>
      </div>
      <form
        key={editingRecord?.id || 'new'}
        className={`ting-form ${editingRecord ? 'is-editing' : ''} ${cardsOnly ? 'cards-only-view' : ''}`}
        onSubmit={submit}
        noValidate
      >
        <header className="ting-form-main-header">
          <div className="ting-form-head-row">
            <div className="ting-form-heading">
              <span aria-hidden="true">📚</span>
              <div>
                <p>
                  {editingRecord
                    ? 'TINGLOVCHI · TAHRIRLASH'
                    : 'TINGLOVCHI · 2026'}
                </p>
                <h3>
                  {editingRecord
                    ? 'Ma’lumotni tahrirlash'
                    : 'Ro‘yxatdan o‘tkazish'}
                </h3>
              </div>
            </div>
            <button
              type="button"
              aria-label="Yopish"
              onClick={editingRecord ? cancelEditing : onCancel}
            >
              ×
            </button>
          </div>
          <div className="form-public-tools">
            <div className="form-lookup-bar">
              <input
                type="text"
                readOnly
                value={detectedGroup}
                placeholder="Guruh: avtomatik to‘ldiriladi"
                aria-label="Telefon yoki tanlov bo‘yicha aniqlangan guruh"
              />
              <button type="button" onClick={openGroupPreview}>
                👁 Ko‘rish
              </button>
            </div>
            <a
              className="form-telegram-invite"
              href={telegramGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Tinglovchilar Telegram guruhiga qo‘shilish"
            >
              <span className="form-telegram-plane" aria-hidden="true">
                ➤
              </span>
              <span className="form-telegram-copy">
                <strong>Telegram guruhimiz</strong>
                <small>E&apos;lonlar, savollar va guruh muloqoti</small>
              </span>
              <span className="form-telegram-action">Qo‘shilish →</span>
            </a>
          </div>
        </header>
        <div className="ting-form-body">
          {cardsOnly && (
            <div className="cards-only-success">
              ✓ Tinglovchi ro‘yxatga kiritildi. Guruh kartochkasi ochildi.
            </div>
          )}
          {groupPreviewOpen && (
            <section className="form-group-preview">
              <header>
                <div>
                  <small>TELEFON / GURUH BO‘YICHA</small>
                  <h4>
                    👥 {detectedGroup} · {detectedGroupRows.length} nafar
                  </h4>
                </div>
                {!cardsOnly && (
                  <button
                    type="button"
                    onClick={() => setGroupPreviewOpen(false)}
                  >
                    Yopish
                  </button>
                )}
              </header>
              {detectedGroupRows.length ? (
                <div className="form-group-members listener-card-list">
                  {detectedGroupRows.map((row) => {
                    const progress = listenerProgress(row);
                    const isMe = matchedListener?.id === row.id;
                    return (
                      <article
                        className={`listener-member-card ${progress.complete ? 'complete' : 'incomplete'} ${isMe ? 'is-me' : ''}`}
                        key={row.id}
                      >
                        {row.age !== null && (
                          <span className="listener-age-badge">{row.age}</span>
                        )}
                        <div className="listener-member-row">
                          <div className="listener-member-photo-column">
                            <button
                              type="button"
                              className="listener-photo-button"
                              disabled={!row.photo}
                              onClick={() => row.photo && setZoomedRecord(row)}
                            >
                              {row.photo ? (
                                <img
                                  src={row.photo}
                                  alt={`${row.name} rasmi`}
                                />
                              ) : (
                                '👤'
                              )}
                            </button>
                          </div>
                          <div className="listener-member-info">
                            <div className="listener-member-name">
                              {row.name || 'Noma’lum'}{' '}
                              {isMe && (
                                <em
                                  className={
                                    progress.complete
                                      ? 'complete'
                                      : 'incomplete'
                                  }
                                >
                                  {progress.complete ? 'SIZ ✓' : 'SIZ'}
                                </em>
                              )}
                            </div>
                            <div className="listener-member-workplace">
                              <span>▦</span>
                              {row.workplace || 'Ish joyi kiritilmagan'}
                            </div>
                            <div className="listener-member-region">
                              {row.region}
                              {row.district ? `, ${row.district}` : ''}
                            </div>
                            <div className="listener-member-phone">
                              <a href={`tel:${row.phone.replace(/\s/g, '')}`}>
                                📞
                              </a>
                              <a href={`tel:${row.phone.replace(/\s/g, '')}`}>
                                {row.phone}
                              </a>
                            </div>
                            {row.position !== '—' && (
                              <div className="listener-member-position">
                                {row.position}
                              </div>
                            )}
                          </div>
                        </div>
                        {row.orderFile && (
                          <a
                            className="listener-member-document"
                            href={row.orderFile}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className="listener-member-document-preview">
                              FAYL
                            </span>
                            <span className="listener-member-document-copy">
                              <b>Buyruq</b>
                              <small>Ko‘rish uchun bosing</small>
                            </span>
                          </a>
                        )}
                        {!progress.complete && (
                          <footer className="listener-member-edit">
                            <span>
                              To‘ldirilgan {progress.completed}/{progress.total}
                            </span>
                            <button
                              type="button"
                              onClick={() => editRecord(row)}
                            >
                              ✎ TAHRIRLASH
                            </button>
                          </footer>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="form-group-empty">
                  <b>Bu guruhda hali tinglovchi yo‘q</b>
                  <span>
                    Birinchi tinglovchini quyidagi forma orqali kiriting.
                  </span>
                </div>
              )}
            </section>
          )}
          {!cardsOnly && (
            <>
              <section className="ting-form-section">
                <div className="ting-section-title">
                  <span>01</span>
                  <div>
                    <b>O‘quv oqimi</b>
                  </div>
                </div>
                <div className="ting-form-grid">
                  <label>
                    <span>Malaka oshirish boshlangan sana</span>
                    <input
                      name="startDate"
                      type="date"
                      defaultValue={editingRecord?.startDate || ''}
                    />
                  </label>
                  <label>
                    <span>Yil</span>
                    <input
                      name="year"
                      defaultValue={editingRecord?.year || '2026'}
                      maxLength={4}
                    />
                  </label>
                  <label>
                    <span>Kategoriya *</span>
                    <select
                      name="category"
                      required
                      defaultValue={
                        editingRecord?.category || 'Nomzod direktor'
                      }
                    >
                      <option>Nomzod direktor</option>
                    </select>
                  </label>
                  <label>
                    <span>Guruh *</span>
                    {editingRecord && (
                      <input type="hidden" name="group" value={selectedGroup} />
                    )}
                    <select
                      name={editingRecord ? undefined : 'group'}
                      required
                      value={selectedGroup}
                      disabled={Boolean(editingRecord)}
                      onChange={(event) => {
                        setSelectedGroup(event.target.value);
                        setGroupPreviewOpen(false);
                      }}
                    >
                      <option value="">Tanlang</option>
                      {candidateGroups.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
              <section className="ting-form-section ting-origin-section">
                <div className="ting-section-title">
                  <span>02</span>
                  <div>
                    <b>Ish joyi va hudud</b>
                  </div>
                </div>
                <div className="ting-form-grid">
                  <label>
                    <span>Hudud *</span>
                    <select
                      name="region"
                      required
                      value={selectedRegion}
                      onChange={(event) => {
                        setSelectedRegion(event.target.value);
                        setSelectedDistrict('');
                      }}
                    >
                      <option value="">Tanlang</option>
                      {Object.keys(districtsByRegion).map((region) => (
                        <option key={region}>{region}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Tuman-shahar *</span>
                    <select
                      name="district"
                      required
                      disabled={!selectedRegion}
                      value={selectedDistrict}
                      onChange={(event) =>
                        setSelectedDistrict(event.target.value)
                      }
                    >
                      <option value="">
                        {selectedRegion ? 'Tanlang' : 'Avval hududni tanlang'}
                      </option>
                      {(districtsByRegion[selectedRegion] || []).map(
                        (district) => (
                          <option key={district}>{district}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="wide workplace-field">
                    <span>Ish joyi (MTM) *</span>
                    <input
                      name="workplace"
                      required
                      defaultValue={editingRecord?.workplace || ''}
                      placeholder="MTM yoki tashkilot nomini qo‘lda kiriting"
                    />
                  </label>
                  <label className="wide">
                    <span>Lavozim</span>
                    <input
                      name="position"
                      defaultValue={
                        editingRecord?.position === '—'
                          ? ''
                          : editingRecord?.position || ''
                      }
                      placeholder="Lavozimni qo‘lda kiriting"
                    />
                  </label>
                </div>
              </section>
              <section className="ting-form-section">
                <div className="ting-section-title">
                  <span>03</span>
                  <div>
                    <b>Shaxsiy ma’lumotlar</b>
                  </div>
                </div>
                <div className="ting-form-grid">
                  <label>
                    <span>Familiya *</span>
                    <input
                      name="surname"
                      required
                      defaultValue={editingRecord?.surname || ''}
                    />
                  </label>
                  <label>
                    <span>Ism *</span>
                    <input
                      name="firstName"
                      required
                      defaultValue={editingRecord?.firstName || ''}
                    />
                  </label>
                  <label>
                    <span>Otasining ismi</span>
                    <input
                      name="patronymic"
                      defaultValue={editingRecord?.patronymic || ''}
                    />
                  </label>
                  <label>
                    <span>Tug‘ilgan sana</span>
                    <input
                      name="birthDate"
                      type="date"
                      defaultValue={editingRecord?.birthDate || ''}
                    />
                  </label>
                  <label>
                    <span>Telefon *</span>
                    <div className="ting-phone">
                      <i>+998</i>
                      <input
                        name="phone"
                        required
                        inputMode="numeric"
                        maxLength={9}
                        pattern="[0-9]{9}"
                        placeholder="XX XXX XX XX"
                        value={phoneDigits}
                        onChange={(event) => {
                          setPhoneDigits(
                            event.target.value.replace(/\D/g, '').slice(0, 9),
                          );
                          setGroupPreviewOpen(false);
                        }}
                      />
                    </div>
                    {matchedListener && (
                      <small className="phone-group-found">
                        ✓ {matchedListener.group} aniqlandi
                      </small>
                    )}
                  </label>
                  <label className="wide">
                    <span>Izoh</span>
                    <textarea
                      name="note"
                      defaultValue={editingRecord?.note || ''}
                    />
                  </label>
                </div>
              </section>
              <section className="ting-form-section">
                <div className="ting-section-title">
                  <span>04</span>
                  <div>
                    <b>Hujjatlar</b>
                  </div>
                </div>
                <div className="ting-files">
                  <label
                    className={`ting-file ting-photo-upload ${photoPreview ? 'has-file' : ''}`}
                  >
                    <input
                      name="photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required={!editingRecord?.photo}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          setPhotoPreview(editingRecord?.photo || '');
                          return;
                        }
                        void fileDataUrl(file).then(setPhotoPreview);
                      }}
                    />
                    {photoPreview ? (
                      <img
                        className="ting-photo-preview"
                        src={photoPreview}
                        alt="Tanlangan 3×4 rasm"
                      />
                    ) : (
                      <span>＋</span>
                    )}
                    <b>{photoPreview ? '3×4 rasm tanlandi' : '3×4 rasm *'}</b>
                    <small>
                      {photoPreview
                        ? 'Almashtirish uchun rasmni bosing'
                        : 'JPG, PNG yoki WEBP'}
                    </small>
                  </label>
                  <label
                    className={`ting-file ${editingRecord?.orderFile ? 'has-file' : ''}`}
                  >
                    <input
                      name="order"
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                    />
                    <span>PDF</span>
                    <b>
                      {editingRecord?.orderFile
                        ? 'Buyruq yuklangan ✓'
                        : 'Buyruq (PDF yoki rasm)'}
                    </b>
                  </label>
                  <label
                    className={`ting-file compact ${editingRecord?.passportFront ? 'has-file' : ''}`}
                  >
                    <input name="passportFront" type="file" accept="image/*" />
                    <span>＋</span>
                    <b>
                      {editingRecord?.passportFront
                        ? 'Pasport old tomoni ✓'
                        : 'Pasport old tomoni'}
                    </b>
                  </label>
                  <label
                    className={`ting-file compact ${editingRecord?.passportBack ? 'has-file' : ''}`}
                  >
                    <input name="passportBack" type="file" accept="image/*" />
                    <span>＋</span>
                    <b>
                      {editingRecord?.passportBack
                        ? 'Pasport orqa tomoni ✓'
                        : 'Pasport orqa tomoni'}
                    </b>
                  </label>
                </div>
              </section>
              {error && (
                <div className="ting-state error">
                  <b>!</b>
                  <span>{error}</span>
                </div>
              )}
              {submitted && (
                <div className="ting-state">
                  <span>
                    ✓ Ma’lumotlar saqlandi. Guruh kartochkalari yangilandi.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
        {!cardsOnly && (
          <footer>
            <button
              type="button"
              onClick={editingRecord ? cancelEditing : onCancel}
            >
              {editingRecord ? 'TAHRIRNI BEKOR QILISH' : 'Bekor qilish'}
            </button>
            <button className="primary">
              {editingRecord ? 'O‘ZGARISHLARNI SAQLASH' : 'RO‘YXATGA KIRITISH'}
            </button>
          </footer>
        )}
      </form>
      {zoomedRecord?.photo && (
        <div
          className="form-photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${zoomedRecord.name} rasmi`}
          onClick={() => setZoomedRecord(null)}
        >
          <button
            type="button"
            aria-label="Yopish"
            onClick={() => setZoomedRecord(null)}
          >
            ×
          </button>
          <figure onClick={(event) => event.stopPropagation()}>
            <img src={zoomedRecord.photo} alt={`${zoomedRecord.name} rasmi`} />
            <figcaption>{zoomedRecord.name}</figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}

function TermsPanel({ onOpenForm }: { onOpenForm: () => void }) {
  const terms = [
    {
      number: '01',
      title: 'Kategoriya va guruh',
      text: '“Nomzod direktor” kategoriyasi hamda 56–61-guruhlardan biri tanlanishi majburiy.',
    },
    {
      number: '02',
      title: 'Ish joyi va hudud',
      text: 'Ish joyi (MTM) qo‘lda kiritiladi, hudud va tuman-shahar ro‘yxatdan tanlanadi.',
    },
    {
      number: '03',
      title: 'Familiya va ism',
      text: 'Familiya va ism kiritilishi majburiy; otasining ismi manbadagi kabi ixtiyoriy maydon.',
    },
    {
      number: '04',
      title: 'Telefon raqami',
      text: '+998 prefiksidan keyin aynan 9 ta raqam kiritilishi shart.',
    },
    {
      number: '05',
      title: '3×4 rasm',
      text: 'Tinglovchining 3×4 formatidagi suratini yuklash majburiy.',
    },
    {
      number: '06',
      title: 'Ixtiyoriy hujjatlar',
      text: 'Buyruq, pasport old-orqa nusxalari, lavozim, tug‘ilgan sana va izoh ixtiyoriy.',
    },
  ];
  return (
    <section className="terms-source-page">
      <header className="terms-source-head">
        <p>TINGLOVCHI FORMASI · VALIDATEFORM</p>
        <h2>Ro‘yxatdan o‘tish shartlari</h2>
        <small>
          Talablar moliya-svg/E-talim dagi forma tekshiruvlaridan aynan olindi.
        </small>
      </header>
      <div className="terms-source-list">
        {terms.map((term) => (
          <article key={term.number}>
            <span>{term.number}</span>
            <div>
              <h3>{term.title}</h3>
              <p>{term.text}</p>
            </div>
          </article>
        ))}
      </div>
      <button className="terms-source-action" onClick={onOpenForm}>
        TINGLOVCHI FORMASINI OCHISH
      </button>
    </section>
  );
}

function SourcesPanel() {
  const [entryOpen, setEntryOpen] = useState(false);
  const [entries, setEntries] = useState<
    Array<{ id: number; kind: string; value: string }>
  >([]);
  const [sourceView, setSourceView] = useState<'locations' | 'groups'>(
    'groups',
  );

  function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const kind = String(data.get('sourceKind') ?? '').trim();
    const value = String(data.get('sourceValue') ?? '').trim();
    if (!kind || !value) return;
    setEntries((current) => [...current, { id: Date.now(), kind, value }]);
    form.reset();
    setEntryOpen(false);
  }

  const sourceItems =
    sourceView === 'groups'
      ? candidateGroups
      : entries
          .filter((entry) => entry.kind === 'Ҳудуд ва туман')
          .map((entry) => entry.value);
  return (
    <section className="ting-source-page">
      <header className="ting-source-hero">
        <div>
          <p className="eyebrow">TINGMANBA · TINGLOVCHILAR MANBASI</p>
          <h2>Tingmanba</h2>
          <p>
            {sourceView === 'locations'
              ? 'Viloyatlar va ularga tegishli tuman-shaharlarni boshqaring.'
              : 'Har bir kategoriya va unga bog‘langan guruhlarni boshqaring.'}
          </p>
        </div>
        <button type="button" onClick={() => setEntryOpen(true)}>
          <span>＋</span>
          {sourceView === 'locations' ? 'HUDUD QO‘SHISH' : 'GURUH QO‘SHISH'}
        </button>
      </header>
      <nav className="ting-source-switch">
        <button
          className={
            sourceView === 'locations' ? 'active location' : 'location'
          }
          onClick={() => setSourceView('locations')}
        >
          <span className="source-switch-icon">HU</span>
          <span>
            <strong>Hudud → tuman-shahar</strong>
            <small>Viloyat va unga tegishli tuman-shaharlar</small>
          </span>
          <b>
            {entries.filter((entry) => entry.kind === 'Ҳудуд ва туман').length}
            <i>hudud</i>
          </b>
        </button>
        <button
          className={sourceView === 'groups' ? 'active groups' : 'groups'}
          onClick={() => setSourceView('groups')}
        >
          <span className="source-switch-icon">KG</span>
          <span>
            <strong>Kategoriya → guruh</strong>
            <small>Har bir kategoriya uchun alohida guruhlar</small>
          </span>
          <b>
            1<i>kategoriya</i>
          </b>
        </button>
      </nav>
      <article className={`ting-map-panel ${sourceView}`}>
        <header className="ting-map-head">
          <div>
            <p className="eyebrow">
              {sourceView === 'locations'
                ? 'TINGLOVCHILAR HUDUDI'
                : 'TINGLOVCHILAR OQIMI'}
            </p>
            <h3>
              {sourceView === 'locations'
                ? 'Viloyat va bog‘langan tuman-shaharlar'
                : 'Kategoriya va bog‘langan guruhlar'}
            </h3>
            <p>
              Etalimmanbadagi kabi: avval asosiy manba, so‘ng unga tegishli
              qiymat tanlanadi.
            </p>
          </div>
          <button type="button" onClick={() => setEntryOpen(true)}>
            ＋{' '}
            {sourceView === 'locations'
              ? 'Viloyat yoki tuman'
              : 'Kategoriya yoki guruh'}
          </button>
        </header>
        <div className="ting-split-workspace">
          <aside className="ting-master-rail">
            <button className="selected">
              <span>
                {sourceView === 'groups' ? 'Nomzod direktor' : 'Hududlar'}
              </span>
              <b>{sourceItems.length}</b>
            </button>
          </aside>
          <div className="ting-detail-browser">
            <div className="ting-detail-head">
              <div>
                <span>Tanlangan manba</span>
                <h4>
                  {sourceView === 'groups'
                    ? 'Nomzod direktor'
                    : 'Hudud, tuman-shahar'}
                </h4>
              </div>
              <div className="ting-detail-tools">
                <label>
                  <span>⌕</span>
                  <input placeholder="Manbani qidiring" />
                </label>
                <button type="button" onClick={() => setEntryOpen(true)}>
                  ＋
                </button>
              </div>
            </div>
            <div className="ting-link-grid">
              {sourceItems.map((item, index) => (
                <div className="ting-link-item" key={item}>
                  <b>{String(index + 1).padStart(2, '0')}</b>
                  <span>{item}</span>
                  <small className="active">Faol</small>
                  <div>
                    <button type="button">✎</button>
                    <button type="button" className="danger">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {!sourceItems.length && (
              <div className="ting-map-empty">
                <span>＋</span>
                <h4>Ma’lumot kiritilmagan</h4>
                <p>Birinchi yozuvni bittadan qo‘shing.</p>
                <button type="button" onClick={() => setEntryOpen(true)}>
                  Qo‘shish
                </button>
              </div>
            )}
          </div>
        </div>
      </article>
      {entryOpen && (
        <div className="ting-source-modal">
          <form onSubmit={addEntry}>
            <header className={sourceView}>
              <div>
                <p>
                  {sourceView === 'locations' ? 'YANGI HUDUD' : 'YANGI GURUH'}
                </p>
                <h3>
                  {sourceView === 'locations'
                    ? 'Hudud → tuman-shahar'
                    : 'Kategoriya → guruh'}
                </h3>
              </div>
              <button type="button" onClick={() => setEntryOpen(false)}>
                ×
              </button>
            </header>
            <div className="ting-source-form-grid">
              <input
                type="hidden"
                name="sourceKind"
                value={
                  sourceView === 'locations'
                    ? 'Ҳудуд ва туман'
                    : 'Категория ва гуруҳ'
                }
              />
              <label>
                <span>
                  {sourceView === 'locations' ? 'Tuman-shahar *' : 'Guruh *'}
                </span>
                <input name="sourceValue" required />
                <small>Yozuvlar manbaga bittadan qo‘shiladi</small>
              </label>
              <label className="ting-source-check">
                <input type="checkbox" defaultChecked />
                <span>Faol manba sifatida ishlatilsin</span>
              </label>
            </div>
            <footer>
              <button type="button" onClick={() => setEntryOpen(false)}>
                Bekor qilish
              </button>
              <button className="primary">
                {sourceView === 'locations'
                  ? 'HUDUDNI SAQLASH'
                  : 'GURUHNI SAQLASH'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}

function RolesPanel() {
  const [selectedRole, setSelectedRole] = useState('Bosh admin');
  const [activeTab, setActiveTab] = useState<
    'roles' | 'permissions' | 'monitoring'
  >('roles');
  const roles = [
    {
      name: 'Bosh admin',
      note: 'Барча саҳифа ва ҳаракатларга тўлиқ рухсат.',
      pages: [
        'Тингловчилар',
        'Eta’lim манба',
        'Ҳудуд ва туман',
        'Категория ва гуруҳ',
        'Вазирлик ва идоралар',
      ],
      actions: ['Кўриш', 'Киритиш', 'Таҳрирлаш', 'Ўчириш'],
    },
    {
      name: 'Admin',
      note: 'Манбадаги preset бўйича тўлиқ бошқарув рухсати.',
      pages: [
        'Тингловчилар',
        'Eta’lim манба',
        'Ҳудуд ва туман',
        'Категория ва гуруҳ',
        'Вазирлик ва идоралар',
      ],
      actions: ['Кўриш', 'Киритиш', 'Таҳрирлаш', 'Ўчириш'],
    },
    {
      name: 'Foydalanuvchi',
      note: 'Тингловчилар ва белгиланган иш саҳифаларига кириш.',
      pages: [
        'Бош саҳифа',
        'Солнома',
        'Дарс соатлари',
        'Назорат соатлари',
        'Режа-амалда',
        'FISH ҳисоботи',
        'Модул ва мавзулар',
        'Тингловчилар',
        'Туғилган кунлар',
      ],
      actions: ['Кўриш', 'Киритиш', 'Таҳрирлаш', 'Ўчириш'],
    },
    {
      name: 'Ko‘ruvchi',
      note: 'Фақат кўриш ҳуқуқи берилган чекланган роль.',
      pages: [
        'Бош саҳифа',
        'Режа-амалда',
        'FISH ҳисоботи',
        'Тингловчилар',
        'Туғилган кунлар',
      ],
      actions: ['Кўриш'],
    },
  ];
  const selected = roles.find((role) => role.name === selectedRole) ?? roles[0];
  const permissionRows = [
    ['TINGLOVCHILAR', 'Тингловчилар'],
    ['MANBALAR', 'Eta’lim манба'],
    ['MANBALAR', 'Ҳудуд ва туман'],
    ['MANBALAR', 'Категория ва гуруҳ'],
    ['MANBALAR', 'Вазирлик ва идоралар'],
  ];

  return (
    <section className="access-page access-management-page">
      <div className="access-hero access-management-hero">
        <div className="access-title-block">
          <h2>RUXSAT VA ROLL</h2>
          <div className="access-view-tabs" role="tablist">
            <button
              className={activeTab === 'roles' ? 'active' : ''}
              onClick={() => setActiveTab('roles')}
            >
              Rollar
            </button>
            <button
              className={activeTab === 'permissions' ? 'active' : ''}
              onClick={() => setActiveTab('permissions')}
            >
              Ruxsatlar
            </button>
            <button
              className={activeTab === 'monitoring' ? 'active' : ''}
              onClick={() => setActiveTab('monitoring')}
            >
              Monitoring
            </button>
          </div>
        </div>
        {activeTab === 'roles' && (
          <button
            type="button"
            className="staff-entry-button access-entry-button"
          >
            <span>＋</span> KIRITISH
          </button>
        )}
      </div>
      {activeTab !== 'monitoring' ? (
        <>
          <div className="access-role-presets">
            {roles.map((role) => (
              <button
                type="button"
                key={role.name}
                className={selectedRole === role.name ? 'active' : ''}
                onClick={() => setSelectedRole(role.name)}
              >
                <strong>{role.name}</strong>
                <small>{role.note}</small>
              </button>
            ))}
          </div>
          <article className="access-panel access-matrix-panel">
            <div className="access-panel-head">
              <div>
                <p className="eyebrow">ROL BO‘YICHA AMALLAR</p>
                <h3>
                  {activeTab === 'roles'
                    ? 'Rol bo‘yicha sahifalar'
                    : 'Ruxsatlar'}
                </h3>
                <p>{selected.name} uchun manbadagi ruxsatlar matritsasi.</p>
              </div>
            </div>
            <div className="access-table-wrap">
              <table className="access-simple-grid">
                <thead>
                  <tr>
                    <th>BO‘LIM</th>
                    <th>SAHIFA</th>
                    {['Ko‘rish', 'Kiritish', 'Tahrirlash', 'O‘chirish'].map(
                      (action) => (
                        <th key={action}>{action}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {permissionRows.map(([section, page]) => {
                    const pageEnabled = selected.pages.includes(page);
                    return (
                      <tr key={page}>
                        <td>{section}</td>
                        <td>{page}</td>
                        {['Кўриш', 'Киритиш', 'Таҳрирлаш', 'Ўчириш'].map(
                          (action) => {
                            const enabled =
                              pageEnabled && selected.actions.includes(action);
                            return (
                              <td key={action}>
                                <span
                                  className={`access-simple-check ${enabled ? '' : 'off'}`}
                                >
                                  {enabled ? '✓' : '–'}
                                </span>
                              </td>
                            );
                          },
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : (
        <div className="access-load-status">
          <span>⌕</span>
          <div>
            <strong>Monitoring yozuvlari hali mavjud emas</strong>
            <small>
              Faoliyat yozuvlari keyingi bosqichda shu yerda ko‘rinadi.
            </small>
          </div>
        </div>
      )}
    </section>
  );
}
