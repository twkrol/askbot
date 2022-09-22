from django.core.management.base import BaseCommand
from askbot.utils.console import get_yes_or_no, ProgressBar
from askbot.models import Post

ARE_YOU_SURE_MESSAGE = 'All posts html will be rerendered, are you sure to proceed?'

class Command(BaseCommand): #pylint: disable=missing-class-docstring
    help = "Rerenders all posts"

    def handle(self, *args, **kwargs): #pylint: disable=missing-docstring, unused-argument
        if kwargs['verbosity'] > 0:
            response = get_yes_or_no(ARE_YOU_SURE_MESSAGE)
            if response == 'no':
                return

        posts = Post.objects.all()
        count = posts.count()
        message = "Rendering posts"
        for post in ProgressBar(posts.iterator(), count, message):
            try:
                post.render()
                post.save()
            except Exception as error: #pylint: disable=broad-except
                print(f'could not render post {post.id}, {error}')
