from django.db import models
from django.utils.translation import ugettext_lazy as _

# Create your models here.

class SectionManagementTable(models.Model):
    """
    This model is for managing sections in index page. Only super-admin can
    manage this.
    """

    section = models.CharField(max_length=50, default='')
    is_visible = models.BooleanField(default=True)


class SliderImages(models.Model):
    """
    This model is for slider images management
    """
    title = models.CharField(max_length=100)
    descripton = models.TextField(max_length=300)
    is_visible = models.BooleanField(default=False, verbose_name=_('Add to slider'))
    image = models.ImageField(help_text=_('Image dimension (w * h = 220 * 600)'))
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)

