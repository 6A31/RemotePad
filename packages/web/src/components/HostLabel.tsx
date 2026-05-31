import { useHostInfo } from "../hooks/useHostInfo";

interface HostLabelProps {
  fallback?: string;
}

export function HostLabel({ fallback = "RemotePad" }: HostLabelProps) {
  const info = useHostInfo();
  if (!info) return <span className="brand">{fallback}</span>;
  return (
    <span className="brand" title={info.hostname}>
      {info.hostname}
    </span>
  );
}
