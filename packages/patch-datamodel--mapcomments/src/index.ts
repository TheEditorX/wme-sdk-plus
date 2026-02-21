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
import { doActions } from '@wme-enhanced-sdk/patch-editing--transactions';

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

  new DefinePropertyRule('DataModel.MapComments.addMapComment', ({ sdk }: { sdk: WmeSDK }) => {
    if (typeof sdk.DataModel.MapComments.addComment === 'function') {
      return (args: AddMapCommentArgs) => {
        console.warn('[WME SDK+]: "MapComments.addMapComment" method from SDK+ is deprecated. Please use "MapComments.addComment" from the official SDK instead. This method will cease to exist in future SDK+ versions');

        const mapComment = doActions(() => {
          const mapComment = sdk.DataModel.MapComments.addComment({
            subject: args.subject ?? "",
            body: args.body ?? "",
            endDate: args.endDate ? args.endDate.getTime() / 1000 : 0,
            geometry: args.geometry,
          });

          // Waze requires all attributes in their interface to be provided, yet they..
          // ..miss some of the other attributes we could set.
          // After we have added the map comment using the native SDK implementation,..
          // ..we will collect a list of other attribtues to set/modify, to match the expected..
          // ..behavior of our function.
          //
          // For example, Waze requires an expiration date (endDate) to be provided.
          // This is counter intuitive and unnecessary, and sometimes illogical..
          // ..yet, they require it. When adding the map comment using the SDK,..
          // ..we will provide a default value (of 0) so their implementation won't fail,..
          // ..and afterwards, as we manage the data, we'll clear the expiration date using the legacy "UpdateObject" action.
          // The same will be true for setting attributes that are otherwise aren't supported by the SDK implementation.
          const attributesToSet: Record<string, unknown> = {};
          if (args.lockRank !== undefined) {
            attributesToSet.lockRank = args.lockRank;
          }
          if (!args.endDate) {
            // Waze forces us (in SDK v2.340-9) into setting an expiration date..
            // ..but our implementation does not require it, so when we receive no expiration date..
            // ..we will use a default value on the addComment implementation, and here we'll clear it.
            attributesToSet.endDate = null;
          }

          if (Object.keys(attributesToSet).length > 0) {
            const wmeMapComment = getMapComment(mapComment.id);
            if (!wmeMapComment)
              throw new sdk.Errors.WMEError("Unable to retrieve a reference to the WME MapComment object to update it's attributes.");

            pushUpdateObjectAction(wmeMapComment, attributesToSet);
          }

          return mapComment;
        });
        
        return mapComment.id;
      };
    }

    return (args: AddMapCommentArgs) => {
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
    }
  }, { isFactory: true }),

  new DefinePropertyRule('DataModel.MapComments.updateMapComment', ({ sdk }: { sdk: WmeSDK }) => {
    if (typeof sdk.DataModel.MapComments.updateComment === 'function') {
      console.warn('[WME SDK+]: "MapComments.updateMapComment" method from SDK+ is deprecated. Please use "MapComments.addComment" from the official SDK instead. This method will cease to exist in future SDK+ versions');

      return (args: UpdateMapCommentsArgs) => {
        doActions(() => {
          const mapComment = sdk.DataModel.MapComments.updateComment({
            mapCommentId: args.mapCommentId,
            subject: args.subject ?? "",
            body: args.body ?? "",
            geometry: args.geometry,
          });

          // Waze requires all attributes in their interface to be provided, yet they..
          // ..miss some of the other attributes we could set.
          // After we have added the map comment using the native SDK implementation,..
          // ..we will collect a list of other attribtues to set/modify, to match the expected..
          // ..behavior of our function.
          const attributesToSet: Record<string, unknown> = {};
          if (args.lockRank !== undefined) {
            attributesToSet.lockRank = args.lockRank;
          }

          if (Object.keys(attributesToSet).length > 0) {
            const wmeMapComment = getMapComment(mapComment.id);
            if (!wmeMapComment)
              throw new sdk.Errors.WMEError("Unable to retrieve a reference to the WME MapComment object to update it's attributes.");

            pushUpdateObjectAction(wmeMapComment, attributesToSet);
          }
        });
      }
    };

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
