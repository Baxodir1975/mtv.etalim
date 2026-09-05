export function formatAdminCohort(cohort: {
  group: string;
  year: string;
  month: string;
  category?: string;
}) {
  const months = [
    'yanvar',
    'fevral',
    'mart',
    'aprel',
    'may',
    'iyun',
    'iyul',
    'avgust',
    'sentyabr',
    'oktyabr',
    'noyabr',
    'dekabr',
  ];
  const period = [
    cohort.year ? `${cohort.year} yil` : '',
    months[Number(cohort.month) - 1] || '',
  ].filter(Boolean);
  const group =
    cohort.group ||
    (cohort.category
      ? `${cohort.category} · Barcha guruhlar`
      : 'Barcha guruhlar');
  const parsed = /^(.*?)\s*\((\d+)-guruh\)$/i.exec(group.trim());
  if (parsed && period.length)
    return `${parsed[1].trim()} (${[...period, `${parsed[2]}-guruh`].join(', ')})`;
  return `${group} · ${period.length ? period.join(', ') : 'Barcha davrlar'}`;
}
