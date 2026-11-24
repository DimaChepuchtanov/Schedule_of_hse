import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import DirectoryCards from "./components/DirectoryCards.jsx";
import DirectoryTable from "./components/DirectoryTable.jsx";
import { DIRECTORIES, MODULES_TABLE } from "./catalog.js";
import "./reference.css";

export default function DirectoriesSection() {
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const selectedKey = params.get("directory");
  const selected = DIRECTORIES.find((directory) => directory.key === selectedKey);

  function directoryHref(key) {
    const next = new URLSearchParams(params);
    next.set("section", "directories");
    if (key) next.set("directory", key);
    else next.delete("directory");
    return `?${next}`;
  }

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetch("/api/reference/", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.errors?.[0] || "Не удалось загрузить справочники.");
        }
        if (!payload || DIRECTORIES.some(({ key }) => !Array.isArray(payload[key]))) {
          throw new Error("Сервер вернул справочники в неверном формате.");
        }
        return payload;
      })
      .then((payload) => {
        if (!controller.signal.aborted) setData(payload);
      })
      .catch((failure) => {
        if (!controller.signal.aborted && failure.name !== "AbortError") {
          setError(failure.message);
        }
      });
    return () => controller.abort();
  }, [attempt]);

  if (error) {
    return (
      <div className="directories__state">
        <p role="alert">{error}</p>
        <button className="directories__retry" onClick={() => setAttempt((value) => value + 1)}>
          Повторить загрузку
        </button>
      </div>
    );
  }
  if (!data) return <p role="status">Загружаем справочники…</p>;

  return (
    <div className="directories">
      {selected ? (
        <>
          <Link className="directories__back" to={directoryHref()}>
            <ArrowLeft size={18} aria-hidden="true" /> Все справочники
          </Link>
          <DirectoryTable definition={selected} rows={data[selected.key]} />
          {selected.key === "universities" && (
            <DirectoryTable definition={MODULES_TABLE} rows={data.modules || []} />
          )}
        </>
      ) : (
        <DirectoryCards data={data} directoryHref={directoryHref} />
      )}
    </div>
  );
}
