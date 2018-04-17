from geonode.geoserver.mixins import GeoServerMixin
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response


class GeoserverWMSGetFeatureInfoListAPIView(ListAPIView, GeoServerMixin):
    """
    This api will serve wms call of geoserver
    """
    
    def get(self, request, **kwargs):
        data = dict(request.query_params)
        layers = data.get('layers', [None])[0]

        if not layers:
            layers = data.get('LAYERS')[0]

        access_token = None
        if 'access_token' in request.session:
            access_token = request.session['access_token']
                
        query = self.get_configuration(data)
        result = dict()
        for layer_name in layers.split(','):
            attributes = self.getAttributesPermission(layer_name=layer_name)
            attributes.remove('the_geom')
            query.update(dict(SERVICE='WMS', 
                            REQUEST='GetFeatureInfo',
                            QUERY_LAYERS= layer_name,
                            LAYERS=layer_name,
                            access_token=access_token, 
                            propertyName=','.join(attributes)))
            result[layer_name] = self.get_response_from_geoserver('wms', query)
        
        response = dict()
        for k,v in result.items():
            if not response:
                response = v
            else:
                response['features'] += v['features']

        return Response(response, status=status.HTTP_200_OK)
