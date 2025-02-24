// @ts-check

import './styles.scss';
import 'bootstrap';
import app from './view.js';
import * as yup from "yup";

const initialState = { // состояние пока не используется
    form: {
        isValue: false
    }
}

const urls = [];

const form = document.querySelector('.rss-form'); // находим форму в разметке
const input = document.querySelector('#url-input'); //инпут формы

form.addEventListener('submit', async (e) => { // слушатель по кнопке "Добавить" в форме
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = formData.get('url').trim(); // получаем данные того что ввел пользователь в форме

   
    const scheme = yup.object().shape({
        url: yup.string()
            .url('Ссылка должна быть валидным URL')
            .notOneOf(urls, 'RSS уже существует') // создаем схему проверки того, что введенное является строкой url
    })

    try {
        console.log('Перед валидацией, массив URLs:', urls); // Отладка
        await scheme.validate({ url: data }); // ассинхронно проверяем является ли url сайтом (тогда отображаем информациию о том что успешно и убираем введенный сайт), либо если нет (указываем, что не сайт)
        renderSuccess();
        urls.push(data);
        form.reset();
        input.focus();
        console.log('После добавления, массив URLs:', urls); // Отладка
    } catch (e) {
        renderError(e.message);
    }
})

const renderSuccess = () => { // рендер того что является сайтом
    const feedback = document.querySelector('.feedback');
    feedback.textContent = 'RSS успешно загружен';
    feedback.classList.remove('text-danger');
    feedback.classList.add('text-success');
};

const renderError = (text) => { // рендер того что не является сайтом
    const feedback = document.querySelector('.feedback');
    feedback.textContent = text;
    feedback.classList.remove('text-success');
    feedback.classList.add('text-danger');
}