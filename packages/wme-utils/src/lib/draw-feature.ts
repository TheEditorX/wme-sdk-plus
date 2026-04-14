/* eslint-disable @typescript-eslint/no-explicit-any */
import { Point, Polygon } from 'geojson';
import { getFiber, findParentFiber } from '@wme-enhanced-sdk/react-utils';
import { getWindow } from '@wme-enhanced-sdk/utils';
import {
  PropertySwapper,
} from '@wme-enhanced-sdk/method-interceptor';

const interceptDrawControl = (effect?: (control: any) => void) => {
  return new Promise<any>((resolve) => {
    const window = getWindow<{ W: any; }>();
    const swapper = new PropertySwapper(window.W.map.getOLMap(), 'addControl');
    swapper.swap((control: any) => {
      effect?.(control);
      resolve(control);
      swapper.restore();
    });
  });
}

function geometryToFeature(geometry: Point | Polygon) {
  const window = getWindow<{ W: any; OpenLayers: any; }>();

  const openLayersGeometry = window.W.userscripts.toOLGeometry(geometry);
  return new window.OpenLayers.Feature.Vector(openLayersGeometry);
}

export async function drawFeature(
  sidebarListItem: HTMLElement,
  geometry: Point | Polygon,
) {
  const fiberWithDrawInitiator = findParentFiber(
    getFiber(sidebarListItem),
    (fiber) => 'onClick' in fiber.props && typeof fiber.props.onClick === 'function',
  );

  if (!fiberWithDrawInitiator) {
    throw new Error('No fiber found with draw initiator');
  }

  const { onClick } = fiberWithDrawInitiator.props;

  //! OpenLayers dependent code below - implementation might change over time
  const interceptionPromise = interceptDrawControl((control) => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    control.activate = () => {};
  });
  onClick(new Event('click')); // simulate a mouse click to trigger the draw control
  const control = await interceptionPromise;
  control.events.triggerEvent('featureadded', { feature: geometryToFeature(geometry) });
}
