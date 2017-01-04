from django.conf.urls import url, include
from .views import UserViewSet, MapDefinitionViewSet, TableInfoViewSet, ColumnInfoViewSet, ColoursViewset, SchemasViewSet

from rest_framework import routers

router = routers.DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'columninfo', ColumnInfoViewSet)

# Need to set base_name because Reasons
# http://www.django-rest-framework.org/api-guide/routers/#usage (see note re `base_name`)
# http://stackoverflow.com/questions/22083090/what-base-name-parameter-do-i-need-in-my-route-to-make-this-django-api-work
router.register(r'maps', MapDefinitionViewSet, base_name='MapDefinition')
router.register(r'colours', ColoursViewset, base_name='colours')
router.register(r'schemas', SchemasViewSet, base_name='schemas')
router.register(r'tableinfo', TableInfoViewSet, base_name='tableinfo')

urlpatterns = [
    url(r'^api/0.1/', include(router.urls)),
]
