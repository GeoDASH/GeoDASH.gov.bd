import tempfile
import os
import shutil

from django.http import HttpResponse
try:
    import json
except ImportError:
    from django.utils import simplejson as json
from tastypie.resources import Resource
from django.contrib.gis.db import models
from django.db import transaction, IntegrityError, DatabaseError


from geonode.class_factory import ClassFactory
from geonode.layers.models import Layer
from geonode.layers.utils import file_upload
from geonode.groups.models import GroupProfile


class LayerFeatureUploadView(Resource):
    '''
    This API class receives a layer feature as json input
    and processes that feature to upload to postgis database
    directly to the specified layer.
    '''

    class Meta:
        resource_name = 'layer-feature-upload'
        list_allowed_methods = ['post']


    def dispatch(self, request_type, request, **kwargs):
        if request.method == 'POST':
            out = {'success': False}
            layer_id = json.loads(request.body).get('layer_id')
            if request.user.is_authenticated():
                try:
                    layer = Layer.objects.get(id=layer_id)
                except Layer.DoesNotExist:
                    out['success'] = False
                    out['errors'] = "Layer Does not exist with this id"
                    status_code = 301
                else:
                    extra_field = {'USER-DEFINED': models.GeometryField}
                    factory = ClassFactory(extra_field)
                    model_instance = factory.get_model(name=str(layer.title_en), table_name=str(layer.name),
                                                       db=str(layer.store))

                    try:
                        with transaction.atomic(using=str(layer.store)):
                            features = json.loads(request.body).get('features')
                            for feature in features:
                                obj = model_instance(**feature)
                                obj.save()

                    except Exception as ex:
                        out['success'] = False
                        out['error'] = ex.message
                        status_code = 400
                    else:
                        out['success'] = True
                        status_code = 200

            else:
                out['error'] = 'Access denied'
                out['success'] = False
                status_code = 401

            return HttpResponse(json.dumps(out), content_type='application/json', status=status_code)



class CreateFeaturedLayer(Resource):
    '''
    This API class receives a json string with a layer
    credentials and attributes for a feature and
    creates an empty layer without any vector data and
    only with attributes and sends layer id in response.
    '''

    class Meta:
        resource_name = 'create-featured-layer'
        list_allowed_methods = ['post']


    def dispatch(self, request_type, request, **kwargs):
        if request.method == 'POST':
            out = {'success': False}
            layer_title = json.loads(request.body).get('layer_title')
            layer_name = json.loads(request.body).get('layer_name')
            category = json.loads(request.body).get('category')
            organization_id = json.loads(request.body).get('organization')
            group = GroupProfile.objects.get(id=organization_id)
            attributes = json.loads(request.body).get('attributes')
            layer_type = json.loads(request.body).get('layer_type') #point,multilinestring,multipolygone
            keywords = []
            if layer_title is not None and len(layer_title) > 0:
                keywords = layer_title.split()

            if request.user.is_authenticated():
                base_file, tempdir = getShapeFileFromAttribute(attributes, layer_name, layer_type)
                saved_layer = uploadLayer(base_file, layer_name, request.user, category, group, keywords, layer_title)
                if saved_layer:
                    out['success'] = True
                    status_code = 200
                else:
                    out['success'] = False
                    out['error'] = "Can not create layer with provided credentials"
                    status_code = 400

                if tempdir is not None:
                    shutil.rmtree(tempdir)

            else:
                out['error'] = 'Access denied'
                out['success'] = False
                status_code = 400

            return HttpResponse(json.dumps(out), content_type='application/json', status=status_code)




def getShapeFileFromAttribute(attributes, layername, layer_type):
    temp_csv_dir = tempfile.mkdtemp()  # temporary directory for creating .csv file
    temporary_file = open('%s/%s' % (temp_csv_dir, layername + '.csv'), 'a+')
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
                                <OGRVRTLayer name="222ogr_vrt_layer_name222">
                                    <SrcDataSource>000path_to_the_imported_csv_file000</SrcDataSource>
                                    <GeometryType>layerType</GeometryType>
                                    <LayerSRS>WGS84</LayerSRS>
                                    <GeometryField encoding="WKT" field="111the_field_name_geom_for_csv111"/>
                                </OGRVRTLayer>
                        </OGRVRTDataSource> """

    vrt_string = vrt_string.replace("222ogr_vrt_layer_name222", layername)
    vrt_string = vrt_string.replace("000path_to_the_imported_csv_file000", file_path)
    vrt_string = vrt_string.replace("111the_field_name_geom_for_csv111", "geom")
    vrt_string = vrt_string.replace("layerType", "wkb" + layer_type)
    temp_vrt_file.write(vrt_string)

    temp_vrt_file.close()
    ogr2ogr_string = 'ogr2ogr -overwrite -f "ESRI Shapefile" '
    ogr2ogr_string = ogr2ogr_string + '"' + temp_csv_dir + '"' + ' ' + '"' + temp_vrt_path + '"'

    os.system(ogr2ogr_string)

    files = os.listdir(temp_csv_dir)
    base_file = ""
    for f in files:
        if f.endswith('.shp'):
            base_file = temp_csv_dir + "/" + f
    return base_file, temp_csv_dir



def uploadLayer(base_file, name, user, category, group, keywords, title):
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


