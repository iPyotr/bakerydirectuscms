import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 30% 25%, #ff4545 0%, #d62929 55%, #a11414 100%)",
          fontFamily: "Arial Black, sans-serif",
          fontSize: 92,
          fontWeight: 900,
          color: "#fff",
          letterSpacing: -2,
        }}
      >
        ДВ
      </div>
    ),
    { ...size },
  );
}
