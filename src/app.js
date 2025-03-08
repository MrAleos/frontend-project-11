import './styles.scss';
import 'bootstrap';
import * as yup from "yup";
import onChange from 'on-change';
import axios from 'axios';
import _ from 'lodash';
import i18next from 'i18next';
import resources from './locales/index.js';

const timeUdpate = 5000; // время через которое пост обновится
const defaultLanguage = 'ru'; // язык по умолчанию
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
    postsContainer: document.querySelector('.posts')
}

const initialState = {
    form: {
        status: 'filling', // filling -> sending -> added
        error: ''
    },
    urls: [], // хранение добавленных url для проверки на то указывал их пользователь или нет
    feeds: [],
    posts: [],
    readPosts: [] // массив для хранения ID прочитанных постов
};

const i18n = i18next.createInstance(); // создаем i18n для текстов
i18n.init({
    lng: defaultLanguage,
    debug: true,
    resources
});

const load = (url) => { // функция для загрузки данных с переданного пользователем сайта
    const fullUrl = `https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`
        return axios(fullUrl) // грузим данные с url
            .then((response) => {
                if (response.status !== 200) { //затем, если загрузка не прошла успешно выдаем ошибку
                    throw new Error(i18n.t('errors.networkError'));
                } 
                return response.data; // иначе возвращаем загруженные данные
            })
            .catch((error) => { 
                console.error('Error loading data:', error); // Вывод ошибки в консоль
        })
}

const parse = (content) => { // парсинг данных для передачи в рендеры
    const parser = new DOMParser();
    const xmlData = parser.parseFromString(content.contents, "application/xml");

    const parseError = xmlData.querySelector("parsererror"); // проверка, что если строка невалидна как XML, то выбросит ошибку
        if (parseError) {
            throw new Error(i18n.t('errors.notRssUrl'));
        }
    
    const feedChannel = xmlData.querySelector('channel'); //получение данных по фиду url
        if (!feedChannel) { //если не содержит канал, то невалидный
            throw new Error(i18n.t('errors.notRssUrl'));
        }

    const feedTitle = feedChannel.querySelector('title').textContent;
    const feedDescription = feedChannel.querySelector('description').textContent;
    const feedId = _.uniqueId('feed_');
    const feeds = {
        title: feedTitle,
        description: feedDescription,
        id: feedId
    }

    const posts = Array.from(xmlData.querySelectorAll('item')).map((item) => { // получение данных по каждому посту
        const id = _.uniqueId('post_');
        const title = item.querySelector('title').textContent;
        const description = item.querySelector('description').textContent;
        const link = item.querySelector('link').textContent;

        return { title, description, link, id, feedId };
    });
    
    return { feeds, posts }; // возврат объекта с объектом фида и массивом объектов постов
}


const watchedState = onChange(initialState, (path) => { //вотчер состояния, который будет передавать актуальное состояние в рендеры
    switch (path) {
        case 'form':
            renderForm(watchedState, elements, i18n); // Вызываем renderForm при изменении состояния формы
            break;
        case 'feeds':
            renderFeed(watchedState, elements, i18n); // Вызываем renderFeed при изменении состояния (добавления) фидов
            break;
        case 'posts':
            renderPost(watchedState, elements, i18n); // Вызываем renderPost при изменении состояния (добавления) постов
        case 'readPosts': // Добавляем обработку изменений в readPosts
            renderPost(watchedState, elements, i18n);
            break;
    }
});

const createSchema = (existingUrls) => yup.object().shape({
    url: yup.string()
        .url(i18n.t('errors.notUrl')) // Проверка на валидность URL
        .notOneOf(existingUrls, i18n.t('errors.existUrl')) // Проверка на существование URL в массиве
});

const validateUrl = (url, existingUrls) => {
    const schema = createSchema(existingUrls); //Создаём схему с текущим списком URL (existingUrls = текущий список)
    return schema.validate({ url }) // Проверяем URL по схеме
    .then(() => ({ isValid: true, error: null })) // затем если ок - возвращаем успех
    .catch (error => ({ isValid: false, error: error.message })) // Если ошибка - возвращаем её текст
};

