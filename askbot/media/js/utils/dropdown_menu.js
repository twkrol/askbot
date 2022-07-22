var DropdownMenu = function () {};

DropdownMenu.prototype.decorate = function(elem) {
  var elem = $(elem);
  if (elem.hasClass('js-mounted')) { /* no remounts */
    return
  }

  var target = elem.find('.js-dropdown-target');

  function toggleMenu (evt) {
    evt.stopPropagation();
    if (!elem.hasClass('js-dropdown-menu')) {/* allow disabling the menu dynamically by removing this class */
      return
    }
    if (target.hasClass('js-dropdown-active')) {
      target.removeClass('js-dropdown-active');
    } else {
      target.addClass('js-dropdown-active');
    }
  }

  $(elem).click(function(evt) {
    evt.stopPropagation();
  });

  var trigger = $(elem).find('.js-dropdown-trigger');
  trigger.click(toggleMenu);
  $(window).click(function () { target.removeClass('js-dropdown-active') });
  elem.addClass('js-mounted');
};

(function() {
  $(".js-dropdown-menu:not('.js-mounted')").each(function(_, elem) {
    var menu = new DropdownMenu();
    menu.decorate($(elem));
  })
})();
