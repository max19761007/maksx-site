// MaksX/beauty - заголовки выезжают по строкам при прокрутке (тот же приём, что на главной)
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

// Форма заявки: тот же n8n-сценарий, что и с главной страницы.
// Поле page (location.href) содержит /beauty/ - этим лиды отличаются от общих.
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
    professions: data.getAll('profession'),
    service: data.get('service') || '',
    task: (data.get('task') || '').trim(),
    page: location.href,
    consent: new Date().toISOString() // когда человек дал согласие на обработку данных
  };

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
