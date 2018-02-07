from django.shortcuts import render

# Create your views here.

from django.http import HttpResponse
from django.views.generic import TemplateView,ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from django.core.urlresolvers import reverse_lazy
from django.core.urlresolvers import reverse
from geonode.nsdi.forms import SectorForm, DepartmentForm

from geonode.nsdi.models import SectorModel, DepartmentModel


#CRUD for Sector
class SectorList(ListView):

    template_name = 'sector_list.html'
    model = SectorModel

    def get_queryset(self):
        return SectorModel.objects.all()


class SectorCreate(CreateView):

    template_name = 'sector_create.html'
    model = SectorModel
    form_class = SectorForm

    def get_success_url(self):
        return reverse('sector_list')


class SectorUpdate(UpdateView):
    template_name = 'sector_create.html'
    model = SectorModel
    form_class = SectorForm

    def get_object(self):
        return SectorModel.objects.get(pk=self.kwargs['sector_pk'])

    def get_success_url(self):
        return reverse('sector_list')


class SectorDelete(DeleteView):
    template_name = 'sector_delete.html'
    model = SectorModel

    def get_success_url(self):
        return reverse('sector_list')

    def get_object(self):
        return SectorModel.objects.get(pk=self.kwargs['sector_pk'])


#CRUD for Department
class DepartmentList(ListView):

    template_name = 'department_list.html'
    model = DepartmentModel

    def get_queryset(self):
        return DepartmentModel.objects.all()


class DepartmentCreate(CreateView):

    template_name = 'department_create.html'
    model = DepartmentModel
    form_class = DepartmentForm

    def get_success_url(self):
        return reverse('department_list')


class DepartmentUpdate(UpdateView):
    template_name = 'department_create.html'
    model = DepartmentModel
    form_class = DepartmentForm

    def get_object(self):
        return DepartmentModel.objects.get(pk=self.kwargs['department_pk'])

    def get_success_url(self):
        return reverse('department_list')


class DepartmentDelete(DeleteView):
    template_name = 'department_delete.html'
    model = DepartmentModel

    def get_success_url(self):
        return reverse('department_list')

    def get_object(self):
        return DepartmentModel.objects.get(pk=self.kwargs['department_pk'])
