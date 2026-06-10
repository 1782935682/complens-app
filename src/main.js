import { categoryPath } from './data/categories.js';
import { renderRoute, resolveRoute } from './router/router.js';
import { extractIngredientsFromImage } from './services/ocrService.js';
import { addHistory, clearHistory, toggleFavorite } from './store/userStore.js';

const app = document.querySelector('#app');

function navigate(hash) {
  window.location.hash = hash;
}

function render() {
  const route = resolveRoute(window.location.hash);
  app.innerHTML = renderRoute(route);
  bindPageEvents(route);
  window.scrollTo({ top: 0, behavior: 'auto' });
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

  const sampleButton = document.querySelector('[data-fill-sample]');
  if (sampleButton) {
    sampleButton.addEventListener('click', () => {
      const textarea = document.querySelector('#ingredient-text');
      textarea.value = '水，烟酰胺，透明质酸钠，水杨酸，香精，苯氧乙醇';
      textarea.focus();
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
}

window.addEventListener('hashchange', render);

if (!window.location.hash) {
  window.location.hash = '#/';
} else {
  render();
}
