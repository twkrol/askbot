(function() {
  $('.js-badges-list').sortable({
    itemSelector: '.js-badge-row',
    containerSelector: '.js-badges-list',
    onDrop: function(item, ctnr) {
      item.removeClass("dragged").removeAttr("style");
      $("body").removeClass("dragging");
      var postData = {
        badge_id: item.data('badgeId'),
        position: $('.js-badge-row').index(item)
      }
      $.ajax({
        type: 'POST',
        dataType: 'json',
        url: askbot.urls.reorderBadges,
        data: postData
      });
    }
  });
})();
