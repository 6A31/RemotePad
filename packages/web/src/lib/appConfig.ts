export async function patchAppConfig(
  token: string,
  patch: { robloxMode?: boolean },
): Promise<{ robloxMode: boolean } | null> {
  try {
    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    return (await res.json()) as { robloxMode: boolean };
  } catch {
    return null;
  }
}
