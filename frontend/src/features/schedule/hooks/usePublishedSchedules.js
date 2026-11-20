import { useEffect, useState } from "react";
import { loadPublishedSchedule, loadScheduleVersions } from "../api.js";
import { chooseDefaultVersion, normalizeSchedule, normalizeVersions } from "../model.js";

export function usePublications() {
  const [state, setState] = useState({
    status: "loading",
    versions: [],
    selectedId: "",
    error: "",
  });
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState((previous) => ({ ...previous, status: "loading", error: "" }));

    loadScheduleVersions({ signal: controller.signal })
      .then(normalizeVersions)
      .then((versions) => {
        if (!active) return;
        setState((previous) => ({
          status: "ready",
          versions,
          selectedId: versions.some((version) => version.uuid === previous.selectedId)
            ? previous.selectedId
            : chooseDefaultVersion(versions)?.uuid || "",
          error: "",
        }));
      })
      .catch((error) => {
        if (!active || error?.name === "AbortError") return;
        // A failed refresh must not keep an old publication visible.
        setState({ status: "error", versions: [], selectedId: "", error: error.message });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshToken]);

  const selected = state.status === "ready"
    ? state.versions.find((version) => version.uuid === state.selectedId) || null
    : null;

  return {
    ...state,
    selected,
    refreshToken,
    select: (uuid) => setState((previous) => ({ ...previous, selectedId: uuid })),
    refresh: () => setRefreshToken((value) => value + 1),
  };
}

export function usePublishedSchedule(version, refreshToken) {
  const [state, setState] = useState({
    status: "idle",
    versionId: "",
    data: null,
    error: "",
  });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!version) return undefined;
    const controller = new AbortController();
    let active = true;
    setState({ status: "loading", versionId: version.uuid, data: null, error: "" });

    loadPublishedSchedule(version, { signal: controller.signal })
      .then((payload) => normalizeSchedule(payload, version))
      .then((data) => {
        if (active) {
          setState({ status: "ready", versionId: version.uuid, data, error: "" });
        }
      })
      .catch((error) => {
        if (!active || error?.name === "AbortError") return;
        setState({
          status: "error", versionId: version.uuid, data: null, error: error.message,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [version, refreshToken, retryToken]);

  if (!version || state.versionId !== version.uuid) {
    return {
      status: version ? "loading" : "idle",
      data: null,
      error: "",
      retry: () => setRetryToken((value) => value + 1),
    };
  }
  return { ...state, retry: () => setRetryToken((value) => value + 1) };
}
