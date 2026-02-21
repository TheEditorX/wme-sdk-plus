/* eslint-disable @typescript-eslint/no-explicit-any */
import { DefineMiddlewareActionPointRule } from '../../define-middleware-action-point.js';
import { SaveClosuresData } from './interfaces/save-closures-data.js';
import { AppSaveControllerInterceptor, SaveRequest } from './AppSaveControllerInterceptor.js';
import { getWindow } from '@wme-enhanced-sdk/utils';
import { isAddRoadClosureAction } from './utils/is-add-road-closure-action.js';
import { isAddTurnClosureAction } from './utils/is-add-turn-closure-action.js';
import { isUpdateRoadClosureAction } from './utils/is-update-road-closure-action.js';
import { isUpdateTurnClosureAction } from './utils/is-update-turn-closure-action.js';
import { isDeleteRoadClosureAction } from './utils/is-delete-road-closure-action.js';
import { isDeleteTurnClosureAction } from './utils/is-delete-turn-closure-action.js';
import { Closure, ClosureToDelete } from './interfaces/closure.js';
import { SegmentClosure } from './interfaces/segment-closure.js';
import { TurnClosure } from './interfaces/turn-closure.js';
import {
  AnyClosureAction,
  getAllClosureActions,
} from './utils/find-all-closure-actions.js';
import { wmeClosureToMiddlewareClosure } from './utils/wme-closure-to-middleware-closure.js';
import { compareClosuresArrays } from './utils/compare-closures-arrays.js';
import { SdkPatcherRule } from '@wme-enhanced-sdk/sdk-patcher';
import { resolveEntityPrototype } from '@wme-enhanced-sdk/wme-utils';
import { RoadClosure } from '../../@wme-typings/Waze/DataModels/RoadClosure.js';
import { TurnClosure as WmeTurnClosure } from '../../@wme-typings/Waze/DataModels/TurnClosure.js';
import { middlewareClosureToWmeClosure } from './utils/middleware-closure-to-wme-closure.js';
import { ROAD_CLOSURE_ARTIFACT, TURN_CLOSURE_ARTIFACT } from './consts.js';
import { Action } from '../../@wme-typings/Waze/actions/index.js';

function closureActionToClosureData(
  action: AnyClosureAction
):
  | Closure
  | SegmentClosure
  | TurnClosure
  | ClosureToDelete<Closure | SegmentClosure | TurnClosure>
  | null {
  if (isAddRoadClosureAction(action))
    return { ...wmeClosureToMiddlewareClosure(action.closure), id: null };

  if (isAddTurnClosureAction(action))
    return { ...wmeClosureToMiddlewareClosure(action.getObject()), id: null };

  if (isUpdateRoadClosureAction(action))
    return wmeClosureToMiddlewareClosure(action.getObject());

  if (isDeleteRoadClosureAction(action))
    return wmeClosureToMiddlewareClosure(action.closure);

  if (isUpdateTurnClosureAction(action) || isDeleteTurnClosureAction(action))
    return wmeClosureToMiddlewareClosure(action.getObject());

  return null;
}

