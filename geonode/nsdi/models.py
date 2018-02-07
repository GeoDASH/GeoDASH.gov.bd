from django.db import models

# Create your models here.

class SectorModel(models.Model):
    """
    This model is for managing sectors. Only super-admin can
    manage this.
    """

    title = models.CharField(max_length=50, default='')
    slug = models.SlugField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)

    def __unicode__(self):
        return self.title


class DepartmentModel(models.Model):
    """
    This model is for managing Departments. Only super-admin can
    manage this.
    """

    title = models.CharField(max_length=50, default='')
    sector = models.ForeignKey(SectorModel, related_name='sector')
    slug = models.SlugField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)

    def __unicode__(self):
        return self.title
