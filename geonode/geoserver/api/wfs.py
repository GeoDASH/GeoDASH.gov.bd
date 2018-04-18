import csv, StringIO, urllib, requests, json 
from geonode.geoserver.mixins import GeoServerMixin
from osgeo import ogr, osr
from rest_framework import status
from rest_framework.generics import ListAPIView, CreateAPIView
from rest_framework.response import Response

        
class GeoserverWFSListAPIView(ListAPIView, GeoServerMixin):
    """
    This api will serve wfs call of geoserver
    """
    
    def get(self, request, **kwargs):
        access_token = None
        if 'access_token' in request.session:
            access_token = request.session['access_token']
        data = dict(request.query_params, access_token=access_token)
        query = self.get_configuration(data)
        query.update(dict(SERVICE='WFS'))
        params = self.getAttributesPermission(data.get('typeNames', data.get('typeName', [None]))[0])
        if not kwargs.get('include_geometry', False):
             params.remove('the_geom')

        query.update(dict(propertyName=','.join(params)))
        
        result = self.get_response_from_geoserver('wfs', query)

        return Response(result, status=status.HTTP_200_OK)


class GeoserverCreateLayerByFeature(GeoServerMixin, CreateAPIView):
    """
    This api will serve create layer
    """

    def _get_param(self, geom_type, layer_title,organizationId, categoryId, permissions = None):      
        param =  {
                'permissions': json.dumps({} if permissions is None else permissions),
                'charset': 'UTF-8',
                'layer_title': layer_title,
                'category': categoryId,
                'organization': organizationId,
                'layer_type': 'csv',
            }
        if geom_type == 'Point':
            res = param.copy()
            res.update({
                'csv_layer_type': 'latlon',
                'longitude': 'longitude',
                'lattitude': 'latitude',
            })
            return res
        else:
            res = param.copy()
            res.update({
                'csv_layer_type': 'the_geom',
                'the_geom': 'geom',
            })
            return res



    def create_csv(self, result):
        geom_type = None
        for feature in result.get('features'):
            if 'geometry' in feature and 'properties' in feature:
                inSpatialRef = osr.SpatialReference()
                inSpatialRef.ImportFromEPSG(3857)

                outSpatialRef = osr.SpatialReference()
                outSpatialRef.ImportFromEPSG(4326)
                coordTransform = osr.CoordinateTransformation(inSpatialRef, outSpatialRef)
                geometry = feature.get('geometry')
                if geometry['type'] == 'Point':
                    geom_type =  geometry['type']
                    point =  ogr.CreateGeometryFromJson(json.dumps(geometry))
                    point.Transform(coordTransform)
                    feature['properties'].update(dict(longitude=point.GetX(), latitude=point.GetY()))
                else:
                    geom_type =  'Others'
                    geom = ogr.CreateGeometryFromJson(json.dumps(geometry))
                    geom.Transform(coordTransform)                    
                    feature['properties'].update(dict(geom=geom.ExportToWkt()))

        mem_file = StringIO.StringIO()

        csv_writer = csv.writer(mem_file, quoting=csv.QUOTE_ALL)

        features = [r.get('properties') for r in result.get('features')]
        keys = [k for k, v in features[0].items()]        
        values = [[v for k, v in f.items()] for f in features]
        csv_writer.writerows([keys] + values)

        return mem_file, geom_type

    def create_layer(self, csv, geom_type, layer_title, organizationId, categoryId, host, scheme='http', cookies = None):
        if not cookies:
            cookies = dict()

        files = {'base_file': ('base_file.csv', csv.getvalue(), 'application/octet-stream', {'Expires': '0'})}

        data = self._get_param(layer_title=layer_title, geom_type=geom_type, organizationId=organizationId,categoryId=categoryId)
        # import pdb;pdb.set_trace()
        url = "{0}://{1}/layers/upload".format(scheme, host)
        client = requests.get("{0}://{1}".format(scheme, host))

        csrftoken = client.cookies['csrftoken']

        cookies.update(dict(csrftoken=csrftoken))

        headers = {'X-CSRFToken': csrftoken }
        # import pdb;pdb.set_trace()
        response = requests.post(url, cookies=cookies, headers=headers, data=data, files=files)

        return json.loads(response.content)

    def post(self, request, **kwargs):
        data = request.data
        layer_title = None
        categoryId = None
        organizationId = None
        if 'layer_title' in data:
            layer_title = data['layer_title']
            del data['layer_title']
        if 'category' in data:
            categoryId = data['category']
            del data['category']
        if 'organization' in data:
            organizationId = data['organization']
            del data['organization']  
            
        query = self.get_configuration(data)

        access_token = None
        if 'access_token' in request.session:
            access_token = request.session['access_token']

        query.update(dict(SERVICE='WFS', access_token=access_token))
        result = self.get_response_from_geoserver('wfs', query)
        mem_file, geom_type = self.create_csv(result)
        
        response = self.create_layer(csv=mem_file,
                                    geom_type=geom_type,
                                    layer_title=layer_title, 
                                    categoryId=categoryId,
                                    organizationId=organizationId,
                                    host=request.META.get('HTTP_HOST'), 
                                    scheme=request.scheme, 
                                    cookies=request.COOKIES)

        return Response(response, status=status.HTTP_200_OK)
