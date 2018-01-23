# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('groups', '__first__'),
        ('people', '0002_profile_occupation'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='section',
            field=models.ForeignKey(related_name='section', to='groups.SectionModel', null=True),
        ),
    ]
