"""Fixes Post.offensive_flag_count based on the Activity records"""
from django.core.management.base import BaseCommand
from django.contrib.contenttypes.models import ContentType
from askbot import const
from askbot.models import Activity, Post
from askbot.utils.console import ProgressBar

class Command(BaseCommand):

    def handle(self, *args, **kwargs): #pylint: disable=unused-argument
        """Iterates through posts and makes Postoffensive_flag_count
        equal the count of Activity objects of corresponding type"""
        filters = {'content_type': ContentType.objects.get_for_model(Post),
                   'activity_type': const.TYPE_ACTIVITY_MARK_OFFENSIVE}
        posts = Post.objects.all()
        bad_count = 0
        for post in ProgressBar(posts.iterator(), posts.count(), 'Fixing flag post counts'):
            filters['object_id'] = post.pk
            real_count = Activity.objects.filter(**filters).count()
            if post.offensive_flag_count != real_count:
                bad_count += 1
                Post.objects.filter(pk=post.pk).update(offensive_flag_count=real_count)

        print(f'{bad_count} posts had incorrect denormalized count of flags')
