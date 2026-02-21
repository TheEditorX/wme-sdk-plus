/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Type definitions for WME internal structures (not exposed in official SDK)
 */

export interface WazeMapLayers {
  segmentLayer: any;
  venueLayer: any;
  commentLayer: any;
  nodeLayer: any;
  bigJunctionLayer: any;
  permanentHazardLayers: any[];
  restrictedDrivingAreaLayer: any;
}

export interface WazeWindow extends Window {
  W: {
    map: {
      olMap: any;
      segmentLayer: any;
      venueLayer: any;
      commentLayer: any;
      nodeLayer: any;
      bigJunctionLayer: any;
      permanentHazardLayers: any[];
      restrictedDrivingAreaLayer: any;
    };
    selectionManager: any;
    model: any;
  };
  OpenLayers: any;
}

/**
 * Helper to get the appropriate layer for a feature type
 */
export function getLayerForFeatureType(wazeMap: WazeWindow['W']['map'], featureType: string): any | any[] {
  switch (featureType) {
    case 'segment':
      return wazeMap.segmentLayer;
    case 'venue':
      return wazeMap.venueLayer;
    case 'mapComment':
      return wazeMap.commentLayer;
    case 'node':
      return wazeMap.nodeLayer;
    case 'bigJunction':
      return wazeMap.bigJunctionLayer;
    case 'permanentHazard':
      return wazeMap.permanentHazardLayers; // Array of layers
    case 'restrictedDrivingArea':
      return wazeMap.restrictedDrivingAreaLayer;
    default:
      return null;
  }
}

/**
 * Helper to get feature from layer by ID
 */
export function getFeatureFromLayer(layer: any, featureId: number | string): any {
  if (!layer || !layer.features) return null;
  
  // Try direct featureMap access if available
  if (layer.featureMap && layer.featureMap[featureId]) {
    return layer.featureMap[featureId];
  }
  
  // Fallback to searching features array
  return layer.features.find((f: any) => f.attributes?.id === featureId || f.fid === featureId);
}

/**
 * Helper to get all features from permanent hazard layers
 */
export function getFeaturesFromPermanentHazardLayers(layers: any[], featureId: number | string): any[] {
  const features: any[] = [];
  for (const layer of layers) {
    const feature = getFeatureFromLayer(layer, featureId);
    if (feature) {
      features.push(feature);
    }
  }
  return features;
}
