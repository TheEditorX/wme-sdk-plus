/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Model } from 'backbone';

type EntitiesType =
  | 'bigJunctions'
  | 'cities'
  | 'countries'
  | 'editSuggestions'
  | 'eventsForClosures'
  | 'googlePlaces'
  | 'junctions'
  | 'majorTrafficEvents'
  | 'managedAreas'
  | 'mapComments'
  | 'mapProblems'
  | 'mapUpdateRequests'
  | 'nodes'
  | 'onlineEditors'
  | 'permanentHazards'
  | 'problemDetails'
  | 'restrictedDrivingAreas'
  | 'restrictedEditingAreas'
  | 'roadClosures'
  | 'schedules'
  | 'segmentHouseNumbers'
  | 'segmentSuggestions'
  | 'segments'
  | 'signTypes'
  | 'states'
  | 'streets'
  | 'turnClosures'
  | 'updateRequestSessions'
  | 'userAreas'
  | 'users'
  | 'venues';

/**
 * Minimal interface for a WME data model repository instance, sufficient for
 * action capture operations. Any object exposing an `actionManager.add` method
 * satisfies this contract — including both the live `W.model` and dummy instances
 * created via `W.model.constructor`.
 */
export type DataModel = {
  actionManager: ActionManager;

  repos: Record<EntitiesType, any>;
  [repoName in EntitiesType]: any;
  isRepository(name: string): name is EntitiesType;
  getRepositories(): Record<EntitiesType, any>;

  clone(): DataModel;
  mergeObjects(
    objectsByRepos: Partial<Record<EntitiesType, { objects: Model[] }>>,
    options?: {
      areObjectsInBbox?: boolean;
    },
  ): void;
}

interface ActionManager {
  dataModel: DataModel;

  add(action: any): boolean;
  getActions(): any[];
  clear(): void;
  canUndo(): boolean;
  undo(): void;
  undoAll(): void;
  canRedo(): boolean;
  redo(): void;
}
