# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0002_servicelayer_layer'),
    ]

    operations = [
        migrations.AlterField(
            model_name='webserviceharvestlayersjob',
            name='service',
            field=models.OneToOneField(to='services.Service'),
        ),
    ]
