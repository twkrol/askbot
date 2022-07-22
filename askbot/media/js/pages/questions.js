/* scroll-activated behaviour of the questions list header */
(function () {
  var qListHdr = document.getElementsByClassName('js-questions-header-top')[0];
  function callback(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        qListHdr.classList.remove('js-scrolled');
      } else {
        qListHdr.classList.add('js-scrolled');
      }
    })
  }
  var observer = new IntersectionObserver(callback);
  var siteHdr = document.getElementsByTagName('header')[0];
  observer.observe(siteHdr)
})();
