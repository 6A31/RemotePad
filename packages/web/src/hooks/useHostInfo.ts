import { useEffect, useState } from "react";
import type { HostInfo } from "@remotepad/protocol";
import { fetchHostInfo } from "../lib/hostInfo";

export function useHostInfo(): HostInfo | null {
  const [info, setInfo] = useState<HostInfo | null>(null);

  useEffect(() => {
    void fetchHostInfo().then(setInfo);
  }, []);

  return info;
}
