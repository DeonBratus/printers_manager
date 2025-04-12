/**
 * Модуль для управления темами
 */

// Возможные темы
const THEMES = {
  LIGHT: 'light-theme',
  DARK: 'dark-theme',
  HIGH_CONTRAST: 'high-contrast-theme'
};

// Ключ для локального хранилища
const THEME_STORAGE_KEY = 'user-theme-preference';

/**
 * Инициализирует систему тем
 */
export function initThemeSystem() {
  console.log('Инициализация системы тем...');
  
  // Загрузка темы из localStorage
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  
  // Определение предпочтительной темы
  let preferredTheme;
  
  if (savedTheme) {
    // Используем сохраненную тему, если она есть
    preferredTheme = savedTheme;
    console.log(`Загружена сохраненная тема: ${preferredTheme}`);
  } else {
    // Проверка системных предпочтений
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      preferredTheme = THEMES.DARK;
      console.log('Обнаружены системные предпочтения: темная тема');
    } else {
      preferredTheme = THEMES.LIGHT;
      console.log('Обнаружены системные предпочтения: светлая тема');
    }
  }
  
  // Применение темы
  setTheme(preferredTheme);
  
  // Добавление кнопки переключения темы (если еще не добавлена)
  setupThemeToggle();
  
  // Отслеживание изменений системных предпочтений
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        setTheme(e.matches ? THEMES.DARK : THEMES.LIGHT);
      }
    });
  }
  
  console.log('Инициализация системы тем завершена');
}

/**
 * Устанавливает тему
 * @param {string} theme - Имя темы
 */
export function setTheme(theme) {
  // Удаляем все классы тем
  document.body.classList.remove(THEMES.LIGHT, THEMES.DARK, THEMES.HIGH_CONTRAST);
  
  // Добавляем класс выбранной темы
  if (theme && Object.values(THEMES).includes(theme)) {
    document.body.classList.add(theme);
    console.log(`Применена тема: ${theme}`);
    
    // Сохраняем выбор пользователя
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    
    // Обновляем иконки
    updateThemeIcons(theme);
  } else {
    console.warn(`Неизвестная тема: ${theme}, применена светлая тема по умолчанию`);
    document.body.classList.add(THEMES.LIGHT);
    localStorage.setItem(THEME_STORAGE_KEY, THEMES.LIGHT);
  }
}

/**
 * Создаёт кнопку переключения темы, если её еще нет
 */
function setupThemeToggle() {
  const existingToggle = document.querySelector('.theme-toggle');
  
  if (existingToggle) {
    // Кнопка уже есть, просто добавляем обработчик
    existingToggle.removeEventListener('click', cycleTheme);
    existingToggle.addEventListener('click', cycleTheme);
    return;
  }
  
  // Создаем кнопку переключения темы если её еще нет
  const userActions = document.querySelector('.user-actions');
  
  if (userActions) {
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.setAttribute('aria-label', 'Переключить тему');
    themeToggle.setAttribute('title', 'Переключить тему');
    
    // Иконки для разных тем
    themeToggle.innerHTML = `
      <i class="fas fa-sun light-icon" aria-hidden="true"></i>
      <i class="fas fa-moon dark-icon" aria-hidden="true"></i>
      <i class="fas fa-adjust contrast-icon" aria-hidden="true"></i>
    `;
    
    // Добавляем перед первым элементом в .user-actions
    userActions.insertBefore(themeToggle, userActions.firstChild);
    
    // Добавляем обработчик
    themeToggle.addEventListener('click', cycleTheme);
    
    // Обновляем иконки для текущей темы
    const currentTheme = getCurrentTheme();
    updateThemeIcons(currentTheme);
    
    console.log('Добавлена кнопка переключения темы');
  } else {
    console.warn('Не найден элемент .user-actions для добавления кнопки темы');
  }
}

/**
 * Переключает темы по кругу: светлая -> темная -> высококонтрастная -> светлая
 */
function cycleTheme() {
  const currentTheme = getCurrentTheme();
  
  let nextTheme;
  switch (currentTheme) {
    case THEMES.LIGHT:
      nextTheme = THEMES.DARK;
      break;
    case THEMES.DARK:
      nextTheme = THEMES.HIGH_CONTRAST;
      break;
    case THEMES.HIGH_CONTRAST:
      nextTheme = THEMES.LIGHT;
      break;
    default:
      nextTheme = THEMES.LIGHT;
  }
  
  setTheme(nextTheme);
}

/**
 * Возвращает текущую тему
 * @returns {string} - Имя текущей темы
 */
function getCurrentTheme() {
  if (document.body.classList.contains(THEMES.DARK)) {
    return THEMES.DARK;
  } else if (document.body.classList.contains(THEMES.HIGH_CONTRAST)) {
    return THEMES.HIGH_CONTRAST;
  } else {
    return THEMES.LIGHT;
  }
}

/**
 * Обновляет видимость иконок в зависимости от выбранной темы
 * @param {string} theme - Имя темы
 */
function updateThemeIcons(theme) {
  const themeToggle = document.querySelector('.theme-toggle');
  if (!themeToggle) return;
  
  // Скрываем все иконки
  const lightIcon = themeToggle.querySelector('.light-icon');
  const darkIcon = themeToggle.querySelector('.dark-icon');
  const contrastIcon = themeToggle.querySelector('.contrast-icon');
  
  if (lightIcon) lightIcon.style.display = 'none';
  if (darkIcon) darkIcon.style.display = 'none';
  if (contrastIcon) contrastIcon.style.display = 'none';
  
  // Показываем нужную иконку
  switch (theme) {
    case THEMES.LIGHT:
      if (darkIcon) darkIcon.style.display = 'block';
      break;
    case THEMES.DARK:
      if (lightIcon) lightIcon.style.display = 'block';
      break;
    case THEMES.HIGH_CONTRAST:
      if (lightIcon) lightIcon.style.display = 'block';
      break;
  }
} 