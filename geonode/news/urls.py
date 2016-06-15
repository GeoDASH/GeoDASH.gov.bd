from django.conf.urls import patterns, url


urlpatterns = patterns(
    'geonode.news.views',

    url(r'^create$', 'news_create', name='news-create'),
    url(r'^list$', 'news_lsit', name='news-list'),
    url(r'^(?P<news_pk>[0-9]+)/details$', 'news_details', name='news-details'),

)