

from django.forms import ModelForm
from geonode.nsdi.models import SectorModel, DepartmentModel


class SectorForm(ModelForm):
    class Meta:
        model = SectorModel
        fields = ('title',)


class DepartmentForm(ModelForm):
    class Meta:
        model = DepartmentModel
        fields = ('sector', 'title')

