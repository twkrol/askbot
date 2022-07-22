"""Class for deploying the celery.py file"""
import os
from askbot.deployment.deployers.file_deployer import FileDeployer

class InitPy(FileDeployer): #pylint: disable=missing-class-docstring
    template_path = 'deployment/templates/init_py.jinja2'

    def get_file_path(self):
        """Returns path to the manage.py file"""
        return os.path.join(self.params['proj_dir'], '__init__.py')
