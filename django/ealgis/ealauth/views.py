from django.contrib.auth.models import User
from .models import MapDefinition

from rest_framework import viewsets, mixins, status
from rest_framework.views import APIView
from rest_framework.decorators import detail_route, list_route
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated

from .serializers import UserSerializer, MapDefinitionSerializer, TableInfoSerializer, TableInfoWithColumnsSerializer, DataInfoSerializer, ColumnInfoSerializer, GeometryLinkageSerializer
from ealgis.colour_scale import definitions, make_colour_scale
from django.apps import apps

import json
import time
import copy
from django.http import HttpResponseNotFound
from ealgis.util import deepupdate

def api_not_found(request):
    return HttpResponseNotFound()


class CurrentUserView(APIView):
    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    permission_classes = (IsAdminUser,)
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer


class MapDefinitionViewSet(viewsets.ModelViewSet):
    """
    API endpoint to allow map definitions to be viewed or edited by the user that owns them.
    """
    serializer_class = MapDefinitionSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        # More complex example from SO:
        # http://stackoverflow.com/questions/34968725/djangorestframework-how-to-get-user-in-viewset
        return MapDefinition.objects.filter(owner_user_id=self.request.user)

    def create(self, request):
        # request.data is from the POST object. We want to take these
        # values and supplement it with the user.id that's defined
        # in our URL parameter
        data = {
            'name': request.data['name'],
            'description': request.data['description'],
            'json': request.data['json'] if "json" in request.data else {},
            'owner_user_id': self.request.user.id
        }

        serializer = MapDefinitionSerializer(data=data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @detail_route(methods=['put'])
    def addLayer(self, request, pk=None, format=None):
        queryset = self.get_queryset()
        map = queryset.filter(id=pk).first()

        if "layer" not in request.data:
            raise ValidationError(detail="Layer object not found.")

        json = map.json
        json["layers"].append(request.data["layer"])

        serializer = MapDefinitionSerializer(map, data={"json": json}, partial=True)
        if serializer.is_valid():
            serializer.save()

            layerId = len(serializer.validated_data["json"]["layers"]) - 1
            newLayer = serializer.validated_data["json"]["layers"][layerId]

            olStyleDef = serializer.createOLStyleDef(newLayer)
            if olStyleDef is not False:
                newLayer["olStyleDef"] = olStyleDef

            return Response({
                "layerId": layerId,
                "layer": newLayer,
            }, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @detail_route(methods=['put'])
    def initDraftLayer(self, request, pk=None, format=None):
        queryset = self.get_queryset()
        map = queryset.filter(id=pk).first()
        layerId = int(request.data["layerId"])

        if layerId < 0:
            raise ValidationError(detail="LayerId not valid.")

        if (layerId + 1) > len(map.json["layers"]):
            raise ValidationError(detail="Layer not found.")

        json = map.json
        layer = json["layers"][layerId]

        if "master" in layer:
            layer = layer["master"]

        # Make a new master object (first time editing this layer) so we have a copy to restore
        # if we don't publish the edits to this layer.
        layer["master"] = copy.deepcopy(layer)
        layer["draft"] = True
        json["layers"][layerId] = layer

        serializer = MapDefinitionSerializer(map, data={"json": json}, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({})
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @detail_route(methods=['put'])
    def editDraftLayer(self, request, pk=None, format=None):
        queryset = self.get_queryset()
        map = queryset.filter(id=pk).first()
        layerId = int(request.data["layerId"])

        if not (layerId >= 0 or type(request.data["layer"]) is dict):
            raise ValidationError(detail="LayerId and/or Layer object not found.")

        if (layerId + 1) > len(map.json["layers"]):
            raise ValidationError(detail="Layer not found.")

        json = copy.deepcopy(map.json)
        layer = json["layers"][layerId]

        if "master" not in layer:
            raise ValidationError(detail="Layer edit session not initialised.")

        json["layers"][layerId] = deepupdate(layer, request.data["layer"])

        serializer = MapDefinitionSerializer(map, data={"json": json}, partial=True)
        if serializer.is_valid():
            serializer.save()

            newLayer = serializer.validated_data["json"]["layers"][layerId]
            del newLayer["master"]
            del newLayer["draft"]

            olStyleDef = serializer.createOLStyleDef(newLayer)
            if olStyleDef is not False:
                newLayer["olStyleDef"] = olStyleDef

            return Response(newLayer)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @detail_route(methods=['put'])
    def publishLayer(self, request, pk=None, format=None):
        queryset = self.get_queryset()
        map = queryset.filter(id=pk).first()
        layerId = int(request.data["layerId"])

        if not (layerId >= 0 or type(request.data["layer"]) is dict):
            raise ValidationError(detail="LayerId and/or Layer object not found.")

        if (layerId + 1) > len(map.json["layers"]):
            raise ValidationError(detail="Layer not found.")

        if "master" not in map.json["layers"][layerId] or "draft" not in map.json["layers"][layerId]:
            raise ValidationError(detail="Layer has not been edited - nothing to publish.")

        json = map.json
        json["layers"][layerId] = request.data["layer"]

        serializer = MapDefinitionSerializer(map, data={"json": json}, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data["json"]["layers"][layerId])
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @detail_route(methods=['put'])
    def restoreMasterLayer(self, request, pk=None, format=None):
        queryset = self.get_queryset()
        map = queryset.filter(id=pk).first()
        layerId = int(request.data["layerId"])

        if not (layerId >= 0 or type(request.data["layer"]) is dict):
            raise ValidationError(detail="LayerId and/or Layer object not found.")

        if (layerId + 1) > len(map.json["layers"]):
            raise ValidationError(detail="Layer not found.")

        if "master" not in map.json["layers"][layerId] or "draft" not in map.json["layers"][layerId]:
            raise ValidationError(detail="Layer has not been edited - nothing to restore.")

        json = map.json
        del json["layers"][layerId]["master"]
        del json["layers"][layerId]["draft"]

        serializer = MapDefinitionSerializer(map, data={"json": json}, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data["json"]["layers"][layerId])
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @list_route(methods=['get'])
    def compileStyle(self, request, format=None):
        qp = request.query_params

        # We only need the fill params on the layer to compile the style
        layer = {
            "fill": {
                "opacity": qp["opacity"],
                "scale_max": qp["scale_max"],
                "scale_min": qp["scale_min"],
                "expression": qp["expression"],
                "scale_flip": qp["scale_flip"],
                "scale_name": qp["scale_name"],
                "scale_nlevels": qp["scale_nlevels"],
            }
        }

        scale_min = float(layer["fill"]['scale_min'])
        scale_max = float(layer["fill"]['scale_max'])
        opacity = float(layer["fill"]['opacity'])

        return Response(make_colour_scale(layer, 'q', scale_min, scale_max, opacity))

    @detail_route(methods=['get'])
    def exists(self, request, pk=None, format=None):
        queryset = self.get_queryset()
        map = queryset.filter(id=pk).first()

        return Response({
            "exists": map is not None
        })

    @detail_route(methods=['put'])
    def clone(self, request, pk=None, format=None):
        queryset = self.get_queryset()
        map = queryset.filter(id=pk).first()

        map.name = "{} Copied {}".format(map.name, int(round(time.time() * 1000)))[:32]
        map.json["rev"] = 0
        map.id = None
        map.pk = None
        map.save()

        serializer = self.serializer_class(map)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @detail_route(methods=['get'])
    def query_summary(self, request, pk=None, format=None):
        queryset = self.get_queryset()
        map = queryset.filter(id=pk).first()
        qp = request.query_params
        eal = apps.get_app_config('ealauth').eal

        layer = None
        if "layer" in qp:
            for l in map.json["layers"]:
                if l["hash"] == qp["layer"]:
                    layer = l
                    break

        if layer is None:
            raise ValidationError(detail="Layer not found.")

        summary = eal.def_get_summary_stats_for_layer(layer)
        return Response(summary)

    @detail_route(methods=['get'])
    def tiles(self, request, pk=None, format=None):
        # Used to inject features for debugging vector tile performance
        def debug_features(features, x, y, z):
            import mercantile
            bounds = mercantile.bounds(x, y, z)

            # Centre of the tile
            lon = bounds[0] + ((bounds[2] - bounds[0]) / 2)
            lat = bounds[3] - ((bounds[3] - bounds[1]) / 2)

            # Polygon bounding box of the tile
            polygon = [[
                [bounds[0], bounds[1]],  # BL
                [bounds[2], bounds[1]],  # BR
                [bounds[2], bounds[3]],  # TR
                [bounds[0], bounds[3]],  # TL
                [bounds[0], bounds[1]],  # BL
            ]]

            return [{
                "type": "Feature",
                "id": "tile_centroid",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat],
                },
                "properties": {
                    "debug": True,
                    "label": "{},{},{} / {}".format(x, y, z, len(features)),
                }
            }, {
                "type": "Feature",
                "id": "tile_bounds",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": polygon,
                },
                "properties": {
                    "debug": True,
                }
            }]

        #  tileRequestStartTime = int(round(time.time() * 1000))
        queryset = self.get_queryset()
        map = queryset.filter(id=pk).first()
        qp = request.query_params

        # Validate required params for serving a vector tile
        # Layer OK?
        layer = None
        for l in map.json["layers"]:
            if l["hash"] == qp["layer"]:
                layer = l
                break

        if layer is None:
            raise ValidationError(detail="Layer not found.")

        # Format OK?
        if "format" not in qp or qp["format"] not in ["geojson", "pbf"]:
            raise ValidationError(detail="Unknown format '{format}".format(format=format))

        # Has Tile Coordinates OK?
        if not("x" in qp and "y" in qp and "z" in qp):
            raise ValidationError(detail="Tile coordinates (X, Y, Z) not found.")

        # OK, generate a GeoJSON Vector Tile
        def row_to_dict(row):
            def f(item):
                return not item[0] == 'geom'
            return dict(i for i in row.items() if f(i))

        def to_geojson_feature(row):
            def process_geometry(geometry):
                return json.loads(geometry)

            return {
                "type": "Feature",
                "geometry": process_geometry(row["geom"]),
                "properties": row_to_dict(row),
            }

        def to_pbf_feature(row):
            def process_geometry(geometry):
                return geometry

            return {
                "geometry": process_geometry(row['geom']),
                "properties": row_to_dict(row)
            }

        from django.core.cache import cache
        format = qp["format"]
        cache_key = "layer_{}_{}_{}_{}".format(qp["layer"], qp["x"], qp["y"], qp["z"])
        cache_time = 60 * 60 * 24 * 365  # time to live in seconds
        debugMode = True if "debug" in qp else False
        memcachedEnabled = False if "no_memcached" in qp or debugMode is True else True
        fromMemcached = False

        if memcachedEnabled:
            features = cache.get(cache_key)
            if features is not None:
                fromMemcached = True

        if memcachedEnabled is False or features is None:
            eal = apps.get_app_config('ealauth').eal
            # tileSQLStartTime = int(round(time.time() * 1000))
            results = eal.get_tile_mv(layer, int(qp["x"]), int(qp["y"]), int(qp["z"]))
            # tileSQLEndTime = int(round(time.time() * 1000))

            if qp["format"] == "geojson":
                # tileToGeoJSONStartTime = int(round(time.time() * 1000))
                features = [to_geojson_feature(row) for row in results]
                # tileToGeoJSONEndTime = int(round(time.time() * 1000))
            elif qp["format"] == "pbf":
                layers = [{
                    "name": "Layer A",
                    "features": [to_pbf_feature(row) for row in results]
                }]

                # Is sloooooooow
                import mapbox_vector_tile
                features = mapbox_vector_tile.encode(layers)

            if memcachedEnabled:
                cache.set(cache_key, features, cache_time)

        headers = {
            "Access-Control-Allow-Origin": "*",
            "X-From-Memcached": fromMemcached,
        }

        # tileRequestEndTime = int(round(time.time() * 1000))
        # tileSQLTime = 0
        # if 'tileSQLEndTime' in vars():
        #     tileSQLTime = tileSQLEndTime - tileSQLStartTime
        # tileGeoJSONTime = 0
        # if 'tileToGeoJSONEndTime' in vars():
        #     tileGeoJSONTime = tileToGeoJSONEndTime - tileToGeoJSONStartTime
        # tileRequestTime = tileRequestEndTime - tileRequestStartTime
        # print("{}: SQLTime = {}ms; GeoJSON Time = {}ms; Total Time = {}ms".format(cache_key, tileSQLTime, tileGeoJSONTime, tileRequestTime))

        if qp["format"] == "geojson":
            # Inject features in debug mode to allow OpenLayers to style the tile coordinates and feature count
            if debugMode:
                features = features + debug_features(features, int(qp["x"]), int(qp["y"]), int(qp["z"]))

            return Response({
                "type": "FeatureCollection",
                "features": features
            }, headers=headers)

        elif qp["format"] == "pbf":
            from django.http.response import HttpResponse
            response = HttpResponse(features, content_type="application/x-protobuf")
            for key, val in headers.items():
                response[key] = val
            return response


class ReadOnlyGenericTableInfoViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    def retrieve(self, request, format=None, pk=None):
        schema_name = self.get_schema_from_request(request)

        table = self.getter_method(pk, schema_name)
        if table is None:
            raise NotFound()

        table = self.add_columns_to_table(table, schema_name)

        serializer = self.serializer_class(table)
        return Response(serializer.data)

    def get_schema_from_request(self, request):
        eal = apps.get_app_config('ealauth').eal

        schema_name = request.query_params.get('schema', None)
        if schema_name is None or not schema_name:
            raise ValidationError(detail="No schema name provided.")
        elif schema_name not in eal.get_schemas():
            raise ValidationError(detail="Schema name '{}' is not a known schema.".format(schema_name))
        return schema_name

    def add_columns_to_table(self, table, schema_name):
        eal = apps.get_app_config('ealauth').eal

        columninfo = eal.get_table_class("column_info", schema_name)
        columns = {}
        for column in eal.session.query(columninfo).filter_by(tableinfo_id=table.id).all():
            columns[column.name] = json.loads(column.metadata_json)

        if len(columns) > 0:
            table.columns = columns
        return table


class DataInfoViewSet(viewsets.ViewSet):
    """
    API endpoint that allows tabular tables to be viewed or edited.
    """
    permission_classes = (IsAuthenticated,)
    serializer_class = DataInfoSerializer
    getter_method = apps.get_app_config('ealauth').eal.get_data_info

    def list(self, request, format=None):
        eal = apps.get_app_config('ealauth').eal
        tables = eal.get_datainfo()
        return Response(tables)

    def retrieve(self, request, format=None, pk=None):
        eal = apps.get_app_config('ealauth').eal
        schema_name = self.get_schema_from_request(request)

        gid = request.query_params.get('gid', None)
        row = eal.get_geometry_source_info_by_gid(pk, gid, schema_name)
        return Response(row)

    def get_schema_from_request(self, request):
        eal = apps.get_app_config('ealauth').eal

        schema_name = request.query_params.get('schema', None)
        if schema_name is None or not schema_name:
            raise ValidationError(detail="No schema name provided.")
        elif schema_name not in eal.get_schemas():
            raise ValidationError(detail="Schema name '{}' is not a known schema.".format(schema_name))
        return schema_name

    @list_route(methods=['get'])
    def create_views(self, request, format=None):
        eal = apps.get_app_config('ealauth').eal
        qp = request.query_params
        execute = True if "execute" in qp else False

        viewNames = []
        if "table_name" in qp and "schema_name" in qp:
            table = eal.get_data_info(qp["table_name"], qp["schema_name"])
            tables = "{}.{}".format(qp["schema_name"], table.name)
            viewNames.append(eal.create_materialised_view_for_table(table.name, qp["schema_name"], execute))
        elif "all_tables" in qp:
            tables = eal.get_datainfo()
            for key in tables:
                viewNames.append(eal.create_materialised_view_for_table(tables[key]["name"], tables[key]["schema_name"], execute))
        else:
            raise ValidationError(detail="Invalid query - must specify table_name or all_tables and schema_name.")

        if execute:
            return Response({"views": viewNames})
        else:
            sqlAllViews = []
            for view in viewNames:
                sqlAllViews.append(view["sql"])

            from django.http.response import HttpResponse
            return HttpResponse("\n\n\n".join(sqlAllViews), content_type="text/plain")


