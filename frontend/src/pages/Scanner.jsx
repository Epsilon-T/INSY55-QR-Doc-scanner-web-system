import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import * as api from "../api.js";

const READER_ID = "qr-reader";

export default function Scanner() {
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  // starting | scanning | checking | result | error
  const [phase, setPhase] = useState("starting");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      /* it was not running */
    }
    try {
      scanner.clear();
    } catch {
      /* nothing to clear */
    }
  }, []);

  const onScan = useCallback(
    async (text) => {
      if (busyRef.current) return; // ignore repeat reads of the same code
      busyRef.current = true;
      setPhase("checking");
      await stopScanner();
      try {
        setResult(await api.verifyScan(text));
        setPhase("result");
      } catch (err) {
        setError(err.message);
        setPhase("error");
      } finally {
        busyRef.current = false;
      }
    },
    [stopScanner]
  );

  const startScanner = useCallback(async () => {
    setError("");
    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (w, h) => {
            const size = Math.floor(Math.min(w, h) * 0.7);
            return { width: size, height: size };
          },
        },
        onScan,
        () => {} // called on every frame without a QR code, nothing to do
      );
      if (scannerRef.current !== scanner) {
        // the page was left or restarted while the camera was opening
        await scanner.stop().catch(() => {});
        return;
      }
      setPhase("scanning");
    } catch {
      if (scannerRef.current === scanner) {
        setError("Could not open the camera. Allow camera access in your browser, then try again.");
        setPhase("error");
      }
    }
  }, [onScan]);

  // Start the camera whenever we go back to the "starting" phase
  useEffect(() => {
    if (phase === "starting") startScanner();
  }, [phase, startScanner]);

  // Turn the camera off when leaving the page
  useEffect(() => () => void stopScanner(), [stopScanner]);

  function scanNext() {
    setResult(null);
    setPhase("starting");
  }

  const ok = result?.status === "entered";
  const student = result?.student;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Mobile QR Scanner</h1>
      <p className="mb-5 text-muted">Point the camera at the QR code on the student's ID.</p>

      {phase !== "result" && (
        <>
          <div className="relative overflow-hidden rounded-xl bg-ink">
            <div id={READER_ID} className="aspect-square w-full" />
            {(phase === "starting" || phase === "checking") && (
              <div className="absolute inset-0 grid place-items-center bg-ink/70 text-white">
                {phase === "starting" ? "Opening camera..." : "Checking student..."}
              </div>
            )}
          </div>
          {phase === "scanning" && <p className="mt-3 text-center text-muted">Ready. Hold the QR code inside the square.</p>}
          {phase === "error" && (
            <div className="mt-4 grid gap-3">
              <p className="rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-bad" role="alert">{error}</p>
              <button
                className="rounded-md bg-navy px-5 py-3 font-semibold text-white hover:bg-navy-dark"
                onClick={scanNext}
              >
                Try again
              </button>
            </div>
          )}
        </>
      )}

      {phase === "result" && result && (
        <div className="grid gap-4">
          <div className={`rounded-xl px-5 py-4 text-white ${ok ? "bg-ok" : "bg-bad"}`} role="status">
            <p className="font-head text-2xl font-bold">{ok ? "Verified" : "Not verified"}</p>
            <p>{ok ? "COR and photo found. Compare the face with the person at the gate." : result.reason}</p>
          </div>

          {student && (
            <div className="rounded-xl border border-line bg-white p-4">
              <div className="mb-3 flex gap-4">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={`Photo of ${student.name}`}
                    className="aspect-[3/4] w-32 shrink-0 rounded-lg border border-line object-cover"
                  />
                ) : (
                  <div className="grid aspect-[3/4] w-32 shrink-0 place-items-center rounded-lg border border-dashed border-bad/40 bg-bad/5 px-2 text-center text-sm text-bad">
                    No photo on file
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-head text-xl font-bold">{student.name}</p>
                  <p className="text-sm text-muted">{student.studentID}</p>
                  <p className="text-sm text-muted">{student.course} {student.section}</p>
                  <p className="text-sm text-muted">{student.year}</p>
                </div>
              </div>
              {ok && (
                <img
                  src={student.imageUrl}
                  alt={`COR of ${student.name}`}
                  className="w-full rounded-md border border-line"
                />
              )}
            </div>
          )}

          <button
            className="rounded-md bg-navy px-5 py-4 text-lg font-semibold text-white hover:bg-navy-dark"
            onClick={scanNext}
          >
            Scan next student
          </button>
        </div>
      )}
    </div>
  );
}
