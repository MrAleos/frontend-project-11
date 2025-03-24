const renderModal = (post, i18n) => { // рендер модалки
  const viewButton = document.createElement('button'); // создаем кнопку для просмотра поста
  viewButton.classList.add('btn', 'btn-primary', 'view-button'); // добавление классов для стилизации кнопки
  viewButton.textContent = i18n.t('buttons.modalButtonName'); // установка текста кнопки
  viewButton.setAttribute('data-bs-toggle', 'modal'); // добавление атрибута для включения модального окна
  viewButton.setAttribute('data-bs-target', '#modal'); // установка цели модального окна
  viewButton.setAttribute('data-id', post.id); // передаем id поста в кнопку модалки
  return viewButton;
};

const renderModalContent = (watchedState, elements) => { // рендер контента модалки
  const { modalTitle, modalBody, fullArticleLink } = elements;
  
  if (!watchedState.modal) { // если в состоянии нет данных модалки
    return; // модалка закрыта
  }

  const post = watchedState.posts.find((p) => p.id === watchedState.modal.postId); // ищем пост
  if (!post) return; // если нет поста, то прекращаем

  modalTitle.textContent = post.title; // установка заголовка модального окна
  modalBody.textContent = post.description; // установка описания модального окна
  fullArticleLink.href = post.link; // установка ссылки на полную статью в модальном окне
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
    postLink.href = post.link; // задаем ссылку
    postLink.target = '_blank'; // открываем ссылку в новом окне
    postLink.textContent = post.title; // текст ссылки = заголовок поста
    postLink.setAttribute('data-post-id', post.id); // Добавляем id поста в ссылку для идентификации

    // в зависимости от состояния (есть ли пост среди прочитанных) добавляем или убираем классы
    if (watchedState.readPosts.includes(post.link)) {
      postLink.classList.remove('fw-bold');
      postLink.classList.add('text-muted');
    } else {
      postLink.classList.add('fw-bold');
      postLink.classList.remove('text-muted');
    }

    const viewButton = renderModal(post, i18n); // рендерим кнопку с модалкой для поста
    viewButton.setAttribute('data-post-id', post.id); // Добавляем id поста в кнопку для идентификации

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

  watchedState.feeds.forEach((feed) => {
    const listItem = document.createElement('li'); // Создаем элемент списка
    listItem.classList.add('list-group-item', 'border-0');

    const feedTitle = document.createElement('h3'); // создаем заголовок фида
    feedTitle.classList.add('h6');
    feedTitle.textContent = feed.title;

    const feedDescription = document.createElement('p'); // создаем описание фида
    feedDescription.classList.add('small', 'text-black-50');
    feedDescription.textContent = feed.description;

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
  const { feedback, form, input } = elements; // фидбэк формы

  switch (watchedState.form.status) { // проверяем статус состояния
    case 'filling': // если состояние заполнения
      enableButton(elements); // включаем кнопку "добавить"
      feedback.textContent = ''; // очищаем текст
      feedback.classList.remove('text-danger', 'text-success');
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
      form.reset(); // Сбрасываем форму
      input.focus(); // Ставим фокус на инпут
      break;

    case 'error': // если получили ошибку
      enableButton(elements); // кнопка досупна, чтобы пользователь исправил данные
      feedback.textContent = watchedState.form.error; // сообщение об ошибке
      feedback.classList.remove('text-success'); // стилизация
      feedback.classList.add('text-danger');
      input.focus(); // фокус на инпут сразу для пользователя
      break;
    default:
      break;
  }
};

export {
  renderFeed, renderForm, renderPost, renderModalContent,
};
