import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = React.useState<DeviceType>('mobile');

  React.useEffect(() => {
    const getDeviceType = (): DeviceType => {
      const width = window.innerWidth;
      if (width < MOBILE_BREAKPOINT) return 'mobile';
      if (width < TABLET_BREAKPOINT) return 'tablet';
      return 'desktop';
    };

    const onChange = () => {
      setDeviceType(getDeviceType());
    };

    // Initial check
    onChange();

    window.addEventListener("resize", onChange);
    return () => window.removeEventListener("resize", onChange);
  }, []);

  return deviceType;
}
