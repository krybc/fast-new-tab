class Message {
  static success(message) {
    Message.handle('success', message);
  }

  static danger(message) {
    Message.handle('danger', message);
  }

  static info(message) {
    Message.handle('info', message);
  }

  static handle(type, message) {
    let status = document.getElementById('messages');
    status.innerHTML = `<div class="message ${type}">${message}</div>`;
    setTimeout(function () {
      status.innerHTML = '';
    }, 1500);
  }
}