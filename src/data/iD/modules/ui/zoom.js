import {
    event as d3_event,
    select as d3_select
} from 'd3-selection';

import { t, textDirection } from '../util/locale';
import { svgIcon } from '../svg/icon';
import { uiCmd } from './cmd';
import { uiTooltip } from './tooltip';


export function uiZoom(context) {

    var zooms = [{
        id: 'zoom-in',
        icon: 'plus',
        title: t('zoom.in'),
        action: zoomIn,
        key: '+'
    }, {
        id: 'zoom-out',
        icon: 'minus',
        title: t('zoom.out'),
        action: zoomOut,
        key: '-'
    }];

    function zoomIn() {
        d3_event.preventDefault();
        context.map().zoomIn();
    }

    function zoomOut() {
        d3_event.preventDefault();
        context.map().zoomOut();
    }

    function zoomInFurther() {
        d3_event.preventDefault();
        context.map().zoomInFurther();
    }

    function zoomOutFurther() {
        d3_event.preventDefault();
        context.map().zoomOutFurther();
    }

    return function(selection) {
        var button = selection.selectAll('button')
            .data(zooms)
            .enter()
            .append('button')
            .attr('class', function(d) { return d.id; })
            .on('click.editor', function(d) {
                if (!d3_select(this).classed('disabled')) {
                    d.action();
                }
            })
            .call(uiTooltip()
                .placement((textDirection === 'rtl') ? 'right' : 'left')
                .title(function(d) {
                    return d.title;
                })
                .keys(function(d) {
                    return [d.key];
                })
            );

        button.each(function(d) {
            d3_select(this)
                .call(svgIcon('#iD-icon-' + d.icon, 'light'));
        });

        ['plus', 'ffplus', '=', 'ffequals'].forEach(function(key) {
            context.keybinding().on([key], zoomIn);
            context.keybinding().on([uiCmd('⌘' + key)], zoomInFurther);
        });

        ['_', '-', 'ffminus', 'dash'].forEach(function(key) {
            context.keybinding().on([key], zoomOut);
            context.keybinding().on([uiCmd('⌘' + key)], zoomOutFurther);
        });

        function updateButtonStates() {
            var canZoomIn = context.map().canZoomIn();
            selection.select('button.zoom-in')
                .classed('disabled', !canZoomIn);

            var canZoomOut = context.map().canZoomOut();
            selection.select('button.zoom-out')
                .classed('disabled', !canZoomOut);
        }

        updateButtonStates();

        context.map().on('move.uiZoom', updateButtonStates);
    };
}
