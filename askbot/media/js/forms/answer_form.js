/* global getSuperClass, inherits, Form, FoldedEditor */
var AnswerForm = function () {
  Form.call(this);
};
inherits(AnswerForm, Form);

AnswerForm.prototype.getAfterOpenHandler = function () {
  /* decorate the super class now, b/c now we have
     the editor input element in DOM */
  var element = this._element;
  var me = this;
  return function () {
    getSuperClass(AnswerForm).decorate.call(me, element);
    var proxyInputsElement = $('.proxy-author-inputs');
    if (proxyInputsElement.length) {
      var proxyInputs = new ProxyAuthorInputs()
      proxyInputs.decorate(proxyInputsElement);
    }
  };
};

AnswerForm.prototype.decorate = function (element) {
  this._element = element;
  /* todo: move folded editor inside the answer form! */
  var editorBox = element.closest('.js-folded-editor');
  if (editorBox.length) {
    var foldedEditor = new FoldedEditor();
    foldedEditor.decorate(editorBox);
    var onAfterOpen = this.getAfterOpenHandler();
    $(document).on('askbot.FoldedEditor.afterOpened', onAfterOpen);
  }
};
