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
    chrome.storage.sync.get(function(storage) {
      if (!chrome.runtime.error) {
        storage.settings = settings;
        App.storageSave(storage);
      }
    });
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

    // settings
    let settingsHtml = `
      <div class="header">
        <h2>
          <i class="fa fa-cogs"></i>
          ${chrome.i18n.getMessage('widget_settings_title')}
        </h2>
      </div>
      <div class="body">
        <form class="form">
          <div class="control">
            <div class="field">
              <label>${chrome.i18n.getMessage('widget_settings_field_columns_label')}</label>
              <input type="number" size="3" id="settings_columns" value="${storage.settings.columns}">
            </div>
          </div>
        </form>
        <div class="footer">
          <button type="button" class="button blue" id="settings_submit">
            <i class="fa fa-check-circle"></i>
            ${chrome.i18n.getMessage('widget_settings_submit')}
          </button>
        </div>
      </div>
    `;

    let settingsContainer = document.createElement('div');
    settingsContainer.setAttribute('class', 'card border-0 shadow-0');
    settingsContainer.innerHTML = settingsHtml;
    document.getElementById('settings').appendChild(settingsContainer);

    // backgrounds
    let backgroundHtml = `
      <div class="header">
        <h2>
          <i class="fa fa-image"></i>
          ${chrome.i18n.getMessage('widget_settings_background_title')}
        </h2>
      </div>
      <div class="body">
        <form class="form">
          <div class="gallery" id="background-gallery"></div>
          <div class="control">
            <div class="field">
              <label>${chrome.i18n.getMessage('widget_settings_background_field_backgroundUrl_label')}</label>
              <input type="text" id="settings_background_url" size="50" value="${backgroundUrl}">
            </div>
            <span class="help text-right">${chrome.i18n.getMessage('widget_settings_background_field_backgroundUrl_help')}</span>
          </div>
          <input type="hidden" id="settings_background" value="${storage.settings.background}">
        </form>
        <div class="footer">
          <button type="button" class="button blue" id="background_submit">
            <i class="fa fa-check-circle"></i>
            ${chrome.i18n.getMessage('widget_settings_background_submit')}
          </button>
        </div>
      </div>
    `;

    let backgroundContainer = document.createElement('div');
    backgroundContainer.setAttribute('class', 'card border-0 shadow-0');
    backgroundContainer.innerHTML = backgroundHtml;
    document.getElementById('settings').appendChild(backgroundContainer);

    this.drawBackgroundGallery();

    document.getElementById('settings_background_url').addEventListener('change', this.setBackgroundFromURL);

    document.getElementById('settings_submit').addEventListener('click', this.save);
    document.getElementById('background_submit').addEventListener('click', this.save);
  }

  drawBackgroundGallery() {
    let images = [
      '1.jpg',
      '2.jpg',
      '3.jpg',
      '4.jpg',
      '5.jpg',
      '6.jpg',
      '7.jpg'
    ];

    images.forEach(image => {
      let imageUrl = chrome.runtime.getURL(constants.backgroundDir + image);
      let imageElement = document.createElement('div');
      imageElement.setAttribute('class', 'image');
      imageElement.setAttribute('data-background-id', image);
      imageElement.setAttribute('style', `background-image: url("${imageUrl}")`);

      if (storage.settings.background === image) {
        imageElement.classList.add('selected');
        let checkElement = document.createElement('div');
        checkElement.setAttribute('class', 'check-icon');
        let checkIconElement = document.createElement('i');
        checkIconElement.setAttribute('class', 'fa fa-check-circle');
        checkElement.appendChild(checkIconElement);
        imageElement.appendChild(checkElement);
      }

      imageElement.addEventListener('click', this.setBackgroundFromGallery);
      document.getElementById('background-gallery').appendChild(imageElement);
    });
  }

  setBackgroundFromGallery(event) {
    const target = event.target;
    document.getElementById('settings_background').value = target.getAttribute('data-background-id');
    document.getElementById('settings_background_url').value = '';

    document.querySelectorAll('#background-gallery .image').forEach(element => {
      element.classList.remove('selected');
      element.innerHTML = '';
    });

    target.classList.add('selected');
    let checkElement = document.createElement('div');
    checkElement.setAttribute('class', 'check-icon');
    let checkIconElement = document.createElement('i');
    checkIconElement.setAttribute('class', 'fa fa-check-circle');
    checkElement.appendChild(checkIconElement);
    target.appendChild(checkElement);
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

  static drawEnabled() {
    return new Promise((resolve, reject) => {
      resolve(true);
    });
  }

  draw() {
    let html = `
    <div class="header">
      <h2>
        <i class="fa fa-list"></i>
        ${chrome.i18n.getMessage('widget_bookmarks_title')}
      </h2>
    </div>
    <form class="form" id="widget_bookmarks">
    <div class="body">
      <div class="control">
        <div class="field">
          <label>${chrome.i18n.getMessage('widget_bookmarks_field_title_label')}</label>
          <input type="text" id="widget_bookmarks_title">
        </div>
      </div>
      <div class="control">
        <div class="field">
          <label>${chrome.i18n.getMessage('widget_bookmarks_field_group_label')}</label>
          <select id="widget_bookmarks_group"></select>
        </div>
      </div>
      <div class="footer">
        <button type="button" class="button blue" id="widget_bookmarks_submit">
          <i class="fa fa-check-circle"></i>
          ${chrome.i18n.getMessage('widget_add')}
        </button>
      </div>
    </div>
    </form>
    `;

    let container = document.createElement('div');
    container.setAttribute('id', 'widget-bookmarks');
    container.setAttribute('class', 'card widget bookmarks');
    container.innerHTML = html;

    document.getElementById('widgets').appendChild(container);
    this.drawGroups();

    document.getElementById('widget_bookmarks_group').addEventListener('change', function (event) {
      document.getElementById('widget_bookmarks_title').setAttribute('value', event.target.options[event.target.selectedIndex].text);
    });

    document.getElementById('widget_bookmarks_submit').addEventListener('click', this.save);
  }

  drawGroups() {
    this.getGroups().then(result => {
      let groups = this.drawGroupsOptions(result[0].children);
      document.getElementById('widget_bookmarks_group').innerHTML = groups;

      if (document.getElementById('widget_bookmarks_group').options.length > 0) {
        document.getElementById('widget_bookmarks_title').setAttribute('value', document.getElementById('widget_bookmarks_group').options[0].text);
      }
    });
  }

  drawGroupsOptions(bookmarkNodes) {
    let html = '';
    let i;
    for (i = 0; i < bookmarkNodes.length; i++) {
      if (bookmarkNodes[i].children && bookmarkNodes[i].children.length > 0) {
        if (bookmarkNodes[i].parentId !== '0' && !storage.widgets.find(w => w.type === 'bookmarks' && w.group === bookmarkNodes[i].id)) {
          html += `<option value="${bookmarkNodes[i].id}">${bookmarkNodes[i].title}</option>`;
        }

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
        // console.log(widget);
        // widget.drawEnabled.then(enabled => {
        //   console.log(enabled);
        //   if (enabled === true) {
        //     new widget().draw();
        //   }
        // });
      });
    }
  });
};
