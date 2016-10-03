from django.conf.urls import patterns, url
from django.views.generic import TemplateView

from geonode.workspace.views import MemberWorkspaceLayer

urlpatterns = patterns(
    'geonode.dashboard.views',
    url(r'^section-management-table$', 'section_list', name='section-list-table'),
    url(r'^section-update$', 'section_update', name='section-update'),
    url(r'^_dashboard/?$', TemplateView.as_view(template_name='_dashboard.html'), name='_dashboard'),
    url(r'^favourite_list/?$', TemplateView.as_view(template_name='favourite_list.html'), name='favourite_list'),
    url(r'^_featured_list/?$', TemplateView.as_view(template_name='_featured_list.html'), name='_featured_list'),


    #database backup and restore
    url(r'^database-backup/metadata$', 'metadatabackup', name='metadata-backup'),
    url(r'^database-backup/data$', 'databackup', name='data-backup'),



)
