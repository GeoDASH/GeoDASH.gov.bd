

from django.conf import settings


NSDI_FRONT_END_SETTINGS = {
    'templates_base': {
        'invite_user': False,
        'backup_organization_layers':True,
        'manage_sector_dept_section_createOrg': True,
        'social_login':False,
        'administration_header_menu':True,
        'search_engine_title': 'NSDI',
        'navbar_css': settings.STATIC_URL + 'static/navbar-nsdi.css?'

    },
    'layer_detail_page': {
        'attributes': False,
        'button_name2': True
    },
    'member_workspace_layer_page': {
        'edit_layer': True,
        'button_name2': True
    },
    'attribute_permission' : True,
    'register' : False,
    'add_version' : True
}


GEODASH_FRONT_END_SETTINGS = {
    'templates_base': {
        'invite_user': True,
        'backup_organization_layers':True,
        'manage_sector_dept_section_createOrg': False,
        'social_login':False,
        'administration_header_menu':False,
        'search_engine_title': 'GeoDASH',
        'navbar_css': settings.STATIC_URL + 'geonode/css/navbar-geodash.css?'

    },
    'layer_detail_page': {
        'attributes': True,
        'button_name2': True
    },
    'member_workspace_layer_page': {
        'edit_layer': False,
        'button_name2': True
    },
    'attribute_permission' : False,
    'register' : True,
    'add_version' : False
}