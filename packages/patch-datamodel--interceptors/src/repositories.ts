import { SdkPatcherRule } from '@wme-enhanced-sdk/sdk-patcher';
import { createRepositoryInterceptorRule } from './lib/create-repository-interceptor-rule.js';

/**
 * Builds the three action point names for a repository.
 *
 * Convention: `DataModel.{PascalRepositoryName}.{added|changed|removed}`
 */
function makeRule(repositoryKey: string, pascalName: string): SdkPatcherRule {
  return createRepositoryInterceptorRule({
    repositoryKey,
    addedActionPoint: `DataModel.${pascalName}.added`,
    changedActionPoint: `DataModel.${pascalName}.changed`,
    removedActionPoint: `DataModel.${pascalName}.removed`,
  });
}

/**
 * One {@link SdkPatcherRule} per WME data-model repository listed in
 * `DATA_MODEL_NAMES`.  Each rule installs a {@link RepositoryInterceptor} that
 * routes Backbone Collection mutations through the middleware chain.
 */
export const repositoryRules: SdkPatcherRule[] = [
  makeRule('bigJunctions', 'BigJunctions'),
  makeRule('cities', 'Cities'),
  makeRule('countries', 'Countries'),
  makeRule('majorTrafficEvents', 'MajorTrafficEvents'),
  makeRule('mapComments', 'MapComments'),
  makeRule('mapProblems', 'MapProblems'),
  makeRule('mapUpdateRequests', 'MapUpdateRequests'),
  makeRule('nodes', 'Nodes'),
  makeRule('roadClosures', 'RoadClosures'),
  makeRule('segments', 'Segments'),
  makeRule('states', 'States'),
  makeRule('streets', 'Streets'),
  makeRule('updateRequestSessions', 'UpdateRequestSessions'),
  makeRule('venues', 'Venues'),
  makeRule('segmentHouseNumbers', 'SegmentHouseNumbers'),
];
