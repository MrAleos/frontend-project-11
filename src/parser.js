const parse = (content) => { // парсинг данных для передачи в рендеры
    const parser = new DOMParser();
    const xmlData = parser.parseFromString(content.contents, "application/xml");

    const parseError = xmlData.querySelector("parsererror"); // проверка, что если строка невалидна как XML, то выбросит ошибку
    if (parseError) {
        throw new Error('invalidRSS');
    }
    
    const feedChannel = xmlData.querySelector('channel'); //получение данных по фиду url
    if (!feedChannel) { //если не содержит канал, то невалидный
        throw new Error('invalidRSS');
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
};

export default parse;