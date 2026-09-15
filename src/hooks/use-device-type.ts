"use client";

import { useEffect, useState } from "react";
import { detectDeviceEnvironment } from "@/lib/device/device-context";

export type DeviceType = "mobile" | "desktop" | "tv";

interface DeviceInfo {
  deviceType: DeviceType;
  isTV: boolean;
  isLowMemory: boolean;
}

const DEFAULT_DEVICE: DeviceInfo = { deviceType: "desktop", isTV: false, isLowMemory: true };

function detectDevice(): DeviceInfo {
  const environment = detectDeviceEnvironment();
  return { deviceType: environment.platform, isTV: environment.isTV, isLowMemory: environment.isLowMemory };
}

export function useDeviceType(): DeviceInfo {
  const [device, setDevice] = useState<DeviceInfo>(DEFAULT_DEVICE);

  useEffect(() => {
    const updateDevice = () => {
      const nextDevice = detectDevice();
      setDevice(nextDevice);
      document.documentElement.dataset.device = nextDevice.deviceType;
      document.documentElement.dataset.lowMemory = String(nextDevice.isLowMemory);
    };
    updateDevice();
    window.addEventListener("resize", updateDevice);
    return () => {
      window.removeEventListener("resize", updateDevice);
      delete document.documentElement.dataset.device;
      delete document.documentElement.dataset.lowMemory;
    };
  }, []);

  return device;
}