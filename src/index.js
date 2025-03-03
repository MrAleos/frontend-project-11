// @ts-check

import './styles.scss';
import 'bootstrap';
import * as yup from "yup";
import onChange from 'on-change';
import axios from 'axios';
import _ from 'lodash';

const initialState = { // Изначальное состояние
    form: {
        isValue: false,
        error: ''
    },
    urls: [], // Массив для хранения URL
    feeds: [], // массив для харения фидов
    posts: [] // массив для хранения постов
};

const load = async (url) => { // функция для загрузки данных с переданного пользователем сайта
    const fullUrl = `https://allorigins.hexlet.app/get?url=${encodeURIComponent(url)}`
    try {
        const response = await axios(fullUrl);
        if (response.status !== 200) { // если загрузка не прошла успешно выдаем ошибку (доработать потом отображение этой ошибки)
            throw new Error('Ошибка сети');
        }
        return response.data;

    } catch (error) {
        console.error('Error loading data:', error); // Вывод ошибки в консоль
    }
}

const parse = (content) => { // парсинг данных для передачи в рендеры
    const parser = new DOMParser();
    const xmlData = parser.parseFromString(content.contents, "application/xml");

    const parseError = xmlData.querySelector("parsererror"); // проверка, что если строка невалидна как XML, то выбросит ошибку
        if (parseError) {
            throw new Error('Ресурс не содержит валидный RSS');
        }
    
    const feedChannel = xmlData.querySelector('channel'); //получение данных по фиду url
        if (!feedChannel) { //если не содержит канал, то невалидный
            throw new Error('Ресурс не содержит валидный RSS');
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

        return { title, description, link, id, feedId }
    });
    
    return { feeds, posts }; // возврат объекта с объектом фида и массивом объектов постов
}


const watchedState = onChange(initialState, (path) => { //вотчер состояния, который будет передавать актуальное состояние в рендеры
    switch (path) {
        case 'form':
            renderForm(watchedState); // Вызываем renderForm при изменении состояния формы
            break;
        case 'feeds':
            renderFeed(watchedState); // Вызываем renderFeed при изменении состояния (добавления) фидов
            break;
        case 'posts':
            renderPost(watchedState); // Вызываем renderPost при изменении состояния (добавления) постов
            break;
    }
});

const createSchema = (existingUrls) => yup.object().shape({
    url: yup.string()
        .url('Ссылка должна быть валидным URL') // Проверка на валидность URL
        .notOneOf(existingUrls, 'RSS уже существует') // Проверка на существование URL в массиве
});

const validateUrl = async (url, existingUrls) => {
    const schema = createSchema(existingUrls); //Создаём схему с текущим списком URL (existingUrls = текущий список)
    try {
      await schema.validate({ url }); // Проверяем URL по схеме
      return { isValid: true, error: null }; // Если ок - возвращаем успех
    } catch (error) {
      return { isValid: false, error: error.message }; // Если ошибка - возвращаем её текст
    }
};

const addPosts = (parseData) => { //функция добавления постов
    parseData.posts
        .forEach((post) => watchedState.posts.unshift(post)); // добавляем через вотчер в состояние для отслеживания изменений
};

const addFeed = (parseData) => { // функция добавления фида 
    watchedState.feeds.unshift(parseData.feeds); // добавляем через вотчер в состояние для отслеживания изменений
};

const renderPost = (state) => {
    const postsContainer = document.querySelector('.posts');
    postsContainer.innerHTML = '';
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card', 'border-0'); // карточка

    const cardBody = document.createElement('div'); // тело карточки
    cardBody.classList.add('card-body');

    const title = document.createElement('h2'); // общий заголовок
    title.classList.add('card-title', 'h4');
    title.textContent = 'Посты';
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
        postLink.textContent = post.title // текст ссылки = заголовок поста

        const postDescription = document.createElement('p'); // создаем описание поста
        postDescription.classList.add('small', 'text-black-50');
        postDescription.textContent = post.description;
        
        listItem.append(postLink, postDescription); // добавляем заголовок и описание поста в элемент списка
        listGroup.append(listItem); // добавляем элемент списка в список постов
    });
    
    cardDiv.append(cardBody, listGroup); // добавляем тело карточки и список постов в карточку
    postsContainer.append(cardDiv); // добавляем карточку в контейнер posts
};

  
const renderFeed = (state) => { //рендер фида
    const feedsContainer = document.querySelector('.feeds'); // находим контейнер фида
    feedsContainer.innerHTML = ''; //очищаем контейнер фида
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card', 'border-0'); // карточка

    const cardBody = document.createElement('div'); // тело карточки
    cardBody.classList.add('card-body');

    const title = document.createElement('h2'); // общий заголовок
    title.classList.add('card-title', 'h4');
    title.textContent = 'Фиды';
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

const form = document.querySelector('.rss-form'); // Находим форму в разметке
const input = document.querySelector('#url-input'); // Инпут формы

form.addEventListener('submit', async (e) => { // Слушатель по кнопке "Добавить" в форме
    e.preventDefault();
    e.stopImmediatePropagation();
    const formData = new FormData(e.target);
    const url = formData.get('url').trim(); // Получаем данные того, что ввел пользователь в форме

    const { isValid, error } = await validateUrl(url, watchedState.urls);  // Асинхронно проверяем является ли URL сайтом (watchedState.urls всегда свежий)

    if(isValid) {
        watchedState.form = { isValue: true, error: '' }; // Устанавливаем флаг успешной валидации и очищаем сообщение об ошибке 
        watchedState.urls.push(url); // Обновляем массив через watchedState
        form.reset(); // Сбрасываем форму
        input.focus(); // Ставим фокус на инпут
        try {
            const content = await load(url); // Вызов функции load после успешного добавления URL
            const parser = parse(content); // Вызов функции parse для парсинга данных
            addPosts(parser); // добавление постов
            addFeed(parser); // добавление фидов
        } catch (parseError) {
            watchedState.form = { isValue: false, error: parseError } // если парсер словил ошибку (РАБОТАЕТ НЕКОРРЕКТНО, ТАК КАК СНАЧАЛА ОТОБРАЖАЕТ ЧТО ССЫЛКА ВАЛИДНА. НУЖНО ДОРАБОТАТЬ ЛОГИКУ)
        }
    } else {
        watchedState.form = { isValue: false, error }; // Передача всей структуры формы

    }
});

const renderForm = (state) => { // Рендер формы в зависимости от состояния
    const feedback = document.querySelector('.feedback');
    if (state.form.isValue) {
        feedback.textContent = 'RSS успешно загружен'; // отображаем, что загрузка прошла успешно
        feedback.classList.remove('text-danger');
        feedback.classList.add('text-success');
    } else {
        feedback.textContent = state.form.error; // Выводим сообщение об ошибке
        feedback.classList.remove('text-success');
        feedback.classList.add('text-danger');
    }

};
