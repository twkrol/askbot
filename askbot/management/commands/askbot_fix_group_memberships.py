"""Management command that fixes broken group membership records"""
from django.contrib.auth.models import Group as AuthGroup
from django.core.management.base import BaseCommand
from askbot.conf import settings as askbot_settings
from askbot.models import User, Group
from askbot.utils.console import ProgressBar

class Command(BaseCommand): # pylint: disable=missing-class-docstring
    askbot_groups_cache = {}

    @classmethod
    def get_or_create_group_by_name(cls, group_name):
        """Returns Askbot group with given name.
        If group is missing, creates it, with the default Askbot group settings.
        Assumes that the auth group with this name exists.
        """
        if group_name in cls.askbot_groups_cache:
            return cls.askbot_groups_cache[group_name]

        try:
            group = Group.objects.get(name=group_name)
        except Group.DoesNotExist: #pylint: disable=no-member
            auth_group = AuthGroup.objects.get(name=group_name)
            group = Group(group_ptr=auth_group)
            group.save()

        cls.askbot_groups_cache[group_name] = group
        return group

    def handle(self, *args, **kwargs): #pylint: disable=unused-argument
        """Joins all users to default groups.
        For all users compares Askbot group memberships with `contrib.auth` group memberships,
        if Askbot group is missing, creates it, then joins users to those groups.
        """
        #users without personal or everyone
        users = User.objects.exclude(groups__name__startswith='_personal_')
        users = users | User.objects.exclude(groups__name=askbot_settings.GLOBAL_GROUP_NAME)
        print(f'{users.count()} users without global or personal groups')
        for user in users:
            user.join_default_groups()

        message = 'Searching for discrepancies in Askbot with contrib.auth user group memberships'
        count = 0
        total_count = User.objects.count()
        for user in ProgressBar(User.objects.all().iterator(), total_count, message=message):
            django_group_names = set(user.groups.all().values_list('name', flat=True))
            askbot_group_names = set(user.get_groups().values_list('name', flat=True))
            missing_group_names = django_group_names - askbot_group_names
            count += int(bool(missing_group_names))
            for group_name in missing_group_names:
                askbot_group = self.get_or_create_group_by_name(group_name)
                user.join_group(askbot_group, force=True)

        print(f'Found {count} users with this issue')
