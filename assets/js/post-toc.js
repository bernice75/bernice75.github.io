/* Builds the post table of contents from the article's h1/h2 headings.
   Loaded from _layouts/post.html. */
(function () {
  var article = document.querySelector('[data-post-article]');
  var toc = document.querySelector('[data-post-toc]');
  var tocNav = document.querySelector('[data-post-toc-nav]');
  var tocToggle = document.querySelector('[data-post-toc-toggle]');
  var tocToggleLabel = document.querySelector('[data-post-toc-toggle-label]');

  if (!article || !toc || !tocNav || !tocToggle || !tocToggleLabel) {
    return;
  }

  var headings = Array.prototype.slice.call(article.querySelectorAll('h1, h2'));
  if (!headings.length) {
    return;
  }

  var usedIds = Object.create(null);

  function slugify(text, index) {
    var base = (text || '')
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\w\s-가-힣"]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    if (!base) {
      base = 'section-' + (index + 1);
    }

    var candidate = base;
    var suffix = 2;
    while (document.getElementById(candidate) || usedIds[candidate]) {
      candidate = base + '-' + suffix;
      suffix += 1;
    }
    usedIds[candidate] = true;
    return candidate;
  }

  var items = headings.map(function (heading, index) {
    if (!heading.id) {
      heading.id = slugify(heading.textContent, index);
    }

    var link = document.createElement('a');
    link.className = 'post-toc__link post-toc__link--' + heading.tagName.toLowerCase();
    link.href = '#' + heading.id;
    link.textContent = heading.textContent.replace(/\s+/g, ' ').trim();
    tocNav.appendChild(link);

    return { heading: heading, link: link };
  });

  toc.hidden = false;

  function syncMobileTocState() {
    var isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) {
      toc.classList.remove('is-collapsed');
      tocToggle.setAttribute('aria-expanded', 'true');
      tocToggleLabel.textContent = '목차';
      return;
    }

    if (!toc.classList.contains('is-ready')) {
      toc.classList.add('is-collapsed');
      toc.classList.add('is-ready');
    }
    tocToggle.setAttribute('aria-expanded', String(!toc.classList.contains('is-collapsed')));
    tocToggleLabel.textContent = toc.classList.contains('is-collapsed') ? '목차' : '닫기';
  }

  function updateActiveLink() {
    var current = items[0];
    var threshold = 140;

    for (var i = 0; i < items.length; i += 1) {
      if (items[i].heading.getBoundingClientRect().top - threshold <= 0) {
        current = items[i];
      } else {
        break;
      }
    }

    items.forEach(function (item) {
      item.link.classList.toggle('is-active', item === current);
    });
  }

  tocToggle.addEventListener('click', function () {
    var isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) {
      return;
    }

    toc.classList.toggle('is-collapsed');
    tocToggle.setAttribute('aria-expanded', String(!toc.classList.contains('is-collapsed')));
    tocToggleLabel.textContent = toc.classList.contains('is-collapsed') ? '목차' : '닫기';
  });

  items.forEach(function (item) {
    item.link.addEventListener('click', function () {
      if (!window.matchMedia('(max-width: 767px)').matches) {
        return;
      }

      toc.classList.add('is-collapsed');
      tocToggle.setAttribute('aria-expanded', 'false');
      tocToggleLabel.textContent = '목차';
    });
  });

  document.addEventListener('click', function (event) {
    if (!window.matchMedia('(max-width: 767px)').matches) {
      return;
    }
    if (toc.classList.contains('is-collapsed')) {
      return;
    }
    if (toc.contains(event.target)) {
      return;
    }

    toc.classList.add('is-collapsed');
    tocToggle.setAttribute('aria-expanded', 'false');
    tocToggleLabel.textContent = '목차';
  });

  syncMobileTocState();
  updateActiveLink();
  window.addEventListener('scroll', updateActiveLink, { passive: true });
  window.addEventListener('resize', function () {
    syncMobileTocState();
    updateActiveLink();
  });
})();