const addPosts = (parseData) => { // функция добавления постов
    watchedState.posts = [...parseData.posts, ...watchedState.posts]; //создаем новый массив, где сначала идут новые посты (parseData.posts), а затем старые (watchedState.posts)
};

const addFeed = (parseData) => { // функция добавления фида 
    watchedState.feeds.unshift(parseData.feeds); // добавляем через вотчер в состояние для отслеживания изменений
};

const updatePosts = (urls) => { // фунция обновления постов, принимающая массив urls  (СКОРЕЕ ВСЕГО НАДО ТУТ ПОДПРАВИТЬ БУДЕТ ДЛЯ ТОГО, ЧТОБЫ ОБНОВЛЕНИЕ ПОСТОВ НЕ СБИВАЛИ СОСТОЯНИЕ ПРОЧИТАННЫХ ПОСТОВ)
      const promises = urls.map((url) => load(url)); // создаем массив промисов, каждый из которых выполняет функцию load для соответствующего url
      Promise.all(promises) // ожидаем выполнения всех промисов и сохраняем результаты в массив contents
        .then((contents) => {
            const newPosts = []; // создаем пустой массив для новых постов
  
            contents.forEach((content) => { // проходимся по каждому элементу массива contents
                const { posts } = parse(content); // парсим контент и извлекаем массив постов
                const existingPostIds = watchedState.posts.map((post) => post.link); // извлекаем массив существующих id постов из состояния
                const filteredPosts = posts.filter((post) => !existingPostIds.includes(post.link)); // отбираем только те посты, id которых нет в массиве existingPostIds
          
                newPosts.unshift(...filteredPosts); // добавляем отфильтрованные посты в массив newPosts
            });
  
        if (newPosts.length > 0) { // если есть новые посты
            watchedState.posts = [...newPosts, ...watchedState.posts]; // добавляем новые посты перед старыми постами в состоянии
        }
    })
    
        .catch((error) => {
        // ловим возможные ошибки и выводим в консоль
        console.error ('updatePosts error'); 
    })
      
        .finally(() => {
            setTimeout(() => updatePosts(watchedState.urls), timeUdpate); // рекурсивно вызываем функцию updatePosts через 5 секунд
    })
  };
  
  updatePosts(watchedState.urls); // начальный вызов функции updatePosts
  
