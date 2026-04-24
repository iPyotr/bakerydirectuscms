import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#d62929",
          borderRadius: 14,
          fontFamily: "Arial Black, sans-serif",
          fontSize: 38,
          fontWeight: 900,
          color: "#fff",
          letterSpacing: -1,
        }}
      >
        ДВ
      </div>
    ),
    { ...size },
  );
}
