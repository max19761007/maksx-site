// Переключатель «Было / Стало» на первом экране
const tabs = [...document.querySelectorAll('.switch [role="tab"]')];

function select(tab) {
  tabs.forEach(t => {
    const on = t === tab;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    panel.hidden = !on;
    if (on) {
      panel.classList.remove('is-entering');
      void panel.offsetWidth; // перезапуск анимации
      panel.classList.add('is-entering');
    }
  });
}

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => select(tab));
  tab.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    select(next);
    next.focus();
  });
});

// Заголовки выезжают по строкам: первый экран при загрузке, остальные при прокрутке
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (window.gsap && window.SplitText && window.ScrollTrigger && !reduceMotion) {
  gsap.registerPlugin(SplitText, ScrollTrigger);
  document.documentElement.classList.add('js-anim');

  document.fonts.ready.then(() => {
    const lines = el => SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' }).lines;

    const hero = document.querySelector('.hero-title');
    gsap.set(hero, { visibility: 'visible' });
    gsap.from(lines(hero), { yPercent: 110, duration: 0.9, ease: 'power4.out', stagger: 0.09 });

    document.querySelectorAll('.reveal').forEach(el => {
      gsap.set(el, { visibility: 'visible' });
      gsap.from(lines(el), {
        yPercent: 110, duration: 0.8, ease: 'power4.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
  });
}

// Отзывы: стрелки листают ленту на одну карточку
const reviews = document.querySelector('.reviews');
document.querySelectorAll('.reviews-nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = reviews.querySelector('.review');
    const step = card ? card.offsetWidth + 24 : reviews.clientWidth;
    reviews.scrollBy({ left: step * Number(btn.dataset.dir), behavior: reduceMotion ? 'auto' : 'smooth' });
  });
});

// Форма заявки: отправка в n8n. Пока адреса нет, предлагаем написать в Telegram
// Сценарий «MaksX - заявки с сайта» в n8n: заявка → уведомление в Telegram
const WEBHOOK_URL = 'https://n8n.maksx.ru/webhook/maksx-lead';
const TELEGRAM = 'https://t.me/MaxSmoll';

const form = document.getElementById('lead-form');
const status = form.querySelector('.form-status');

form.addEventListener('submit', async e => {
  e.preventDefault();

  const required = [...form.querySelectorAll('[required]')];
  let firstBad = null;
  required.forEach(input => {
    const bad = input.type === 'checkbox' ? !input.checked : !input.value.trim();
    input.setAttribute('aria-invalid', bad);
    if (bad && !firstBad) firstBad = input;
  });
  if (firstBad) {
    status.textContent = firstBad.type === 'checkbox'
      ? 'Отметьте согласие на обработку данных - без него я не могу принять заявку.'
      : 'Заполните имя и контакт - без них я не смогу ответить.';
    firstBad.focus();
    return;
  }

  const data = new FormData(form);

  // Ловушку заполнил бот: делаем вид, что всё отправлено, и ничего не шлём
  if (data.get('website')) {
    form.reset();
    status.textContent = 'Заявка отправлена. Отвечу в течение дня.';
    return;
  }

  const payload = {
    name: data.get('name').trim(),
    contact: data.get('contact').trim(),
    services: data.getAll('service'),
    budget: data.get('budget') || '',
    task: (data.get('task') || '').trim(),
    page: location.href,
    consent: new Date().toISOString() // когда человек дал согласие на обработку данных
  };

  if (!WEBHOOK_URL) {
    status.innerHTML = `Форма пока не подключена. Напишите мне в <a href="${TELEGRAM}">Telegram</a> - отвечу в течение дня.`;
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.textContent = 'Отправляю заявку...';
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(res.status);
    form.reset();
    status.textContent = 'Заявка отправлена. Отвечу в течение дня.';
  } catch {
    status.innerHTML = `Заявка не отправилась. Напишите мне в <a href="${TELEGRAM}">Telegram</a> - так даже быстрее.`;
  } finally {
    button.disabled = false;
  }
});
