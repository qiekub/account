import { drag as d3_drag } from 'd3-drag';
import {
    event as d3_event,
    select as d3_select
} from 'd3-selection';

import { t } from '../../util/locale';
import { actionChangeMember } from '../../actions/change_member';
import { actionDeleteMember } from '../../actions/delete_member';
import { actionMoveMember } from '../../actions/move_member';
import { modeBrowse } from '../../modes/browse';
import { modeSelect } from '../../modes/select';
import { osmEntity } from '../../osm';
import { svgIcon } from '../../svg/icon';
import { services } from '../../services';
import { uiCombobox } from '../combobox';
import { uiSection } from '../section';
import { utilDisplayName, utilDisplayType, utilHighlightEntities, utilNoAuto } from '../../util';


export function uiSectionRawMemberEditor(context) {

    var section = uiSection('raw-member-editor', context)
        .shouldDisplay(function() {
            if (!_entityIDs || _entityIDs.length !== 1) return false;

            var entity = context.hasEntity(_entityIDs[0]);
            return entity && entity.type === 'relation';
        })
        .title(function() {
            var entity = context.hasEntity(_entityIDs[0]);
            if (!entity) return '';

            var gt = entity.members.length > _maxMembers ? '>' : '';
            return t('inspector.members_count', { count: gt + entity.members.slice(0, _maxMembers).length });
        })
        .disclosureContent(renderDisclosureContent);

    var taginfo = services.taginfo;
    var _entityIDs;
    var _maxMembers = 1000;

    function downloadMember(d) {
        d3_event.preventDefault();

        // display the loading indicator
        d3_select(this.parentNode).classed('tag-reference-loading', true);
        context.loadEntity(d.id, function() {
            section.reRender();
        });
    }

    function zoomToMember(d) {
        d3_event.preventDefault();

        var entity = context.entity(d.id);
        context.map().zoomToEase(entity);

        // highlight the feature in case it wasn't previously on-screen
        utilHighlightEntities([d.id], true, context);
    }


    function selectMember(d) {
        d3_event.preventDefault();

        // remove the hover-highlight styling
        utilHighlightEntities([d.id], false, context);

        var entity = context.entity(d.id);
        var mapExtent = context.map().extent();
        if (!entity.intersects(mapExtent, context.graph())) {
            // zoom to the entity if its extent is not visible now
            context.map().zoomToEase(entity);
        }

        context.enter(modeSelect(context, [d.id]));
    }


    function changeRole(d) {
        var oldRole = d.role;
        var newRole = d3_select(this).property('value');

        if (oldRole !== newRole) {
            var member = { id: d.id, type: d.type, role: newRole };
            context.perform(
                actionChangeMember(d.relation.id, member, d.index),
                t('operations.change_role.annotation')
            );
        }
    }


    function deleteMember(d) {

        // remove the hover-highlight styling
        utilHighlightEntities([d.id], false, context);

        context.perform(
            actionDeleteMember(d.relation.id, d.index),
            t('operations.delete_member.annotation')
        );

        if (!context.hasEntity(d.relation.id)) {
            context.enter(modeBrowse(context));
        }
    }

    function renderDisclosureContent(selection) {

        var entityID = _entityIDs[0];

        var memberships = [];
        var entity = context.entity(entityID);
        entity.members.slice(0, _maxMembers).forEach(function(member, index) {
            memberships.push({
                index: index,
                id: member.id,
                type: member.type,
                role: member.role,
                relation: entity,
                member: context.hasEntity(member.id)
            });
        });

        var list = selection.selectAll('.member-list')
            .data([0]);

        list = list.enter()
            .append('ul')
            .attr('class', 'member-list')
            .merge(list);


        var items = list.selectAll('li')
            .data(memberships, function(d) {
                return osmEntity.key(d.relation) + ',' + d.index + ',' +
                    (d.member ? osmEntity.key(d.member) : 'incomplete');
            });

        items.exit()
            .each(unbind)
            .remove();

        var itemsEnter = items.enter()
            .append('li')
            .attr('class', 'member-row form-field')
            .classed('member-incomplete', function(d) { return !d.member; });

        itemsEnter
            .each(function(d) {
                var item = d3_select(this);

                var label = item
                    .append('label')
                    .attr('class', 'field-label');

                if (d.member) {
                    // highlight the member feature in the map while hovering on the list item
                    item
                        .on('mouseover', function() {
                            utilHighlightEntities([d.id], true, context);
                        })
                        .on('mouseout', function() {
                            utilHighlightEntities([d.id], false, context);
                        });

                    var labelLink = label
                        .append('span')
                        .attr('class', 'label-text')
                        .append('a')
                        .attr('href', '#')
                        .on('click', selectMember);

                    labelLink
                        .append('span')
                        .attr('class', 'member-entity-type')
                        .text(function(d) {
                            var matched = context.presets().match(d.member, context.graph());
                            return (matched && matched.name()) || utilDisplayType(d.member.id);
                        });

                    labelLink
                        .append('span')
                        .attr('class', 'member-entity-name')
                        .text(function(d) { return utilDisplayName(d.member); });

                    label
                        .append('button')
                        .attr('class', 'member-zoom')
                        .attr('title', t('icons.zoom_to'))
                        .call(svgIcon('#iD-icon-framed-dot', 'monochrome'))
                        .on('click', zoomToMember);

                } else {
                    var labelText = label
                        .append('span')
                        .attr('class', 'label-text');

                    labelText
                        .append('span')
                        .attr('class', 'member-entity-type')
                        .text(t('inspector.' + d.type, { id: d.id }));

                    labelText
                        .append('span')
                        .attr('class', 'member-entity-name')
                        .text(t('inspector.incomplete', { id: d.id }));

                    label
                        .append('button')
                        .attr('class', 'member-download')
                        .attr('title', t('icons.download'))
                        .attr('tabindex', -1)
                        .call(svgIcon('#iD-icon-load'))
                        .on('click', downloadMember);
                }
            });

        var wrapEnter = itemsEnter
            .append('div')
            .attr('class', 'form-field-input-wrap form-field-input-member');

        wrapEnter
            .append('input')
            .attr('class', 'member-role')
            .property('type', 'text')
            .attr('maxlength', context.maxCharsForRelationRole())
            .attr('placeholder', t('inspector.role'))
            .call(utilNoAuto);

        wrapEnter
            .append('button')
            .attr('tabindex', -1)
            .attr('title', t('icons.remove'))
            .attr('class', 'remove form-field-button member-delete')
            .call(svgIcon('#iD-operation-delete'));

        if (taginfo) {
            wrapEnter.each(bindTypeahead);
        }

        // update
        items = items
            .merge(itemsEnter)
            .order();

        items.select('input.member-role')
            .property('value', function(d) { return d.role; })
            .on('blur', changeRole)
            .on('change', changeRole);

        items.select('button.member-delete')
            .on('click', deleteMember);

        var dragOrigin, targetIndex;

        items.call(d3_drag()
            .on('start', function() {
                dragOrigin = {
                    x: d3_event.x,
                    y: d3_event.y
                };
                targetIndex = null;
            })
            .on('drag', function(d, index) {
                var x = d3_event.x - dragOrigin.x,
                    y = d3_event.y - dragOrigin.y;

                if (!d3_select(this).classed('dragging') &&
                    // don't display drag until dragging beyond a distance threshold
                    Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) <= 5) return;

                d3_select(this)
                    .classed('dragging', true);

                targetIndex = null;

                selection.selectAll('li.member-row')
                    .style('transform', function(d2, index2) {
                        var node = d3_select(this).node();
                        if (index === index2) {
                            return 'translate(' + x + 'px, ' + y + 'px)';
                        } else if (index2 > index && d3_event.y > node.offsetTop) {
                            if (targetIndex === null || index2 > targetIndex) {
                                targetIndex = index2;
                            }
                            return 'translateY(-100%)';
                        } else if (index2 < index && d3_event.y < node.offsetTop + node.offsetHeight) {
                            if (targetIndex === null || index2 < targetIndex) {
                                targetIndex = index2;
                            }
                            return 'translateY(100%)';
                        }
                        return null;
                    });
            })
            .on('end', function(d, index) {

                if (!d3_select(this).classed('dragging')) {
                    return;
                }

                d3_select(this)
                    .classed('dragging', false);

                selection.selectAll('li.member-row')
                    .style('transform', null);

                if (targetIndex !== null) {
                    // dragged to a new position, reorder
                    context.perform(
                        actionMoveMember(d.relation.id, index, targetIndex),
                        t('operations.reorder_members.annotation')
                    );
                }
            })
        );



        function bindTypeahead(d) {
            var row = d3_select(this);
            var role = row.selectAll('input.member-role');
            var origValue = role.property('value');

            function sort(value, data) {
                var sameletter = [];
                var other = [];
                for (var i = 0; i < data.length; i++) {
                    if (data[i].value.substring(0, value.length) === value) {
                        sameletter.push(data[i]);
                    } else {
                        other.push(data[i]);
                    }
                }
                return sameletter.concat(other);
            }

            role.call(uiCombobox(context, 'member-role')
                .fetcher(function(role, callback) {
                    // The `geometry` param is used in the `taginfo.js` interface for
                    // filtering results, as a key into the `tag_members_fractions`
                    // object.  If we don't know the geometry because the member is
                    // not yet downloaded, it's ok to guess based on type.
                    var geometry;
                    if (d.member) {
                        geometry = context.graph().geometry(d.member.id);
                    } else if (d.type === 'relation') {
                        geometry = 'relation';
                    } else if (d.type === 'way') {
                        geometry = 'line';
                    } else {
                        geometry = 'point';
                    }

                    var rtype = entity.tags.type;
                    taginfo.roles({
                        debounce: true,
                        rtype: rtype || '',
                        geometry: geometry,
                        query: role
                    }, function(err, data) {
                        if (!err) callback(sort(role, data));
                    });
                })
                .on('cancel', function() {
                    role.property('value', origValue);
                })
            );
        }


        function unbind() {
            var row = d3_select(this);

            row.selectAll('input.member-role')
                .call(uiCombobox.off, context);
        }
    }

    section.entityIDs = function(val) {
        if (!arguments.length) return _entityIDs;
        _entityIDs = val;
        return section;
    };


    return section;
}
