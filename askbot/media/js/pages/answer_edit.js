$(document).ready(function(){
   $('#editor').TextAreaResizer();
   var display = true;
   var txt = gettext('hide preview');
   $('#pre-collapse').text(txt);
   $('#pre-collapse').bind('click', function(){
     txt = display ? gettext('show preview') : gettext('hide preview');
     display = !display;
     $('#previewer').toggle();
     $('#pre-collapse').text(txt);
   });

   $('#id_revision').unbind().change(function(){
     $("#select_revision").val('true');
     $('#edit_post_form_submit_button').click();
   });

});
