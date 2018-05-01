from rest_framework.authentication import SessionAuthentication 

class CsrfExemptSessionAuthentication(SessionAuthentication):
    '''
    this is a csrf exempt class for django rest framework
    '''
    def enforce_csrf(self, request):
        return  # Do not perform the csrf check previously happening
