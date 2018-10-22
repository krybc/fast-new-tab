let storage = {};
let widgets = [];
let constants = {
  backgroundDir: 'images/background/',
};

class Helpers {
  static getImageBase64(url) {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.onload = function() {
        var reader = new FileReader();
        reader.onloadend = function() {
          resolve(reader.result);
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.open('GET', url);
      xhr.responseType = 'blob';
      xhr.send();
    });
  }
}

class App {
  static widgetSave(widget) {
    chrome.storage.sync.get(function(storage) {
      if (!chrome.runtime.error) {
        let id = 0;

        if (!storage.widgets) {
          storage.widgets = [];
        } else {
          storage.widgets.forEach(function (item) {
            if (item.id > id) {
              id = item.id;
            }
          })
        }
        ++id;

        widget = {...widget, ...{id}};
        storage.widgets.push(widget);

        App.storageSave(storage);
      }
    });
  }

  static settingsSave(settings) {
    storage.settings = settings;
    App.storageSave(storage);
  }

  static storageSave(storage) {
    chrome.storage.sync.set(storage, function() {
      Message.success(chrome.i18n.getMessage('settings_saved'));
    });
  }
}

class Settings {
  constructor() {

  }

  draw() {
    let backgroundUrl = '';
    if (storage.settings.background.substring(0, 4) === 'http') {
      backgroundUrl = storage.settings.background;
    }

    let html = `
      <div class="header">
        ${chrome.i18n.getMessage('widget_settings_title')}
      </div>
      <div class="body">
        <form class="form">
          <div class="field">
            <label>${chrome.i18n.getMessage('widget_settings_field_columns_label')}</label>
            <input type="number" id="settings_columns" value="${storage.settings.columns}">
          </div>
          <div class="field">
            <label>${chrome.i18n.getMessage('widget_settings_field_backgroundGallery_label')}</label>
            <div class="gallery" id="background-gallery"></div>
          </div>
          <div class="field">
            <label>${chrome.i18n.getMessage('widget_settings_field_backgroundUrl_label')}</label>
            <input type="text" id="settings_background_url" value="${backgroundUrl}">
            <span class="help">${chrome.i18n.getMessage('widget_settings_field_backgroundUrl_help')}</span>
          </div>
          <input type="hidden" id="settings_background" value="${storage.settings.background}">
        </form>
      </div>
      <div class="footer">
        <button type="button" class="button blue" id="settings_submit">${chrome.i18n.getMessage('widget_settings_submit')}</button>
      </div>
    `;

    let container = document.createElement('div');
    container.setAttribute('class', 'card border-0 shadow-0');
    container.innerHTML = html;

    document.getElementById('settings').appendChild(container);

    this.drawBackgroundGallery();

    document.getElementById('settings_background_url').addEventListener('change', this.setBackgroundFromURL);

    document.getElementById('settings_submit').addEventListener('click', this.save);
  }

  drawBackgroundGallery() {
    let images = [
      '1.jpg',
      '2.jpg',
      '3.jpg',
      '4.jpg',
      '5.jpg'
    ];

    images.forEach(image => {
      let imageElement = document.createElement('img');
      let imageUrl = chrome.runtime.getURL(constants.backgroundDir + image);
      imageElement.setAttribute('class', 'image');
      imageElement.setAttribute('src', imageUrl);
      imageElement.setAttribute('data-background-id', image);

      if (storage.settings.background === image) {
        imageElement.classList.add('selected');
      }

      imageElement.addEventListener('click', this.setBackgroundFromGallery);

      document.getElementById('background-gallery').appendChild(imageElement);
    });
  }

  setBackgroundFromGallery(event) {
    document.getElementById('settings_background').value = event.target.getAttribute('data-background-id');
    document.getElementById('settings_background_url').value = '';

    document.querySelectorAll('#background-gallery .image').forEach(element => {
      element.classList.remove('selected');
    });
    event.target.classList.add('selected');
  }

  setBackgroundFromURL(event) {
    document.getElementById('settings_background').value = event.target.value;
    document.querySelectorAll('#background-gallery .image').forEach(element => {
      element.classList.remove('selected');
    });
  }

  save() {
    let settings = {
      columns: parseInt(document.getElementById('settings_columns').value),
      background: document.getElementById('settings_background').value,
    };

    if (storage.settings.backgroundUrl !== settings.backgroundUrl && settings.backgroundUrl.length > 0) {
      Helpers.getImageBase64(settings.backgroundUrl)
        .then(result => {
          localStorage.setItem('backgroundBase64', result);

        });
    }

    App.settingsSave(settings);
  }
}

/**
 * Bookmarks Widget
 * @type {widgetBookmarks}
 */
let widgetBookmarksClass = class widgetBookmarks {
  constructor() {

  }

  draw() {
    let html = `
    <div class="header">
      <h2>${chrome.i18n.getMessage('widget_bookmarks_title')}</h2>
    </div>
    <form class="form" id="widget_bookmarks">
    <div class="body">
      <div class="field">
        <label>${chrome.i18n.getMessage('widget_bookmarks_field_title_label')}</label>
        <input type="text" id="widget_bookmarks_title">
      </div>
      <div class="field">
        <label>${chrome.i18n.getMessage('widget_bookmarks_field_group_label')}</label>
        <select id="widget_bookmarks_group"></select>
      </div>
    </div>
    <div class="footer">
      <button type="button" class="button blue" id="widget_bookmarks_submit">${chrome.i18n.getMessage('widget_add')}</button>
    </div>
    </form>
    `;

    let container = document.createElement('div');
    container.setAttribute('id', 'widget-bookmarks');
    container.setAttribute('class', 'card widget bookmarks');
    container.innerHTML = html;

    document.getElementById('widgets').appendChild(container);

    document.getElementById('widget_bookmarks_group').addEventListener('change', function (event) {
      document.getElementById('widget_bookmarks_title').setAttribute('value', event.target.options[event.target.selectedIndex].text);
    });
    document.getElementById('widget_bookmarks_submit').addEventListener('click', this.save);
    this.drawGroups();
  }

  drawGroups() {
    this.getGroups().then(result => {
      let groups = this.drawGroupsOptions(result[0].children);
      document.querySelector('#widget-bookmarks select').innerHTML = groups;
    });
  }

  drawGroupsOptions(bookmarkNodes) {
    let html = '';
    let i;
    for (i = 0; i < bookmarkNodes.length; i++) {
      if (bookmarkNodes[i].children && bookmarkNodes[i].children.length > 0) {
        html += `<option value="${bookmarkNodes[i].id}">${bookmarkNodes[i].title}</option>`;
        html += this.drawGroupsOptions(bookmarkNodes[i].children);
      }
    }
    return html;
  }

  getGroups() {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.getTree(
        function(result) {
          resolve(result);
        });
    });
  }

  save() {
    let title = document.getElementById('widget_bookmarks_title').value;
    let group = document.getElementById('widget_bookmarks_group').value;

    let widget = {
      column: 1,
      type: 'bookmarks',
      title,
      group
    };
    App.widgetSave(widget);
  }
};
widgets.push(widgetBookmarksClass);

document.body.onload = function() {
  chrome.storage.sync.get(function(result) {
    if (!chrome.runtime.error) {
      storage = result;

      new Settings().draw();
      widgets.forEach(function (widget) {
        new widget().draw();
      });
    }
  });
};