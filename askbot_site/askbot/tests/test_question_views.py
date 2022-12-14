from bs4 import BeautifulSoup
from django.test import override_settings as override_django_settings
from askbot.conf import settings as askbot_settings
from askbot import const
from askbot.tests.utils import AskbotTestCase
from askbot import models
from django.urls import reverse

class PrivateQuestionViewsTests(AskbotTestCase):

    def setUp(self):
        self._backup = askbot_settings.GROUPS_ENABLED
        everyone = models.Group.objects.get_global_group()
        everyone.can_post_questions = True
        everyone.can_post_answers = True
        everyone.can_post_comments = True
        askbot_settings.update('GROUPS_ENABLED', True)
        self.user = self.create_user('user')
        self.group = models.Group.objects.create(
                        name='the group',
                        openness=models.Group.OPEN,
                        can_post_questions=True,
                        can_post_answers=True,
                        can_post_comments=True
                    )
        self.user.join_group(self.group)
        self.qdata = {
            'title': 'test question title',
            'text': 'test question text'
        }
        self.client.login(user_id=self.user.id, method='force')

    def tearDown(self):
        askbot_settings.update('GROUPS_ENABLED', self._backup)

    @override_django_settings(ASKBOT_LANGUAGE_MODE='single-lang')
    def test_post_private_question(self):
        data = self.qdata
        data['post_privately'] = 'checked'
        response1 = self.client.post(reverse('ask'), data=data)
        response2 = self.client.get(response1['location'])
        dom = BeautifulSoup(response2.content, 'html5lib')
        title = dom.find('h1').text
        self.assertTrue(str(const.POST_STATUS['private']) in title)
        question = models.Thread.objects.get()
        self.assertEqual(question.title, self.qdata['title'])
        self.assertFalse(models.Group.objects.get_global_group() in set(question.groups.all()))

        #private question is not accessible to unauthorized users
        self.client.logout()
        response = self.client.get(question._question_post().get_absolute_url())
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.content, b'')
        #private question link is not shown on the main page
        #to unauthorized users
        response = self.client.get(reverse('questions'))
        self.assertFalse(self.qdata['title'] in str(response.content))
        #private question link is not shown on the poster profile
        #to the unauthorized users
        response = self.client.get(self.user.get_profile_url())
        self.assertFalse(self.qdata['title'] in str(response.content))

    def test_publish_private_question(self):
        question = self.post_question(user=self.user, is_private=True)
        title = question.thread.get_title()
        self.assertTrue(str(const.POST_STATUS['private']) in title)
        response2 = self.client.get(question.get_absolute_url())
        dom = BeautifulSoup(response2.content, 'html5lib')
        h1 = dom.find('h1')
        title = h1.find('div', {'class': 'js-editable-content'}).text
        self.assertFalse(models.Group.objects.get_global_group() in set(question.groups.all()))

        self.client.post(
            reverse('publish_post'),
            data={'post_id': question.id},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )

        question = self.reload_object(question)
        #self.assertTrue(str(const.POST_STATUS['private']) not in question.thread.get_title())
        self.assertEqual(question.is_private(), False)

        self.client.logout()
        response = self.client.get(question.get_absolute_url())
        self.assertEqual(response.status_code, 200)

    @override_django_settings(ASKBOT_LANGUAGE_MODE='single-lang')
    def test_privatize_public_question(self):
        question = self.post_question(user=self.user)
        title = question.thread.get_title()
        self.assertFalse(str(const.POST_STATUS['private']) in title)

        self.user.set_status('d')
        self.user.save()
        response = self.client.post(
            reverse('publish_post'),
            data={'post_id': question.id},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )

        response = self.client.get(question.get_absolute_url())
        dom = BeautifulSoup(response.content, 'html5lib')
        title = dom.find('h1').text
        self.assertFalse(models.Group.objects.get_global_group() in set(question.groups.all()))
        self.assertTrue(str(const.POST_STATUS['private']) in title)

    @override_django_settings(ASKBOT_LANGUAGE_MODE='single-lang')
    def private_question_has_publish_button(self):
        question = self.post_question(user=self.user, is_private=True)
        response = self.client.get(question.get_absolute_url())
        dom = BeautifulSoup(response.content, 'html5lib')
        btn = dom.select(f'#js-post-publish-btn-{question.id}')
        self.assertEqual(len(btn), 1)
        self.assertTrue('js-publish-post' in btn[0]['class'])

    @override_django_settings(ASKBOT_LANGUAGE_MODE='single-lang')
    def test_public_question_has_unpublish_button(self):
        question = self.post_question(user=self.user)
        response = self.client.get(question.get_absolute_url())
        dom = BeautifulSoup(response.content, 'html5lib')
        btn = dom.select(f'#js-post-publish-btn-{question.id}')
        self.assertEqual(len(btn), 1)
        self.assertTrue('js-unpublish-post' in btn[0]['class'])


