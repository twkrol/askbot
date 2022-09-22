/* global askbot, interpolate, ngettext */
askbot.validators = askbot.validators || {};

askbot.validators.titleValidator = function (text) {
  text = $.trim(text);
  if (text.length < askbot.settings.minTitleLength) {
    throw interpolate(
      ngettext(
        'enter > %(length)s character',
        'enter > %(length)s characters',
        askbot.settings.minTitleLength
      ),
      {'length': askbot.settings.minTitleLength},
      true
    );
  }
};

askbot.validators.questionDetailsValidator = function (text) {
  text = $.trim(text);
  var minLength = askbot.settings.minQuestionBodyLength;
  if (minLength && (text.length < minLength)) {
    /* todo - for tinymce text extract text from html 
     * otherwise html tags will be counted and user misled */
    throw interpolate(
      ngettext(
        'details must have > %s character',
        'details must have > %s characters',
        minLength
      ),
      [minLength]
    );
  }
};
