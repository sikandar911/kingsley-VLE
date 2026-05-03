import { useState, useRef } from "react";
import { adminApi } from "../api/admin.api";

// ─── CSV template ──────────────────────────────────────────────────────────────
const CSV_HEADER = "fullName,email,username,password,phone";
const CSV_EXAMPLE = [
  "John Doe,john@example.com,johndoe,Password123,+1234567890",
  "Jane Smith,jane@example.com,janesmith,Password123,",
  "Ali Khan,ali@example.com,,Password123,+9876543210",
].join("\n");
const TEMPLATE_CONTENT = `${CSV_HEADER}\n${CSV_EXAMPLE}\n`;

// ─── Helpers ───────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { error: "CSV file is empty." };

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["fullname", "email", "password"];
  const missing = required.filter((f) => !header.includes(f));
  if (missing.length) {
    return { error: `CSV is missing required columns: ${missing.join(", ")}` };
  }

  const idx = {
    fullName: header.indexOf("fullname"),
    email: header.indexOf("email"),
    username: header.indexOf("username"),
    password: header.indexOf("password"),
    phone: header.indexOf("phone"),
  };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    rows.push({
      _row: i,
      fullName: cols[idx.fullName] || "",
      email: cols[idx.email] || "",
      username: cols[idx.username] || "",
      password: cols[idx.password] || "",
      phone: cols[idx.phone] || "",
    });
  }

  return { rows };
}

function validateRow(row) {
  const errs = [];
  if (!row.fullName) errs.push("fullName required");
  if (!row.email) errs.push("email required");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
    errs.push("invalid email");
  if (!row.password) errs.push("password required");
  else if (row.password.length < 6) errs.push("password min 6 chars");
  return errs;
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CONTENT], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bulk_students_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Stages ────────────────────────────────────────────────────────────────────
// 'upload' → 'preview' → 'result'

