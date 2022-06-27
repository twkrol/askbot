/* global askbot, setupButtonEventHandlers, showMessage */
$(document).ready(function () {
  //todo: convert to "control" class
  var publishBtns = $('.js-publish-post, .js-unpublish-post');
  publishBtns.each(function (idx, btn) {
    setupButtonEventHandlers($(btn), function () {
      var postId = $(btn).data('postId');
      $.ajax({
        type: 'POST',
        dataType: 'json',
        data: {'post_id': postId},
        url: askbot.urls.publishPost,
        success: function (data) {
          if (data.success) {
            window.location.reload(true);
          } else {
            showMessage($(btn), data.message, $(btn));
          }
        }
      });
    });
  });
});
