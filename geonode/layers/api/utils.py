import tempfile
import os
import shutil
import requests
import logging

from requests.auth import HTTPBasicAuth
from django.conf import settings
from geonode.layers.utils import file_upload


logger = logging.getLogger("geonode.security.models")


def updateBoundingBox(layer, recalculate=False, bbox=None):
    """
    This function updates, recalculates or sets new boundingbox for a layer.

    :param layer:
    :param recalculate:
    :param bbox:
    :return:
    """
    url = settings.OGC_SERVER['default']['LOCATION']
    url += "rest/workspaces/"
    url += layer.workspace
    url += "/datastores/"
    url += layer.store
    url += "/featuretypes/"
    url += layer.name
    request_url = url + ".json"

    user = settings.OGC_SERVER['default']['USER']
    passwd = settings.OGC_SERVER['default']['PASSWORD']


    headers = {'Content-type': 'application/json'}
    r = requests.get(request_url, headers=headers, auth=HTTPBasicAuth(user, passwd))

    body_text = r.text

    if (r.status_code != 200):
        logger.warning("Could not GET GeoServer Rules for Layer " + str(layer.name))
        return r.status_code
    else:
        if recalculate:
            request_url = url + "?recalculate=nativebbox,latlonbbox"
        else:
            request_url = url
        if bbox:
            #not implemented yet.
            #replace bbox in the body_text with the given bbox
            pass
        credential = (user, passwd)
        r = requests.put(
            request_url,
            data=body_text,
            headers=headers,
            auth=credential
        )
    if r.status_code == 200:
        layer.save()

def getShapeFileFromAttribute(attributes, name, layer_type, **kwargs):
    temp_csv_dir = tempfile.mkdtemp()  # temporary directory for creating .csv file
    temporary_file = open('%s/%s' % (temp_csv_dir, name + '.csv'), 'a+')
    content = ""
    for attr in attributes:
        content += attr + ','
    content = content[:-1]
    temporary_file.write(str(content))
    temporary_file.close()
    file_path = temporary_file.name

    temp_vrt_path = os.path.join(temp_csv_dir, "tempvrt.vrt")
    temp_vrt_file = open(temp_vrt_path, 'wt')
    vrt_string = """  <OGRVRTDataSource>
                                <OGRVRTLayer name="{0}">
                                    <SrcDataSource>{1}</SrcDataSource>
                                    <GeometryType>wkb{2}</GeometryType>
                                    <LayerSRS>WGS84</LayerSRS>
                                    <GeometryField encoding="WKT" field="geom"/>
                                </OGRVRTLayer>
                        </OGRVRTDataSource> """.format(name, file_path,layer_type)

    temp_vrt_file.write(vrt_string)

    temp_vrt_file.close()

    ogr2ogr_string = 'ogr2ogr -overwrite -f "ESRI Shapefile" "{0}" "{1}"'.format(temp_csv_dir, temp_vrt_path)

    os.system(ogr2ogr_string)

    files = os.listdir(temp_csv_dir)
    base_file = ""
    for f in files:
        if f.endswith('.shp'):
            base_file = temp_csv_dir + "/" + f
    return base_file, temp_csv_dir



def uploadLayer(base_file, name, user, category, group, keywords, title, **kwargs):
    saved_layer = file_upload(
                    base_file,
                    name=name,
                    user=user,
                    category=category,
                    group=group,
                    keywords=keywords,
                    overwrite=False,
                    title=title,
                    user_data_epsg=4326
                )
    if saved_layer:
        return saved_layer
    else:
        return False


