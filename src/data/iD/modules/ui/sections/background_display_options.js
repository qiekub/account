import {
    event as d3_event,
    select as d3_select
} from 'd3-selection';

import { t, textDirection } from '../../util/locale';
import { svgIcon } from '../../svg/icon';
import { uiSection } from '../section';
import { utilDetect } from '../../util/detect';


export function uiSectionBackgroundDisplayOptions(context) {

    var section = uiSection('background-display-options', context)
        .title(t('background.display_options'))
        .disclosureContent(renderDisclosureContent);

    var _detected = utilDetect();
    var _storedOpacity = context.storage('background-opacity');
    var _minVal = 0.25;
    var _maxVal = _detected.cssfilters ? 2 : 1;

    var _sliders = _detected.cssfilters
        ? ['brightness', 'contrast', 'saturation', 'sharpness']
        : ['brightness'];

    var _options = {
        brightness: (_storedOpacity !== null ? (+_storedOpacity) : 1),
        contrast: 1,
        saturation: 1,
        sharpness: 1
    };

    function clamp(x, min, max) {
        return Math.max(min, Math.min(x, max));
    }

    function updateValue(d, val) {
        if (!val && d3_event && d3_event.target) {
            val = d3_event.target.value;
        }

        val = clamp(val, _minVal, _maxVal);

        _options[d] = val;
        context.background()[d](val);

        if (d === 'brightness') {
            context.storage('background-opacity', val);
        }

        section.reRender();
    }

    function renderDisclosureContent(selection) {
        var container = selection.selectAll('.display-options-container')
            .data([0]);

        var containerEnter = container.enter()
            .append('div')
            .attr('class', 'display-options-container controls-list');

        // add slider controls
        var slidersEnter = containerEnter.selectAll('.display-control')
            .data(_sliders)
            .enter()
            .append('div')
            .attr('class', function(d) { return 'display-control display-control-' + d; });

        slidersEnter
            .append('h5')
            .text(function(d) { return t('background.' + d); })
            .append('span')
            .attr('class', function(d) { return 'display-option-value display-option-value-' + d; });

        slidersEnter
            .append('input')
            .attr('class', function(d) { return 'display-option-input display-option-input-' + d; })
            .attr('type', 'range')
            .attr('min', _minVal)
            .attr('max', _maxVal)
            .attr('step', '0.05')
            .on('input', function(d) {
                var val = d3_select(this).property('value');
                updateValue(d, val);
            });

        slidersEnter
            .append('button')
            .attr('title', t('background.reset'))
            .attr('class', function(d) { return 'display-option-reset display-option-reset-' + d; })
            .on('click', function(d) {
                if (d3_event.button !== 0) return;
                updateValue(d, 1);
            })
            .call(svgIcon('#iD-icon-' + (textDirection === 'rtl' ? 'redo' : 'undo')));

        // reset all button
        containerEnter
            .append('a')
            .attr('class', 'display-option-resetlink')
            .attr('href', '#')
            .text(t('background.reset_all'))
            .on('click', function() {
                for (var i = 0; i < _sliders.length; i++) {
                    updateValue(_sliders[i],1);
                }
            });

        // update
        container = containerEnter
            .merge(container);

        container.selectAll('.display-option-input')
            .property('value', function(d) { return _options[d]; });

        container.selectAll('.display-option-value')
            .text(function(d) { return Math.floor(_options[d] * 100) + '%'; });

        container.selectAll('.display-option-reset')
            .classed('disabled', function(d) { return _options[d] === 1; });

        // first time only, set brightness if needed
        if (containerEnter.size() && _options.brightness !== 1) {
            context.background().brightness(_options.brightness);
        }
    }

    return section;
}
