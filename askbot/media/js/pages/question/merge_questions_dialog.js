/* global askbot, gettext, inherits, makeKeyHandler, Tag, ModalDialog */
(function () {
  var MergeQuestionsDialog = function () {
    ModalDialog.call(this);
    this._tags = [];
    this._prevQuestionId = undefined;
  };
  inherits(MergeQuestionsDialog, ModalDialog);

  MergeQuestionsDialog.prototype.show = function () {
    MergeQuestionsDialog.superClass_.show.call(this);
    this._idInput.focus();
  };

  MergeQuestionsDialog.prototype.getStartMergingHandler = function () {
    var me = this;
    return function () {
      $.ajax({
        type: 'POST',
        cache: false,
        dataType: 'json',
        url: askbot.urls.mergeQuestions,
        data: JSON.stringify({
          from_id: me.getFromId(),
          to_id: me.getToId()
        }),
        success: function () {
          window.location.reload();
        }
      });
    };
  };

  MergeQuestionsDialog.prototype.setPreview = function (data) {
    this._previewTitle.html(data.title);
    this._previewBody.html(data.summary);
    for (var i = 0; i < this._tags.length; i++) {
      this._tags[i].dispose();
    }
    for (i = 0; i < data.tags.length; i++) {
      var tag = new Tag();
      tag.setLinkable(false);
      tag.setName(data.tags[i]);
      this._previewTags.append(tag.getElement());
      this._tags.push(tag);
    }
    this._preview.fadeIn();
  };

  MergeQuestionsDialog.prototype.clearIdInput = function () {
    this._idInput.val('');
  };

  MergeQuestionsDialog.prototype.clearPreview = function () {
    for (var i = 0; i < this._tags.length; i++) {
      this._tags[i].dispose();
    }
    this._previewTitle.html('');
    this._previewBody.html('');
    this._previewTags.html('');
    this.setAcceptButtonText(gettext('Load preview'));
    this._preview.hide();
  };

  MergeQuestionsDialog.prototype.getFromId = function () {
    return this._fromId;
  };

  MergeQuestionsDialog.prototype.getToId = function () {
    return this._idInput.val();
  };

  MergeQuestionsDialog.prototype.getPrevToId = function () {
    return this._prevQuestionId;
  };

  MergeQuestionsDialog.prototype.setPrevToId = function (toId) {
    this._prevQuestionId = toId;
  };

  MergeQuestionsDialog.prototype.getLoadPreviewHandler = function () {
    var me = this;
    return function () {
      //var prevId = me.getPrevToId();
      var curId = me.getToId();
      // here I am disabling eqeqeq because it looks like there's a type coercion going on, can't be sure
      // so skipping it
      /*jshint eqeqeq:false*/
      if (curId) {// && curId != prevId) {
      /*jshint eqeqeq:true*/
        $.ajax({
          type: 'GET',
          cache: false,
          dataType: 'json',
          url: askbot.urls.apiV1Questions + curId + '/',
          success: function (data) {
            me.setPreview(data);
            me.setPrevToId(curId);
            me.setAcceptButtonText(gettext('Merge'));
            me.setPreviewLoaded(true);
            return false;
          },
          error: function () {
            me.clearPreview();
            me.setAcceptButtonText(gettext('Load preview'));
            me.setPreviewLoaded(false);
            return false;
          }
        });
      }
    };
  };

  MergeQuestionsDialog.prototype.setPreviewLoaded = function(isLoaded) {
    this._isPreviewLoaded = isLoaded;
  };

  MergeQuestionsDialog.prototype.isPreviewLoaded = function() {
    return this._isPreviewLoaded;
  };

  MergeQuestionsDialog.prototype.getAcceptHandler = function() {
    var me = this;
    return function() {
      var handler;
      if (me.isPreviewLoaded()) {
        handler = me.getStartMergingHandler();
      } else {
        handler = me.getLoadPreviewHandler();
      }
      handler();
      return false;
    };
  };

  MergeQuestionsDialog.prototype.getRejectHandler = function() {
    var me = this;
    return function() {
      me.clearPreview();
      me.clearIdInput();
      me.setPreviewLoaded(false);
      me.hide();
    };
  };

  MergeQuestionsDialog.prototype.createDom = function () {
    var content = this.makeElement('div');
    var search = $("<div class='js-merge-questions-search'></div>");
    content.append(search);
    var label = this.makeElement('label');
    label.attr('for', 'question_id');
    label.html(gettext(askbot.messages.enterDuplicateQuestionId));
    search.append(label);
    var input = this.makeElement('input');
    input.attr('type', 'text');
    input.attr('name', 'question_id');
    search.append(input);
    this._idInput = input;

    var preview = this.makeElement('div');
    content.append(preview);
    this._preview = preview;
    preview.hide();

    var title = $('<h2 class="js-question-title"></h2>');
    preview.append(title);
    this._previewTitle = title;

    var tags = this.makeElement('div');
    tags.addClass('js-tags');
    this._preview.append(tags);
    this._previewTags = tags;

    var body = this.makeElement('div');
    body.addClass('js-preview-body');
    this._preview.append(body);
    this._previewBody = body;

    var previewHandler = this.getLoadPreviewHandler();
    var enterHandler = makeKeyHandler(13, previewHandler);
    input.keydown(enterHandler);
    input.blur(previewHandler);

    this.setContent(content);

    this.setClass('js-merge-questions');
    this.setRejectButtonText(gettext('Cancel'));
    this.setAcceptButtonText(gettext('Load preview'));
    this.setHeadingText(askbot.messages.mergeQuestions);
    this.setRejectHandler(this.getRejectHandler());
    this.setAcceptHandler(this.getAcceptHandler());

    MergeQuestionsDialog.superClass_.createDom.call(this);
    this._element.hide();

    this._fromId = $('.js-question').data('postId');
    //have to do this on document since _element is not in the DOM yet
    $(document).trigger('askbot.afterMergeQuestionsDialogCreateDom', [this]);
  };

  if (askbot.data.userIsThreadModerator) {
    var mergeQuestions = new MergeQuestionsDialog();
    $('body').append(mergeQuestions.getElement());
    var mergeBtn = $('.js-question-merge-btn');
    setupButtonEventHandlers(mergeBtn, function () {
      mergeQuestions.show();
    });
  }
})();
