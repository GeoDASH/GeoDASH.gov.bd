import tempfile
import os

from django.http import HttpResponse
from django.http import Http404

from geonode import local_settings


# Create your views here.

def metadatabackup(request):
    """
    This view is for database metadata backup.
    Only super admin can do the job
    :return:
    """
    if request.user.is_superuser:
        database_name = local_settings.DATABASES['default']['NAME']
        database_user = local_settings.DATABASES['default']['USER']
        database_password = local_settings.DATABASES['default']['PASSWORD']
        database_host = local_settings.DATABASES['default']['HOST']
        database_port = local_settings.DATABASES['default']['PORT']


        tempdir = tempfile.mkdtemp()
        #command_string = 'echo ' + sudo_pass + ' | sudo -S  -u postgres -i pg_dump -c -Fc ' + database_name +' > ' + tempdir + '/metadata.backup'
        command_string = 'pg_dump -h' + database_host + ' -p' + database_port + ' -U' + database_user + ' -c -Fc -w ' +\
                         database_name + ' > ' + tempdir +'/metadata.backup'
        os.putenv("PGPASSWORD", database_password)
        os.system(command_string)
        file_path = tempdir + '/metadata.backup'
        fsock = open(file_path,"rb")
        response = HttpResponse(fsock, content_type='application/octet-stream')
        response['Content-Disposition'] = 'attachment; filename=metadata.backup'
        return response
    else:
        raise Http404("You dont have permission")


def databackup(request):
    """
    This view is for database data backup.
    Only super admin can do the job
    :return:
    """
    if request.user.is_superuser:
        database_name = local_settings.DATABASES['datastore']['NAME']
        database_user = local_settings.DATABASES['datastore']['USER']
        database_password = local_settings.DATABASES['datastore']['PASSWORD']
        database_host = str(local_settings.DATABASES['datastore']['HOST'])
        database_port = str(local_settings.DATABASES['datastore']['PORT'])

        tempdir = tempfile.mkdtemp()
        command_string = 'pg_dump -h' + database_host + ' -p' + database_port + ' -U' + database_user + ' -c -Fc -w ' +\
                         database_name + ' > ' + tempdir +'/data.backup'
        #command_string = 'echo ' + sudo_pass + ' | sudo -S  -u postgres -i pg_dump -c -Fc ' + database_name +' > ' + tempdir + '/data.backup'
        os.putenv("PGPASSWORD", database_password)
        os.system(command_string)
        file_path = tempdir + '/data.backup'
        fsock = open(file_path,"rb")
        response = HttpResponse(fsock, content_type='application/octet-stream')
        response['Content-Disposition'] = 'attachment; filename=data.backup'
        return response
    else:
        raise Http404('You dont have permission')









