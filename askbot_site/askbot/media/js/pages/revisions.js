$(document).ready(function(){
  function toggleRev(evt) {
    if ($(evt.target).hasClass('user-name-link')) {
      return true;
    }
    evt.stopPropagation();
    var element = $(evt.target).closest('.js-revision');
    element.toggleClass('js-active');
    element.find('.js-revision-body').slideToggle('fast');
    return false;
  }

  $('.js-revision').each(function(_, item) {
    var revId = $(item).data('revisionId');
    $(item).click(toggleRev);
  });
});

