// Счётчики символов и подсветка полей из одних пробелов (подсказка; основная проверка — на сервере)
document.querySelectorAll('[data-max]').forEach((input) => {
  const counter = input.closest('.field').querySelector('.counter');
  const max = Number(input.dataset.max);

  const update = () => {
    const length = input.value.trim().length;
    if (counter) counter.textContent = `${length}/${max}`;
    const onlySpaces = input.value.length > 0 && length === 0;
    input.classList.toggle('input--warn', length > max || onlySpaces);
  };

  input.addEventListener('input', update);
  update();
});

// Подстановка объёма по умолчанию при смене вида донации
const defaults = { whole: 450, plasma: 600, platelets: 400 };
const typeSelect = document.getElementById('donationType');
const volumeInput = document.getElementById('volume');
if (typeSelect && volumeInput) {
  typeSelect.addEventListener('change', () => {
    volumeInput.value = defaults[typeSelect.value] || '';
  });
}
