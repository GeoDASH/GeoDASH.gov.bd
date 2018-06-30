# rest_framework api
import views

from django.conf.urls import url


urlpatterns =[
    url(r'^(?P<pk>[0-9]+)/layer-feature-upload$', views.LayerFeatureUploadView.as_view()),
    url(r'^create-featured-layer$', views.CreateFeaturedLayer.as_view()),
    url(r'^approve-multiple-layers/$', views.MultipleLayersApproveAPIView.as_view()),
]
