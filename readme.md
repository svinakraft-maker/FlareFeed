<div align="center">

# ☁️ FlareFeed ☁️
# ↘️ПРОКСИ ЗЕРКАЛА И ВСЕ ОБНОВЛЕНИЯ↙️ 
# 💬 https://t.me/FlareFeedtg 💬
# ↗️ЧАТ И ПРЕДЛОЖЕНИЯ ПО УЛУЧШЕНИЮ↖️
### Независимое хранилище VLESS‑подписок на Cloudflare Workers

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Gitverse mirror](https://img.shields.io/badge/mirror-Gitverse-2b6cb0?style=for-the-badge)](https://gitverse.ru/Nokls/FlareFeed)
[![Auto-updated](https://img.shields.io/badge/refresh-~every%201h-brightgreen?style=for-the-badge)](#-обновление-подписок)
[![last update](https://img.shields.io/github/last-commit/svinakraft-maker/flarefeed?label=last%20update&style=for-the-badge&logo=github&color=blue)](https://github.com/svinakraft-maker/flarefeed/commits/main)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/svinakraft-maker/flarefeed?style=for-the-badge&color=blue)](https://github.com/svinakraft-maker/flarefeed/stargazers)

</div>

## 🎬 Демо

<div align="center">
  
![maxresdefault](https://raw.githubusercontent.com/svinakraft-maker/FlareFeed/refs/heads/main/video/prewiew.gif)

</div>

## 🚀 Готовая подписка

Ссылки — выбирай под свой клиент. Просто скопируй и вставь в VPN‑клиент (Happ, v2rayN, mihomo, Shadowrocket и др.):


# 🌐 ALL — все рабочие серверы
Полный список живых конфигов после проверки. Для агрегаторов и личной проверки

```text
https://vless.svinakraft.workers.dev/podpiska.txt
```
# 🛡️TOP 500 SECURE — топ защищённых
Отсортировано по качеству (Reality+XHTTP+TLS). **Для LTE** — список от сильных DPI анализов.

```text
https://vless.svinakraft.workers.dev/Top500.txt
```

## 📱 MOBILE — топ быстрых
Отсортировано по качеству (минимальный пинг + максимальная скорость). **Для телефона и Happ** — лёгкий список, не тормозит импорт.

```text
https://vless.svinakraft.workers.dev/fastest.txt
```



### 🇷🇺 ЗЕРКАЛО на Gitverse — если основное не открывается
Резервные ссылки на российском Gitverse. Работают **без Cloudflare и GitHub** (отдаются напрямую через raw‑API), ASCII‑шапка без кракозябр:

**ALL:**
```text
https://gitverse.ru/api/repos/Nokls/FlareFeed/raw/branch/main/public/podpiska.txt
```
**MOBILE (топ‑100):**
```text
https://gitverse.ru/api/repos/Nokls/FlareFeed/raw/branch/main/public/fastest.txt
```

# Разделение на протоколы

**VLESS**
```text
https://vless.svinakraft.workers.dev/vless.txt
```

**HYSTERIA2**
```text
https://vless.svinakraft.workers.dev/hysteria2.txt
```

**TROJAN**
```text
https://vless.svinakraft.workers.dev/trojan.txt
```

**VMESS**
```text
https://vless.svinakraft.workers.dev/vmess.txt
```

**SHADOWSOCKS**
```text
https://vless.svinakraft.workers.dev/ss.txt
```
### 🇷🇺 ЗЕРКАЛО на Gitverse
**VLESS**
```text
https://gitverse.ru/api/repos/Nokls/FlareFeed/raw/branch/main/public/vless.txt
```

**HYSTERIA2**
```text
https://gitverse.ru/api/repos/Nokls/FlareFeed/raw/branch/main/public/hysteria2.txt
```

**TROJAN**
```text
https://gitverse.ru/api/repos/Nokls/FlareFeed/raw/branch/main/public/trojan.txt
```

**VMESS**
```text
https://gitverse.ru/api/repos/Nokls/FlareFeed/raw/branch/main/public/vmess.txt
```

**SHADOWSOCKS**
```text
https://gitverse.ru/api/repos/Nokls/FlareFeed/raw/branch/main/public/ss.txt
```
<div align="center">

**🔼 Одна ссылка – десятки рабочих серверов 🔽**
*Авто‑обновление ~каждый час · время и количество в шапке файла*

</div>

---

## 📖 О проекте

**FlareFeed** — это **независимый персональный** проект: репозиторий VLESS‑конфигураций, который раздаётся через Cloudflare Workers, с **зеркалом на Gitverse** для доступности из России. Все файлы отдаются как обычный текст (`text/plain`), что позволяет использовать их напрямую в качестве подписок для любых VPN‑клиентов. Проект не аффилирован с Cloudflare — технология Workers используется просто как удобный бесплатный хостинг, а Gitverse — как резервный канал раздачи.

Авто‑чекер каждый час собирает конфиги из публичных источников, проверяет каждый сервер (пинг + скорость) и публикует два файла: полный список живых (`ALL`) и топ‑100 самых быстрых (`MOBILE`).

## 🌐 Сайт проекта 
# https://vless.svinakraft.workers.dev

### 🎯 Преимущества

- ⚡ **Скорость** — файлы раздаются через глобальный CDN Cloudflare
- 🌍 **Доступность** — работает там, где заблокирован GitHub
- 🇷🇺 **Зеркало в РФ** — Gitverse отдаёт подписки без Cloudflare и GitHub
- 🔄 **Автообновление** — список пересобирается ~каждый час, клиенты подтягивают свежее
- 🆓 **Бесплатно** — Cloudflare Workers даёт 100 000 запросов в день бесплатно
- 📱 **Универсальность** — работает во всех популярных клиентах

---

## 📱 Как подключить подписку

### 🖥 v2rayN (Windows) - https://github.com/2dust/v2rayN/releases
1. Открой программу → **Подписки** → **Настроить подписки**
2. Нажми **Добавить** и вставь URL:
   ```text
   https://vless.svinakraft.workers.dev/podpiska.txt
   ```
3. Сохрани → нажми **Обновить подписки без прокси**

### 📱 V2rayNG (Android) - https://github.com/2dust/v2rayNG/releases
1. **Плюс** → **Импорт из буфера обмена**
2. Обнови подписку через меню
3. Проверить задержку профилей
4. Сортировать по результатам теста

### 🤖 Hiddify (Все платформы) - https://github.com/hiddify/hiddify-app/releases
1. **Add Profile** → **From URL**
2. Вставь URL → **Continue**

### 📦 Sing-box - https://github.com/SagerNet/sing-box/releases
Добавь в конфигурационный файл:
```json
{
  "providers": [{
    "type": "remote",
    "url": "https://vless.svinakraft.workers.dev/podpiska.txt",
    "update_interval": "1h"
  }]
}
```

---

**Логика работы:**
1. 📥 Пользователь запрашивает файл (например, `podpiska.txt`)
2. 🔍 **Основной канал:** Worker берёт файл из статики (`env.ASSETS`), подменяет `Content-Type` на `text/plain` и отдаёт чистый текст
3. 🇷🇺 **Зеркало:** Gitverse отдаёт тот же файл напрямую через raw‑API — без Cloudflare, работает из РФ
4. 📤 Клиент парсит готовые конфиги

---

## 📁 Структура репозитория

```text
📁 public
   📄 podpiska.txt      ← ALL (все живые)
   📄 fastest.txt       ← MOBILE (топ-100)
   📄 index.html        ← Основной сайт проекта
📁 video
   📄 prewiew.gif
📄 worker.js
📄 wrangler.toml
📄 package.json
📄 README.md
📄 LICENSE
```

## 🔄 Обновление подписок

Авто‑чекер пересобирает список **примерно каждый час**; в оба файла (и в зеркало на Gitverse) изменения попадают автоматически. Большинство клиентов обновляют подписки сами по своему интервалу.

**Ручное обновление:**
- **v2rayN:** правый клик по подписке → Обновить
- **Nekobox:** зажми подписку → Обновить
- **Streisand:** свайп вниз в разделе конфигураций
- **Hiddify:** потяни вниз для обновления

---

## ❓ Частые вопросы

**Q: Безопасно ли использовать эту подписку?**
A: Файл содержит публичные VLESS‑конфигурации. Используй на свой страх и риск.

**Q: Почему у меня не подключается?**
A: Проверь: 1) актуальность конфигов (могли устареть), 2) корректность настроек клиента, 3) доступность Cloudflare в твоей сети.

**Q: Основная ссылка (workers.dev) не открывается. Что делать?**
A: Используй **зеркало на Gitverse** (блок «🇷🇺 ЗЕРКАЛО» выше) — оно работает без Cloudflare и GitHub.

**Q: Как часто обновляются конфиги?**
A: Авто‑чекер пересобирает список ~каждый час. Следи за бейджем *last update* и шапкой файла (дата/время/количество).

**Q: Могу ли я предложить свои конфиги?**
A: Да! Открой Pull Request или Issue (на [GitHub](https://github.com/svinakraft-maker/flarefeed) или [Gitverse](https://gitverse.ru/Nokls/FlareFeed/issues)).


## 📄 Лицензия

Распространяется под лицензией [MIT](LICENSE).

---

<div align="center">

### ⭐ Если проект полезен — поставь звёздочку!

**Made with ❤️ by [@svinakraft-maker](https://github.com/svinakraft-maker)**

[🌐 Подписка](https://vless.svinakraft.workers.dev/podpiska.txt) • [🐙 GitHub](https://github.com/svinakraft-maker/flarefeed) • [🇷🇺 Gitverse](https://gitverse.ru/Nokls/FlareFeed) • [🐛 Issues](https://github.com/svinakraft-maker/flarefeed/issues)

</div>
## <img src="https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Z25rOXRoeW1xODR1dWh2b3UycTd6YnB0Y2hlMTZtaDluZW1uNnl4ZyZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/CeYEKonyFQyzWhxmvd/giphy.gif" width="40"> ДИСКЛЕЙМЕР

Проект создан **в образовательных целях** для изучения работы Cloudflare Workers, HTTP‑заголовков и сетевых протоколов. Это **независимый** проект, не связанный с Cloudflare Inc.

Автор не несёт ответственности за использование данного инструмента третьими лицами. Используя проект, вы соглашаетесь соблюдать законодательство вашей страны.

> *Автор не является владельцем/разработчиком/поставщиком перечисленных VPN-конфигураций. Это независимый информационный обзор и результаты тестирования.*
>
> *Данный пост не является рекламой VPN. Весь материал предназначен исключительно в информационных целях, и только для граждан тех стран, где эта информация легальна, как минимум - в научных целях. Если вам такое читать нельзя - закройте эту страницу немедленно!* 
>
> *Автор не имеет никаких намерений, не побуждает, не поощряет и не оправдывает использование VPN и любых других программ ни при каких обстоятельствах.*
>
> *Ответственность за любое применение данных VPN-конфигураций — на их пользователе.*
>
> *Отказ от ответственности: автор не несёт ответственность за действия третьих лиц и не поощряет противоправное использование VPN.*
>
> *Автор не несет ответственности за точность, полноту и достоверность опубликованных данных. Все совпадения случайны. Вся информация предоставлена «как есть» и может не соответствовать действительности.*
>
> *Используйте в соответствии с местным законодательством.* 
>
> *Используйте VPN только в законных целях: в частности - для обеспечения вашей безопасности в сети и защищённого удалённого доступа, и ни в коем случае не применяйте данную технологию для обхода блокировок.*
>
> *Проект некоммерческий, бесплатный, вся представленная "платежная" информация найдена случайным образом где-то в интернет-пространстве, скопирована "как есть" для демонстрации возможного примера и автору не принадлежит.*
>
> *Совет - закройте эту страницу, удалите все VPN с вашего компьютера, поставьте MAX и Yandex на все устройства, чтобы "ловило" даже на парковке, и пользуйтесь только интернет-ресурсами, которые разрешены вашим интернет-провайдером, ну вы поняли.*
