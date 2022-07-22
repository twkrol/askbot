/* global askbot, TinyMCE, WMD, WrappedElement, inherits, gettext, showMessage,
 setupButtonEventHandlers */
/**
 * @constructor
 * @todo: change this to generic object description editor
 */
var ObjectDescriptionEditor = function () {
  WrappedElement.call(this);
  this._state = 'display';//'edit' or 'display'
  this._content_backup  = '';
  this._is_editor_loaded = false;
  this._enabled_editor_buttons = null;
  this._previewerEnabled = false;
};
inherits(ObjectDescriptionEditor, WrappedElement);

ObjectDescriptionEditor.prototype.backupContent = function () {
  this._content_backup = this._content_box.contents();
};

ObjectDescriptionEditor.prototype.setEnabledEditorButtons = function (buttons) {
  this._enabled_editor_buttons = buttons;
};

ObjectDescriptionEditor.prototype.setPreviewerEnabled = function (state) {
  this._previewerEnabled = state;
  if (this.isEditorLoaded()) {
      this._editor.setPreviewerEnabled(this._previewerEnabled);
  }
};

ObjectDescriptionEditor.prototype.setContent = function (content) {
  this._content_box.empty();
  this._content_box.append(content);
};

ObjectDescriptionEditor.prototype.setState = function (state) {
  if (state === 'edit') {
    this._state = state;
    this._edit_btn.hide();
    this._cancel_btn.show();
    this._save_btn.show();
    this._cancel_sep.show();
  } else if (state === 'display') {
    this._state = state;
    this._edit_btn.show();
    this._cancel_btn.hide();
    this._cancel_sep.hide();
    this._save_btn.hide();
  }
};

ObjectDescriptionEditor.prototype.restoreContent = function () {
  var content_box = this._content_box;
  content_box.empty();
  $.each(this._content_backup, function (idx, element) {
    content_box.append(element);
  });
};

ObjectDescriptionEditor.prototype.getObjectId = function () {
  return this._objectId;
};

ObjectDescriptionEditor.prototype.getModelName = function () {
  return this._modelName;
};

ObjectDescriptionEditor.prototype.isEditorLoaded = function () {
  return this._is_editor_loaded;
};

ObjectDescriptionEditor.prototype.setEditorLoaded = function () {
  this._is_editor_loaded = true;
  return true;
};

/**
 * loads initial data for the editor input and activates
 * the editor
 */
ObjectDescriptionEditor.prototype.startActivatingEditor = function () {
  var editor = this._editor;
  var me = this;
  var data = {
    object_id: me.getObjectId(),
    model_name: me.getModelName(),
  };
  $.ajax({
    type: 'GET',
    url: askbot.urls.load_object_description,
    data: data,
    cache: false,
    success: function (data) {
      me.backupContent();
      editor.setText(data);
      me.setContent(editor.getElement());
      me.setState('edit');
      if (me.isEditorLoaded() === false) {
        editor.start();
        me.setEditorLoaded();
      }
    }
  });
};

ObjectDescriptionEditor.prototype.saveData = function () {
  var me = this;
  var text = this._editor.getText();
  var data = {
    object_id: me.getObjectId(),
    model_name: me.getModelName(),
    text: text
  };
  $.ajax({
    type: 'POST',
    dataType: 'json',
    url: askbot.urls.save_object_description,
    data: data,
    cache: false,
    success: function (data) {
      if (data.success) {
        me.setState('display');
        me.setContent(data.html);
      } else {
        showMessage(me.getElement(), data.message);
      }
    }
  });
};

ObjectDescriptionEditor.prototype.cancelEdit = function () {
  this.restoreContent();
  this.setState('display');
};

ObjectDescriptionEditor.prototype.decorate = function (element) {
  this._element = element;
  var edit_btn = element.find('.js-edit-description-btn');
  this._edit_btn = edit_btn;

  //adding two buttons...
  var save_btn = this.makeElement('a');
  save_btn.html(gettext('save'));
  edit_btn.after(save_btn);
  save_btn.hide();
  this._save_btn = save_btn;

  var cancel_btn = this.makeElement('a');
  cancel_btn.html(gettext('cancel'));
  save_btn.after(cancel_btn);
  cancel_btn.hide();
  this._cancel_btn = cancel_btn;

  this._cancel_sep = $('<span> | </span>');
  cancel_btn.before(this._cancel_sep);
  this._cancel_sep.hide();

  this._content_box = element.find('.js-description');
  this._objectId = element.data('objectId');
  this._modelName = element.data('modelName');

  var me = this;
  var editor;
  if (askbot.settings.editorType === 'markdown') {
    editor = new WMD({minLines: 3});
  } else {
    editor = new TinyMCE({//override defaults
      theme_advanced_buttons1: 'bold, italic, |, link, |, numlist, bullist',
      theme_advanced_buttons2: '',
      theme_advanced_path: false,
      plugins: ''
    });
  }
  if (this._enabled_editor_buttons) {
    editor.setEnabledButtons(this._enabled_editor_buttons);
  }
  editor.setPreviewerEnabled(this._previewerEnabled);
  this._editor = editor;
  setupButtonEventHandlers(edit_btn, function () { me.startActivatingEditor(); });
  setupButtonEventHandlers(cancel_btn, function () {me.cancelEdit(); });
  setupButtonEventHandlers(save_btn, function () {me.saveData(); });
};