export default function BulkCreateModal({ onClose, onCreated }) {
  const [stage, setStage] = useState("upload");
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const dropRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  // ── File handling ────────────────────────────────────────────────────────────
  const processFile = (file) => {
    setParseError("");
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setParseError("Please upload a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const { rows: parsed, error } = parseCSV(e.target.result);
      if (error) {
        setParseError(error);
        return;
      }
      if (parsed.length === 0) {
        setParseError("No data rows found in CSV.");
        return;
      }
      if (parsed.length > 500) {
        setParseError("Maximum 500 rows per upload.");
        return;
      }
      setRows(parsed);
      setStage("preview");
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  // ── Row editing in preview ───────────────────────────────────────────────────
  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  };

  const removeRow = (index) =>
    setRows((prev) => prev.filter((_, i) => i !== index));

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = rows.map(
        ({ fullName, email, username, password, phone }) => ({
          fullName,
          email,
          username: username || undefined,
          password,
          phone: phone || undefined,
        }),
      );
      const res = await adminApi.bulkCreateStudents(payload);
      setResult(res.data);
      setStage("result");
      onCreated();
    } catch (err) {
      setParseError(
        err.response?.data?.error || "Submission failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const validRows = rows.filter((r) => validateRow(r).length === 0);
  const invalidCount = rows.length - validRows.length;

  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Bulk Create Students
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {stage === "upload" &&
                "Upload a CSV file to create multiple student accounts at once"}
              {stage === "preview" &&
                `Review ${rows.length} students before adding them to the system`}
              {stage === "result" && "Bulk creation complete"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition border-0 bg-transparent cursor-pointer text-lg"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* ── STAGE: UPLOAD ─────────────────────────────────────────────────── */}
          {stage === "upload" && (
            <div className="px-6 py-8 flex flex-col items-center gap-6 max-w-xl mx-auto">
              {/* Template download */}
              <div className="w-full bg-[#6b1142]/10 border border-[#6b1142] rounded-xl p-4 flex items-start gap-3">
                <img
                  src="/files-icon.png"
                  alt="Template"
                  className="w-7 h-7 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#6b1142]">
                    Download CSV Template
                  </p>
                  <p className="text-xs text-[#6b1142] mt-0.5">
                    Use our template to ensure your CSV has the correct columns:
                    <span className="font-mono">
                      {" "}
                      fullName, email, username, password, phone
                    </span>
                  </p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="shrink-0 px-3 py-1.5 bg-[#6b1142] text-white text-xs font-medium rounded-lg hover:bg-[#5a0d38] transition border-0 cursor-pointer"
                >
                  ↓ Template
                </button>
              </div>

              {/* Drop zone */}
              <div
                ref={dropRef}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition ${
                  dragging
                    ? "border-[#6b1142] bg-[#6b1142]/10"
                    : "border-gray-300 hover:border-[#6b1142] hover:bg-[#6b1142]/5"
                }`}
              >
                <img
                  src="/folder-icon.png"
                  alt="Upload"
                  className="w-12 h-12 object-contain"
                />
                <p className="text-sm font-medium text-gray-700">
                  Drop your CSV here or click to browse
                </p>
                <p className="text-xs text-gray-400">
                  Only .csv files, max 500 students
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {parseError && (
                <div className="w-full bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {parseError}
                </div>
              )}

              {/* Format reference */}
              <div className="w-full">
                <p className="text-xs text-gray-500 font-medium mb-2">
                  Required CSV columns:
                </p>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {[
                          "fullName *",
                          "email *",
                          "username",
                          "password *",
                          "phone",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left font-semibold text-gray-600"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-500 font-mono">
                          John Doe
                        </td>
                        <td className="px-3 py-2 text-gray-500 font-mono">
                          john@example.com
                        </td>
                        <td className="px-3 py-2 text-gray-500 font-mono">
                          johndoe
                        </td>
                        <td className="px-3 py-2 text-gray-500 font-mono">
                          Password123
                        </td>
                        <td className="px-3 py-2 text-gray-500 font-mono">
                          +1234567890
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  * required &nbsp;|&nbsp; studentId is auto-generated
                  &nbsp;|&nbsp; role is always <em>student</em>
                </p>
              </div>
            </div>
          )}

          {/* ── STAGE: PREVIEW ────────────────────────────────────────────────── */}
          {stage === "preview" && (
            <div className="px-6 py-4">
              {/* Summary bar */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">
                    {rows.length}
                  </span>{" "}
                  rows detected
                </span>
                {invalidCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                    {invalidCount} row{invalidCount > 1 ? "s" : ""} with errors
                  </span>
                )}
                {invalidCount === 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    All rows valid ✓
                  </span>
                )}
                <button
                  onClick={() => {
                    setStage("upload");
                    setParseError("");
                  }}
                  className="ml-auto text-xs text-gray-500 hover:text-gray-800 underline border-0 bg-transparent cursor-pointer"
                >
                  ← Re-upload
                </button>
              </div>

              {parseError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                  {parseError}
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {[
                        "#",
                        "Full Name",
                        "Email",
                        "Username",
                        "Password",
                        "Phone",
                        "Status",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const errs = validateRow(row);
                      const hasError = errs.length > 0;
                      return (
                        <tr
                          key={i}
                          className={`border-t border-gray-100 ${hasError ? "bg-red-50" : "hover:bg-gray-50"}`}
                        >
                          <td className="px-3 py-2 text-gray-400 text-xs">
                            {row._row}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              value={row.fullName}
                              onChange={(e) =>
                                updateRow(i, "fullName", e.target.value)
                              }
                              className={`w-36 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-600 ${hasError && !row.fullName ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                              placeholder="Full Name *"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              value={row.email}
                              onChange={(e) =>
                                updateRow(i, "email", e.target.value)
                              }
                              className={`w-44 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-600 ${hasError && (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                              placeholder="email@example.com *"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              value={row.username}
                              onChange={(e) =>
                                updateRow(i, "username", e.target.value)
                              }
                              className="w-28 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                              placeholder="Optional"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="password"
                              value={row.password}
                              onChange={(e) =>
                                updateRow(i, "password", e.target.value)
                              }
                              className={`w-32 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-600 ${hasError && (!row.password || row.password.length < 6) ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                              placeholder="Password *"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              value={row.phone}
                              onChange={(e) =>
                                updateRow(i, "phone", e.target.value)
                              }
                              className="w-32 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                              placeholder="Optional"
                            />
                          </td>
                          <td className="px-3 py-2 min-w-[120px]">
                            {hasError ? (
                              <span
                                className="text-red-500 text-xs"
                                title={errs.join(", ")}
                              >
                                ⚠ {errs[0]}
                                {errs.length > 1 ? ` +${errs.length - 1}` : ""}
                              </span>
                            ) : (
                              <span className="text-green-600 text-xs">
                                ✓ Valid
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              onClick={() => removeRow(i)}
                              className="text-gray-400 hover:text-red-500 transition border-0 bg-transparent cursor-pointer text-base p-1"
                              title="Remove row"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── STAGE: RESULT ─────────────────────────────────────────────────── */}
          {stage === "result" && result && (
            <div className="px-6 py-8 max-w-2xl mx-auto">
              <div className="flex gap-4 mb-6">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {result.created}
                  </p>
                  <p className="text-sm text-green-700 font-medium mt-1">
                    Students Created
                  </p>
                </div>
                {result.failed.length > 0 && (
                  <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-red-500">
                      {result.failed.length}
                    </p>
                    <p className="text-sm text-red-600 font-medium mt-1">
                      Failed
                    </p>
                  </div>
                )}
              </div>

              {result.failed.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Failed Rows
                  </p>
                  <div className="rounded-lg border border-red-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50">
                        <tr>
                          {["Row", "Email", "Reason"].map((h) => (
                            <th
                              key={h}
                              className="px-3 py-2 text-left text-xs font-semibold text-red-700"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.failed.map((f, i) => (
                          <tr key={i} className="border-t border-red-100">
                            <td className="px-3 py-2 text-gray-500">{f.row}</td>
                            <td className="px-3 py-2 text-gray-700">
                              {f.email || "—"}
                            </td>
                            <td className="px-3 py-2 text-red-600">
                              {f.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.failed.length === 0 && (
                <div className="text-center text-sm text-gray-500">
                  All students were created successfully! 🎉
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
          {stage === "upload" && (
            <>
              <span className="text-xs text-gray-400">
                Supports up to 500 students per upload
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer bg-white"
              >
                Cancel
              </button>
            </>
          )}

          {stage === "preview" && (
            <>
              <span className="text-xs text-gray-400">
                {invalidCount > 0
                  ? `Fix ${invalidCount} error${invalidCount > 1 ? "s" : ""} before submitting, or remove invalid rows`
                  : `${validRows.length} students ready to be created`}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || rows.length === 0 || invalidCount > 0}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-5"
                >
                  {submitting
                    ? "Creating..."
                    : `Add ${validRows.length} Student${validRows.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </>
          )}

          {stage === "result" && (
            <div className="flex gap-2 ml-auto">
              <button onClick={onClose} className="btn-primary px-5">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