export default [
  {
    async install() {
      const RoadClosure: { new (attributes: object): RoadClosure } =
        await resolveEntityPrototype('roadClosures', {});
      return {
        [ROAD_CLOSURE_ARTIFACT]: RoadClosure,
      };
    },
  },
  {
    async install() {
      const TurnClosure: { new (attributes: object): WmeTurnClosure } =
        await resolveEntityPrototype('turnClosures', {});
      return {
        [TURN_CLOSURE_ARTIFACT]: TurnClosure,
      };
    },
  },
  new DefineMiddlewareActionPointRule<SaveClosuresData>({
    actionPoint: 'closures.save',
    install: (triggerMiddlewares, artifacts) => {
      const window = getWindow<any>();
      const controllerInterceptor = new AppSaveControllerInterceptor(
        window.W,
        async (saveRequest) => {
          const allActions = saveRequest.getActionsFlat();
          const allClosureActions = getAllClosureActions(allActions);

          if (!allClosureActions.length) return;

          const { delete: closuresToDelete, set: closuresToSet } =
            allClosureActions.reduce<{
              delete: AnyClosureAction[];
              set: AnyClosureAction[];
            }>(
              (acc, action) => {
                const array =
                  isDeleteRoadClosureAction(action) ||
                  isDeleteTurnClosureAction(action)
                    ? acc.delete
                    : acc.set;
                array.push(action);
                return acc;
              },
              { delete: [], set: [] }
            );

          const initialContextData = {
            source: undefined,
            closures: closuresToSet
              .map(closureActionToClosureData)
              .filter(Boolean) as Closure[],
            deleteClosures: closuresToDelete
              .map(closureActionToClosureData)
              .filter(Boolean) as Closure[],
          };
          const mutatedContextData = await triggerMiddlewares(
            initialContextData
          );
          const hasDirtyClosures = compareClosuresArrays(
            initialContextData.closures,
            mutatedContextData.closures
          );
          const hasDirtyDeleteClosures = compareClosuresArrays(
            initialContextData.deleteClosures,
            mutatedContextData.deleteClosures
          );
          if (hasDirtyClosures && hasDirtyDeleteClosures) return;

          const AddRoadClosureAction = allClosureActions.find((action) =>
            isAddRoadClosureAction(action)
          )?.constructor as { new (closure: RoadClosure, segment: any): any };
          const AddTurnClosureAction = allClosureActions.find((action) =>
            isAddTurnClosureAction(action)
          )?.constructor as {
            new (
              turnClosure: WmeTurnClosure,
              fromSegment: any,
              toSegment: any
            ): any;
          };

          allClosureActions.forEach((action) => {
            const path = saveRequest.getActionPath(action);
            if (!path) return;
            saveRequest.removeAction(path);
            action.undoAction(window.W.model);
          });
          const { addClosureActions, updateClosureActions } = mutatedContextData.closures.reduce<{ addClosureActions: Action[]; updateClosureActions: Action[] }>(
            (acc, closure) => {
              const window = getWindow<any>();
              const wmeClosure = middlewareClosureToWmeClosure(
                closure as TurnClosure | SegmentClosure,
                artifacts as any
              );
              if (!wmeClosure) return acc;

              if (!closure.id) {
                const action = (() => {
                  switch (closure.closureType) {
                    case 'SEGMENT': {
                      if (!AddRoadClosureAction) {
                        const CreateObject = window.require(
                          'Waze/Action/CreateObject'
                        );
                        return new CreateObject(wmeClosure);
                      }
                      const segment = window.W.model.segments.getObjectById(
                        (closure as SegmentClosure).segmentId
                      );
                      return new AddRoadClosureAction(
                        wmeClosure as RoadClosure,
                        segment
                      );
                    }
                    case 'TURN': {
                      if (!AddTurnClosureAction) {
                        const CreateObject = window.require(
                          'Waze/Action/CreateObject'
                        );
                        return new CreateObject(wmeClosure);
                      }
                      const fromSegment = window.W.model.segments.getObjectById(
                        (closure as TurnClosure).fromSegmentId
                      );
                      const toSegment = window.W.model.segments.getObjectById(
                        (closure as TurnClosure).toSegmentId
                      );
                      return new AddTurnClosureAction(
                        wmeClosure as WmeTurnClosure,
                        fromSegment,
                        toSegment
                      );
                    }
                    default:
                      throw new Error(
                        'Unregistered closure factory for closure type ' +
                          closure.closureType
                      );
                  }
                })();
                if (action) acc.addClosureActions.push(action);
              }

              const updateAction = (() => {
                // we have an ID, we need to update
                const existingClosure = window.W.model
                  .getRepository(
                    closure.closureType === 'SEGMENT'
                      ? 'roadClosure'
                      : 'turnClosure'
                  )
                  .getObjectById(closure.id);
                if (!existingClosure) return null;
                const UpdateObject = window.require('Waze/Action/UpdateObject');
                return new UpdateObject(existingClosure, wmeClosure.attributes);
              })();
              if (updateAction) acc.updateClosureActions.push(updateAction);
              return acc;
            },
            {
              addClosureActions: [],
              updateClosureActions: [],
            }
          );
          const deleteClosureActions = mutatedContextData.deleteClosures.map(
            (closure) => {
              const window = getWindow<any>();
              const existingClosure = window.W.model
                .getRepository(
                  closure.closureType === 'SEGMENT'
                    ? 'roadClosure'
                    : 'turnClosure'
                )
                .getObjectById(closure.id);
              if (!existingClosure) return null;
              const DeleteObject = window.require('Waze/Action/DeleteObject');
              return new DeleteObject(existingClosure);
            }
          );

          // since the backend can't reduce closure actions, we will send them type by type
          // first send the updates, as those might be blocking add and delete actions
          // then delete actions, since those might be limited us because of time overlapping
          // and lastly, do all the adds
          // luckily, the AppSaveControllerInterceptor supports returning multiple SaveRequests, and it'll execute them sequentially
          return [
            new SaveRequest(updateClosureActions.filter(Boolean)),
            new SaveRequest(deleteClosureActions.filter(Boolean)),
            new SaveRequest(addClosureActions.filter(Boolean)),
          ].filter((request) => request.actions.length > 0);
        }
      );
      controllerInterceptor.enable();

      return () => {
        controllerInterceptor.disable();
      };
    },
  }),
] as SdkPatcherRule[];
