import { categoryPath } from './data/categories.js';
import { getRouteTitle, renderRoute, resolveRoute } from './router/router.js';
import { extractIngredientsFromImage } from './services/ocrService.js';
import { addHistory, clearHistory, setUserAllergens, toggleFavorite } from './store/userStore.js';
import { SAMPLE_OPTIONS, SAMPLES } from './utils/text.js';

const app = document.querySelector('#app');

function navigate(hash) {
  window.location.hash = hash;
}

function render() {
  const route = resolveRoute(window.location.hash);
  document.title = getRouteTitle(route);
  app.innerHTML = renderRoute(route);
  bindPageEvents(route);
  window.scrollTo({ top: 0, behavior: 'auto' });
  if (typeof app.focus === 'function') {
    app.focus({ preventScroll: true });
  }
}

function bindPageEvents(route) {
  document.querySelectorAll('[data-search-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const query = String(formData.get('q') || '').trim();
      if (!query) return;
      addHistory(query);
      navigate(`#${categoryPath(route.category, '/search')}?q=${encodeURIComponent(query)}`);
    });
  });

  document.querySelectorAll('[data-analyze-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const input = String(formData.get('ingredients') || '').trim();
      navigate(`#${categoryPath(route.category, '/analyze')}?text=${encodeURIComponent(input)}`);
    });
  });

  document.querySelectorAll('[data-favorite-id]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleFavorite(button.dataset.favoriteId, route.category);
      render();
    });
  });

  const clearButton = document.querySelector('[data-clear-history]');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      clearHistory();
      render();
    });
  }

  const sampleSelect = document.querySelector('#sample-select');
  if (sampleSelect) {
    sampleSelect.addEventListener('change', () => {
      const sampleIdsForCategory = new Set(
        SAMPLE_OPTIONS
          .filter((sample) => sample.category === route.category)
          .map((sample) => sample.id)
      );
      const val = sampleSelect.value;
      const textarea = document.querySelector('#ingredient-text');
      if (val === '0') return;
      if (!sampleIdsForCategory.has(val)) {
        sampleSelect.value = '0';
        if (textarea) textarea.value = '';
        return;
      }
      if (textarea) {
        textarea.value = SAMPLES[val];
        textarea.focus();
      }
    });
  }

  const imageInput = document.querySelector('[data-image-input]');
  if (imageInput) {
    imageInput.addEventListener('change', async () => {
      const feedback = document.querySelector('[data-image-feedback]');
      try {
        if (feedback) feedback.textContent = '正在检查图片识别能力...';
        const result = await extractIngredientsFromImage(imageInput.files?.[0]);
        if (feedback) feedback.textContent = result.message;
      } catch {
        if (feedback) feedback.textContent = '识别失败，请换一张更清晰的图片或直接粘贴成分表文本。';
      }
    });
  }

  const allergenForm = document.querySelector('[data-allergen-form]');
  if (allergenForm) {
    allergenForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(allergenForm);
      const selected = setUserAllergens(formData.getAll('allergens'));
      updateAllergenSettingsFeedback(selected.length, '设置已保存');
    });

    allergenForm.addEventListener('change', () => {
      const formData = new FormData(allergenForm);
      updateAllergenSettingsFeedback(formData.getAll('allergens').length, '');
    });
  }

  const clearAllergensButton = document.querySelector('[data-clear-allergens]');
  if (clearAllergensButton && allergenForm) {
    clearAllergensButton.addEventListener('click', () => {
      allergenForm.querySelectorAll('input[name="allergens"]').forEach((input) => {
        input.checked = false;
      });
      setUserAllergens([]);
      updateAllergenSettingsFeedback(0, '已清空');
    });
  }
}

function updateAllergenSettingsFeedback(count, message) {
  const countNode = document.querySelector('[data-allergen-count]');
  if (countNode) countNode.textContent = `${count} 项已关注`;
  const statusNode = document.querySelector('[data-allergen-status]');
  if (statusNode) statusNode.textContent = message;
}

window.addEventListener('hashchange', render);

if (!window.location.hash) {
  window.location.hash = '#/';
} else {
  render();
}
