/* global askbot, gettext, ngettext, interpolate */
function setupFormValidation(form, validationRules, validationMessages, onSubmitCallback) {

  function setSubmitButtonDisabled(form, isDisabled) {
    form.find('input[type="submit"]').attr('disabled', isDisabled);
  }

  function enableSubmitButton(form) {
    setSubmitButtonDisabled(form, false);
  }

  function disableSubmitButton(form) {
    setSubmitButtonDisabled(form, true);
  }

  enableSubmitButton(form);
  var placementLocation = askbot.settings.errorPlacement;
  var placementClass = placementLocation ? ' ' + placementLocation : '';
  form.validate({
    debug: true,
    rules: (validationRules ? validationRules : {}),
    messages: (validationMessages ? validationMessages : {}),
    errorElement: 'span',
    errorClass: 'form-error' + placementClass,
    highlight: function (element) {
      $(element).closest('.form-group').addClass('has-error');
    },
    unhighlight: function (element) {
      var formGroup = $(element).closest('.form-group');
      formGroup.removeClass('has-error');
      formGroup.find('.form-error').remove();
    },
    errorPlacement: function (error, element) {
      //bs3 error placement
      var label = element.closest('.form-group').find('label');
      if (placementLocation === 'in-label') {
        label.html(error);
        return;
      } else if (placementLocation === 'after-label') {
        var errorLabel = element.closest('.form-group').find('.form-error');
        if (errorLabel.length) {
          errorLabel.replaceWith(error);
        } else {
          label.after(error);
        }
        return;
      }

      //old askbot error placement
      var span = element.next().find('.form-error');
      if (span.length === 0) {
        span = element.parent().find('.form-error');
        if (span.length === 0) {
          //for resizable textarea
          var element_id = element.attr('id');
          $('label[for="' + element_id + '"]').after(error);
        }
      } else {
        span.replaceWith(error);
      }
    },
    submitHandler: function (form_dom) {
      disableSubmitButton($(form_dom));

      if (onSubmitCallback) {
        onSubmitCallback(form_dom);
      } else {
        form_dom.submit();
      }
    }
  });
}

$(document).ready(function(){
  var answerRules = {
    text: {
      required: true,
      minlength: askbot.settings.minAnswerBodyLength
    }
  }
  var answerMessages = {
    text: {
      required: ' ' + gettext('content cannot be empty'),
      minlength: interpolate(
        ngettext(
            'enter > %(length)s character',
            'enter > %(length)s characters',
            askbot.settings.minAnswerBodyLength
        ),
        {'length': askbot.settings.minAnswerBodyLength},
        true
      )
    }
  }
  setupFormValidation($("#fmedit"), answerRules, answerMessages);
});
