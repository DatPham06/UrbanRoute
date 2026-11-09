import React from 'react';
import { LeafletMap, LeafletMapProps } from './LeafletMap';

export type GoogleMapWrapperProps = LeafletMapProps;

/**
 * Map wrapper now fully powered by Leaflet with street, satellite and terrain layers
 */
export const GoogleMapWrapper: React.FC<LeafletMapProps> = (props) => {
  return <LeafletMap {...props} />;
};
