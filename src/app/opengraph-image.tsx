import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MMT Racing - Bengkel Motor, Modifikasi, dan Jasa Bubut Custom Cilacap";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #0b0b0f 0%, #18181f 45%, #3b0b0b 100%)",
          color: "white",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 999,
            background: "rgba(239,68,68,0.38)",
            filter: "blur(18px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -220,
            left: -120,
            width: 620,
            height: 620,
            borderRadius: 999,
            background: "rgba(239,68,68,0.28)",
            filter: "blur(20px)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px",
            width: "100%",
            height: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div
              style={{
                width: 86,
                height: 86,
                borderRadius: 24,
                background: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 48,
                fontWeight: 900,
                boxShadow: "0 24px 80px rgba(239,68,68,0.45)",
              }}
            >
              M
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1 }}>MMT Racing</div>
              <div style={{ fontSize: 22, color: "rgba(255,255,255,0.68)" }}>Workshop & Custom Fabrication</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 910 }}>
            <div style={{ display: "flex", color: "#fca5a5", fontSize: 26, fontWeight: 800 }}>
              Bengkel Motor Cilacap
            </div>
            <div style={{ fontSize: 72, lineHeight: 0.98, fontWeight: 950, letterSpacing: -3 }}>
              Servis Berkualitas, Modifikasi Presisi Tinggi
            </div>
            <div style={{ fontSize: 28, lineHeight: 1.35, color: "rgba(255,255,255,0.78)" }}>
              Spesialis servis rutin, modifikasi, dan jasa bubut custom untuk motor.
            </div>
          </div>
          <div style={{ display: "flex", gap: 18, fontSize: 24, fontWeight: 800, color: "rgba(255,255,255,0.86)" }}>
            <div style={{ display: "flex", padding: "14px 22px", borderRadius: 999, background: "rgba(255,255,255,0.10)" }}>Booking Online</div>
            <div style={{ display: "flex", padding: "14px 22px", borderRadius: 999, background: "rgba(255,255,255,0.10)" }}>Widarapayung Wetan, Binangun</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