class PrivateAnswerViewsTests(AskbotTestCase):

    def setUp(self):
        self._backup = askbot_settings.GROUPS_ENABLED
        askbot_settings.update('GROUPS_ENABLED', True)
        everyone = models.Group.objects.get_global_group()
        everyone.can_post_questions = True
        everyone.can_post_answerss = True
        everyone.can_post_comments = True
        everyone.save()
        self.user = self.create_user('user')
        group = models.Group.objects.create(
            name='the group',
            openness=models.Group.OPEN,
            can_post_questions=True,
            can_post_answers=True,
            can_post_comments=True
        )
        self.user.join_group(group)
        self.question = self.post_question(user=self.user)
        self.client.login(user_id=self.user.id, method='force')

    def tearDown(self):
        askbot_settings.update('GROUPS_ENABLED', self._backup)

    def test_post_private_answer(self):
        response1 = self.client.post(
            reverse('answer', kwargs={'id': self.question.id}),
            data={'text': 'some answer text', 'post_privately': 'checked'}
        )
        answer = self.question.thread.get_answers(user=self.user)[0]
        self.assertFalse(models.Group.objects.get_global_group() in set(answer.groups.all()))
        self.client.logout()

        user2 = self.create_user('user2')
        self.client.login(user_id=user2.id, method='force')
        response = self.client.get(self.question.get_absolute_url())
        self.assertFalse(b'some answer text' in response.content)

        self.client.logout()
        response = self.client.get(self.question.get_absolute_url())
        self.assertFalse(b'some answer text' in response.content)

    def test_private_checkbox_is_on_when_editing_private_answer(self):
        answer = self.post_answer(
            question=self.question, user=self.user, is_private=True
        )
        response = self.client.get(
            reverse('edit_answer', kwargs={'id': answer.id})
        )
        dom = BeautifulSoup(response.content, 'html5lib')
        checkbox = dom.find(
            'input', attrs={'type': 'checkbox', 'name': 'post_privately'}
        )
        self.assertTrue(checkbox.has_attr('checked'))

    def test_privaet_checkbox_is_off_when_editing_public_answer(self):
        answer = self.post_answer(question=self.question, user=self.user)
        response = self.client.get(
            reverse('edit_answer', kwargs={'id': answer.id})
        )
        dom = BeautifulSoup(response.content, 'html5lib')
        checkbox = dom.find(
            'input', attrs={'type': 'checkbox', 'name': 'post_privately'}
        )
        self.assertEqual(checkbox.get('checked', False), False)

    def test_publish_private_answer(self):
        answer = self.post_answer(
            question=self.question, user=self.user, is_private=True
        )
        self.client.post(
            reverse('edit_answer', kwargs={'id': answer.id}),
            data={'text': 'edited answer text', 'select_revision': 'false'}
        )
        answer = self.reload_object(answer)
        self.assertTrue(models.Group.objects.get_global_group() in answer.groups.all())
        self.client.logout()
        response = self.client.get(self.question.get_absolute_url())
        self.assertIn(b'edited answer text', response.content)


    def test_privatize_public_answer(self):
        answer = self.post_answer(question=self.question, user=self.user)
        self.client.post(
            reverse('edit_answer', kwargs={'id': answer.id}),
            data={
                'text': 'edited answer text',
                'post_privately': 'checked',
                'select_revision': 'false'
            }
        )
        #check that answer is not visible to the "everyone" group
        answer = self.reload_object(answer)
        self.assertFalse(models.Group.objects.get_global_group() in answer.groups.all())
        #check that countent is not seen by an anonymous user
        self.client.logout()
        response = self.client.get(self.question.get_absolute_url())
        self.assertFalse(b'edited answer text' in response.content)
