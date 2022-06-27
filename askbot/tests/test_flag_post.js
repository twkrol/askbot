from django.contrib.contenttypes.models import ContentType
from askbot import const
from askbot.conf import settings as askbot_settings
from askbot.models import Activity
from askbot.tests.test_db_api import DBApiTestsBase

class FlagPostTests(DBApiTestsBase):

    def test_flag_question(self):
        self.user.set_status('m')
        self.user.flag_post(self.question)
        self.assertEqual(
            self.user.get_flags().count(),
            1
        )

    def test_flag_answer(self):
        self.post_answer()
        self.user.set_status('m')
        self.user.flag_post(self.answer)
        self.assertEqual(self.user.get_flags().count(), 1)


    def test_flag_and_unflag_question(self):
        admin = self.create_user('admin', status='d')
        profile = self.user.get_localized_profile()
        profile.reputation = askbot_settings.MIN_REP_TO_FLAG_OFFENSIVE + 1
        profile.save()
        user = self.reload_object(self.user)

        flags = Activity.objects.filter(object_id=self.question.id,
                                        content_type=ContentType.objects.get_for_model(self.question),
                                        activity_type=const.TYPE_ACTIVITY_MARK_OFFENSIVE)
        self.assertEqual(flags.count(), 0)

        user.flag_post(self.question)

        admin.flag_post(self.question)
        admin.flag_post(self.question, cancel=True)
        admin.flag_post(self.question, cancel=True)
        q = self.reload_object(self.question)
        self.assertEqual(q.offensive_flag_count, 0)
        flags = Activity.objects.filter(object_id=q.id,
                                        content_type=ContentType.objects.get_for_model(q),
                                        activity_type=const.TYPE_ACTIVITY_MARK_OFFENSIVE)
        self.assertEqual(flags.count(), 0)
