/* global askbot, Markdown, MathJax, hljs */
// Askbot adapter to markdown converter;
var getAskbotMarkdownConverter = function() {
  askbot['controllers'] = askbot['controllers'] || {};
  var converter = askbot['controllers']['markdownConverter'];
  if (!converter) {
    converter = new AskbotMarkdownConverter();
    askbot['controllers']['markdownConverter'] = converter;
  }
  return converter;
};

var AskbotMarkdownConverter = function() {
  this._converter = new Markdown.getSanitizingConverter();
  this._timeout = null;
};

AskbotMarkdownConverter.prototype.scheduleMathJaxRendering = function () {
  if (this._timeout) {
      clearTimeout(this._timeout);
  }
  var renderFunc = function () {
      MathJax.Hub.Queue(['Typeset', MathJax.Hub, 'previewer']);
  };
  this._timeout = setTimeout(renderFunc, 500);
};

AskbotMarkdownConverter.prototype.makeScratchPadElement = function () {
  $(document.body).append($('<div id="markdown-scratch-pad" class="js-hidden"></div>'));
  return document.getElementById('markdown-scratch-pad');
};

AskbotMarkdownConverter.prototype.getScratchPadElement = function () {
  var element = document.getElementById('markdown-scratch-pad');
  if (!element) return this.makeScratchPadElement();
  return element;
}

AskbotMarkdownConverter.prototype.highlightSyntax = function (htmlBase) {
  var scratch = this.getScratchPadElement();
  $(scratch).html(htmlBase);
  $(scratch).find('pre code').parent().each(function () {
    hljs.highlightElement(this);
  });
  return $(scratch).html();
};

AskbotMarkdownConverter.prototype.makeHtml = function (text) {
  var baseHtml = this._converter.makeHtml(text);
  baseHtml =  this.highlightSyntax(baseHtml);

  if (askbot['settings']['mathjaxEnabled'] === false){
      return baseHtml;
  } else if (typeof MathJax != 'undefined') {
    MathJax.Hub.queue.Push(
      function(){
        $('.wmd-preview').html(baseHtml);
      }
    );
    this.scheduleMathJaxRendering();
    return $('.wmd-preview').html();
  } else {
    console.log('Could not load MathJax');
    return baseHtml;
  }
};
