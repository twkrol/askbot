/* global askbot, WrappedElement, inherits, tinyMCE, tinymce, inArray */
/**
 * @constructor
 */
var TinyMCE = function (config) {
    WrappedElement.call(this);
    var defaultConfig = JSON.parse(askbot['settings']['tinyMCEConfigJson']);
    this._config = $.extend(defaultConfig, config || {});

    this._id = 'editor';//desired id of the textarea
};
inherits(TinyMCE, WrappedElement);

TinyMCE.prototype.setTextareaName = function (name) {
    this._textareaName = name;
};

/*
 * not passed onto prototoype on purpose!!!
 */
TinyMCE.onInitHook = function () {
    //set initial content
    var ed = tinyMCE.activeEditor;
    //if we have spellchecker - enable it by default
    if (inArray('spellchecker', askbot.settings.tinyMCEPlugins)) {
        setTimeout(function () {
            ed.controlManager.setActive('spellchecker', true);
            tinyMCE.execCommand('mceSpellCheck', true);
        }, 1);
    }
    $('.mceStatusbar').remove();
};

TinyMCE.onChangeHook = function (editor) {
    tinyMCE.triggerSave();
    $(tinyMCE.get(editor.id).getElement()).change();
};

/* 3 dummy functions to match WMD api */
TinyMCE.prototype.setEnabledButtons = function () {};

TinyMCE.prototype.start = function () {
    //copy the options, because we need to modify them
    var opts = $.extend({}, this._config);
    var extraOpts = {
        'mode': 'exact',
        'elements': this._id
    };
    opts = $.extend(opts, extraOpts);
    tinyMCE.init(opts);
    if (this._text) {
        this.setText(this._text);
    }
};
TinyMCE.prototype.setPreviewerEnabled = function () {};
TinyMCE.prototype.setHighlight = function () {};

TinyMCE.prototype.putCursorAtEnd = function () {
    var ed = tinyMCE.activeEditor;
    //add an empty span with a unique id
    var endId = tinymce.DOM.uniqueId();
    ed.dom.add(ed.getBody(), 'span', {'id': endId}, '');
    //select that span
    var newNode = ed.dom.select('span#' + endId);
    ed.selection.select(newNode[0]);
};

TinyMCE.prototype.focus = function (onFocus) {
    var editorId = this._id;
    var winH = $(window).height();
    var winY = $(window).scrollTop();
    var edY = this._element.offset().top;
    var edH = this._element.height();

    //@todo: the fallacy of this method is timeout - should instead use queue
    //because at the time of calling focus() the editor may not be initialized yet
    setTimeout(
        function () {
            tinyMCE.execCommand('mceFocus', false, editorId);

            //@todo: make this general to all editors

            //if editor bottom is below viewport
            var isBelow = ((edY + edH) > (winY + winH));
            var isAbove = (edY < winY);
            if (isBelow || isAbove) {
                //then center on screen
                $(window).scrollTop(edY - edH / 2 - winY / 2);
            }
            if (onFocus) {
                onFocus();
            }
        },
        100
    );


};

TinyMCE.prototype.setId = function (id) {
    this._id = id;
};

TinyMCE.prototype.setText = function (text) {
    this._text = text;
    if (this.isLoaded()) {
        tinymce.get(this._id).setContent(text);
    }
};

TinyMCE.prototype.getText = function () {
    return tinyMCE.activeEditor.getContent();
};

TinyMCE.prototype.getHtml = TinyMCE.prototype.getText;

TinyMCE.prototype.isLoaded = function () {
    return (typeof tinymce !== 'undefined' && tinymce.get(this._id) !== undefined);
};

TinyMCE.prototype.createDom = function () {
    var editorBox = this.makeElement('div');
    editorBox.addClass('wmd-container');
    this._element = editorBox;
    var textarea = this.makeElement('textarea');
    textarea.attr('id', this._id);
    textarea.addClass('editor');
    if (this._textareaName) {
        textarea.attr('name', this._textareaName);
    }
    //textarea.addClass(askbot.settings.tinymceEditorDeselector);
    this._element.append(textarea);
};

TinyMCE.prototype.decorate = function (element) {
    this._element = element;
    this._id = element.attr('id');
};
