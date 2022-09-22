/* global AjaxToggle, inherits */
/**
 * @constructor
 * turns on/off the category editor
 */
var CategoryEditorToggle = function () {
    AjaxToggle.call(this);
};
inherits(CategoryEditorToggle, AjaxToggle);

CategoryEditorToggle.prototype.setCategorySelector = function (sel) {
    this._category_selector = sel;
};

CategoryEditorToggle.prototype.getCategorySelector = function () {
    return this._category_selector;
};

CategoryEditorToggle.prototype.decorate = function (element) {
    CategoryEditorToggle.superClass_.decorate.call(this, element);
};

CategoryEditorToggle.prototype.getDefaultHandler = function () {
    var me = this;
    return function () {
        var editor = me.getCategorySelector();
        if (me.isOn()) {
            me.setState('off-state');
            editor.setState('select');
        } else {
            me.setState('on-state');
            editor.setState('editable');
        }
    };
};
