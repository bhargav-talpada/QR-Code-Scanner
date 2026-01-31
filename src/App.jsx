import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import * as XLSX from "xlsx";

export default function App() {
  const [count, setCount] = useState(0);
  const [lastScan, setLastScan] = useState("");
  const [status, setStatus] = useState("");

  const scannerRef = useRef(null);
  const scannedSet = useRef(new Set());
  const excelRows = useRef([]);
  const busyRef = useRef(false);

  // -----------------------------
  // AUTO START SCANNER
  // -----------------------------
  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []);

  const startScanner = async () => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      onScanSuccess
    );
  };

  const stopScanner = () => {
    if (!scannerRef.current) return;
    scannerRef.current.stop().catch(() => {});
  };

  // -----------------------------
  // QR SCAN SUCCESS
  // -----------------------------
  const onScanSuccess = (qrText) => {
    if (busyRef.current) return;

    busyRef.current = true;
    setTimeout(() => (busyRef.current = false), 1000);

    if (scannedSet.current.has(qrText)) {
      setStatus("⚠️ Duplicate QR ignored");
      return;
    }

    scannedSet.current.add(qrText);

    const row = parseQR(qrText);
    excelRows.current.push(row);

    setCount(scannedSet.current.size);
    setLastScan(qrText);
    setStatus("✅ Saved to Excel");
  };

  // -----------------------------
  // PARSE QR CONTENT
  // -----------------------------
  const parseQR = (text) => {
    const parts = text.split("/").map(p => p.trim());
  
    const fields = {
      // -------- FIXED POSITION FIELDS --------
      agency: parts[0] || "",
      federation: parts[1] || "",
      society_name: parts[2] || "",
      rrao: parts[3] || "",
      exporter: parts[4] || "",
      year: parts[5] || "",
      season: parts[6] || "",
      commodity: parts[7] || "",
  
      // -------- KEY : VALUE FIELDS --------
      dispatch_id: "",
      dispatch_date: "",
      truck_sheet_no: "",
      vehicle_no: "",
      total_net_qty: "",
      total_bags: "",
    };
  
    parts.forEach(part => {
      if (part.startsWith("Dispatch ID")) {
        fields.dispatch_id = part.split(":")[1]?.trim() || "";
      }
      if (part.startsWith("Dispatch Date")) {
        fields.dispatch_date = part.split(":")[1]?.trim() || "";
      }
      if (part.startsWith("Truck Sheet No")) {
        fields.truck_sheet_no = part.split(":")[1]?.trim() || "";
      }
      if (part.startsWith("Vehicle No")) {
        fields.vehicle_no = part.split(":")[1]?.trim() || "";
      }
      if (part.startsWith("Total Net Qty")) {
        fields.total_net_qty = part.split(":")[1]?.trim() || "";
      }
      if (part.startsWith("Total Bags")) {
        fields.total_bags = part.split(":")[1]?.trim() || "";
      }
    });
  
    return fields;
  };
  

  // -----------------------------
  // DOWNLOAD EXCEL
  // -----------------------------
  const downloadExcel = () => {
    if (excelRows.current.length === 0) {
      alert("No QR scanned!");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(excelRows.current);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "QR-Data");
    XLSX.writeFile(wb, "groundnut_dispatch_scans.xlsx");
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-center mb-4">QR Scanner</h1>

      <div id="qr-reader" className="rounded-lg overflow-hidden shadow-lg mb-6"></div>

      <div className="text-center mb-6">
        <p className="text-xl font-semibold">
          Scanned: {count} QR Codes
        </p>

        <p className="text-sm text-gray-300 mt-1 break-all">
          Last Scan: {lastScan}
        </p>

        <p className="mt-2 font-medium text-green-400">{status}</p>
      </div>

      <button
        onClick={downloadExcel}
        className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-lg text-lg"
      >
        Download Excel
      </button>
    </div>
  );
}
