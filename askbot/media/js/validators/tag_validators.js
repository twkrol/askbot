/* global askbot, getUniqueWords */
$.validator.addMethod('limit_tag_count', function(value) {
  var tags = getUniqueWords(value);
  return (tags.length <= askbot.settings.maxTagsPerPost);
});

$.validator.addMethod('limit_tag_length', function (value) {
  var tags = getUniqueWords(value);
  var are_tags_ok = true;
  $.each(tags, function (index, value) {
    if (value.length > askbot.settings.maxTagLength) {
      are_tags_ok = false;
    }
  });
  return are_tags_ok;
});
