from django.db import connections
from django.conf import settings


class InformationSchemaColumns:
    _KEYS = ['column_name', 'is_nullable', 'data_type', 'character_maximum_length']
    column_name = None
    is_nullable = None
    data_type = None
    character_maximum_length = None
    def __init__(self, *args, **kwargs):
        self.column_name = kwargs.get('column_name', '')
        self.is_nullable =  kwargs.get('is_nullable', 'YES')
        self.data_type = kwargs.get('data_type', None)
        self.character_maximum_length = kwargs.get('character_maximum_length', None)
    
    @property
    def is_null(self):
        return True if self.is_nullable == 'YES' else False

    def keys(self):
        return self._KEYS

    def __getitem__(self, key):
        return getattr(self, key)


class Database(object):
    '''
    This class will handle db connection
    '''
    TABLE_SCHEMA_INFO_QUERY = "SELECT %s FROM information_schema.columns WHERE TABLE_NAME = '%s'"

    TABLE_KEY_COLUMN_USAGE = "SELECT c.column_name \
                                FROM information_schema.key_column_usage AS c \
                                LEFT JOIN information_schema.table_constraints AS t \
                                ON t.constraint_name = c.constraint_name \
                                WHERE t.table_name = '%s' AND t.constraint_type = 'PRIMARY KEY'"

    def __init__(self, db_name=None):
        if db_name is None:
            k, v = settings.DATABASES.items()[0]
            self.cursor = connections[k]
        else:
            self.cursor = connections[db_name]
    
    def get_table_primary_key(self, table_name):
        with self.cursor.cursor() as cursor:
            sql = self.TABLE_KEY_COLUMN_USAGE % table_name
            cursor.execute(sql)
            return cursor.fetchone()[0]

    def get_table_schema_info(self, table_name):
        columns_details = []
        schema_columns = InformationSchemaColumns._KEYS
        with self.cursor.cursor() as cursor:
            sql = self.TABLE_SCHEMA_INFO_QUERY % (','.join(schema_columns), table_name)
            cursor.execute(sql)
            for row in cursor.fetchall():
                columns_details.append(InformationSchemaColumns(**dict(zip(schema_columns, row))))
        
        return columns_details
