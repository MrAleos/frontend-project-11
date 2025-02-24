// @ts-check

import './styles.scss';
import 'bootstrap';
import * as yup from "yup";
import onChange from 'on-change';

const initialState = { // Изначальное состояние
    form: {
        isValue: false,
        error: ''
    },
    urls: [] // Массив для хранения URL
};

const watchedState = onChange(initialState, () => {
    renderForm(watchedState); // Вызываем renderForm при изменении состояния
});

const form = document.querySelector('.rss-form'); // Находим форму в разметке
const input = document.querySelector('#url-input'); // Инпут формы

form.addEventListener('submit', async (e) => { // Слушатель по кнопке "Добавить" в форме
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = formData.get('url').trim(); // Получаем данные того, что ввел пользователь в форме

    const scheme = yup.object().shape({
        url: yup.string()
            .url('Ссылка должна быть валидным URL') // Проверка на валидность URL
            .notOneOf(watchedState.urls, 'RSS уже существует') // Проверка на существование URL в массиве
    });

    try {
        console.log('Перед валидацией, массив URLs:', watchedState.urls); // Отладка
        await scheme.validate({ url: data }); // Асинхронно проверяем является ли URL сайтом 
        watchedState.form = { isValue: true, error: '' }; // Устанавливаем флаг успешной валидации и очищаем сообщение об ошибке 
        watchedState.urls.push(data); // Обновляем массив через watchedState
        form.reset(); // Сбрасываем форму
        input.focus(); // Ставим фокус на инпут
        console.log('После добавления, массив URLs:', watchedState.urls); // Отладка
    } catch (e) {
        watchedState.form.isValue = false;
        watchedState.form.error = e.message; // Устанавливаем сообщение об ошибке
    }
});

const renderForm = (state) => { // Рендер формы в зависимости от состояния
    const feedback = document.querySelector('.feedback');
    if (state.form.isValue) {
        feedback.textContent = 'RSS успешно загружен';
        feedback.classList.remove('text-danger');
        feedback.classList.add('text-success');
    } else {
        feedback.textContent = state.form.error; // Выводим сообщение об ошибке
        feedback.classList.remove('text-success');
        feedback.classList.add('text-danger');
    }
};
