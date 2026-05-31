import { useEffect, useState } from "react";
import type { HostInfo } from "@remotepad/protocol";
import { fetchHostInfo } from "../lib/hostInfo";

export function useHostInfo(): HostInfo | null {
  const [info, setInfo] = useState<HostInfo | null>(null);

  useEffect(() => {
    const refresh = () => {
      void fetchHostInfo().then(setInfo);
    };

    refresh();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("remotepad-config-updated", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("remotepad-config-updated", refresh);
    };
  }, []);

  return info;
}
