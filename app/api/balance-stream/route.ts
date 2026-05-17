export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial connection event
      sendEvent({ type: "connected", message: "SSE stream established" });

      // Simulate micro-earnings ticks every 2-5 seconds
      let active = true;
      
      const interval = setInterval(() => {
        if (!active) return;
        const tickAmount = 0.01 + (Math.random() * 0.02); // 0.01 - 0.03
        sendEvent({ type: "tick", amount: tickAmount });
      }, 3000 + Math.random() * 2000);

      request.signal.addEventListener("abort", () => {
        active = false;
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
