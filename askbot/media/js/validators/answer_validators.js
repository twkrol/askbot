/* global askbot, interpolate, ngettext */
askbot.validators = askbot.validators || {};
askbot.validators.answerValidator = function (text) {
  var minLength = askbot.settings.minAnswerBodyLength;
  var textLength
  text = $.trim(text);
  if (askbot.settings.editorType == 'tinymce') {
    textLength = $('<p>' + text + '</p>').text().length;
  } else {
    textLength = text.length;
  }
  if (minLength && (textLength < minLength)) {
    throw interpolate(
      ngettext(
        'enter > %(length)s character',
        'enter > %(length)s characters',
        minLength
      ),
      {'length': minLength},
      true
    );
  }
};
