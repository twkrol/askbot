var renderGooglePlusBtn = function () {
    gapi.signin.render('google-plus-btn-id', {
        'clientid': askbot.settings.googlePlusPublicKey,
        'cookiepolicy': 'single_host_origin',
        'scope': 'https://www.googleapis.com/auth/plus.login'
    });
};

$.fn.authenticator = function () {
    var signin_page = $(this);
    var signin_form = $('#signin-form');
    var openid_login_token_input = $('input[name=openid_login_token]');
    var openid_login_token_input_fields = $('#openid-fs');
    var provider_name_input = $('input[name=login_provider_name]');
    var password_input_fields = $('#password-fs');
    var existing_login_methods_div = $('#existing-login-methods');
    var openid_submit_button = $('input[name=openid_login_with_extra_token]');
    var existing_login_methods = {};

    var setup_click_handler = function (elements, handler_function) {
        elements.unbind('click').click(handler_function);
    };

    var setup_enter_key_handler = function (elements, handler_function) {
        elements.each(
            function (index, element) {
                $(element).unbind('keypress').keypress(
                    function (e) {
                        if ((e.which && e.which === 13) || (e.keyCode && e.keyCode === 13)) {
                            if (handler_function) {
                                return handler_function ();
                            } else {
                                element.click();
                                return false;
                            }
                        }
                    }
                );
            }
        );
    };

    var setup_event_handlers = function (elements, handler_function) {
        setup_click_handler(elements, handler_function);
        setup_enter_key_handler(elements);
    };

    var get_provider_name = function (row_el) {
        var row = $(row_el);
        var name_span = row.find('.ab-provider-name');
        var provider_name = $.trim(name_span.html());
        return provider_name;
    };

    var read_existing_login_methods = function () {
        $('.ab-provider-row').each(
            function (i, provider_row) {
                var provider_name = get_provider_name(provider_row);
                existing_login_methods[provider_name] = true;
            }
        );
    };

    var setup_login_method_deleters = function () {
        $('.ab-provider-row').each(
            function (i, provider_row) {
                var provider_name = get_provider_name(provider_row);
                var remove_button = $(
                                    provider_row
                                ).find('button');
                remove_button.click(
                    function () {
                        var message = interpolate(gettext('Are you sure you want to remove your %s login?'), [provider_name]);
                        if (confirm(message)) {
                            $.ajax({
                                type: 'POST',
                                url: askbot.urls.deleteLoginMethod,
                                data: {provider_name: provider_name},
                                success: function (data, text_status, xhr) {
                                    $(provider_row).remove();
                                    delete existing_login_methods[provider_name];
                                    askbot.auth.providerCount -= 1;
                                    if (askbot.auth.providerCount <= 0) {
                                        askbot.auth.providerCount = 0;
                                    }
                                    if (askbot.auth.providerCount === 0) {
                                        $('#ab-existing-login-methods').remove();
                                        $('#ab-show-login-methods').remove();
                                        $('h1').html(
                                            gettext('Please add one or more login methods.')
                                        );
                                        $('.js-login-intro').html(
                                            gettext('You don\'t have a method to log in right now, please add one or more by clicking any of the icons below.')
                                        );
                                        existing_login_methods = null;
                                    }
                                }
                            });
                        }
                    }
                );
            }
        );
    };

    /**
     * field - jQuery element of input
     * returns error label for this field
     */
    var getErrorLabel = function (field) {
        var group = field.closest('.form-group');
        var error = group.find('.form-error');
        if (error.length) {
            return error;
        } else {
            field.before('<span class="error form-error" generated="true""></span>');
            return group.find('.form-error');
        }
    };

    /**
     * sets error text and .has-error class
     * to the .form-group
     * field - jQuery element of input field
     * text - text of error label
     */
    var setError = function(field, text) {
        var error = getErrorLabel(field);
        error.text(text);
        error.closest('.form-group').addClass('has-error');
    }

    var clearError = function(field) {
        setError(field, '');
        field.closest('.form-group').removeClass('has-error');
    };

    var submit_login_with_password = function () {
        var username = $('#id_username');
        var password = $('#id_password');
        var ok = true;
        var text;

        if (username.val().length < 1) {
            username.focus();
            if (askbot.settings.useLdapForPasswordLogin) {
                text = gettext('enter username');
            } else {
                text = gettext('enter username or email');
            }
            setError(username, text);
            ok = false;
        } else {
            clearError(username);
        }
        if (password.val().length < 1) {
            password.focus();
            setError(password, gettext('enter password'));
            ok = false;
        } else {
            clearError(password);
        }
        return ok;
    };

    var submit_change_password = function () {
        var newpass = $('#id_new_password');
        var newpass_retyped = $('#id_new_password_retyped');
        if (newpass.val().length < 1) {
            newpass.focus();
            return false;
        }
        if (newpass_retyped.val().length < 1) {
            newpass_retyped.focus();
            return false;
        }
        if (newpass.val() !== newpass_retyped.val()) {
            newpass_retyped.after(
                    '<span class="error">' +
                    gettext('passwords do not match') +
                    '</span>'
                );
            newpass.val('').focus();
            newpass_retyped.val('');
            return false;
        }
        return true;
    };

    //validator, may be extended to check url for openid
    var submit_with_extra_openid_token = function () {
        if (openid_login_token_input.val().length < 1) {
            openid_login_token_input.focus();
            return false;
        }
        return true;
    };

    var insert_login_list_enabler = function () {
        var enabler = $('#login-list-enabler');
        if (enabler.is('p#login-list-enabler')) {
            enabler.show();
        } else {
            enabler = $(
                    '<p id="login-list-enabler"><a href="#">' +
                    gettext('Show/change current login methods') +
                    '</a></p>');
            setup_event_handlers(
                enabler,
                function () {
                    if (askbot.settings.signin_always_show_local_login === false) {
                        password_input_fields.hide();
                    }
                    openid_login_token_input_fields.hide();
                    enabler.hide();
                    existing_login_methods_div.show();
                }
            );
            existing_login_methods_div.after(enabler);
        }
    };

    var reset_password_input_fields = function () {
        if (askbot.data.userIsAuthenticated) {
            $('#id_new_password').val('');
            $('#id_new_password_retyped').val('');
        } else {
            $('#id_username').val('');
            $('#id_password').val('');
        }
    };

    var reset_form = function () {
        openid_login_token_input_fields.hide();
        if (askbot.settings.signin_always_show_local_login === false) {
            password_input_fields.hide();
        }
        reset_password_input_fields();
        if (askbot.data.userIsAuthenticated !== false) {
            if (existing_login_methods !== null) {
                existing_login_methods_div.hide();
                insert_login_list_enabler();
            }
        }
    };

    var reset_form_and_errors = function () {
        reset_form();
        $('.error').remove();
    };

    var set_provider_name = function (element) {
        var provider_name = element.attr('name');
        provider_name_input.val(provider_name);
    };

    var show_openid_input_fields = function (provider_name) {
        reset_form_and_errors();
        var token_name = askbot.auth.extraTokenName[provider_name];
        if (askbot.data.userIsAuthenticated) {
            $('#openid-heading').html(
                interpolate(gettext('Please enter your %s, then proceed'), [token_name])
            );
            var button_text = gettext('Connect your %(provider_name)s account to %(site)s');
            var data = {
                provider_name: provider_name,
                site: askbot.settings.siteName
            };
            button_text = interpolate(button_text, data, true);
            openid_submit_button.val(button_text);
        } else {
            $('#openid-heading>span').html(token_name);
        }
        openid_login_token_input_fields.show();
        openid_login_token_input.focus();
    };

    var start_simple_login = function () {
        //$('#openid_form .providers td').removeClass('highlight');
        //$li.addClass('highlight');
        set_provider_name($(this));
        signin_form.submit();
        return true;
    };

    var start_login_with_extra_openid_token = function () {
        show_openid_input_fields($(this).attr('name'));
        set_provider_name($(this));

        setup_enter_key_handler(
            openid_login_token_input,
            function () {
                openid_submit_button.click();
                return false;
            }
        );

        setup_event_handlers(
            openid_submit_button,
            function () {
                signin_form.unbind(
                                'submit'
                            ).submit(
                                submit_with_extra_openid_token
                            );
            }
        );
        return false;
    };

    var start_facebook_login = function () {
        set_provider_name($(this));
        if (typeof FB !== 'undefined') {
            FB.getLoginStatus(function (response) {
                if (response.authResponse) {
                    signin_form.submit();
                } else {
                    if (FB.getAuthResponse()) {
                        signin_form.submit();
                    }
                    FB.login();
                }
            });
        }
        return false;
    };

    var start_password_login_or_change = function () {
        //called upon clicking on one of the password login buttons
        reset_form_and_errors();
        set_provider_name($(this));
        var provider_name = $(this).attr('name');
        return setup_password_login_or_change(provider_name);
    };

    var init_password_login = function () {
        //reset_form();
        //will break wordpress and ldap
        provider_name_input.val('local');
        setup_password_login_or_change('local');
    };

    var setup_password_login_or_change = function (provider_name) {
        var token_name = askbot.auth.extraTokenName[provider_name];
        var password_action_input = $('input[name=password_action]');
        var provider_cleaned_name;
        var password_heading_text;
        var password_button_text;
        var password_button = $('input[name=change_password]');
        var submit_action = submit_change_password;
        var focus_input = $('#id_new_password');
        var submittable_input = $('#id_new_password_retyped');

        if (askbot.data.userIsAuthenticated && !askbot.settings.useLdapForPasswordLogin) {

            if (provider_name === 'local') {
                provider_cleaned_name = askbot.settings.siteName;
            } else {
                provider_cleaned_name = provider_name;
            }
            if (existing_login_methods && existing_login_methods[provider_name]) {
                password_heading_text = interpolate(gettext('Change your %s password'), [provider_cleaned_name]);
                password_button_text = gettext('Change password');
            } else {
                password_heading_text = interpolate(gettext('Create a password for %s'), [provider_cleaned_name]);
                password_button_text = gettext('Create password');
            }
            $('#password-heading').html(password_heading_text);
            password_button.val(password_button_text);
            password_action_input.val('change_password');
        } else {
            $('#password-heading>span').html(token_name);
            password_button = $('input[name=login_with_password]');
            submit_action = submit_login_with_password;
            var create_pw_link = $('a.create-password-account');
            if (create_pw_link.length > 0) {
                create_pw_link.html(gettext('Create a password-protected account'));
                var url = create_pw_link.attr('href');
                if (url.indexOf('?') !== -1) {
                    url = url.replace(/\?.*$/, '?login_provider=' + provider_name);
                } else {
                    url += '?login_provider=' + provider_name;
                }
                create_pw_link.attr('href', url);
            }
            password_action_input.val('login');
            focus_input = $('#id_username');
            submittable_input = $('#id_password');
        }
        password_input_fields.show();
        focus_input.focus();

        var submit_password_login = function () {
            signin_form.unbind('submit').submit(submit_action);
        };

        setup_enter_key_handler(
            submittable_input,
            function () {
                password_button.click();
                return false;
            }
        );
        setup_event_handlers(password_button, submit_password_login);
        return false;
    };

    var start_mozilla_persona_login = function () {
        navigator.id.request();
        return false;
    };

    var clear_password_fields = function () {
        $('#id_password').val('');
        $('#id_new_password').val('');
        $('#id_new_password_retyped').val('');
    };

    var setupMozillaPersonaListeners = function () {
        navigator.id.watch({
            //loggedInUser: askbot.data.userEmail,
            onlogin: function (assertion) {
                var assertionElement = signin_form.find('input[name=persona_assertion]');
                assertionElement.val(assertion);
                provider_name_input.val('mozilla-persona');
                signin_form.submit();
                return false;
            }
        });
    };

    var activateGooglePlusBtn = function (btn) {
        //add id to button - so that the "render" call would find it
        btn.attr('id', 'google-plus-btn-id');
        //load script with the gplus button code
        var po = document.createElement('script');
        po.type = 'text/javascript';
        po.async = true;
        //the global function renderGooglePlusBtn defined above will activate the button
        po.src = 'https://apis.google.com/js/client:plusone.js?onload=renderGooglePlusBtn';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(po, s);
    };

    var setup_default_handlers = function () {

        setup_event_handlers(
            signin_page.find('input.openid-username'),
            start_login_with_extra_openid_token
        );

        setup_event_handlers(
            signin_page.find('input.openid-generic'),
            start_login_with_extra_openid_token
        );

        var mozillaPersonaBtn = signin_page.find('input.mozilla-persona');

        if (mozillaPersonaBtn.length) {
            var mozillaPersonaInitiated = false;
            var personaListener = function () {
                if (mozillaPersonaInitiated === false) {
                    setupMozillaPersonaListeners();
                    mozillaPersonaInitiated = true;
                }
                start_mozilla_persona_login();
                return false;
            };
            setup_event_handlers(
                signin_page.find('input.mozilla-persona'),
                personaListener
            );
        }

        setup_event_handlers(
            signin_page.find('input.oauth, input.oauth2, input.openid-direct, input.cas, input.discourse, input.oidc'),
            start_simple_login
        );

        setup_event_handlers(
            signin_page.find('input.password'),
            start_password_login_or_change
        );
        setup_event_handlers(
            signin_page.find('input.wordpress_site'),
            start_password_login_or_change
        );

        if (askbot.data.userIsAuthenticated) {
            read_existing_login_methods();
            setup_login_method_deleters();
        }
    };

    setup_default_handlers();
    init_password_login();
    clear_password_fields();
    return this;
};

