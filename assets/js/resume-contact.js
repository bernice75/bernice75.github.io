(function () {
  var header = document.querySelector('.resume-header');
  var clear = document.getElementById('resume-contact-clear');
  var fields = ['email', 'phone', 'linkedin'].map(function (name) {
    return document.getElementById('resume-contact-' + name);
  });
  if (!header || !clear || fields.some(function (field) { return !field; })) return;

  var contact = document.createElement('div');
  contact.className = 'resume-print-contact';
  contact.hidden = true;
  header.appendChild(contact);
  var labels = ['이메일', '전화번호', 'LinkedIn'];

  function sync() {
    contact.replaceChildren();
    fields.forEach(function (field, index) {
      var value = field.value.trim();
      if (!value) return;
      var line = document.createElement('p');
      var label = document.createElement('strong');
      label.textContent = labels[index] + ': ';
      line.appendChild(label);
      line.appendChild(document.createTextNode(value));
      contact.appendChild(line);
    });
    contact.hidden = !contact.childElementCount;
  }

  function reset() {
    fields.forEach(function (field) { field.value = ''; });
    sync();
  }

  fields.forEach(function (field) { field.addEventListener('input', sync); });
  clear.addEventListener('click', reset);
  window.addEventListener('beforeprint', sync);
  window.addEventListener('pageshow', reset);
  reset();
})();
