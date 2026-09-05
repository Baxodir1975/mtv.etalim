export const formUrls = {
  listener: 'https://mtv.etalimai.uz/?section=form',
  admin: 'https://mtv.etalimai.uz/admin?section=form',
} as const;

export function formShareText(kind: keyof typeof formUrls) {
  return kind === 'listener'
    ? [
        '🎓 MTV E-TA’LIM AI',
        '📝 Oddiy tinglovchi formasi',
        '',
        'Ma’lumotlaringizni to‘ldirib, «RO‘YXATGA KIRITISH»ni bosing.',
        '«KO‘RISH»da ro‘yxatdan o‘tgan yilingiz, oyingiz, kategoriyangiz va guruhingiz saqlanadi.',
        '«KO‘RISH»ni qayta bosib, o‘z guruhingiz ro‘yxatini yangilang.',
        '',
        '🔗 ' + formUrls.listener,
      ].join('\n')
    : [
        '🎓 MTV E-TA’LIM AI',
        '🔐 Bosh admin formasi',
        '',
        'Tinglovchilarni kiritish va tahrirlash, yil–oy–guruh bo‘yicha ko‘rish.',
        'Faqat ruxsat berilgan bosh admin akkaunti bilan kiriladi.',
        'Bu havola o‘z-o‘zidan admin huquqini bermaydi.',
        '',
        '🔗 ' + formUrls.admin,
      ].join('\n');
}
