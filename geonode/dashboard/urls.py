from django.conf.urls import patterns, url
from django.views.generic import TemplateView

from geonode.workspace.views import MemberWorkspaceLayer
from geonode.dashboard.views import SliderImageList, SliderImageCreate, SliderImageUpdate, SliderImageDelete

urlpatterns = patterns(
    'geonode.dashboard.views',
    url(r'^section-management-table$', 'section_list', name='section-list-table'),
    url(r'^section-update$', 'section_update', name='section-update'),
    url(r'^_dashboard/?$', TemplateView.as_view(template_name='_dashboard.html'), name='_dashboard'),
    url(r'^_dashboard_grid/?$', TemplateView.as_view(template_name='_dashboard_grid.html'), name='_dashboard_grid'),
    url(r'^favourite_list/?$', TemplateView.as_view(template_name='favourite_list.html'), name='favourite_list'),
    url(r'^_featured_list/?$', TemplateView.as_view(template_name='_featured_list.html'), name='_featured_list'),


    #database backup and restore
    url(r'^database-backup/metadata$', 'metadatabackup', name='metadata-backup'),
    url(r'^database-backup/data$', 'databackup', name='data-backup'),


    #home page section management with image and texts
    url(r'^slider-image/list$', SliderImageList.as_view(), name='slider-image-list'),
    url(r'^slider-image/create$', SliderImageCreate.as_view(), name='slider-image-create'),
    url(r'^slider-image/(?P<image_pk>[0-9]+)/update$', SliderImageUpdate.as_view(), name='slider-image-update'),
    url(r'^slider-image/(?P<image_pk>[0-9]+)/delete$', SliderImageDelete.as_view(), name='slider-image-delete'),
    # url(r'^slider-image/(?P<news_pk>[0-9]+)/details$', NewsDetails.as_view(), name='news-details'),



)
