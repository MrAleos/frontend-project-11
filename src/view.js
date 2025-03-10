const renderModal = (post, i18n) => { // рендер модалки
  const viewButton = document.createElement('button'); // создаем кнопку для просмотра поста
  viewButton.classList.add('btn', 'btn-primary', 'view-button'); // добавление классов для стилизации кнопки
  viewButton.textContent = i18n.t('buttons.modalButtonName'); // установка текста кнопки
  viewButton.setAttribute('data-bs-toggle', 'modal'); // добавление атрибута для включения модального окна
  viewButton.setAttribute('data-bs-target', '#modal'); // установка цели модального окна
  viewButton.setAttribute('data-title', post.title); // установка цели модального окна.
  viewButton.setAttribute('data-description', post.description); // установка цели модального окна.
  viewButton.setAttribute('data-link', post.link); // передача ссылки поста в атрибут кнопки.
  return viewButton;
};

const renderPost = (watchedState, elements, i18n) => {
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

  watchedState.posts.forEach((post) => {
    const listItem = document.createElement('li'); // Создаем элемент списка
    listItem.classList.add('list-group-item', 'border-0', 'd-flex', 'justify-content-between', 'align-items-start');

    const postLink = document.createElement('a'); // создаем ссылку для заголовка
    postLink.classList.add('fw-bold'); // стили для синего цвета и подчеркивания
    postLink.href = post.link; // задаем ссылку
    postLink.target = '_blank'; // открываем ссылку в новом окне
    postLink.textContent = post.title; // текст ссылки = заголовок поста

    // стилизация только после прочтения
    if (watchedState.readPosts.includes(post.link)) {
      postLink.classList.add('text-muted'); // то добавляем серый цвет
    }

    const viewButton = renderModal(post, i18n); // рендерим кнопку с модалкой для поста

    // Слушатель для клика по ссылке поста
    postLink.addEventListener('click', () => { // если пользователь нажал на пост
      if (!watchedState.readPosts.includes(post.link)) { // и в прочитанных постах нет id поста
        watchedState.readPosts.push(post.link); // то, добавляем ID в массив прочитанных
        postLink.classList.add('text-muted');
        postLink.classList.remove('text-primary', 'text-decoration-underline');
      }
    });

    // Слушатель для кнопки "Просмотр"
    viewButton.addEventListener('click', () => { // если нажал на кнопку просмотра
      if (!watchedState.readPosts.includes(post.link)) { // id поста нет в стэйте прочитанных постов
        watchedState.readPosts.push(post.link); // то, добавляем ID в массив прочитанных
        postLink.classList.add('text-muted');
        postLink.classList.remove('text-primary', 'text-decoration-underline');
      }
    });

    listItem.append(postLink, viewButton);
    listGroup.append(listItem); // добавляем элемент списка в список постов
  });

  cardDiv.append(cardBody, listGroup); // добавляем тело карточки и список постов в карточку
  postsContainer.append(cardDiv); // добавляем карточку в контейнер posts
};

const renderFeed = (watchedState, elements, i18n) => { // рендер фида
  const { feedsContainer } = elements; // контейнер фида
  feedsContainer.innerHTML = ''; // очищаем контейнер фида
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

  watchedState.feeds.forEach((element) => {
    const listItem = document.createElement('li'); // Создаем элемент списка
    listItem.classList.add('list-group-item', 'border-0');

    const feedTitle = document.createElement('h3'); // создаем заголовок фида
    feedTitle.classList.add('h6');
    feedTitle.textContent = element.title;

    const feedDescription = document.createElement('p'); // создаем описание фида
    feedDescription.classList.add('small', 'text-black-50');
    feedDescription.textContent = element.description;

    listItem.append(feedTitle, feedDescription);
    listGroup.append(listItem); // добавляем элемент списка в список фидов
  });

  cardDiv.append(cardBody, listGroup); // добавляем тело карточки и список фидов в карточку
  feedsContainer.append(cardDiv); // добавляем карточку в контейнер feeds
};

const disableButton = (elements) => {
  const { submitButton } = elements; // кнопка "Добавить"
  submitButton.disabled = true;
  submitButton.classList.add('disabled'); // визуально показываем что неактивна
};

const enableButton = (elements) => {
  const { submitButton } = elements; // кнопка "Добавить"
  submitButton.disabled = false; // кнопка становится активна
  submitButton.classList.remove('disabled'); // визуально показываем что активна
};

const renderForm = (watchedState, elements, i18n) => { // Рендер формы в зависимости от состояния
  const { feedback } = elements; // фидбэк формы

  switch (watchedState.form.status) {
    case 'filling': // если состояние заполнения
      enableButton(elements); // включаем кнопку добавить
      if (watchedState.form.error) { // проверяем есть ли ошибка в стейте
        feedback.textContent = watchedState.form.error; // Выводим сообщение об ошибке
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
    default:
      break;
  }
};

export { renderFeed, renderForm, renderPost };
