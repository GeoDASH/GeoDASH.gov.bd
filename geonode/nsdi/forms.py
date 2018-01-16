

from django.forms import ModelForm
from geonode.nsdi.models import SectorModel, DepartmentModel


class SectorForm(ModelForm):
    class Meta:
        model = SectorModel
        fields = ('title', 'slug',)


class DepartmentForm(ModelForm):
    class Meta:
        model = DepartmentModel
        fields = ('title', 'slug', 'sector')

