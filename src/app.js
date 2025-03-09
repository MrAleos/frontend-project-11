import * as yup from 'yup';
import onChange from 'on-change';
import axios from 'axios';
import i18next from 'i18next';
import resources from './locales/index.js';
import parse from './parser.js';
import { renderFeed, renderPost, renderForm } from './view.js';

const timeUdpate = 5000; // время через которое пост обновится
const defaultLanguage = 'ru'; // язык по умолчанию
const app = () => {
  const elements = {
    form: document.querySelector('.rss-form'), // Находим форму в разметке
    input: document.querySelector('#url-input'), // Инпут формы
    submitButton: document.querySelector('button[type="submit"]'), // кнопка "добавить"
    feedback: document.querySelector('.feedback'), // низ формы, где дается ответ клиенту после ввода url
    feedsContainer: document.querySelector('.feeds'), // находим контейнер фида
    modal: document.getElementById('modal'), // получение элемента модального окна.
    modalTitle: document.querySelector('.modal-title'), // получение элемента заголовка модального окна
    modalBody: document.querySelector('.modal-body'), // получение элемента тела модального окна
    fullArticleLink: document.querySelector('.full-article'), // получение элемента ссылки на полную статью
    postsContainer: document.querySelector('.posts'),
  };

  const initialState = {
    form: {
      status: 'filling', // filling -> sending -> added
      error: '',
    },
    urls: [], // хранение добавленных url для проверки на то указывал их пользователь или нет
    feeds: [],
    posts: [],
    readPosts: [], // массив для хранения ID прочитанных постов
  };

  const i18n = i18next.createInstance(); // создаем i18n для текстов
  i18n.init({
    lng: defaultLanguage,
    debug: true,
    resources,
  });

  const load = (url) => { // функция для загрузки данных с переданного пользователем сайта
    const fullUrl = `https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`;
    return axios(fullUrl) // грузим данные с url
      .then((response) => {
        if (response.status !== 200) { // затем, если загрузка не прошла успешно выдаем ошибку
          throw new Error(i18n.t('errors.networkError'));
        }
        return response.data; // иначе возвращаем загруженные данные
      })
      .catch((error) => {
        console.error('Error loading data:', error); // Вывод ошибки в консоль
      });
  };

  const watchedState = onChange(initialState, (path) => {
    switch (path) {
      case 'form':
        renderForm(watchedState, elements, i18n);
        break;
      case 'feeds':
        renderFeed(watchedState, elements, i18n);
        break;
      case 'posts':
        renderPost(watchedState, elements, i18n);
        break;
      case 'readPosts':
        renderPost(watchedState, elements, i18n);
        break;
      default:
        break;
    }
  });

  const createSchema = (existingUrls) => yup.object().shape({
    url: yup.string()
      .url(i18n.t('errors.notUrl')) // Проверка на валидность URL
      .notOneOf(existingUrls, i18n.t('errors.existUrl')), // Проверка на существование URL в массиве
  });

  const validateUrl = (url, existingUrls) => {
    const schema = createSchema(existingUrls);
    return schema.validate({ url });
  };

  const addPosts = (parseData) => { // функция добавления постов
    watchedState.posts = [...parseData.posts, ...watchedState.posts];
  };

  const addFeed = (parseData) => { // функция добавления фида
    watchedState.feeds.unshift(parseData.feeds);
  };

  const updatePosts = (urls) => {
    const promises = urls.map((url) => load(url));
    Promise.all(promises)
      .then((contents) => {
        const newPosts = []; // создаем пустой массив для новых постов

        contents.forEach((content) => { // проходимся по каждому элементу массива contents
          const { posts } = parse(content); // парсим контент и извлекаем массив постов
          const existingPostIds = watchedState.posts.map((post) => post.link);
          const filteredPosts = posts.filter((post) => !existingPostIds.includes(post.link));

          newPosts.unshift(...filteredPosts); // добавляем отфильтрованные посты в массив newPosts
        });

        if (newPosts.length > 0) { // если есть новые посты
          watchedState.posts = [...newPosts, ...watchedState.posts];
        }
      })

      .catch(() => {
        // ловим возможные ошибки и выводим в консоль
        console.error('updatePosts error');
      })

      .finally(() => {
        setTimeout(() => updatePosts(watchedState.urls), timeUdpate);
      });
  };

  updatePosts(watchedState.urls); // начальный вызов функции updatePosts

  // Слушатель для отображения модального окна
  elements.modal.addEventListener('show.bs.modal', (event) => { // добавление обработчика событий на показ модального окна
    const button = event.relatedTarget; // получение кнопки, которая вызвала модальное окно
    const title = button.getAttribute('data-title'); // получение заголовка из атрибута кнопки
    const description = button.getAttribute('data-description'); // получение описания из атрибута кнопки
    const link = button.getAttribute('data-link'); // получение ссылки из атрибута кнопки

    const { modalTitle, modalBody, fullArticleLink } = elements;
    modalTitle.textContent = title; // установка заголовка модального окна
    modalBody.textContent = description; // установка описания модального окна
    fullArticleLink.href = link; // установка ссылки на полную статью в модальном окне
  });

  elements.form.addEventListener('submit', async (e) => { // Слушатель по кнопке "Добавить" в форме
    e.preventDefault();
    e.stopImmediatePropagation();
    const formData = new FormData(e.target);
    const url = formData.get('url').trim(); // Получаем данные того, что ввел пользователь в форме

    validateUrl(url, watchedState.urls)
      .then(() => {
        // Переходим в состояние отправки, если валидно (на предыдущем if прошло корректно)
        watchedState.form = {
          status: 'sending',
          error: '',
        };
        return load(url); // Вызов функции load после успешного добавления URL
      })

      .then((content) => { // и далее уже пробуем парсить данные
        const parseData = parse(content); // Вызов функции parse для парсинга данных

        watchedState.urls.push(url); // Обновляем массив через watchedState

        addPosts(parseData); // добавление постов
        addFeed(parseData); // добавление фидов

        watchedState.form = { // если в try не было ошибки загрузки/парсинга/сети
          status: 'added', // то добавляем состояние успешного добавления Url
          error: '',
        };
        elements.form.reset(); // Сбрасываем форму
        elements.input.focus(); // Ставим фокус на инпут
      })
      .catch((error) => { // Обрабатываем ошибки загрузки или парсинга или сети
        let errorMessage;
        if (error instanceof yup.ValidationError) {
          errorMessage = error.message; // Ошибка валидации от yup
        } else if (error.message === 'invalidRSS') {
          errorMessage = i18n.t('errors.notRssUrl'); // Ошибка парсинга
        } else {
          errorMessage = i18n.t('errors.networkError'); // Сетевая ошибка
        }
        watchedState.form = {
          status: 'filling', // возвращаем состояние статус "заполнения"
          error: errorMessage,
        };
      });
  });
};

export default app;
