"use client";

import { useEffect, useState } from "react";

export type DeviceType = "mobile" | "desktop" | "tv";

interface DeviceInfo {
  deviceType: DeviceType;
  isTV: boolean;
  isLowMemory: boolean;
}

const DEFAULT_DEVICE: DeviceInfo = { deviceType: "desktop", isTV: false, isLowMemory: true };

function detectDevice(): DeviceInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  const isTV = /android tv|googletv|smart-tv|smarttv|hbbtv|aft\w+|netcast|webos/.test(userAgent) ||
    (navigator.maxTouchPoints > 0 && window.matchMedia("(min-width: 1200px)").matches);
  const isMobile = /android|iphone|ipad|ipod|mobile/.test(userAgent) && !isTV;
  const deviceType: DeviceType = isTV ? "tv" : isMobile ? "mobile" : "desktop";
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const isLowMemory = isTV || isMobile || (typeof memory === "number" && memory <= 2);

  return { deviceType, isTV, isLowMemory };
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