const renderModal = (post, elements) => { // рендер модалки
    const viewButton = document.createElement('button'); // создаем кнопку для просмотра поста
    viewButton.classList.add('btn', 'btn-primary', 'view-button'); // добавление классов для стилизации кнопки
    viewButton.textContent = i18n.t('buttons.modalButtonName'); // установка текста кнопки
    viewButton.setAttribute('data-bs-toggle', 'modal'); // добавление атрибута для включения модального окна
    viewButton.setAttribute('data-bs-target', '#modal'); // установка цели модального окна
    viewButton.setAttribute('data-title', post.title); // установка цели модального окна.
    viewButton.setAttribute('data-description', post.description); // установка цели модального окна.
    viewButton.setAttribute('data-link', post.link); // передача ссылки поста в атрибут кнопки.
    return viewButton;
  }
  
  const renderPost = (state, elements, i18n) => {
    const { postsContainer } = elements;
    postsContainer.innerHTML = '';
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card', 'border-0'); // карточка

    const cardBody = document.createElement('div'); // тело карточки
    cardBody.classList.add('card-body');

    const title = document.createElement('h2'); // общий заголовок
    title.classList.add('card-title', 'h4');
    title.textContent = i18n.t('items.postMain');
    cardBody.append(title);    

    const listGroup = document.createElement('ul'); // список постов
    listGroup.classList.add('list-group');

    state.posts.forEach((post) => { // проходимся по массиву posts в состоянии где хранятся объекты постов и создаем элементы для каждого поста
        const listItem = document.createElement('li'); // Создаем элемент списка
        listItem.classList.add('list-group-item', 'border-0');

        const postLink = document.createElement('a'); // создаем ссылку для заголовка
        postLink.classList.add('h6', 'text-primary', 'text-decoration-underline'); // стили для синего цвета и подчеркивания
        postLink.href = post.link; // задаем ссылку
        postLink.target = '_blank'; // открываем ссылку в новом окне
        postLink.textContent = post.title; // текст ссылки = заголовок поста
        
    
       // Если пост прочитан, убираем синий цвет и подчеркивание, делаем серым
       if (state.readPosts.includes(post.link)) { // если в стэйте прочитанных постов есть id поста
        postLink.classList.add('text-muted'); // то добавляем серый цвет
        postLink.classList.remove('text-primary', 'text-decoration-underline');
    } else {
        postLink.classList.add('text-primary', 'text-decoration-underline'); // если нет, то синий цвет для непрочитанных
    }

        const postDescription = document.createElement('p'); // создаем описание поста
        postDescription.classList.add('small', 'text-black-50');
        postDescription.textContent = post.description;

        const viewButton = renderModal(post); // рендерим кнопку с модалкой для поста

        // Слушатель для клика по ссылке поста
        postLink.addEventListener('click', () => { // если пользователь нажал на пост
            if (!state.readPosts.includes(post.link)) { // и в прочитанных постах нет id поста
                watchedState.readPosts.push(post.link); // то, добавляем ID в массив прочитанных
            }
        });

        // Слушатель для кнопки "Просмотр"
        viewButton.addEventListener('click', () => { // если нажал на кнопку просмотра
            if (!state.readPosts.includes(post.link)) { // id поста нет в стэйте прочитанных постов
                watchedState.readPosts.push(post.link); // то, добавляем ID в массив прочитанных
            }
        });

        listItem.append(postLink, postDescription, viewButton); // добавляем заголовок, описание и кнопку поста в элемент списка
        listGroup.append(listItem); // добавляем элемент списка в список постов
    });
    
    cardDiv.append(cardBody, listGroup); // добавляем тело карточки и список постов в карточку
    postsContainer.append(cardDiv); // добавляем карточку в контейнер posts
  };

  

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


  
const renderFeed = (state, elements, i18n) => { //рендер фида
    const { feedsContainer } = elements // контейнер фида
    feedsContainer.innerHTML = ''; //очищаем контейнер фида
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card', 'border-0'); // карточка

    const cardBody = document.createElement('div'); // тело карточки
    cardBody.classList.add('card-body');

    const title = document.createElement('h2'); // общий заголовок
    title.classList.add('card-title', 'h4');
    title.textContent = i18n.t('items.feedMain');
    cardBody.append(title);

    const listGroup = document.createElement('ul'); // список фидов
    listGroup.classList.add('list-group');

    state.feeds.forEach((element) => { // проходимся по массиву feeds в состоянии где хранятся объекты фидов и создаем элементы для каждого фида
        const listItem = document.createElement('li'); // Создаем элемент списка
        listItem.classList.add('list-group-item', 'border-0');
        
        const feedTitle = document.createElement('h3'); // создаем заголовок фида
        feedTitle.classList.add('h6');
        feedTitle.textContent = element.title;

        const feedDescription = document.createElement('p'); // создаем описание фида
        feedDescription.classList.add('small', 'text-black-50');
        feedDescription.textContent = element.description;
        
        listItem.append(feedTitle, feedDescription); // добавляем заголовок и описание фида в элемент списка
        listGroup.append(listItem); // добавляем элемент списка в список фидов
    });

    cardDiv.append(cardBody, listGroup); // добавляем тело карточки и список фидов в карточку
    feedsContainer.append(cardDiv); // добавляем карточку в контейнер feeds
}

