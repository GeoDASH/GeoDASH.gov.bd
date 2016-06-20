from django.conf.urls import patterns, url

from geonode.workspace.views import MemberWorkspaceLayer

urlpatterns = patterns(
    'geonode.dashboard.views',
    url(r'^section-management-table$', 'section_list', name='section-list-table'),
    url(r'^section-update$', 'section_update', name='section-update'),


)
