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
    console.log(text);
    const fields = {
      dispatch_id: "",
      dispatch_date: "",
      vehicle_no: "",
      truck_sheet_no: "",
      delivery_challan_no: "",
      total_net_qty: "",
      total_bags: "",
      timestamp: new Date().toLocaleString(),
    };

    // Split using slashes (/) because your QR uses /
    const parts = text.split("/");

    parts.forEach((part) => {
      const p = part.trim();

      if (p.startsWith("Dispatch ID")) {
        fields.dispatch_id = p.split(":")[1]?.trim() || "";
      }
      if (p.startsWith("Dispatch Date")) {
        fields.dispatch_date = p.split(":")[1]?.trim() || "";
      }
      if (p.startsWith("Vehicle No")) {
        fields.vehicle_no = p.split(":")[1]?.trim() || "";
      }
      if (p.startsWith("Truck Sheet No")) {
        fields.truck_sheet_no = p.split(":")[1]?.trim() || "";
      }
      if (p.startsWith("Delivery Challan No")) {
        fields.delivery_challan_no = p.split(":")[1]?.trim() || "";
      }
      if (p.startsWith("Total Net Qty")) {
        fields.total_net_qty = p.split(":")[1]?.trim() || "";
      }
      if (p.startsWith("Total Bags")) {
        fields.total_bags = p.split(":")[1]?.trim() || "";
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
