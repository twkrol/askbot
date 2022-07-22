"""Class for deploying the celery.py file"""
import os
from askbot.deployment.deployers.file_deployer import FileDeployer

class CeleryPy(FileDeployer): #pylint: disable=missing-class-docstring
    template_path = 'deployment/templates/celery_py.jinja2'

    def get_file_path(self):
        """Returns path to the manage.py file"""
        return os.path.join(self.params['proj_dir'], 'celery.py')

    def get_template_parameters(self):
        """Returns parameters for the manage.py file"""
        proj_name = os.path.basename(self.params['proj_dir'])
        return {'settings_module_path': f'{proj_name}.settings',
                'proj_name': proj_name}
