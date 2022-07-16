"""Group settings"""
from django.utils.translation import ugettext_lazy as _
from askbot.conf.settings_wrapper import settings
from askbot.conf.super_groups import LOGIN_USERS_COMMUNICATION
from livesettings import values as livesettings

GROUP_SETTINGS = livesettings.ConfigurationGroup(
    'GROUP_SETTINGS',
    _('Group settings'),
    super_group=LOGIN_USERS_COMMUNICATION
)

settings.register(
    livesettings.BooleanValue(
        GROUP_SETTINGS,
        'GROUPS_ENABLED',
        default=False,
        description=_('Enable user groups'),
    )
)

def group_name_update_callback(old_name, new_name):
    from askbot.models.tag import clean_group_name #pylint: disable=import-outside-toplevel
    from askbot.models import Group #pylint: disable=import-outside-toplevel
    cleaned_new_name = clean_group_name(new_name.strip())

    if new_name == '':
        #name cannot be empty
        return old_name

    global_group = Group.objects.get_global_group()

    if cleaned_new_name == global_group.name:
        # name did not change
        return old_name

    if Group.objects.filter(name=cleaned_new_name).exists():
        #name already taken
        return old_name

    global_group.name = cleaned_new_name
    global_group.save()
    return new_name


settings.register(
    livesettings.StringValue(
        GROUP_SETTINGS,
        'GLOBAL_GROUP_NAME',
        default=_('everyone'),
        description=_('Global user group name'),
        help_text=_('All users belong to this group automatically'),
        update_callback=group_name_update_callback
    )
)

settings.register(
    livesettings.BooleanValue(
        GROUP_SETTINGS,
        'GROUP_EMAIL_ADDRESSES_ENABLED',
        default=False,
        description=_('Enable group email addresses'),
        help_text=_('If selected, users can post to groups by email '
                    '"group-name@domain.com"')
    )
)
