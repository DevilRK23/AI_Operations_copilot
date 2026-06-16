import { useState } from "react";
import API from "../services/api";

export default function UploadLog() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const uploadFile = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    
    setUploading(true);
    setMessage("");
    setError("");
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await API.post("/upload-log", formData);
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setMessage(response.data.message || "File uploaded and indexed successfully!");
      }
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred during file upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex flex-col items-center">
      <div className="max-w-xl w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl shadow-xl p-8 backdrop-blur-md mt-12">
        <h2 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
          Upload Data Source
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Upload logs, spreadsheets (CSV), documents (PDF/Text), or JSON arrays. Our AI engine will index and generate search embeddings immediately.
        </p>

        {/* Drop Zone */}
        <div className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl p-8 transition-colors duration-200 flex flex-col items-center justify-center bg-slate-900/50 cursor-pointer relative mb-6">
          <input
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".log,.txt,.csv,.json,.pdf,.yaml,.xml,.md"
          />
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl">📁</span>
            <span className="text-sm font-semibold text-slate-300 text-center">
              {file ? file.name : "Click or drag file to upload"}
            </span>
            <span className="text-xs text-slate-500">
              Supports .log, .txt, .csv, .pdf, .json up to 50MB
            </span>
          </div>
        </div>

        {file && (
          <div className="bg-slate-900/80 border border-slate-700/40 rounded-lg p-4 mb-6 flex flex-col gap-1">
            <div className="text-sm font-semibold text-slate-300">File Details:</div>
            <div className="text-xs text-slate-400">Name: {file.name}</div>
            <div className="text-xs text-slate-400">Size: {(file.size / 1024).toFixed(2)} KB</div>
            <div className="text-xs text-slate-400">Type: {file.type || "unknown"}</div>
          </div>
        )}

        <button
          onClick={uploadFile}
          disabled={uploading}
          className={`w-full py-3 px-6 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
            uploading
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25"
          }`}
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Indexing Document...
            </>
          ) : (
            "Upload & Index"
          )}
        </button>

        {/* Banners */}
        {message && (
          <div className="mt-6 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl p-4 flex gap-2">
            <span>✅</span>
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-4 flex gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}