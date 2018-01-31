from django.contrib import admin

# Register your models here.

from geonode.nsdi.models import SectorModel, DepartmentModel

admin.site.register(SectorModel)
admin.site.register(DepartmentModel)