const disableButton = (elements) => {
    const { submitButton } = elements; // кнопка "Добавить"
    submitButton.disabled = true; // // кнопка становится неактивной (серой, некликабельной) (свойство disabled есть в dom для кнопок)
    submitButton.classList.add('disabled'); // визуально показываем что неактивна
};

const enableButton = (elements) => {
    const { submitButton } = elements; // кнопка "Добавить"
    submitButton.disabled = false; // кнопка становится активна
    submitButton.classList.remove('disabled'); // визуально показываем что активна
};

elements.form.addEventListener('submit', async (e) => { // Слушатель по кнопке "Добавить" в форме
    e.preventDefault();
    e.stopImmediatePropagation();
    const formData = new FormData(e.target);
    const url = formData.get('url').trim(); // Получаем данные того, что ввел пользователь в форме

    validateUrl(url, watchedState.urls)  // Асинхронно проверяем является ли URL сайтом (watchedState.urls всегда свежий)
        .then(({ isValid, error }) => {
            if (!isValid) { // проверяем прошел ли валидацию url (некорректен или есть в списке)
                watchedState.form = {  
                    status: 'filling', // форма в состоянии "заполнения" для того, чтобы пользователь ввел снова данные
                    error: error  // передаем сообщение об ошибке
                };
                return Promise.reject('Validation failed'); // прерываем обработчик, цепочку промисов и переходим к catch, так как валидация не прошла
            }
        
             // Переходим в состояние отправки, если валидно (на предыдущем if прошло корректно)
             watchedState.form = { 
                status: 'sending', 
                error: '' 
             };
            return load(url); // Вызов функции load после успешного добавления URL
        })
    

        .then((content) => {  // и далее уже пробуем парсить данные
            const parseData = parse(content); // Вызов функции parse для парсинга данных

            watchedState.urls.push(url); // Обновляем массив через watchedState

            addPosts(parseData); // добавление постов
            addFeed(parseData); // добавление фидов

            watchedState.form = { // если в try не было ошибки загрузки/парсинга/сети
                status: 'added',  // то добавляем состояние успешного добавления Url
                error: '' 
            };
            elements.form.reset(); // Сбрасываем форму
            elements.input.focus(); // Ставим фокус на инпут
        }) 
        .catch((error) => { // Обрабатываем ошибки загрузки или парсинга или сети
            if (error !== 'Validation failed') { // если не ошибка валидации, а загрузки/сети или парсера (то есть если не ошибка того, что это не url в принципе, которая обрабатывается раньше)
                watchedState.form = { 
                    status: 'filling', // возвращаем состояние статус "заполнения"
                    error: error.message === i18n.t('errors.notRssUrl') // отображаем сообщение об ошибке (в зависимости от текста самой ошибки)
                        ? i18n.t('errors.notRssUrl') 
                        : i18n.t('errors.networkError')
                };
            }
        })
});

const renderForm = (state, elements, i18n) => { // Рендер формы в зависимости от состояния
    const { feedback } = elements; // фидбэк формы
    
    switch (state.form.status) {
        case 'filling': // если состояние заполнения
            enableButton(elements); // включаем кнопку добавить
            if (state.form.error) { // проверяем есть ли ошибка в стейте
                feedback.textContent = state.form.error; // Выводим сообщение об ошибке
                feedback.classList.remove('text-success');
                feedback.classList.add('text-danger');
            } else { // если нет, то очищаем фидбек и стилизацию после предыдущей ошибки или успеха
                feedback.textContent = '';
                feedback.classList.remove('text-danger', 'text-success');
            }
            break;
    
        case 'sending': // если состояние загрузки
            disableButton(elements); // отключаем на это время кнопку добавить
            feedback.textContent = i18n.t('status.loadingUrl');
            feedback.classList.remove('text-danger', 'text-success');
            break;
        case 'added': // если ошибки при загрузке не было, то включаем кнопку и делаем соответствующую стилизацию
            enableButton(elements);
            feedback.textContent = i18n.t('status.successLoadUrl');
            feedback.classList.remove('text-danger');
            feedback.classList.add('text-success');
            break;
    }

};
