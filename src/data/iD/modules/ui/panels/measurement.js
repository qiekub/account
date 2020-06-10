import { event as d3_event } from 'd3-selection';

import {
    geoLength as d3_geoLength,
    geoCentroid as d3_geoCentroid
} from 'd3-geo';

import { t } from '../../util/locale';
import { displayArea, displayLength, decimalCoordinatePair, dmsCoordinatePair } from '../../util/units';
import { geoExtent } from '../../geo';
import { utilDetect } from '../../util/detect';
import { services } from '../../services';


export function uiPanelMeasurement(context) {
    var locale = utilDetect().locale;
    var isImperial = (locale.toLowerCase() === 'en-us');


    function radiansToMeters(r) {
        // using WGS84 authalic radius (6371007.1809 m)
        return r * 6371007.1809;
    }

    function steradiansToSqmeters(r) {
        // http://gis.stackexchange.com/a/124857/40446
        return r / (4 * Math.PI) * 510065621724000;
    }


    function toLineString(feature) {
        if (feature.type === 'LineString') return feature;

        var result = { type: 'LineString', coordinates: [] };
        if (feature.type === 'Polygon') {
            result.coordinates = feature.coordinates[0];
        } else if (feature.type === 'MultiPolygon') {
            result.coordinates = feature.coordinates[0][0];
        }

        return result;
    }


    function nodeCount(feature) {
      if (feature.type === 'LineString') return feature.coordinates.length;
      if (feature.type === 'Polygon') return feature.coordinates[0].length - 1;
    }


    function redraw(selection) {
        var resolver = context.graph();
        var selectedNoteID = context.selectedNoteID();
        var osm = services.osm;

        var selected, center, entity, note, geometry;

        if (selectedNoteID && osm) {       // selected 1 note
            selected = [ t('note.note') + ' ' + selectedNoteID ];
            note = osm.getNote(selectedNoteID);
            center = note.loc;
            geometry = 'note';

        } else {                           // selected 1..n entities
            var extent = geoExtent();
            selected = context.selectedIDs()
                .filter(function(e) { return context.hasEntity(e); });
            if (selected.length) {
                for (var i = 0; i < selected.length; i++) {
                    entity = context.entity(selected[i]);
                    extent._extend(entity.extent(resolver));
                }
                center = extent.center();
                geometry = entity.geometry(resolver);
            }
        }

        var singular = selected.length === 1 ? selected[0] : null;

        selection.html('');

        selection
            .append('h4')
            .attr('class', 'measurement-heading')
            .text(singular || t('info_panels.measurement.selected', { n: selected.length.toLocaleString(locale) }));

        if (!selected.length) return;


        var list = selection
            .append('ul');
        var coordItem;

        // multiple selected features, just display extent center..
        if (!singular) {
            coordItem = list
                .append('li')
                .text(t('info_panels.measurement.center') + ':');
            coordItem.append('span')
                .text(dmsCoordinatePair(center));
            coordItem.append('span')
                .text(decimalCoordinatePair(center));
            return;
        }

        // single selected feature, display details..
        if (geometry === 'line' || geometry === 'area') {
            var closed = (entity.type === 'relation') || (entity.isClosed() && !entity.isDegenerate());
            var feature = entity.asGeoJSON(resolver);
            var length = radiansToMeters(d3_geoLength(toLineString(feature)));
            var lengthLabel = t('info_panels.measurement.' + (closed ? 'perimeter' : 'length'));
            var centroid = d3_geoCentroid(feature);

            list
                .append('li')
                .text(t('info_panels.measurement.geometry') + ':')
                .append('span')
                .text(
                    closed ? t('info_panels.measurement.closed_' + geometry) : t('geometry.' + geometry)
                );

            if (entity.type !== 'relation') {
                list
                    .append('li')
                    .text(t('info_panels.measurement.node_count') + ':')
                    .append('span')
                    .text(nodeCount(feature).toLocaleString(locale));
            }

            if (closed) {
                var area = steradiansToSqmeters(entity.area(resolver));
                list
                    .append('li')
                    .text(t('info_panels.measurement.area') + ':')
                    .append('span')
                    .text(displayArea(area, isImperial));
            }


            list
                .append('li')
                .text(lengthLabel + ':')
                .append('span')
                .text(displayLength(length, isImperial));

            coordItem = list
                .append('li')
                .text(t('info_panels.measurement.centroid') + ':');
            coordItem.append('span')
                .text(dmsCoordinatePair(centroid));
            coordItem.append('span')
                .text(decimalCoordinatePair(centroid));

            var toggle  = isImperial ? 'imperial' : 'metric';

            selection
                .append('a')
                .text(t('info_panels.measurement.' + toggle))
                .attr('href', '#')
                .attr('class', 'button button-toggle-units')
                .on('click', function() {
                    d3_event.preventDefault();
                    isImperial = !isImperial;
                    selection.call(redraw);
                });

        } else {
            var centerLabel = t('info_panels.measurement.' +
                (note || entity.type === 'node' ? 'location' : 'center'));

            list
                .append('li')
                .text(t('info_panels.measurement.geometry') + ':')
                .append('span')
                .text(t('geometry.' + geometry));

            coordItem = list
                .append('li')
                .text(centerLabel + ':');
            coordItem.append('span')
                .text(dmsCoordinatePair(center));
            coordItem.append('span')
                .text(decimalCoordinatePair(center));
        }
    }


    var panel = function(selection) {
        selection.call(redraw);

        context.map()
            .on('drawn.info-measurement', function() {
                selection.call(redraw);
            });

        context
            .on('enter.info-measurement', function() {
                selection.call(redraw);
            });
    };

    panel.off = function() {
        context.map().on('drawn.info-measurement', null);
        context.on('enter.info-measurement', null);
    };

    panel.id = 'measurement';
    panel.title = t('info_panels.measurement.title');
    panel.key = t('info_panels.measurement.key');


    return panel;
}
