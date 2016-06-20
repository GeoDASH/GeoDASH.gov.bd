from django.db import models
from django.utils.translation import ugettext_lazy as _

# Create your models here.

class SectionManagementTable(models.Model):
    """
    This model is for managing sections in index page. Only super-admin can
    manage this.
    """

    section = models.CharField(max_length=50, default='')
    is_visible = models.BooleanField(default=False)
