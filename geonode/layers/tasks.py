import time
import os
import requests
import shutil
import logging
import hashlib


from django.core import serializers
from django.conf import settings
from django.core.mail import send_mail

try:
    import json
except ImportError:
    from django.utils import simplejson as json


from geonode.base.models import ResourceBase
from geonode.layers.models import Layer
from geonode.settings import MEDIA_ROOT
from geonode.groups.models import GroupProfile
from geonode.people.models import Profile



db_logger = logging.getLogger('db')
now = time.time()



from celery import shared_task


def backupOneLayer(layer, temdir):
    if layer.link_set.filter(name='Zipped Shapefile').exists():
        download_link = layer.link_set.get(name='Zipped Shapefile')
    else:
        return
    # download_link = layer.link_set.get(name='Zipped Shapefile')
    r = requests.get(download_link.url)
    zfile = open(temdir + '/' + layer.name + '.zip', 'wb')
    zfile.write(r.content)
    zfile.close()
    r.close()


@shared_task
def backupOrganizationLayersMetadata( host, user_id, organization_id):

    user = Profile.objects.get(id=user_id)
    # organization = GroupProfile.objects.filter(groupmember__user=user).first()
    organization = GroupProfile.objects.get(id=organization_id)

    layer_objects = Layer.objects.filter(group=organization)
    resource_base_objects = ResourceBase.objects.filter(group=organization)
    jsonSerializer = serializers.get_serializer("json")
    json_serializer = jsonSerializer()
    all_objects = list(layer_objects) + list(resource_base_objects)

    temdir = MEDIA_ROOT + '/backup/organization/' + organization.slug
    if not os.path.exists(temdir):
        os.makedirs(temdir)
    metadata_location = temdir + '/metadata.txt'
    with open(metadata_location, "w") as out:
        json_serializer.serialize(all_objects, stream=out)

    for l in layer_objects:
        backupOneLayer(l, temdir)

    send_mail_to_admin(host, organization, temdir, user)
    return '{} layers backed up with success!'.format(layer_objects.count())


def send_mail_to_admin(host, organization, temdir, user):
    hash_str = str(organization.slug) + "_" + str(now)

    zip_file_name = hashlib.sha224(hash_str).hexdigest()
    # zip_file_name += MEDIA_ROOT + '/backup/organization/'
    shutil.make_archive(MEDIA_ROOT + '/backup/organization/' + zip_file_name, 'zip', temdir)
    shutil.rmtree(temdir)
    org_download_link = "http://" +  host + "/uploaded/backup/organization/" + zip_file_name + ".zip"

    # Send email
    subject = 'Download Organizations Layers'
    from_email = settings.EMAIL_FROM
    recipient_list = [str(user.email)]  # str(request.user.email)
    html_message = "<a href='" + org_download_link + "'>Please go to the following link to download organizations layers:</a> <br/><br/><br/>" + org_download_link
    try:

        send_mail(subject=subject, message=html_message, from_email=from_email, recipient_list=recipient_list,
                  fail_silently=False, html_message=html_message)
    except Exception as e:
        # print e
        db_logger.exception(e)