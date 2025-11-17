"use client";

import { useEffect, useRef } from "react";
import CopilotChat from "./CopilotChat";

interface CopilotEmbedProps {
  apiEndpoint?: string;
  theme?: "light" | "dark" | "auto";
  height?: string;
  width?: string;
}

export default function CopilotEmbed({
  apiEndpoint,
  theme = "auto",
  height = "600px",
  width = "100%",
}: CopilotEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && theme !== "auto") {
      containerRef.current.setAttribute("data-theme", theme);
    }
  }, [theme]);

  return (
    <div
      ref={containerRef}
      style={{ height, width }}
      className="copilot-embed-container"
    >
      <CopilotChat />
    </div>
  );
}
