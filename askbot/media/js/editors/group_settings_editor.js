/* global askbot, gettext, ObjectDescriptionEditor, inherits, AjaxToggle, showMessage,
   ImageChanger, DropdownSelect, TextPropertyEditor */
var GroupSettingsEditor = function () {
  ObjectDescriptionEditor.call(this);
};
inherits(GroupSettingsEditor, ObjectDescriptionEditor);

GroupSettingsEditor.prototype.toggleEmailModeration = function () {
  var btn = this._moderate_email_btn;
  var group_id = this.getObjectId();
  $.ajax({
    type: 'POST',
    dataType: 'json',
    cache: false,
    data: {group_id: group_id},
    url: askbot.urls.toggle_group_email_moderation,
    success: function (data) {
      if (data.success) {
        btn.html(data.new_button_text);
      } else {
        showMessage(btn, data.message);
      }
    }
  });
};

GroupSettingsEditor.prototype.decorate = function (element) {
  this.setEnabledEditorButtons('bold italic link ol ul');
  this.setPreviewerEnabled(false);
  GroupSettingsEditor.superClass_.decorate.call(this, element);
  var change_logo_btn = element.find('.js-change-logo-btn');
  this._change_logo_btn = change_logo_btn;

  var moderate_email_toggle = new AjaxToggle();
  moderate_email_toggle.setPostData({
    group_id: this.getObjectId(),
    property_name: 'moderate_email'
  });
  var moderate_email_btn = element.find('.js-moderate-email-toggle');
  this._moderate_email_btn = moderate_email_btn;
  moderate_email_toggle.decorate(moderate_email_btn);

  var moderate_publishing_replies_toggle = new AjaxToggle();
  moderate_publishing_replies_toggle.setPostData({
    group_id: this.getObjectId(),
    property_name: 'moderate_answers_to_enquirers'
  });
  var btn = element.find('.js-moderate-answers-to-enquirers-toggle');
  moderate_publishing_replies_toggle.decorate(btn);

  var vip_toggle = new AjaxToggle();
  vip_toggle.setPostData({
    group_id: this.getObjectId(),
    property_name: 'is_vip'
  });
  btn = element.find('.js-moderator-toggle');
  vip_toggle.decorate(btn);

  var readOnlyToggle = new AjaxToggle();
  readOnlyToggle.setPostData({
    group_id: this.getObjectId(),
    property_name: 'read_only'
  });
  btn = element.find('.js-read-only-access-toggle');
  readOnlyToggle.decorate(btn);

  var postQuestionsToggle = new AjaxToggle();
  postQuestionsToggle.setPostData({
    group_id: this.getObjectId(),
    property_name: 'can_post_questions'
  });
  btn = element.find('.js-can-post-questions-toggle');
  postQuestionsToggle.decorate(btn);

  var postAnswersToggle = new AjaxToggle();
  postAnswersToggle.setPostData({
    group_id: this.getObjectId(),
    property_name: 'can_post_answers'
  });
  btn = element.find('.js-can-post-answers-toggle');
  postAnswersToggle.decorate(btn);

  var postCommentsToggle = new AjaxToggle();
  postCommentsToggle.setPostData({
    group_id: this.getObjectId(),
    property_name: 'can_post_comments'
  });
  btn = element.find('.js-can-post-comments-toggle');
  postCommentsToggle.decorate(btn);

  var opennessSelector = new DropdownSelect();
  var selectorElement = element.find('.js-group-openness-selector');
  opennessSelector.setPostData({
    group_id: this.getObjectId(),
    property_name: 'openness'
  });
  opennessSelector.decorate(selectorElement);

  var email_editor = new TextPropertyEditor();
  email_editor.decorate(element.find('.js-preapproved-emails'));

  var domain_editor = new TextPropertyEditor();
  domain_editor.decorate(element.find('.js-preapproved-email-domains'));

  var logo_changer = new ImageChanger();
  logo_changer.setImageElement(element.find('.js-group-logo'));
  logo_changer.setAjaxData({
    group_id: this.getObjectId()
  });
  logo_changer.setSaveUrl(askbot.urls.save_group_logo_url);
  logo_changer.setDeleteUrl(askbot.urls.delete_group_logo_url);
  logo_changer.setMessages({
    change_image: gettext('change logo'),
    add_image: gettext('add logo')
  });
  var delete_logo_btn = element.find('.js-delete-logo-btn');
  logo_changer.setDeleteButton(delete_logo_btn);
  logo_changer.decorate(change_logo_btn);
};
