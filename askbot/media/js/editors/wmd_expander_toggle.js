/* global ExpanderToggle, getSuperClass, gettext, inherits */
var WMDExpanderToggle = function (editor) {
    ExpanderToggle.call(this, editor.getPreviewerElement());
    this._editor = editor.getEditorElement();
    this._state = 'on-state';
    this._messages = {
        'on-state': gettext('Preview: (hide)'),
        'off-state': gettext('Show preview')
    }
};
inherits(WMDExpanderToggle, ExpanderToggle);

WMDExpanderToggle.prototype.getEditor = function () {
    return this._editor;
};

WMDExpanderToggle.prototype.setPreviewerCollapsedClass = function (collapsed) {
    var ed = this.getEditor();
    if (collapsed) {
        ed.addClass('wmd-previewer-collapsed');
    } else {
        ed.removeClass('wmd-previewer-collapsed');
    }
};

WMDExpanderToggle.prototype.createDom = function () {
    getSuperClass(WMDExpanderToggle).createDom.call(this);
    this._element.addClass('wmd-previewer-toggle');

    var me = this;
    this._element.on('askbot.Toggle.stateChange', function (evt, data) {
        var newState = data['newState'];
        var collapsed = (newState == 'off-state' || newState == 'on-prompt');
        me.setPreviewerCollapsedClass(collapsed);
        return false;
    });
    this._element.on('askbot.WrappedElement.show askbot.WrappedElement.hide', function () {
        me.setPreviewerCollapsedClass(!me.isOn());
        return false;
    });
}
