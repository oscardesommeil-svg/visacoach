interface MartinAvatarProps {
  size?: "sm" | "md" | "lg";
  withStatus?: boolean; // point vert "en ligne"
}

/** Avatar de Martin, le conseiller visa de VisaCoach. */
export default function MartinAvatar({ size = "md", withStatus = false }: MartinAvatarProps) {
  const sizes = { sm: 32, md: 44, lg: 64 };
  const px = sizes[size];

  return (
    <div style={{ position: "relative", width: px, height: px, flexShrink: 0 }}>
      <div
        style={{
          width: px,
          height: px,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1434A4, #2563EB)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: px * 0.45,
          color: "white",
          fontWeight: 800,
          fontFamily: "serif",
          boxShadow: "0 2px 8px rgba(20,52,164,0.3)",
        }}
      >
        M
      </div>
      {withStatus && (
        <div
          style={{
            position: "absolute",
            bottom: 1,
            right: 1,
            width: px * 0.25,
            height: px * 0.25,
            background: "#16A34A",
            borderRadius: "50%",
            border: "2px solid white",
          }}
        />
      )}
    </div>
  );
}
