(function () {
  var input = document.getElementById('resume-photo-input');
  var select = document.getElementById('resume-photo-select');
  var remove = document.getElementById('resume-photo-remove');
  var status = document.getElementById('resume-photo-status');
  var header = document.querySelector('.resume-header');
  if (!input || !select || !remove || !status || !header) return;

  var photo = null;
  var photoUrl = null;
  var revision = 0;

  function clearPhoto() {
    if (photo) photo.remove();
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photo = null;
    photoUrl = null;
    header.classList.remove('resume-header--with-photo');
    remove.hidden = true;
  }

  select.addEventListener('click', function () { input.click(); });
  remove.addEventListener('click', function () {
    revision++;
    clearPhoto();
    input.value = '';
    status.textContent = '사진을 제거했습니다. 사진 없이 인쇄됩니다.';
  });

  input.addEventListener('change', function () {
    var file = input.files[0];
    if (!file) return;
    var current = ++revision;
    input.value = '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      status.textContent = 'JPG, PNG 또는 WebP 사진을 선택해 주세요. 기존 사진은 유지됩니다.';
      return;
    }
    var url = URL.createObjectURL(file);
    var candidate = new Image();
    status.textContent = '사진을 준비하고 있습니다.';
    candidate.onload = function () {
      if (current !== revision) { URL.revokeObjectURL(url); return; }
      clearPhoto();
      photo = candidate;
      photoUrl = url;
      photo.className = 'resume-print-photo';
      photo.alt = '이력서 증명사진';
      header.appendChild(photo);
      header.classList.add('resume-header--with-photo');
      remove.hidden = false;
      status.textContent = '사진 선택 완료. 인쇄 미리보기에서 확인하세요. 새로고침하면 삭제됩니다.';
    };
    candidate.onerror = function () {
      URL.revokeObjectURL(url);
      if (current === revision) status.textContent = '사진을 읽을 수 없습니다. 다른 사진을 선택해 주세요.';
    };
    candidate.src = url;
  });
})();
