# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('groups', '0007_auto_20180623_1900'),
    ]

    operations = [
        migrations.AlterField(
            model_name='groupprofile',
            name='slug',
            field=models.SlugField(unique=True, max_length=550),
        ),
        migrations.AlterField(
            model_name='groupprofile',
            name='title',
            field=models.CharField(max_length=500, verbose_name='Title'),
        ),
    ]
