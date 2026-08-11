/* Client-side category filtering for /blog/. Loaded from blog/index.html.
   The blog base URL comes from data-blog-base so this file stays static
   (no Liquid) and therefore cacheable. */
(function () {
  var page = document.querySelector('[data-blog-page]');
  if (!page) {
    return;
  }

  var blogBase = page.getAttribute('data-blog-base') || '/blog/';
  var filters = Array.prototype.slice.call(page.querySelectorAll('[data-category-filter]'));
  var inlineLinks = Array.prototype.slice.call(page.querySelectorAll('[data-category-link]'));
  var posts = Array.prototype.slice.call(page.querySelectorAll('[data-blog-post]'));
  var resultsMeta = page.querySelector('[data-category-results-meta]');
  var params = new URLSearchParams(window.location.search);
  var selectedCategory = params.get('category') || 'all';

  function normalize(value) {
    return (value || '').trim().toLowerCase();
  }

  function buildUrl(category) {
    return category === 'all'
      ? blogBase
      : blogBase + '?category=' + encodeURIComponent(category);
  }

  function updateMeta(category, visibleCount) {
    if (!resultsMeta) {
      return;
    }

    if (category === 'all') {
      resultsMeta.textContent = '전체 글을 표시하는 중입니다.';
    } else if (visibleCount > 0) {
      resultsMeta.textContent = '"' + category + '" 카테고리 글 ' + visibleCount + '개를 표시하는 중입니다.';
    } else {
      resultsMeta.textContent = '"' + category + '" 카테고리의 글이 아직 없습니다.';
    }
  }

  function applyFilter(category) {
    var normalizedCategory = normalize(category);
    var isAll = !normalizedCategory || normalizedCategory === 'all';
    var visibleCount = 0;

    filters.forEach(function (filter) {
      var isMatch = normalize(filter.getAttribute('data-category-value')) === (isAll ? 'all' : normalizedCategory);
      filter.classList.toggle('is-active', isMatch);
    });

    posts.forEach(function (post) {
      var categories = normalize(post.getAttribute('data-post-categories')).split('|').filter(Boolean);
      var isVisible = isAll || categories.indexOf(normalizedCategory) !== -1;

      post.hidden = !isVisible;
      post.style.display = isVisible ? '' : 'none';

      if (isVisible) {
        visibleCount += 1;
      }
    });

    updateMeta(isAll ? 'all' : category, visibleCount);
  }

  function handleCategoryNavigation(category) {
    var nextCategory = category || 'all';
    window.history.pushState({ category: nextCategory }, '', buildUrl(nextCategory));
    applyFilter(nextCategory);
  }

  filters.forEach(function (filter) {
    filter.addEventListener('click', function (event) {
      event.preventDefault();
      handleCategoryNavigation(filter.getAttribute('data-category-value') || 'all');
    });
  });

  inlineLinks.forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      handleCategoryNavigation(link.getAttribute('data-category-value') || 'all');
    });
  });

  window.addEventListener('popstate', function () {
    var nextParams = new URLSearchParams(window.location.search);
    applyFilter(nextParams.get('category') || 'all');
  });

  applyFilter(selectedCategory);
})();
