"use client";

import { useEffect, useRef, Suspense } from "react";
import CopilotChat from "@/components/CopilotChat";
import { useSearchParams } from "next/navigation";

function EmbedContent() {
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const isIframe = typeof window !== "undefined" && window.self !== window.top;

  // Get configuration from URL parameters
  const theme = searchParams.get("theme") || "auto";
  const apiEndpoint = searchParams.get("apiEndpoint") || "";
  const position = searchParams.get("position") || "inline";

  useEffect(() => {
    // Apply theme if specified
    if (containerRef.current && theme !== "auto") {
      containerRef.current.setAttribute("data-theme", theme);
    }

    // Handle iframe communication
    if (isIframe) {
      // Notify parent that iframe is loaded
      window.parent.postMessage(
        {
          type: "copilot:loaded",
          payload: { ready: true },
        },
        "*"
      );

      // Listen for messages from parent
      const handleMessage = (event: MessageEvent) => {
        // Security: In production, verify event.origin
        // if (event.origin !== 'https://trusted-domain.com') return;

        if (event.data && event.data.type) {
          // Handle messages from parent window
          console.log("Message from parent:", event.data);
        }
      };

      window.addEventListener("message", handleMessage);

      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }
  }, [theme, isIframe]);

  // Adjust styling for iframe mode
  const containerStyle: React.CSSProperties = {
    height: "100%",
    width: "100%",
    position: "relative",
    overflow: "hidden",
  };

  // For floating positions, adjust the chat mode
  const chatMode = position === "inline" ? "fullscreen" : "bubble";

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className="copilot-embed-page"
    >
      <CopilotChat mode={chatMode} />
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Loading...
        </div>
      }
    >
      <EmbedContent />
    </Suspense>
  );
}
