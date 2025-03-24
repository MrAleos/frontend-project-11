import * as yup from 'yup';
import onChange from 'on-change';
import axios from 'axios';
import i18next from 'i18next';
import _ from 'lodash';
import resources from './locales/index.js';
import parse from './parser.js';
import {
  renderFeed, renderPost, renderForm, renderModalContent,
} from './view.js';

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
    postsContainer: document.querySelector('.posts'), // получение постов
  };

  const load = (url, i18n) => { // функция для загрузки данных с переданного пользователем сайта
    const baseUrl = 'https://allorigins.hexlet.app/get';
    const urlObj = new URL(baseUrl); // объект URL
    urlObj.searchParams.set('disableCache', 'true'); // параметр disableCache
    urlObj.searchParams.set('url', url); // добавляем параметр url
    const fullUrl = urlObj.toString(); // делаем строку
    return axios(fullUrl) // грузим данные с url
      .then((response) => {
        if (response.status !== 200) { // затем, если загрузка не прошла успешно выдаем ошибку
          throw new Error(i18n.t('errors.networkError'));
        }
        return response.data; // иначе возвращаем загруженные данные
      });
  };

  const initialState = {
    form: {
      status: 'filling', // filling -> sending -> added - error
      error: '',
    },
    urls: [], // хранение добавленных url для проверки на то указывал их пользователь или нет
    feeds: [],
    posts: [],
    readPosts: [], // массив для хранения ID прочитанных постов
    modal: null, // данные открытой модалки (сначала закрыта)
  };

  const i18n = i18next.createInstance(); // создаем i18n для текстов
  i18n.init({
    lng: defaultLanguage,
    debug: true,
    resources,
  }).then(() => {
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
        case 'modal': // если изменилось поле
          renderModalContent(watchedState, elements); // рендерим модалку
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

    const addFeedAndPosts = (parseData) => { // добавление фида и постов
      const feedId = _.uniqueId('feed_'); // генерируем id для фида
      const feed = { ...parseData.feed, id: feedId }; // Добавляем id к фиду
      watchedState.feeds.unshift(feed); // добавляем в стэйт фидов

      const postsWithIds = parseData.posts.map((post) => ({
        ...post,
        id: _.uniqueId('post_'), // id для каждого поста
        feedId, // feedId для связи с фидом
      }));
      watchedState.posts = [...postsWithIds, ...watchedState.posts]; // добавляем новые посты
    };

    const updatePosts = (urls) => {
      const promises = urls.map((url) => load(url, i18n)
        .then((responce) => ({ success: true, data: responce })) // успешный запрос
        .catch((error) => ({ success: false, error }))); // ошибка в запросе

      Promise.all(promises)
        .then((results) => {
          const newPosts = []; // создаем пустой массив для новых постов

          results.forEach((result) => { // проходимся по каждому элементу массива contents
            if (result.success) { // парсим только для успешных запросов
              const { posts } = parse(result.data); // парсим контент и извлекаем массив постов
              const existingPostIds = watchedState.posts.map((post) => post.link);
              const filteredPosts = posts.filter((post) => !existingPostIds.includes(post.link));
              newPosts.unshift(...filteredPosts); // добавим отфильтрованные посты в массив newPosts
            } else {
              console.log(`Ошибка загрузки: ${result.error}`); // ошибка для конкретных запросов
            }
          });

          if (newPosts.length > 0) { // если есть новые посты
            watchedState.posts = [...newPosts, ...watchedState.posts];
          }
        })

        .catch(() => {
          // ловим возможные ошибки и выводим в консоль
          console.error('Promise.all error');
        })

        .finally(() => {
          setTimeout(() => updatePosts(watchedState.urls), timeUdpate);
        });
    };

    updatePosts(watchedState.urls); // начальный вызов функции updatePosts

    // слушатель для контейнера постов, чтобы отметить пост прочитанным
    elements.postsContainer.addEventListener('click', (e) => {
      const { target } = e; // получаем элемент куда кликнули
      const postId = target.getAttribute('data-post-id'); // получаем id из атрибутов поста

      const post = watchedState.posts.find((p) => p.id === postId); // находим пост по id
      if (!post) return; // если пост не найден по id в состоянии, то обрываем работу слушателя

      if (target.tagName === 'A' || target.tagName === 'BUTTON') { // если клик по элменту "а" или "button"
        if (!watchedState.readPosts.includes(post.link)) { // если поста нет среди прочитанных
          watchedState.readPosts.push(post.link); // обновляем состояние среди прочитанных
        }
      }
    });

    // Слушатель для отображения модального окна
    elements.modal.addEventListener('show.bs.modal', (event) => { // добавление обработчика событий на показ модального окна
      const button = event.relatedTarget; // получение кнопки, которая вызвала модальное окно
      const postId = button.getAttribute('data-id'); // берем id поста из атрибута
      const post = watchedState.posts.find((p) => p.id === postId); // ищем пост в вотчере

      if (post) { // если пост не пустой (найден id в вотчере)
        watchedState.modal = { // обнова состояния
          postId: post.id,
        }; // записываем id поста и вызов renderModalContent
      }
    });

    elements.form.addEventListener('submit', (e) => { // Слушатель по кнопке "Добавить" в форме
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
          return load(url, i18n); // Вызов функции load после успешного добавления URL
        })

        .then((content) => { // и далее уже пробуем парсить данные
          const parseData = parse(content); // Вызов функции parse для парсинга данных

          watchedState.urls.push(url); // Обновляем массив через watchedState

          addFeedAndPosts(parseData); // добавление фидов и постов

          watchedState.form = { // если в try не было ошибки загрузки/парсинга/сети
            status: 'added', // то добавляем состояние успешного добавления Url
            error: '',
          };
        })
        .catch((error) => { // Обрабатываем ошибки загрузки или парсинга или сети
          let errorMessage;
          if (error instanceof yup.ValidationError) {
            errorMessage = error.message; // Ошибка валидации от yup
          } else {
            errorMessage = error.message === 'invalidRSS' ? i18n.t('errors.notRssUrl') : i18n.t('errors.networkError'); // или ошибка парсинга, либо сети
          }
          watchedState.form = {
            status: 'error', // переходим в статус "ошибка", если попадаем в catch
            error: errorMessage,
          };
        });
    });
  });
};

export default app;
