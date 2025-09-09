import React, { useEffect, useRef, useState } from "react";
import Card from "./primitives/Card";
import Button from "./primitives/Button";
import { listFiles, uploadFile, deleteFile } from "../services/api";

const ALLOWED_EXTS = [".pdf", ".docx", ".csv", ".png", ".jpg", ".jpeg"];

export default function FilesPanel({ userId, selectedDocIds, setSelectedDocIds, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const inputRef = useRef(null);

  const load = async () => {
    setBusy(true); setError("");
    try {
      const res = await listFiles({ userId });
      console.log("Files loaded:", res.files);
      setFiles(res.files.filter(
        f => f.size_bytes > 0
      ) || []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (userId) load(); }, [userId, onUploaded]); // eslint-disable-line

  const validExt = (name) => ALLOWED_EXTS.some(s => name.toLowerCase().endsWith(s));

  const handleFiles = async (fileList) => {
    if (!fileList?.length) return;

    const rejected = [];
    const accepted = [];
    for (const f of fileList) {
      if (validExt(f.name)) accepted.push(f);
      else rejected.push(f.name);
    }

    if (!accepted.length) {
      alert("Please upload PDF, DOCX, CSV, PNG, or JPG");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const results = await Promise.allSettled(
        accepted.map(file => uploadFile({ userId, file }))
      );

      const failed = results
        .map((r, i) => ({ r, name: accepted[i].name }))
        .filter(x => x.r.status === "rejected");

      if (rejected.length || failed.length) {
        const msgs = [];
        if (rejected.length) msgs.push(`Unsupported: ${rejected.join(", ")}`);
        if (failed.length) msgs.push(`Failed: ${failed.map(x => x.name).join(", ")}`);
        alert(msgs.join("\n"));
      }

      onUploaded?.();
      await load();
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const onUpload = async (evt) => {
    const list = evt.target.files;
    await handleFiles(list);
    evt.target.value = "";
  };

  // --- Drag & drop handlers (with counter to avoid flicker on child enters/leaves) ---
  const onDragEnter = (e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true);
  };
  const onDragOver = (e) => {
    e.preventDefault(); e.stopPropagation();
    // indicate copy-drop
    e.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragging(false);
    }
  };
  const onDrop = async (e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const dt = e.dataTransfer;
    if (dt?.files?.length) {
      await handleFiles(dt.files);
    }
  };

  const toggle = (id) =>
    setSelectedDocIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const del = async (id) => {
    if (!confirm("Delete this file?")) return;
    try {
      await deleteFile({ userId, docId: id });
      await load();
      setSelectedDocIds((ids) => ids.filter((x) => x !== id));
    } catch (e) {
      alert(e.message || String(e));
    }
  };

  return (
    <Card
      title="Your Files"
      right={
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-gray-600">Upload</span>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            onChange={onUpload}
            accept={ALLOWED_EXTS.map(e => `*${e}`).join(",")}
          />
          <div className="px-2 py-1 rounded bg-gray-800 text-white text-xs">Choose</div>
        </label>
      }
    >
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      {busy && <div className="text-sm text-gray-500 mb-2">Loading…</div>}

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="File upload dropzone"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          "mb-3 rounded-2xl border-2 border-dashed p-4 transition",
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Drag & drop files here, or <span className="underline">click to choose</span>
            <span className="block text-xs text-gray-500 mt-1">
              Accepted: PDF, DOCX, CSV, PNG, JPG (multiple files allowed)
            </span>
          </div>
          <Button onClick={() => inputRef.current?.click()}>Browse</Button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2 max-h-72 overflow-auto">
        {files.length === 0 ? (
          <div className="text-sm text-gray-500">No files uploaded yet.</div>
        ) : (
          files.map((f) => (
            <div key={f.name} className="flex items-center justify-between gap-2 p-2 border rounded-xl">
              <label className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedDocIds.includes(f.id)}
                  onChange={() => toggle(f.id)}
                />
                <div className="truncate" title={f.name}>{f.name}</div>
              </label>
              <Button variant="danger" onClick={() => del(f.id)}>Delete</Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
