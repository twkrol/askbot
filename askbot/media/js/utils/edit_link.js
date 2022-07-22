/* global gettext, inherits, SimpleControl */
var EditLink = function (className) {
    SimpleControl.call(this);
    this.className = className
};
inherits(EditLink, SimpleControl);

EditLink.prototype.createDom = function () {
    var element = $('<a></a>');
    if (this.className) {
      element.addClass(this.className);
    }
    this.decorate(element);
};

EditLink.prototype.decorate = function (element) {
    this._element = element;
    this._element.attr('title', gettext('click to edit'));
    this._element.html(gettext('edit'));
    this.setHandlerInternal();
};
