let storage = {};
let widgets = {};
let constants = {
  backgroundDir: 'images/background/',
  settingsEnabled: false
};

class Helpers {
  static ucfirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}

/**
 * Bookmarks Widget
 * @type {widgetBookmarks}
 */
widgets.bookmarks = class widgetBookmarks {
  static draw(widget) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.getChildren(widget.group, function(bookmarkTreeNodes) {
        let bookmarks = widgetBookmarks.drawList(bookmarkTreeNodes);
        resolve(bookmarks);
      });
    });
  }

  static drawList(bookmarkNodes) {
    let ul = document.createElement('ul');
    for (let i = 0; i < bookmarkNodes.length; i++) {
      if (bookmarkNodes[i].title && bookmarkNodes[i].parentId !== '0') {
        let li = document.createElement('li');
        let anchor = document.createElement('a');
        anchor.setAttribute('href', bookmarkNodes[i].url);
        anchor.innerText = bookmarkNodes[i].title;
        li.appendChild(anchor);
        ul.appendChild(li);
      } else if (bookmarkNodes[i].children && bookmarkNodes[i].children.length > 0) {
        ul.appendChild(widgetBookmarks.drawList(bookmarkNodes[i].children));
      }
    }

    return ul;
  }
};

class App {
  static init() {
    document.getElementById('cols_wrapper').innerHTML = '';
    chrome.storage.sync.get(function(result) {
      if (!chrome.runtime.error) {
        storage = result;
        for (let i =0; i < storage.settings.columns;i++) {
          let col = document.createElement('div');
          col.setAttribute('class', 'col');
          col.setAttribute('data-column-id', i);
          document.querySelector('.row').appendChild(col);
        }

        App.backgroundDraw();
        App.widgetsDraw();
        DragAndDrop.init();
        document.getElementById('settings_toggle').addEventListener('click', App.settingsToggle);
      }
    });
  }

  static backgroundDraw() {
    if (localStorage.getItem('backgroundBase64')) {
      document.getElementById('wrapper').setAttribute('style', 'background-image: url(' + localStorage.getItem('backgroundBase64') + ');');
    } else {
      document.getElementById('wrapper').setAttribute('style', 'background-image: url("' + chrome.runtime.getURL(constants.backgroundDir + storage.settings.background) + '");');
    }
  }

  static widgetsDraw() {
    storage.widgets
      .sort(function (a, b) {
        return a.order > b.order;
      })
      .forEach(function (widget) {
        App.widgetDraw(widget);
      });
  }

  /**
   * Draw widget frame
   */
  static widgetDraw(widget) {
    widgets[widget.type].draw(widget).then(widgetBody => {
      let widgetElement = document.createElement('div');
      widgetElement.setAttribute('class', 'card widget');
      widgetElement.setAttribute('data-widget-id', widget.id);
      widgetElement.setAttribute('draggable', true);

      let widgetHtml = `
        <div class="header"><h2>${widget.title}</h2>
        <div class="toolbar">
            <i class="toolbar-icon fa fa-arrows-alt dnd hide"></i>
            <i class="toolbar-icon fa fa-trash remove hide"></i>
        </div>
        </div>
        <div class="body"></div>
      `;
      widgetElement.innerHTML = widgetHtml;
      widgetElement.querySelector('.body').appendChild(widgetBody);

      document.querySelector('[data-column-id="' + widget.column + '"]').appendChild(widgetElement);
      widgetElement.querySelector('.dnd').addEventListener('mousedown', DragAndDrop.dragstart);
      widgetElement.addEventListener('mouseup', DragAndDrop.dragend);

      widgetElement.querySelector('.remove').addEventListener('click', App.widgetRemove);
    });
  }

  /**
   * Widget removing
   */
  static widgetRemove(event) {
    if(confirm(chrome.i18n.getMessage('widget_remove_confirmation') === true)) {
      const widget = event.target.offsetParent;

      widget.remove();
      App.widgetsSave().then(result => {
        Message.success(chrome.i18n.getMessage('widget_removed'));
      });
    }
  }

  static widgetsSave() {
    const columns = document.getElementsByClassName('col');
    const widgetsAll = [];
    for (let w of document.getElementsByClassName('widget')) {
      widgetsAll.push(parseInt(w.getAttribute('data-widget-id')));
    }

    // removing widget from storage
    storage.widgets = storage.widgets.filter(w => widgetsAll.indexOf(w.id) !== -1);

    for (let col of columns) {
      let columnId = parseInt(col.getAttribute('data-column-id'));
      let widgetsOrder = [];
      col.childNodes.forEach((col) => {
        widgetsOrder.push(parseInt(col.getAttribute('data-widget-id')));
      });

      storage.widgets.forEach(widget => {
        if (widgetsAll.indexOf(widget.id) !== null && widgetsOrder.indexOf(widget.id) !== -1) {
          widget.order = widgetsOrder.indexOf(widget.id);
          widget.column = columnId;
        }
      });
    }

    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(storage, function () {
        Message.success(chrome.i18n.getMessage('widget_saved'));
        resolve(true);
      });
    });
  }

  static settingsToggle(event) {
    constants.settingsEnabled = !constants.settingsEnabled;
    for (let icon of document.getElementsByClassName('toolbar-icon')) {
      if (constants.settingsEnabled) {
        icon.classList.remove('hide');
      } else {
        icon.classList.add('hide');
      }
    }
  }
}

class DragAndDrop {
  static init() {
    const containers = document.getElementsByClassName('col');
    for(const container of containers) {
      container.addEventListener("dragover", DragAndDrop.dragover);
      container.addEventListener("dragenter", DragAndDrop.dragenter);
      container.addEventListener("dragleave", DragAndDrop.dragleave);
      container.addEventListener("drop", DragAndDrop.drop);
    }
  }

  static dragstart(event) {
    DragAndDrop.box = event.target.parentElement.parentElement.parentElement;
    this.className += " held";
  }

  static dragend(event) {
    this.className = "card";
  }

  static dragover(e) {
    e.preventDefault();
  }

  static dragenter(e) {
    e.preventDefault();
    this.className += " hovered";
  }

  static dragleave() {
    this.className = "col";
  }

  static drop(event) {
    if (event.target.childNodes.length > 0) {
      event.target.childNodes.forEach(function (node) {
        if (node.offsetTop > event.offsetY) {
          node.parentNode.insertBefore(DragAndDrop.box, node);
        } else {
          node.parentNode.append(DragAndDrop.box);
        }
      });
    } else {
      this.append(DragAndDrop.box);
    }

    App.widgetsSave(event.target);

    this.className = "col";
  }
}

document.body.onload = function() {
  App.init();
};

