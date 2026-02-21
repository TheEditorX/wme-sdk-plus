import { DefinePropertyRule, SdkPatcherRule } from '@wme-enhanced-sdk/sdk-patcher';
import { resolveEntityPrototype } from '@wme-enhanced-sdk/wme-utils';
import { point } from '@turf/helpers';
import { AddMapCommentArgs } from './lib/add-map-comments-args.js';
import { pushCreateObjectAction } from './lib/create-object-action.js';
import { formatEndDate } from './lib/format-end-date.js';
import { UpdateMapCommentsArgs } from './lib/update-map-comments-args.js';
import { getMapComment } from './lib/get-map-comment.js';
import { pushUpdateObjectAction } from './lib/update-object-action.js';
import { WmeSDK } from 'wme-sdk-typings';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let MapComment: any;

function assertMapCommentResolved() {
  if (!MapComment)
    throw new Error('MapComment not initialized. Make sure to await the enhancedSDK function before using it.');
}

export default [
  {
    async install() {
      MapComment = await resolveEntityPrototype('mapComments', {
        geometry: point([0, 0]).geometry,
      });
    },
  } as SdkPatcherRule,

  new DefinePropertyRule('DataModel.MapComments.addMapComment', (args: AddMapCommentArgs) => {
    assertMapCommentResolved();

    const mapComment = new MapComment({
      geoJSONGeometry: args.geometry,
      subject: args.subject,
      body: args.body,
      lockRank: args.lockRank,
      endDate: args.endDate ? formatEndDate(args.endDate) : null,
    });
    pushCreateObjectAction(mapComment);
    return mapComment.getID();
  }),

  new DefinePropertyRule('DataModel.MapComments.updateMapComment', ({ sdk }: { sdk: WmeSDK }) => {
    return (args: UpdateMapCommentsArgs) => {
      const mapComment = getMapComment(args.mapCommentId);
      if (!mapComment) {
        throw new sdk.Errors.DataModelNotFoundError('mapComment', args.mapCommentId);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newAttributes: Record<string, any> = {};
      if (args.geometry) newAttributes.geoJSONGeometry = args.geometry;
      if (args.subject) newAttributes.subject = args.subject;
      if (args.body) newAttributes.body = args.body;
      if (args.lockRank) newAttributes.lockRank = args.lockRank;
  
      pushUpdateObjectAction(mapComment, newAttributes);
    }
  }, { isFactory: true }),
];
