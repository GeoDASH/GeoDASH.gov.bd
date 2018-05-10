

from django.conf import settings


NSDI_FRONT_END_SETTINGS = {
    'templates_base': {
        'invite_user': False,
        'backup_organization_layers':True,
        'manage_sector_dept_section_createOrg': True,
        'social_login':False,
        'administration_header_menu':True,
        'search_engine_title': 'NSDI',
        'navbar_css': settings.STATIC_URL + 'geonode/css/navbar-nsdi.css?'

    },
    'page_name2': {
        'button_name1': False,
        'button_name2': True
    }
}


GEODASH_FRONT_END_SETTINGS = {
    'templates_base': {
        'invite_user': True,
        'backup_organization_layers':False,
        'manage_sector_dept_section_createOrg': False,
        'social_login':True,
        'administration_header_menu':False,
        'search_engine_title': 'GeoDASH',
        'navbar_css': settings.STATIC_URL + 'geonode/css/navbar-geodash.css?'

    },
    'layer_detail_page': {
        'attributes': False,
        'button_name2': True
    }
}