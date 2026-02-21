/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getWindow } from '@wme-enhanced-sdk/utils';
import { RoadClosure } from '../../../@wme-typings/Waze/DataModels/RoadClosure.js';
import { TurnClosure as WmeTurnClosure } from '../../../@wme-typings/Waze/DataModels/TurnClosure.js';
import { Artifacts } from '../artifacts-type.js';
import { ROAD_CLOSURE_ARTIFACT, TURN_CLOSURE_ARTIFACT } from '../consts.js';
import { Closure } from '../interfaces/closure.js';
import { SegmentClosure } from '../interfaces/segment-closure.js';
import { TurnClosure } from '../interfaces/turn-closure.js';
import { ClosureAttributes } from '../../../@wme-typings/Waze/DataModels/Closure.js';
import { serializeDate } from './serialize-date.js';

function getRepositoryByClosureType(type: Closure['closureType']): any {
  const window = getWindow<any>();
  const typeToRepositoryName: Record<Closure['closureType'], string> = {
    SEGMENT: 'roadClosure',
    TURN: 'turnClosure',
  };

  return window.W.model.getRepository(typeToRepositoryName[type]);
}

export function middlewareClosureToWmeClosure(
  segmentClosure: SegmentClosure,
  artifacts: Artifacts
): RoadClosure | null;
export function middlewareClosureToWmeClosure(
  turnClosure: TurnClosure,
  artifacts: Artifacts
): WmeTurnClosure | null;
export function middlewareClosureToWmeClosure(
  closure: TurnClosure | SegmentClosure,
  artifacts: Artifacts
): RoadClosure | WmeTurnClosure | null;
export function middlewareClosureToWmeClosure(
  closure: TurnClosure | SegmentClosure,
  artifacts: Artifacts
): RoadClosure | WmeTurnClosure | null {
  const commonClosureAttributes: Omit<
    ClosureAttributes,
    'closureType' | 'permanent'
  > = {
    id:
      closure.id ||
      getRepositoryByClosureType(closure.closureType).idGenerator.next(),
    attributions: null,
    reason: closure.description,
    startDate: serializeDate(closure.startDate),
    endDate: serializeDate(closure.endDate),
    eventId: closure.eventId,
    externalProvider: null,
    externalProviderId: null,
    provider: 'provider' in closure ? closure.provider : null,
    createdBy: null!,
    createdOn: null!,
    updatedBy: null!,
    updatedOn: null!,
    permissions: -1,
    geometry: null,
  };
  switch (closure.closureType) {
    case 'SEGMENT':
      return new artifacts[ROAD_CLOSURE_ARTIFACT]({
        ...commonClosureAttributes,
        closureType: 'SEGMENT',
        permanent: closure.permanent,
        segID: closure.segmentId,
        forward: closure.forward,
        fromNodeClosed: closure.nodeClosure,
      });
    case 'TURN':
      return new artifacts[TURN_CLOSURE_ARTIFACT]({
        ...commonClosureAttributes,
        closureType: 'TURN',
        permanent: true,
        fromSegID: closure.fromSegmentId,
        fromSegForward: closure.fromSegmentForward,
        toSegID: closure.toSegmentId,
        toSegForward: closure.toSegmentForward,
        nodeConnID: closure.nodeId,
      });
  }
}
