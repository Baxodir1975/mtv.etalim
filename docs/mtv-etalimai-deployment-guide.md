# mtv-etalimai deployment ва тиклаш қўлланмаси

## Архитектура

- Frontend ва API: Next/Vinext, Cloudflare Worker.
- Production домен: `mtv.etalimai.uz`.
- Маълумотлар базаси: Neon PostgreSQL.
- Файллар: `listener_files` жадвалида `BYTEA`; паспорт файллари public API орқали берилмайди.
- Манба коди: фақат `moliya-svg/mtv.etalim` репозиторийсига push қилинади.

## Neon миграциялари

Миграциялар `db/migrations/` папкасида:

1. `0001_mtv_etalimai.sql`
2. `0002_mtv_etalimai_telegram.sql`
3. `0003_mtv_etalimai_listener_files.sql`
4. `0004_mtv_etalimai_protected_admins.sql`
5. `0005_mtv_etalimai_recovery_and_audit.sql`

Улар Neon SQL Editor’да тартиб билан бажарилади. `0005` transaction,
lock timeout ва statement timeout билан ҳимояланган. Production миграциясидан олдин
Neon child branch backup яратилади. `DATABASE_URL` ҳеч қачон GitHub ёки ушбу
ҳужжатга ёзилмайди.

## Cloudflare secret ва deploy

```powershell
npm ci
npm run audit:prod
npm run lint
npm run typecheck
npm run build
npx wrangler deploy --config dist/server/wrangler.json --name mtv-etalimai --keep-vars --strict --dry-run
npx wrangler deploy --config dist/server/wrangler.json --name mtv-etalimai --keep-vars --strict
```

Worker’да `DATABASE_URL`, `ADMIN_ACCESS_PASSWORD` ва `AUTH_SESSION_SECRET`
secret номлари мавжудлиги deploy’дан олдин `wrangler secret list` билан
текширилади. Қийматлар фақат Cloudflare’нинг шифрланган secret сақлагичида
туради; оддий deploy пайтида қайта киритилмайди.

## Текшириш

```powershell
npx tsc --noEmit
npx oxlint app/api lib/server-data.ts
npm run build
```

Production текшируви:

- `GET https://mtv.etalimai.uz/api/state` — 200.
- Формада мажбурий майдонлар ва 3×4 расм билан сақлаш.
- «Кўриш»да айнан бириктирилган гуруҳ карточкаларини кўриш.
- Такрорий телефон рақамини 409 билан рад этиш.

## Бош админ

`ilxomovb2023@gmail.com` ва `etalim@appsheet.uz` ҳимояланган `Bosh admin`
сифатида серверда қайта тасдиқланади ва 20 та рухсатни олади.

## Файл чекловлари

- 3×4 расм: JPG/PNG/WEBP, 2 MB гача.
- Буйруқ: PDF/JPG/PNG/WEBP, 3 MB гача.
- Паспорт олд ва орқа томони: ҳар бири 2 MB гача.
- Жами upload: 8 MB гача.
