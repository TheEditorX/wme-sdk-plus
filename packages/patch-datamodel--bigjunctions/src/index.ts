import { SdkPatcherRule } from '@wme-enhanced-sdk/sdk-patcher';
import addBigJunctionRules from './rules/add-big-junction.rules.js';
import configureArtifactsRules from './rules/configure-artifacts.rules.js';
import updateBigJunctionRules from './rules/update-big-junction.rules.js';

export default [
  ...configureArtifactsRules,
  ...addBigJunctionRules,
  ...updateBigJunctionRules,
] as SdkPatcherRule[];