class TableInfoViewSet(ReadOnlyGenericTableInfoViewSet):
    """
    API endpoint that allows data tables to be viewed or edited.
    """
    permission_classes = (IsAuthenticated,)
    serializer_class = TableInfoWithColumnsSerializer
    getter_method = apps.get_app_config('ealauth').eal.get_table_info

    def list(self, request, format=None):
        eal = apps.get_app_config('ealauth').eal
        tables = eal.get_tableinfo()
        return Response(tables)


class ColumnInfoViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    API endpoint that allows data columns to be viewed.
    """
    permission_classes = (IsAuthenticated,)
    serializer_class = ColumnInfoSerializer

    def get_queryset(self):
        pass

    def retrieve(self, request, format=None, pk=None):
        eal = apps.get_app_config('ealauth').eal
        schema_name = self.get_schema_from_request(request)

        # e.g. https://localhost:8443/api/0.1/columninfo/40353/?schema=aus_census_2011
        # Counted_at_home_on_Census_Night_Age_0_14_years
        row = eal.get_column_info(pk, schema_name)
        if row is None:
            raise NotFound()

        serializer = self.serializer_class(row)
        return Response(serializer.data)

    @list_route(methods=['get'])
    def by_name(self, request, format=None):
        eal = apps.get_app_config('ealauth').eal
        schema_name = self.get_schema_from_request(request)
        qp = request.query_params

        if "name" not in qp:
            raise ValidationError(detail="Name parameter not supplied.")

        if "geo_source_id" in qp:
            # e.g. https://localhost:8443/api/0.1/columninfo/by_name/?name=i13&schema=aus_census_2011
            # All "Indigenous: Males" (i13) columns in the whole 2011 Census schema
            query = eal.get_column_info_by_names(qp["name"].split(","), schema_name, qp["geo_source_id"])
        else:
            # e.g. https://localhost:8443/api/0.1/columninfo/by_name/?name=i13&schema=aus_census_2011&geo_source_id=4
            # Find the "Indigenous: Males" (i13) column for the SA3 geometry source in the 2011 Census schema
            query = eal.get_column_info_by_names(qp["name"].split(","), schema_name)

        # Split the response into an array of columns and an object of tables.
        # Often columns will refer to the same table, so this reduces payload size.
        response = {
            "columns": [],
            "tables": {},
        }
        for (column, geomlinkage, tableinfo) in query:
            col = self.serializer_class(column).data
            col["geomlinkage"] = GeometryLinkageSerializer(geomlinkage).data
            response["columns"].append(col)

            table = TableInfoSerializer(tableinfo).data
            table["schema_name"] = schema_name
            if table["id"] not in response["tables"]:
                response["tables"][table["id"]] = table

        if len(response["columns"]) == 0:
            raise NotFound()
        return Response(response)

    @list_route(methods=['get'])
    def search(self, request, format=None):
        eal = apps.get_app_config('ealauth').eal
        schema_name = self.get_schema_from_request(request)
        qp = request.query_params

        columninfo, geometrylinkage, tableinfo = eal.get_table_classes(["column_info", "geometry_linkage", "table_info"], schema_name)
        search_terms = qp["search"].split(",") if qp["search"] != "" else []

        # Constrain our search window to a given geometry source (e.g. All columns relating to SA3s)
        # e.g. https://localhost:8443/api/0.1/columninfo/search/?search=diploma,advanced&schema=aus_census_2011&geo_source_id=4
        # Find all columns mentioning "diploma" and "advanced" at SA3 level
        if "geo_source_id" in qp:
            datainfo_id = qp["geo_source_id"]
            query = eal.session.query(columninfo, geometrylinkage, tableinfo)\
                        .outerjoin(geometrylinkage, columninfo.tableinfo_id == geometrylinkage.attr_table_info_id)\
                        .outerjoin(tableinfo, columninfo.tableinfo_id == tableinfo.id)\
                        .filter(geometrylinkage.geo_source_id == datainfo_id)
            
            if len(search_terms) == 0:
                raise ValidationError(detail="At least one search term is required when searching by geometry.")

        elif "tableinfo_id" in qp or "tableinfo_name" in qp:
        # Constrain our search window to a given table (e.g. All columns relating to a specific table)
        # NB: For the Census this implicitly limits us to a geometry soruce as well
        # e.g. https://localhost:8443/api/0.1/columninfo/search/?search=diploma,advanced,indigenous&schema=aus_census_2011&tableinfo_id=253
        # Find all columns mentioning "diploma", "advaned", and "indigenous" in table "Non-School Qualification: Level of Education by Indigenous Status by Age by Sex" (i15d_aust_sa4)
            if "tableinfo_name" in qp:
                tableNames = qp["tableinfo_name"].split(",")
                query = eal.session.query(tableinfo)\
                            .filter(tableinfo.name.in_(tableNames))

                tableinfo_id = []
                for table in query.all():
                    tableinfo_id.append(table.id)
            else:
                tableinfo_id = [qp["tableinfo_id"]]
            
            query = eal.session.query(columninfo, geometrylinkage, tableinfo)\
                        .outerjoin(geometrylinkage, columninfo.tableinfo_id == geometrylinkage.attr_table_info_id)\
                        .outerjoin(tableinfo, columninfo.tableinfo_id == tableinfo.id)\
                        .filter(columninfo.tableinfo_id.in_(tableinfo_id))

        else:
            raise ValidationError(detail="No geo_source_id or tableinfo_id provided.")

        # Further filter the resultset by one or more search terms (e.g. "diploma,advaned,females")
        for term in search_terms:
            query = query.filter(columninfo.metadata_json.ilike("%{}%".format(term)))

        # Split the response into an array of columns and an object of tables.
        # Often columns will refer to the same table, so this reduces payload size.
        response = {
            "columns": [],
            "tables": {},
        }
        for (column, geomlinkage, tableinfo) in query.all():
            col = self.serializer_class(column).data
            col["geomlinkage"] = GeometryLinkageSerializer(geomlinkage).data
            response["columns"].append(col)

            table = TableInfoSerializer(tableinfo).data
            table["schema_name"] = schema_name
            if table["id"] not in response["tables"]:
                response["tables"][table["id"]] = table

        if len(response["columns"]) == 0:
            raise NotFound()
        return Response(response)

    def get_schema_from_request(self, request):
        eal = apps.get_app_config('ealauth').eal

        schema_name = request.query_params.get('schema', None)
        if schema_name is None or not schema_name:
            raise ValidationError(detail="No schema name provided.")
        elif schema_name not in eal.get_schemas():
            raise ValidationError(detail="Schema name '{}' is not a known schema.".format(schema_name))
        return schema_name


class ColoursViewset(viewsets.ViewSet):
    """
    API endpoint that returns available colours scale for styling.
    """
    permission_classes = (IsAuthenticated,)

    def list(self, request, format=None):
        return Response(definitions.get_json())

    @list_route(methods=['get'])
    def defs(self, request):
        return Response(definitions.get_defs_json())


class SchemasViewSet(viewsets.ViewSet):
    """
    API endpoint that scans the database for EAlGIS-compliant schemas.
    """

    def list(self, request, format=None):
        eal = apps.get_app_config('ealauth').eal
        schema_names = eal.get_schemas()
        return Response(schema_names)
