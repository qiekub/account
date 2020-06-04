import {
  geoExtent, geoLineIntersection, geoMetersToLat, geoMetersToLon,
  geoSphericalDistance, geoVecInterp, geoHasSelfIntersections,
  geoSphericalClosestNode, geoAngle
} from '../geo';

import { actionAddMidpoint } from '../actions/add_midpoint';
import { actionChangeTags } from '../actions/change_tags';
import { actionMergeNodes } from '../actions/merge_nodes';
import { t } from '../util/locale';
import { utilDisplayLabel } from '../util';
import { osmRoutableHighwayTagValues } from '../osm/tags';
import { validationIssue, validationIssueFix } from '../core/validation';
import { services } from '../services';


/**
 * Look for roads that can be connected to other roads with a short extension
 */
export function validationAlmostJunction(context) {
  const type = 'almost_junction';
  const EXTEND_TH_METERS = 5;
  const WELD_TH_METERS = 0.75;
  // Comes from considering bounding case of parallel ways
  const CLOSE_NODE_TH = EXTEND_TH_METERS - WELD_TH_METERS;
  // Comes from considering bounding case of perpendicular ways
  const SIG_ANGLE_TH = Math.atan(WELD_TH_METERS / EXTEND_TH_METERS);

  function isHighway(entity) {
    return entity.type === 'way'
      && osmRoutableHighwayTagValues[entity.tags.highway];
  }

  function isTaggedAsNotContinuing(node) {
    return node.tags.noexit === 'yes'
      || node.tags.amenity === 'parking_entrance'
      || (node.tags.entrance && node.tags.entrance !== 'no');
  }


  const validation = function checkAlmostJunction(entity, graph) {
    if (!isHighway(entity)) return [];
    if (entity.isDegenerate()) return [];

    const tree = context.history().tree();
    const extendableNodeInfos = findConnectableEndNodesByExtension(entity);

    let issues = [];

    extendableNodeInfos.forEach(extendableNodeInfo => {
      issues.push(new validationIssue({
        type,
        subtype: 'highway-highway',
        severity: 'warning',
        message(context) {
          const entity1 = context.hasEntity(this.entityIds[0]);
          if (this.entityIds[0] === this.entityIds[2]) {
            return entity1 ? t('issues.almost_junction.self.message', {
              feature: utilDisplayLabel(entity1, context)
            }) : '';
          } else {
            const entity2 = context.hasEntity(this.entityIds[2]);
            return (entity1 && entity2) ? t('issues.almost_junction.message', {
              feature: utilDisplayLabel(entity1, context),
              feature2: utilDisplayLabel(entity2, context)
            }) : '';
          }
        },
        reference: showReference,
        entityIds: [
          entity.id,
          extendableNodeInfo.node.id,
          extendableNodeInfo.wid,
        ],
        loc: extendableNodeInfo.node.loc,
        hash: JSON.stringify(extendableNodeInfo.node.loc),
        data: {
          midId: extendableNodeInfo.mid.id,
          edge: extendableNodeInfo.edge,
          cross_loc: extendableNodeInfo.cross_loc
        },
        dynamicFixes: makeFixes
      }));
    });

    return issues;

    function makeFixes(context) {
      let fixes = [new validationIssueFix({
        icon: 'iD-icon-abutment',
        title: t('issues.fix.connect_features.title'),
        onClick(context) {
          const annotation = t('issues.fix.connect_almost_junction.annotation');
          const [, endNodeId, crossWayId] = this.issue.entityIds;
          const midNode = context.entity(this.issue.data.midId);
          const endNode = context.entity(endNodeId);
          const crossWay = context.entity(crossWayId);

          // When endpoints are close, just join if resulting small change in angle (#7201)
          const nearEndNodes = findNearbyEndNodes(endNode, crossWay);
          if (nearEndNodes.length > 0) {
            const collinear = findSmallJoinAngle(midNode, endNode, nearEndNodes);
            if (collinear) {
              context.perform(
                actionMergeNodes([collinear.id, endNode.id], collinear.loc),
                annotation
              );
              return;
            }
          }

          const targetEdge = this.issue.data.edge;
          const crossLoc = this.issue.data.cross_loc;
          const edgeNodes = [context.entity(targetEdge[0]), context.entity(targetEdge[1])];
          const closestNodeInfo = geoSphericalClosestNode(edgeNodes, crossLoc);

          // already a point nearby, just connect to that
          if (closestNodeInfo.distance < WELD_TH_METERS) {
            context.perform(
              actionMergeNodes([closestNodeInfo.node.id, endNode.id], closestNodeInfo.node.loc),
              annotation
            );
          // else add the end node to the edge way
          } else {
            context.perform(
              actionAddMidpoint({loc: crossLoc, edge: targetEdge}, endNode),
              annotation
            );
          }
        }
      })];

      const node = context.hasEntity(this.entityIds[1]);
      if (node && !node.hasInterestingTags()) {
        // node has no descriptive tags, suggest noexit fix
        fixes.push(new validationIssueFix({
          icon: 'maki-barrier',
          title: t('issues.fix.tag_as_disconnected.title'),
          onClick(context) {
            const nodeID = this.issue.entityIds[1];
            const tags = Object.assign({}, context.entity(nodeID).tags);
            tags.noexit = 'yes';
            context.perform(
              actionChangeTags(nodeID, tags),
              t('issues.fix.tag_as_disconnected.annotation')
            );
          }
        }));
      }

      return fixes;
    }

    function showReference(selection) {
      selection.selectAll('.issue-reference')
        .data([0])
        .enter()
        .append('div')
        .attr('class', 'issue-reference')
        .text(t('issues.almost_junction.highway-highway.reference'));
    }

    function isExtendableCandidate(node, way) {
      // can not accurately test vertices on tiles not downloaded from osm - #5938
      const osm = services.osm;
      if (osm && !osm.isDataLoaded(node.loc)) {
        return false;
      }
      if (isTaggedAsNotContinuing(node) || graph.parentWays(node).length !== 1) {
        return false;
      }

      let occurences = 0;
      for (const index in way.nodes) {
        if (way.nodes[index] === node.id) {
          occurences += 1;
          if (occurences > 1) {
            return false;
          }
        }
      }
      return true;
    }

    function findConnectableEndNodesByExtension(way) {
      let results = [];
      if (way.isClosed()) return results;

      let testNodes;
      const indices = [0, way.nodes.length - 1];
      indices.forEach(nodeIndex => {
        const nodeID = way.nodes[nodeIndex];
        const node = graph.entity(nodeID);

        if (!isExtendableCandidate(node, way)) return;

        const connectionInfo = canConnectByExtend(way, nodeIndex);
        if (!connectionInfo) return;

        testNodes = graph.childNodes(way).slice();   // shallow copy
        testNodes[nodeIndex] = testNodes[nodeIndex].move(connectionInfo.cross_loc);

        // don't flag issue if connecting the ways would cause self-intersection
        if (geoHasSelfIntersections(testNodes, nodeID)) return;

        results.push(connectionInfo);
      });

      return results;
    }

    function findNearbyEndNodes(node, way) {
      return [
        way.nodes[0],
        way.nodes[way.nodes.length - 1]
      ].map(d => graph.entity(d))
      .filter(d => {
        // Node cannot be near to itself, but other endnode of same way could be
        return d.id !== node.id
          && geoSphericalDistance(node.loc, d.loc) <= CLOSE_NODE_TH;
      });
    }

    function findSmallJoinAngle(midNode, tipNode, endNodes) {
      // Both nodes could be close, so want to join whichever is closest to collinear
      let joinTo;
      let minAngle = Infinity;

      // Checks midNode -> tipNode -> endNode for collinearity
      endNodes.forEach(endNode => {
        const a1 = geoAngle(midNode, tipNode, context.projection) + Math.PI;
        const a2 = geoAngle(midNode, endNode, context.projection) + Math.PI;
        const diff = Math.max(a1, a2) - Math.min(a1, a2);

        if (diff < minAngle) {
          joinTo = endNode;
          minAngle = diff;
        }
      });

      /* Threshold set by considering right angle triangle
      based on node joining threshold and extension distance */
      if (minAngle <= SIG_ANGLE_TH) return joinTo;

      return null;
    }

    function hasTag(tags, key) {
      return tags[key] !== undefined && tags[key] !== 'no';
    }

    function canConnectWays(way, way2) {

      // allow self-connections
      if (way.id === way2.id) return true;

      // if one is bridge or tunnel, both must be bridge or tunnel
      if ((hasTag(way.tags, 'bridge') || hasTag(way2.tags, 'bridge')) &&
        !(hasTag(way.tags, 'bridge') && hasTag(way2.tags, 'bridge'))) return false;
      if ((hasTag(way.tags, 'tunnel') || hasTag(way2.tags, 'tunnel')) &&
        !(hasTag(way.tags, 'tunnel') && hasTag(way2.tags, 'tunnel'))) return false;

      // must have equivalent layers and levels
      const layer1 = way.tags.layer || '0',
        layer2 = way2.tags.layer || '0';
      if (layer1 !== layer2) return false;

      const level1 = way.tags.level || '0',
        level2 = way2.tags.level || '0';
      if (level1 !== level2) return false;

      return true;
    }

    function canConnectByExtend(way, endNodeIdx) {
      const tipNid = way.nodes[endNodeIdx];  // the 'tip' node for extension point
      const midNid = endNodeIdx === 0 ? way.nodes[1] : way.nodes[way.nodes.length - 2];  // the other node of the edge
      const tipNode = graph.entity(tipNid);
      const midNode = graph.entity(midNid);
      const lon = tipNode.loc[0];
      const lat = tipNode.loc[1];
      const lon_range = geoMetersToLon(EXTEND_TH_METERS, lat) / 2;
      const lat_range = geoMetersToLat(EXTEND_TH_METERS) / 2;
      const queryExtent = geoExtent([
        [lon - lon_range, lat - lat_range],
        [lon + lon_range, lat + lat_range]
      ]);

      // first, extend the edge of [midNode -> tipNode] by EXTEND_TH_METERS and find the "extended tip" location
      const edgeLen = geoSphericalDistance(midNode.loc, tipNode.loc);
      const t = EXTEND_TH_METERS / edgeLen + 1.0;
      const extTipLoc = geoVecInterp(midNode.loc, tipNode.loc, t);

      // then, check if the extension part [tipNode.loc -> extTipLoc] intersects any other ways
      const intersected = tree.intersects(queryExtent, graph);
      for (let i = 0; i < intersected.length; i++) {
        let way2 = intersected[i];

        if (!isHighway(way2)) continue;

        if (!canConnectWays(way, way2)) continue;

        for (let j = 0; j < way2.nodes.length - 1; j++) {
          let nAid = way2.nodes[j],
            nBid = way2.nodes[j + 1];

          if (nAid === tipNid || nBid === tipNid) continue;

          let nA = graph.entity(nAid),
            nB = graph.entity(nBid);
          let crossLoc = geoLineIntersection([tipNode.loc, extTipLoc], [nA.loc, nB.loc]);
          if (crossLoc) {
            return {
              mid: midNode,
              node: tipNode,
              wid: way2.id,
              edge: [nA.id, nB.id],
              cross_loc: crossLoc
            };
          }
        }
      }
      return null;
    }
  };

  validation.type = type;

  return validation;
}
