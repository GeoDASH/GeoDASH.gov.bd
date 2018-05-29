import tempfile
import os
import shutil
import requests
import logging
import psycopg2

from requests.auth import HTTPBasicAuth
from django.conf import settings
from geonode.layers.utils import file_upload
from geonode.geoserver.helpers import OGC_Servers_Handler
from geoserver.catalog import Catalog


logger = logging.getLogger("geonode.security.models")


def updateBoundingBox(layer):
    """
    This function sets bounding box for this layer to Bangladesh extent.

    :param layer:
    :param recalculate:
    :param bbox:
    :return:
    """

    ogc_server_settings = OGC_Servers_Handler(settings.OGC_SERVER)['default']
    url = ogc_server_settings.rest
    _user, _password = ogc_server_settings.credentials
    cat = Catalog(url, _user, _password)

    resource = cat.get_resource(layer.name, workspace=layer.workspace)
    resource.native_bbox = ('88.0105667114258', '92.6736602783204', '21.1280899047852', '26.6343994140626', 'EPSG:4326')
    cat.save(resource)
    layer.save()

    ## the following code was written to recalculate the bounding
    ## box of this layer according to data.

    # url = settings.OGC_SERVER['default']['LOCATION']
    # url += "rest/workspaces/"
    # url += layer.workspace
    # url += "/datastores/"
    # url += layer.store
    # url += "/featuretypes/"
    # url += layer.name
    # request_url = url + ".json"
    #
    # user = settings.OGC_SERVER['default']['USER']
    # passwd = settings.OGC_SERVER['default']['PASSWORD']
    #
    # headers = {'Content-type': 'application/json'}
    # req = requests.get(request_url, headers=headers, auth=HTTPBasicAuth(user, passwd))
    #
    # body_text = req.text
    # req.close()
    # if (req.status_code != 200):
    #     logger.warning("Could not GET GeoServer Rules for Layer " + str(layer.name))
    #     return req.status_code
    #
    # else:
    #     if recalculate:
    #         request_url = url + "?recalculate=nativebbox,latlonbbox"
    #     else:
    #         request_url = url
    #     if bbox:
    #         #not implemented yet.
    #         #replace bbox in the body_text with the given bbox
    #         pass
    #     credential = (user, passwd)
    #     update_req = requests.put(
    #         request_url,
    #         data=body_text,
    #         headers=headers,
    #         auth=credential
    #     )
    # if update_req.status_code == 200:
    #     layer.save()


def getShapeFileFromAttribute(attributes, name, layer_type, **kwargs):
    temp_csv_dir = tempfile.mkdtemp()  # temporary directory for creating .csv file
    temporary_file = open('%s/%s' % (temp_csv_dir, name + '.csv'), 'a+')
    content = ""
    for attr in attributes:
        content += attr['name'] + ','
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

    ogr2ogr_string = 'ogr2ogr -skipfailures -overwrite -f "ESRI Shapefile" "{0}" "{1}"'.format(temp_csv_dir, temp_vrt_path)

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


def changeDbFieldTypes(layer, attributes, **kwargs):
    """
    primarily all the columns of the saved_layer is character variyng
    now we should change column types according to given types
    this method below does this task
    :param attributes:
    :return:
    """

    ogc_server_settings = OGC_Servers_Handler(settings.OGC_SERVER)['default']
    db = ogc_server_settings.datastore_db
    conn = None
    port = str(db['PORT'])
    try:
        conn = psycopg2.connect(
            "dbname='" +
            db['NAME'] +
            "' user='" +
            db['USER'] +
            "'  password='" +
            db['PASSWORD'] +
            "' port=" +
            port +
            " host='" +
            db['HOST'] +
            "'")
        cur = conn.cursor()

        for attr in attributes:
            qstr = 'ALTER TABLE {0} ALTER COLUMN "{1}" type {2} USING ("{3}"::{4})'.format(layer.name, attr['name'], attr['type'],
                                                                                               attr['name'],
                                                                                               attr['type'])
            cur.execute(qstr)
            conn.commit()
        # qstr = 'ALTER TABLE {0} ALTER COLUMN "{1}" TYPE geometry(Geometry,4326)'.format(layer.name, 'the_geom')
        # cur.execute(qstr)
        # conn.commit()
    except Exception as e:
        logger.error(
            "Error deleting PostGIS table %s:%s",
            layer.name,
            str(e))
    finally:
        try:
            if conn:
                conn.close()
        except Exception as e:
            logger.error("Error closing PostGIS conn %s:%s", layer.name, str(e))


def reloadFeatureTypes(layer):
    ogc_server_settings = OGC_Servers_Handler(settings.OGC_SERVER)['default']
    url = ogc_server_settings.rest
    _user, _password = ogc_server_settings.credentials
    cat = Catalog(url, _user, _password)

    resource = cat.get_resource(layer.name, workspace=layer.workspace)
    resource.catalog.reload()

