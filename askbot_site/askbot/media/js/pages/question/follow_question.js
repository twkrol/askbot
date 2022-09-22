/* global AjaxToggle, askbot, ngettext, interpolate */
$(document).ready(function() {
  var updateQuestionFollowerCount = function (evt, data) {
    var fav = $('.js-question-follower-count');
    var count = data.num_followers;
    if (count === 0) {
      fav.text('');
    } else {
      var fmt = ngettext('%s follower', '%s followers', count);
      fav.text(interpolate(fmt, [count]));
    }
  };

  var followBtn = $('.js-follow-question-btn');
  if (followBtn.length) {
    var toggle = new AjaxToggle();
    toggle.setPostData({'question_id': askbot.data.questionId });
    toggle.decorate(followBtn);
    followBtn.bind('askbot.two-state-toggle.success', updateQuestionFollowerCount);
  }
});
